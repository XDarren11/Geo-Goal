require('dotenv').config();
const { Client } = require('pg');

const STARTERS_7 = 7;
const STARTERS_11 = 11;

function extractPlayerId(entry) {
  if (!entry || typeof entry !== 'object') return null;

  const maybeId =
    entry.playerId ??
    entry.userId ??
    entry.id ??
    entry.player?.id ??
    entry.user?.id;

  const parsed = Number(maybeId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseEntryMap(entries, role) {
  const map = new Map();
  if (!Array.isArray(entries)) return map;

  for (const entry of entries) {
    const playerId = extractPlayerId(entry);
    if (!playerId) continue;
    if (map.has(playerId)) continue;

    map.set(playerId, {
      role,
      jerseyNumber:
        entry.jerseyNumber == null || Number.isNaN(Number(entry.jerseyNumber))
          ? null
          : Number(entry.jerseyNumber),
      position: typeof entry.position === 'string' ? entry.position : null,
      isCaptain: Boolean(entry.isCaptain),
      minutesPlanned:
        entry.minutesPlanned == null || Number.isNaN(Number(entry.minutesPlanned))
          ? null
          : Number(entry.minutesPlanned),
      notes: typeof entry.notes === 'string' ? entry.notes : null,
      playerName: typeof entry.playerName === 'string' ? entry.playerName : null,
    });
  }

  return map;
}

async function backfillTeamMemberProfile(client) {
  const summary = {
    playerNameUpdated: 0,
    jerseysAssigned: 0,
    teamsWithOverflow: 0,
  };

  const nameFill = await client.query(`
    UPDATE "team_members" tm
    SET "playerName" = u."name",
        "updatedAt" = NOW()
    FROM "users" u
    WHERE tm."userId" = u.id
      AND (tm."playerName" IS NULL OR BTRIM(tm."playerName") = '');
  `);
  summary.playerNameUpdated = nameFill.rowCount || 0;

  const teams = await client.query(`
    SELECT DISTINCT "teamId"
    FROM "team_members"
    ORDER BY "teamId";
  `);

  for (const t of teams.rows) {
    const teamId = Number(t.teamId);

    const usedRows = await client.query(
      `
      SELECT "jerseyNumber"
      FROM "team_members"
      WHERE "teamId" = $1
        AND "jerseyNumber" IS NOT NULL
      ORDER BY "jerseyNumber" ASC;
      `,
      [teamId]
    );

    const used = new Set(usedRows.rows.map((r) => Number(r.jerseyNumber)).filter((n) => Number.isInteger(n) && n > 0));

    const missingRows = await client.query(
      `
      SELECT "userId"
      FROM "team_members"
      WHERE "teamId" = $1
        AND "jerseyNumber" IS NULL
      ORDER BY "createdAt" ASC NULLS LAST, "userId" ASC;
      `,
      [teamId]
    );

    for (const m of missingRows.rows) {
      let candidate = 1;
      while (used.has(candidate) && candidate <= 99) {
        candidate += 1;
      }

      if (candidate > 99) {
        summary.teamsWithOverflow += 1;
        break;
      }

      await client.query(
        `
        UPDATE "team_members"
        SET "jerseyNumber" = $3,
            "updatedAt" = NOW()
        WHERE "teamId" = $1
          AND "userId" = $2;
        `,
        [teamId, Number(m.userId), candidate]
      );

      used.add(candidate);
      summary.jerseysAssigned += 1;
    }
  }

  return summary;
}

async function getTeamRoster(client, teamId) {
  const roster = await client.query(
    `
    SELECT tm."userId" AS "playerId", tm."playerName", tm."jerseyNumber", tm."preferredPosition", u."name", u."email", u."role"
    FROM "team_members" tm
    JOIN "users" u ON u.id = tm."userId"
    WHERE tm."teamId" = $1
    ORDER BY tm."createdAt" ASC NULLS LAST, tm."userId" ASC;
    `,
    [teamId]
  );

  return roster.rows;
}

function toLineupEntry(row) {
  const name = row.playerName && String(row.playerName).trim().length
    ? String(row.playerName).trim()
    : String(row.name);

  return {
    userId: Number(row.playerId),
    playerId: Number(row.playerId),
    name,
    playerName: name,
    number: row.jerseyNumber ?? null,
    jerseyNumber: row.jerseyNumber ?? null,
    position: row.preferredPosition ?? null,
  };
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function resolveStarterCountByLeague(preferredMode, homeCount, awayCount) {
  const preferred = preferredMode === STARTERS_7 ? STARTERS_7 : STARTERS_11;
  const possible = Math.min(homeCount, awayCount);

  if (possible >= preferred) return preferred;
  if (possible >= STARTERS_7) return STARTERS_7;
  return Math.max(1, possible);
}

async function inferLeagueModeMap(client) {
  const map = new Map();

  const explicit = await client.query(`
    SELECT
      m."leagueId" AS "leagueId",
      MAX(
        GREATEST(
          COALESCE(jsonb_array_length(md."homeStartingXI"), 0),
          COALESCE(jsonb_array_length(md."awayStartingXI"), 0)
        )
      ) AS "maxLineup"
    FROM "matches" m
    LEFT JOIN "match_details" md ON md."matchId" = m.id
    GROUP BY m."leagueId";
  `);

  for (const row of explicit.rows) {
    const leagueId = Number(row.leagueId);
    const maxLineup = Number(row.maxLineup || 0);

    if (maxLineup >= 8) {
      map.set(leagueId, STARTERS_11);
    } else if (maxLineup > 0) {
      map.set(leagueId, STARTERS_7);
    }
  }

  const unresolved = await client.query(`
    SELECT DISTINCT m."leagueId"
    FROM "matches" m;
  `);

  for (const row of unresolved.rows) {
    const leagueId = Number(row.leagueId);
    if (map.has(leagueId)) continue;

    const rosterStats = await client.query(
      `
      SELECT COALESCE(MIN(cnt), 0)::int AS "minRoster"
      FROM (
        SELECT t.id, COUNT(tm."userId")::int AS cnt
        FROM "teams" t
        LEFT JOIN "team_members" tm ON tm."teamId" = t.id
        WHERE t."leagueId" = $1
        GROUP BY t.id
      ) x;
      `,
      [leagueId]
    );

    const minRoster = Number(rosterStats.rows[0]?.minRoster ?? 0);
    map.set(leagueId, minRoster >= STARTERS_11 ? STARTERS_11 : STARTERS_7);
  }

  return map;
}

async function upsertMatchDetailLineups(client, {
  matchId,
  kickoffTime,
  actorUserId,
  homeStartingXI,
  awayStartingXI,
  homeBench,
  awayBench,
}) {
  const kickoff = kickoffTime ? new Date(kickoffTime) : null;
  const matchDay = kickoff && !Number.isNaN(kickoff.getTime())
    ? kickoff.toISOString().slice(0, 10)
    : null;

  await client.query(
    `
    INSERT INTO "match_details" (
      "matchId", "kickoffTime", "durationMinutes", "endTime", "matchDay", "fieldId", "homeCoachId", "awayCoachId",
      "homeStartingXI", "awayStartingXI", "homeBench", "awayBench", "referee", "weather", "attendance", "notes", "createdBy", "updatedBy", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, 90, NULL, $3::date, NULL, NULL, NULL, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, NULL, 'Soleado', NULL, 'Backfill automático', $8, $8, NOW(), NOW())
    ON CONFLICT ("matchId") DO UPDATE
    SET "homeStartingXI" = EXCLUDED."homeStartingXI",
        "awayStartingXI" = EXCLUDED."awayStartingXI",
        "homeBench" = EXCLUDED."homeBench",
        "awayBench" = EXCLUDED."awayBench",
        "updatedBy" = EXCLUDED."updatedBy",
        "updatedAt" = NOW();
    `,
    [
      matchId,
      kickoff && !Number.isNaN(kickoff.getTime()) ? kickoff.toISOString() : null,
      matchDay,
      JSON.stringify(homeStartingXI),
      JSON.stringify(awayStartingXI),
      JSON.stringify(homeBench),
      JSON.stringify(awayBench),
      actorUserId,
    ]
  );
}

async function syncSquadForTeam(client, { matchId, teamId, rosterRows, roleMaps, actorUserId }) {
  const playerIds = rosterRows.map((r) => Number(r.playerId));

  if (!playerIds.length) {
    await client.query(
      `DELETE FROM "match_squad_players" WHERE "matchId" = $1 AND "teamId" = $2;`,
      [matchId, teamId]
    );
    return { upserted: 0, deleted: 0 };
  }

  const deleted = await client.query(
    `
    DELETE FROM "match_squad_players"
    WHERE "matchId" = $1
      AND "teamId" = $2
      AND NOT ("playerId" = ANY($3::int[]));
    `,
    [matchId, teamId, playerIds]
  );

  let upserted = 0;

  for (const row of rosterRows) {
    const playerId = Number(row.playerId);
    const starterMeta = roleMaps.starters.get(playerId);
    const benchMeta = roleMaps.bench.get(playerId);

    const roleMeta = starterMeta ?? benchMeta ?? null;

    const squadRole = roleMeta?.role ?? 'roster';
    const isAvailable = squadRole !== 'unavailable';

    const playerName = row.playerName && String(row.playerName).trim().length
      ? String(row.playerName).trim()
      : String(row.name);

    await client.query(
      `
      INSERT INTO "match_squad_players" (
        "matchId", "teamId", "playerId", "squadRole", "isAvailable", "isCaptain", "jerseyNumber", "position", "minutesPlanned", "notes", "createdBy", "updatedBy", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, NOW(), NOW())
      ON CONFLICT ("matchId", "teamId", "playerId") DO UPDATE
      SET "squadRole" = EXCLUDED."squadRole",
          "isAvailable" = EXCLUDED."isAvailable",
          "isCaptain" = EXCLUDED."isCaptain",
          "jerseyNumber" = EXCLUDED."jerseyNumber",
          "position" = EXCLUDED."position",
          "minutesPlanned" = EXCLUDED."minutesPlanned",
          "notes" = EXCLUDED."notes",
          "updatedBy" = EXCLUDED."updatedBy",
          "updatedAt" = NOW();
      `,
      [
        matchId,
        teamId,
        playerId,
        squadRole,
        isAvailable,
        roleMeta?.isCaptain ?? false,
        roleMeta?.jerseyNumber ?? row.jerseyNumber ?? null,
        roleMeta?.position ?? row.preferredPosition ?? null,
        roleMeta?.minutesPlanned ?? null,
        roleMeta?.notes ?? roleMeta?.playerName ?? playerName,
        actorUserId,
      ]
    );

    upserted += 1;
  }

  return { upserted, deleted: deleted.rowCount || 0 };
}

async function backfillMatchSquads(client) {
  const summary = {
    matchesProcessed: 0,
    matchDetailsFilled: 0,
    rowsUpserted: 0,
    rowsDeleted: 0,
    leagueMode7: 0,
    leagueMode11: 0,
  };

  const leagueModeMap = await inferLeagueModeMap(client);
  summary.leagueMode7 = Array.from(leagueModeMap.values()).filter((v) => v === STARTERS_7).length;
  summary.leagueMode11 = Array.from(leagueModeMap.values()).filter((v) => v === STARTERS_11).length;

  const matches = await client.query(`
    SELECT m.id, m."leagueId", m."homeTeamId", m."awayTeamId", m."date", md."homeStartingXI", md."awayStartingXI", md."homeBench", md."awayBench", md."updatedBy", md."createdBy"
    FROM "matches" m
    LEFT JOIN "match_details" md ON md."matchId" = m.id
    ORDER BY m.id ASC;
  `);

  for (const m of matches.rows) {
    const matchId = Number(m.id);
    const actorUserId = Number(m.updatedBy ?? m.createdBy ?? null) || null;

    const homeRosterRows = await getTeamRoster(client, Number(m.homeTeamId));
    const awayRosterRows = await getTeamRoster(client, Number(m.awayTeamId));

    const preferredMode = leagueModeMap.get(Number(m.leagueId)) ?? STARTERS_11;
    const startersCount = resolveStarterCountByLeague(preferredMode, homeRosterRows.length, awayRosterRows.length);

    const generatedHomeStarting = homeRosterRows.slice(0, startersCount).map(toLineupEntry);
    const generatedHomeBench = homeRosterRows.slice(startersCount).map(toLineupEntry);
    const generatedAwayStarting = awayRosterRows.slice(0, startersCount).map(toLineupEntry);
    const generatedAwayBench = awayRosterRows.slice(startersCount).map(toLineupEntry);

    const homeStartingXI = isNonEmptyArray(m.homeStartingXI) ? m.homeStartingXI : generatedHomeStarting;
    const awayStartingXI = isNonEmptyArray(m.awayStartingXI) ? m.awayStartingXI : generatedAwayStarting;
    const homeBench = isNonEmptyArray(m.homeBench) ? m.homeBench : generatedHomeBench;
    const awayBench = isNonEmptyArray(m.awayBench) ? m.awayBench : generatedAwayBench;

    const hadEmptyAnyLineup =
      !isNonEmptyArray(m.homeStartingXI) ||
      !isNonEmptyArray(m.awayStartingXI) ||
      !isNonEmptyArray(m.homeBench) ||
      !isNonEmptyArray(m.awayBench);

    if (hadEmptyAnyLineup) {
      await upsertMatchDetailLineups(client, {
        matchId,
        kickoffTime: m.date,
        actorUserId,
        homeStartingXI,
        awayStartingXI,
        homeBench,
        awayBench,
      });
      summary.matchDetailsFilled += 1;
    }

    const homeRoleMaps = {
      starters: parseEntryMap(homeStartingXI, 'starter'),
      bench: parseEntryMap(homeBench, 'bench'),
    };

    const awayRoleMaps = {
      starters: parseEntryMap(awayStartingXI, 'starter'),
      bench: parseEntryMap(awayBench, 'bench'),
    };

    const homeResult = await syncSquadForTeam(client, {
      matchId,
      teamId: Number(m.homeTeamId),
      rosterRows: homeRosterRows,
      roleMaps: homeRoleMaps,
      actorUserId,
    });

    const awayResult = await syncSquadForTeam(client, {
      matchId,
      teamId: Number(m.awayTeamId),
      rosterRows: awayRosterRows,
      roleMaps: awayRoleMaps,
      actorUserId,
    });

    summary.matchesProcessed += 1;
    summary.rowsUpserted += homeResult.upserted + awayResult.upserted;
    summary.rowsDeleted += homeResult.deleted + awayResult.deleted;
  }

  return summary;
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definido en .env');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    const teamMemberSummary = await backfillTeamMemberProfile(client);
    const squadSummary = await backfillMatchSquads(client);

    await client.query('COMMIT');

    console.log('\n✅ Backfill completado');
    console.log('playerName completados:', teamMemberSummary.playerNameUpdated);
    console.log('dorsales asignados:', teamMemberSummary.jerseysAssigned);
    console.log('equipos con overflow dorsal (>99):', teamMemberSummary.teamsWithOverflow);
    console.log('ligas inferidas como fut7:', squadSummary.leagueMode7);
    console.log('ligas inferidas como fut11:', squadSummary.leagueMode11);
    console.log('partidos procesados:', squadSummary.matchesProcessed);
    console.log('match_details rellenados:', squadSummary.matchDetailsFilled);
    console.log('filas match_squad_players upsert:', squadSummary.rowsUpserted);
    console.log('filas match_squad_players depuradas:', squadSummary.rowsDeleted);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('❌ Error en backfill:', error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});
