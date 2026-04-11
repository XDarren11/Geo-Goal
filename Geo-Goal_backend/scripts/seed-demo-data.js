require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PASSWORD_PLAIN = 'Demo12345!';
const TARGET_LEAGUES = Number(process.env.SEED_TARGET_LEAGUES || 30);
const TARGET_ADMINS = Number(process.env.SEED_TARGET_ADMINS || 6);
const TARGET_COACHES = Number(process.env.SEED_TARGET_COACHES || 24);
const TARGET_PLAYERS = Number(process.env.SEED_TARGET_PLAYERS || 260);
const TARGET_REFEREES = Number(process.env.SEED_TARGET_REFEREES || 12);
const TEAM_ROSTER_SIZE = Number(process.env.SEED_TEAM_ROSTER_SIZE || 14);
const PLAYED_MATCHES_PER_LEAGUE = Number(process.env.SEED_PLAYED_MATCHES_PER_LEAGUE || 8);
const FUTURE_MATCHES_PER_LEAGUE = Number(process.env.SEED_FUTURE_MATCHES_PER_LEAGUE || 3);
const STARTERS_PER_MATCH = Number(process.env.SEED_STARTERS_PER_MATCH || 7);

const POSITIONS = ['POR', 'DFC', 'LTD', 'LTI', 'MC', 'MCO', 'ED', 'EI', 'DC'];

async function findOrCreateUser(client, { name, email, role, passwordHash }) {
  const result = await client.query(
    `
    INSERT INTO "users" ("name", "email", "password", "confirmed", "token", "role", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, true, NULL, $4, NOW(), NOW())
    ON CONFLICT ("email") DO UPDATE
      SET "name" = EXCLUDED."name",
          "role" = EXCLUDED."role",
          "password" = EXCLUDED."password",
          "confirmed" = true,
          "updatedAt" = NOW()
    RETURNING id;
    `,
    [name, email, passwordHash, role]
  );

  return result.rows[0].id;
}

async function findOrCreateLeague(client, { name, description, managerId }) {
  const existing = await client.query(
    `SELECT id FROM "leagues" WHERE "name" = $1 AND "deletedAt" IS NULL LIMIT 1`,
    [name]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO "leagues" ("name", "description", "managerId", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, NOW(), NOW())
    RETURNING id;
    `,
    [name, description, managerId]
  );
  return inserted.rows[0].id;
}

async function findOrCreateSeason(client, { leagueId }) {
  const existing = await client.query(
    `SELECT id FROM "seasons" WHERE "leagueId" = $1 AND "isCurrent" = true LIMIT 1`,
    [leagueId]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO "seasons" (
      "leagueId", "name", "year", "startDate", "endDate", "status", "isCurrent", "createdBy", "updatedBy", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, 'active', true, NULL, NULL, NOW(), NOW())
    RETURNING id;
    `,
    [leagueId, 'Temporada 2026', 2026, '2026-01-15', '2026-12-15']
  );
  return inserted.rows[0].id;
}

async function findOrCreateTeam(client, { name, lat, lng, fieldAddress, trainerId, leagueId }) {
  const existing = await client.query(
    `SELECT id FROM "teams" WHERE "name" = $1 AND "leagueId" = $2 LIMIT 1`,
    [name, leagueId]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO "teams" ("name", "lat", "lng", "fieldAddress", "logoUrl", "leagueId", "trainerId", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, NULL, $5, $6, NOW(), NOW())
    RETURNING id;
    `,
    [name, lat, lng, fieldAddress, leagueId, trainerId]
  );
  return inserted.rows[0].id;
}

async function addTeamMemberIfMissing(client, { teamId, userId, playerName = null, jerseyNumber = null, preferredPosition = null }) {
  await client.query(
    `
    INSERT INTO "team_members" ("teamId", "userId", "playerName", "jerseyNumber", "preferredPosition", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT ("teamId", "userId") DO UPDATE
      SET "playerName" = COALESCE("team_members"."playerName", EXCLUDED."playerName"),
          "jerseyNumber" = COALESCE("team_members"."jerseyNumber", EXCLUDED."jerseyNumber"),
          "preferredPosition" = COALESCE("team_members"."preferredPosition", EXCLUDED."preferredPosition"),
          "updatedAt" = NOW();
    `,
    [teamId, userId, playerName, jerseyNumber, preferredPosition]
  );
}

async function ensureTeamLeagueStats(client, { teamId, leagueId, seasonId }) {
  await client.query(
    `
    INSERT INTO "team_league_stats" (
      "teamId", "leagueId", "seasonId", "points", "gamesPlayed", "wins", "draws", "losses", "goalsFor", "goalsAgainst", "goalDifference", "penaltyWins", "createdAt", "updatedAt"
    )
    SELECT $1, $2, $3, 0, 0, 0, 0, 0, 0, 0, 0, 0, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM "team_league_stats" WHERE "teamId" = $1 AND "leagueId" = $2 AND COALESCE("seasonId", -1) = COALESCE($3, -1)
    );
    `,
    [teamId, leagueId, seasonId]
  );
}

async function ensureLeagueAdmin(client, { leagueId, userId, leagueRole, assignedBy }) {
  await client.query(
    `
    INSERT INTO "league_admins" ("leagueId", "userId", "leagueRole", "assignedBy", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT ("leagueId", "userId") DO UPDATE
      SET "leagueRole" = EXCLUDED."leagueRole",
          "assignedBy" = EXCLUDED."assignedBy",
          "updatedAt" = NOW();
    `,
    [leagueId, userId, leagueRole, assignedBy]
  );
}

async function ensurePrincipalAdminIfMissing(client, { leagueId, userId, assignedBy }) {
  const existing = await client.query(
    `
    SELECT "userId"
    FROM "league_admins"
    WHERE "leagueId" = $1 AND "leagueRole" = 'principal'
    LIMIT 1;
    `,
    [leagueId]
  );

  if (existing.rowCount) {
    return Number(existing.rows[0].userId);
  }

  await ensureLeagueAdmin(client, {
    leagueId,
    userId,
    leagueRole: 'principal',
    assignedBy,
  });

  return userId;
}

async function findOrCreateField(client, { leagueId, name, address, lat, lng, city, state, country, capacity }) {
  const existing = await client.query(
    `SELECT id FROM "fields" WHERE "leagueId" = $1 AND "name" = $2 LIMIT 1`,
    [leagueId, name]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO "fields" (
      "name", "address", "lat", "lng", "city", "state", "country", "capacity", "isActive", "notes", "leagueId", "teamId", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, NULL, NOW(), NOW())
    RETURNING id;
    `,
    [name, address, lat, lng, city, state, country, capacity, 'Cancha principal de pruebas', leagueId]
  );

  return inserted.rows[0].id;
}

async function findOrCreateMatch(client, { leagueId, seasonId, homeTeamId, awayTeamId, date, roundName }) {
  const existing = await client.query(
    `
    SELECT id FROM "matches"
    WHERE "leagueId" = $1
      AND "seasonId" = $2
      AND "homeTeamId" = $3
      AND "awayTeamId" = $4
      AND "roundName" = $5
    LIMIT 1;
    `,
    [leagueId, seasonId, homeTeamId, awayTeamId, roundName]
  );

  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
    INSERT INTO "matches" (
      "leagueId", "homeTeamId", "awayTeamId", "date", "roundName", "homeScore", "awayScore", "played", "homePenaltiesScore", "awayPenaltiesScore", "seasonId", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, 0, 0, false, NULL, NULL, $6, NOW(), NOW())
    RETURNING id;
    `,
    [leagueId, homeTeamId, awayTeamId, date, roundName, seasonId]
  );

  return inserted.rows[0].id;
}

async function ensureMatchDetail(client, {
  matchId,
  fieldId,
  homeCoachId,
  awayCoachId,
  createdBy,
  kickoffTime,
  homeStartingXI = [],
  awayStartingXI = [],
  homeBench = [],
  awayBench = [],
  notes = 'Partido de demostración',
}) {
  const kickoff = kickoffTime ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const matchDay = kickoff.slice(0, 10);

  await client.query(
    `
    INSERT INTO "match_details" (
      "matchId", "kickoffTime", "durationMinutes", "endTime", "matchDay", "fieldId", "homeCoachId", "awayCoachId",
      "homeStartingXI", "awayStartingXI", "homeBench", "awayBench", "referee", "weather", "attendance", "notes", "createdBy", "updatedBy", "createdAt", "updatedAt"
    )
      VALUES ($1, $2, 90, NULL, $3::date, $4, $5, $6,
          $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, NULL, 'Soleado', NULL, $11, $12, $12, NOW(), NOW())
    ON CONFLICT ("matchId") DO UPDATE
      SET "kickoffTime" = EXCLUDED."kickoffTime",
          "matchDay" = EXCLUDED."matchDay",
          "fieldId" = EXCLUDED."fieldId",
          "homeCoachId" = EXCLUDED."homeCoachId",
          "awayCoachId" = EXCLUDED."awayCoachId",
          "homeStartingXI" = EXCLUDED."homeStartingXI",
          "awayStartingXI" = EXCLUDED."awayStartingXI",
          "homeBench" = EXCLUDED."homeBench",
          "awayBench" = EXCLUDED."awayBench",
          "notes" = EXCLUDED."notes",
          "updatedBy" = EXCLUDED."updatedBy",
          "updatedAt" = NOW();
    `,
    [
      matchId,
      kickoff,
      matchDay,
      fieldId,
      homeCoachId,
      awayCoachId,
      JSON.stringify(homeStartingXI),
      JSON.stringify(awayStartingXI),
      JSON.stringify(homeBench),
      JSON.stringify(awayBench),
      notes,
      createdBy,
    ]
  );
}

async function ensureRefereeAssignment(client, { matchId, leagueId, refereeUserId, assignedBy }) {
  await client.query(
    `
    INSERT INTO "match_referee_assignments" ("matchId", "leagueId", "refereeUserId", "assignedBy", "status", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, 'assigned', NOW(), NOW())
    ON CONFLICT ("matchId") DO UPDATE
      SET "refereeUserId" = EXCLUDED."refereeUserId",
          "assignedBy" = EXCLUDED."assignedBy",
          "status" = EXCLUDED."status",
          "updatedAt" = NOW();
    `,
    [matchId, leagueId, refereeUserId, assignedBy]
  );
}

async function ensureNotification(client, { userId, type, title, message, payload = {} }) {
  const existing = await client.query(
    `
    SELECT id FROM "notifications"
    WHERE "userId" = $1 AND "type" = $2 AND "title" = $3
    LIMIT 1;
    `,
    [userId, type, title]
  );

  if (existing.rowCount) return existing.rows[0].id;

  await client.query(
    `
    INSERT INTO "notifications" ("userId", "type", "title", "message", "payload", "readAt", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5::jsonb, NULL, NOW(), NOW())
    RETURNING id;
    `,
    [userId, type, title, message, JSON.stringify(payload)]
  );
}

async function ensureToken(client, { userId, token }) {
  await client.query(
    `
    INSERT INTO "tokens" ("token", "userId", "createdAt", "updatedAt")
    SELECT $1::varchar, $2::int, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM "tokens" WHERE "token" = $1::varchar
    );
    `,
    [token, userId]
  );
}

async function ensureLeagueInvitation(client, { code, leagueId, createdBy, expiresAt }) {
  await client.query(
    `
    INSERT INTO "league_invitations" (
      "code", "leagueId", "createdBy", "expiresAt", "usesCount", "maxUses", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, 0, 100, NOW(), NOW())
    ON CONFLICT ("code") DO UPDATE
      SET "leagueId" = EXCLUDED."leagueId",
          "createdBy" = EXCLUDED."createdBy",
          "expiresAt" = EXCLUDED."expiresAt",
          "updatedAt" = NOW();
    `,
    [code, leagueId, createdBy, expiresAt]
  );
}

async function ensureTeamInvitation(client, { code, teamId, createdBy, expiresAt }) {
  await client.query(
    `
    INSERT INTO "team_invitations" (
      "code", "teamId", "createdBy", "expiresAt", "usesCount", "maxUses", "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, 0, 100, NOW(), NOW())
    ON CONFLICT ("code") DO UPDATE
      SET "teamId" = EXCLUDED."teamId",
          "createdBy" = EXCLUDED."createdBy",
          "expiresAt" = EXCLUDED."expiresAt",
          "updatedAt" = NOW();
    `,
    [code, teamId, createdBy, expiresAt]
  );
}

async function ensureMatchEvent(client, { matchId, leagueId, teamId, playerId, eventType, minute, extraMinute, metadata, recordedBy }) {
  await client.query(
    `
    INSERT INTO "match_events" (
      "matchId", "leagueId", "teamId", "playerId", "eventType", "minute", "extraMinute", "metadata", "recordedBy", "createdAt", "updatedAt"
    )
    SELECT $1::int, $2::int, $3::int, $4::int, $5::varchar, $6::int, $7::int, $8::jsonb, $9::int, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM "match_events"
      WHERE "matchId" = $1
        AND "eventType" = $5::varchar
        AND "minute" = $6::int
        AND COALESCE("playerId", -1) = COALESCE($4::int, -1)
    );
    `,
    [matchId, leagueId, teamId, playerId, eventType, minute, extraMinute, JSON.stringify(metadata ?? {}), recordedBy]
  );
}

async function ensureTrackingFrame(client, { matchId, leagueId, timestampMs, period, ballX, ballY, ballZ, players, recordedBy }) {
  await client.query(
    `
    INSERT INTO "match_tracking_frames" (
      "matchId", "leagueId", "timestampMs", "period", "ballX", "ballY", "ballZ", "players", "recordedBy", "createdAt", "updatedAt"
    )
    SELECT $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM "match_tracking_frames" WHERE "matchId" = $1 AND "timestampMs" = $3
    );
    `,
    [matchId, leagueId, timestampMs, period, ballX, ballY, ballZ, JSON.stringify(players ?? []), recordedBy]
  );
}

async function ensureAuditLog(client, { actorUserId, leagueId, seasonId, entityType, entityId, action, beforeData, afterData, reason, ip, userAgent }) {
  await client.query(
    `
    INSERT INTO "audit_logs" (
      "actorUserId", "leagueId", "seasonId", "entityType", "entityId", "action", "beforeData", "afterData", "reason", "ip", "userAgent", "createdAt"
    )
    SELECT $1::int, $2::int, $3::int, $4::varchar, $5::varchar, $6::varchar, $7::jsonb, $8::jsonb, $9::text, $10::varchar, $11::text, NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM "audit_logs"
      WHERE "entityType" = $4::varchar AND "entityId" = $5::varchar AND "action" = $6::varchar
    );
    `,
    [
      actorUserId,
      leagueId,
      seasonId,
      entityType,
      entityId,
      action,
      JSON.stringify(beforeData ?? null),
      JSON.stringify(afterData ?? null),
      reason,
      ip,
      userAgent,
    ]
  );
}

async function getTeamRoster(client, teamId) {
  const result = await client.query(
    `
    SELECT tm."userId", tm."playerName", tm."jerseyNumber", tm."preferredPosition", u."name"
    FROM "team_members" tm
    JOIN "users" u ON u.id = tm."userId"
    WHERE tm."teamId" = $1
    ORDER BY tm."jerseyNumber" ASC NULLS LAST, tm."createdAt" ASC NULLS LAST, tm."userId" ASC;
    `,
    [teamId]
  );

  return result.rows;
}

function toLineupEntry(row) {
  return {
    userId: Number(row.userId),
    playerId: Number(row.userId),
    name: row.playerName || row.name,
    playerName: row.playerName || row.name,
    number: row.jerseyNumber ?? null,
    jerseyNumber: row.jerseyNumber ?? null,
    position: row.preferredPosition ?? null,
  };
}

async function recomputeLeagueStats(client, { leagueId, seasonId }) {
  await client.query(
    `
    UPDATE "team_league_stats"
    SET "gamesPlayed" = 0,
        "wins" = 0,
        "draws" = 0,
        "losses" = 0,
        "points" = 0,
        "goalsFor" = 0,
        "goalsAgainst" = 0,
        "goalDifference" = 0,
        "updatedAt" = NOW()
    WHERE "leagueId" = $1
      AND COALESCE("seasonId", -1) = COALESCE($2, -1);
    `,
    [leagueId, seasonId]
  );

  const summary = await client.query(
    `
    SELECT
      x."teamId",
      COUNT(*)::int AS "gamesPlayed",
      SUM(CASE WHEN x."goalsFor" > x."goalsAgainst" THEN 1 ELSE 0 END)::int AS wins,
      SUM(CASE WHEN x."goalsFor" = x."goalsAgainst" THEN 1 ELSE 0 END)::int AS draws,
      SUM(CASE WHEN x."goalsFor" < x."goalsAgainst" THEN 1 ELSE 0 END)::int AS losses,
      SUM(x."goalsFor")::int AS "goalsFor",
      SUM(x."goalsAgainst")::int AS "goalsAgainst"
    FROM (
      SELECT m."homeTeamId" AS "teamId", m."homeScore" AS "goalsFor", m."awayScore" AS "goalsAgainst"
      FROM "matches" m
      WHERE m."leagueId" = $1 AND COALESCE(m."seasonId", -1) = COALESCE($2, -1) AND m."played" = true

      UNION ALL

      SELECT m."awayTeamId" AS "teamId", m."awayScore" AS "goalsFor", m."homeScore" AS "goalsAgainst"
      FROM "matches" m
      WHERE m."leagueId" = $1 AND COALESCE(m."seasonId", -1) = COALESCE($2, -1) AND m."played" = true
    ) x
    GROUP BY x."teamId";
    `,
    [leagueId, seasonId]
  );

  for (const row of summary.rows) {
    const wins = Number(row.wins || 0);
    const draws = Number(row.draws || 0);
    const goalsFor = Number(row.goalsFor || 0);
    const goalsAgainst = Number(row.goalsAgainst || 0);

    await client.query(
      `
      UPDATE "team_league_stats"
      SET "gamesPlayed" = $4,
          "wins" = $5,
          "draws" = $6,
          "losses" = $7,
          "points" = $8,
          "goalsFor" = $9,
          "goalsAgainst" = $10,
          "goalDifference" = $11,
          "updatedAt" = NOW()
      WHERE "teamId" = $1
        AND "leagueId" = $2
        AND COALESCE("seasonId", -1) = COALESCE($3, -1);
      `,
      [
        Number(row.teamId),
        leagueId,
        seasonId,
        Number(row.gamesPlayed || 0),
        wins,
        draws,
        Number(row.losses || 0),
        wins * 3 + draws,
        goalsFor,
        goalsAgainst,
        goalsFor - goalsAgainst,
      ]
    );
  }
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

  const rawQuery = client.query.bind(client);
  client.query = async (...args) => {
    const maxRetries = 4;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await rawQuery(...args);
      } catch (error) {
        const isDeadlock = error && error.code === '40P01';
        if (!isDeadlock || attempt === maxRetries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
      }
    }
    throw new Error('No se pudo ejecutar query tras reintentos');
  };

  await client.query('BEGIN');

  try {
    const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

    const admins = [];
    const coaches = [];
    const players = [];
    const referees = [];
    const createdLeagueIds = [];
    const createdTeamIds = [];

    for (let i = 1; i <= TARGET_ADMINS; i++) {
      admins.push(
        await findOrCreateUser(client, {
          name: `Admin ${i}`,
          email: `admin${i}@geogoal.app`,
          role: 'admin',
          passwordHash,
        })
      );
    }

    for (let i = 1; i <= TARGET_COACHES; i++) {
      coaches.push(
        await findOrCreateUser(client, {
          name: `Coach ${i}`,
          email: `coach${i}@geogoal.app`,
          role: 'coach',
          passwordHash,
        })
      );
    }

    for (let i = 1; i <= TARGET_PLAYERS; i++) {
      players.push(
        await findOrCreateUser(client, {
          name: `Jugador ${i}`,
          email: `player${i}@geogoal.app`,
          role: 'player',
          passwordHash,
        })
      );
    }

    for (let i = 1; i <= TARGET_REFEREES; i++) {
      referees.push(
        await findOrCreateUser(client, {
          name: `Árbitro ${i}`,
          email: `referee${i}@geogoal.app`,
          role: 'referee',
          passwordHash,
        })
      );
    }

    const allUsers = [...admins, ...coaches, ...players, ...referees];
    const playerNameById = new Map();

    const playerNames = await client.query(
      `SELECT id, "name" FROM "users" WHERE id = ANY($1::int[])`,
      [players]
    );
    for (const row of playerNames.rows) {
      playerNameById.set(Number(row.id), String(row.name));
    }

    for (let i = 0; i < allUsers.length; i++) {
      await ensureToken(client, {
        userId: allUsers[i],
        token: `seed-token-${String(i + 1).padStart(3, '0')}`,
      });
    }

    for (let i = 1; i <= TARGET_LEAGUES; i++) {
      const principalAdminId = admins[(i - 1) % admins.length];
      const refereeId = referees[(i - 1) % referees.length];
      const coachAId = coaches[(i - 1) % coaches.length];
      const coachBId = coaches[i % coaches.length];
      const playerA1Id = players[(i - 1) % players.length];
      const playerA2Id = players[(i + 1) % players.length];
      const playerB1Id = players[(i + 3) % players.length];
      const playerB2Id = players[(i + 5) % players.length];

      const leagueId = await findOrCreateLeague(client, {
        name: `Liga Demo GeoGoal ${String(i).padStart(2, '0')}`,
        description: `Liga de pruebas #${i}`,
        managerId: principalAdminId,
      });
      createdLeagueIds.push(leagueId);

      await ensurePrincipalAdminIfMissing(client, {
        leagueId,
        userId: principalAdminId,
        assignedBy: principalAdminId,
      });

      await ensureLeagueAdmin(client, {
        leagueId,
        userId: refereeId,
        leagueRole: 'assistant',
        assignedBy: principalAdminId,
      });

      const seasonId = await findOrCreateSeason(client, { leagueId });

      const teamAId = await findOrCreateTeam(client, {
        name: `Tigres ${String(i).padStart(2, '0')}`,
        lat: 19.35 + i * 0.01,
        lng: -99.2 + i * 0.01,
        fieldAddress: `Av. Equipo A ${i}, CDMX`,
        trainerId: coachAId,
        leagueId,
      });
      createdTeamIds.push(teamAId);

      const teamBId = await findOrCreateTeam(client, {
        name: `Leones ${String(i).padStart(2, '0')}`,
        lat: 20.4 + i * 0.01,
        lng: -103.5 + i * 0.01,
        fieldAddress: `Av. Equipo B ${i}, GDL`,
        trainerId: coachBId,
        leagueId,
      });
      createdTeamIds.push(teamBId);

      for (let r = 0; r < TEAM_ROSTER_SIZE; r++) {
        const playerAId = players[((i - 1) * TEAM_ROSTER_SIZE + r) % players.length];
        const playerBId = players[((i - 1) * TEAM_ROSTER_SIZE + TEAM_ROSTER_SIZE + r) % players.length];

        await addTeamMemberIfMissing(client, {
          teamId: teamAId,
          userId: playerAId,
          playerName: playerNameById.get(playerAId) || `Jugador ${playerAId}`,
          jerseyNumber: null,
          preferredPosition: POSITIONS[r % POSITIONS.length],
        });

        await addTeamMemberIfMissing(client, {
          teamId: teamBId,
          userId: playerBId,
          playerName: playerNameById.get(playerBId) || `Jugador ${playerBId}`,
          jerseyNumber: null,
          preferredPosition: POSITIONS[(r + 2) % POSITIONS.length],
        });
      }

      await ensureTeamLeagueStats(client, { teamId: teamAId, leagueId, seasonId });
      await ensureTeamLeagueStats(client, { teamId: teamBId, leagueId, seasonId });

      const fieldId = await findOrCreateField(client, {
        leagueId,
        name: `Cancha Demo ${String(i).padStart(2, '0')}`,
        address: `Calle Cancha ${i}`,
        lat: 19.3 + i * 0.01,
        lng: -99.1 + i * 0.01,
        city: 'Ciudad de México',
        state: 'CDMX',
        country: 'México',
        capacity: 1200 + i * 30,
      });

      const teamARoster = await getTeamRoster(client, teamAId);
      const teamBRoster = await getTeamRoster(client, teamBId);

      const starters = Math.max(1, Math.min(STARTERS_PER_MATCH, teamARoster.length, teamBRoster.length));
      const homeAStarting = teamARoster.slice(0, starters).map(toLineupEntry);
      const awayBStarting = teamBRoster.slice(0, starters).map(toLineupEntry);
      const homeABench = teamARoster.slice(starters, starters + 7).map(toLineupEntry);
      const awayBBench = teamBRoster.slice(starters, starters + 7).map(toLineupEntry);

      let firstFutureMatchId = null;
      let firstPlayedMatchId = null;

      for (let round = 0; round < PLAYED_MATCHES_PER_LEAGUE + FUTURE_MATCHES_PER_LEAGUE; round++) {
        const isPlayed = round < PLAYED_MATCHES_PER_LEAGUE;
        const homeTeamId = round % 2 === 0 ? teamAId : teamBId;
        const awayTeamId = round % 2 === 0 ? teamBId : teamAId;
        const homeCoachId = round % 2 === 0 ? coachAId : coachBId;
        const awayCoachId = round % 2 === 0 ? coachBId : coachAId;

        const roundName = `Jornada ${round}`;
        const matchDate = isPlayed
          ? new Date(Date.now() - ((i * 2 + round + 1) * 24 * 60 * 60 * 1000)).toISOString()
          : new Date(Date.now() + ((i + round + 2) * 24 * 60 * 60 * 1000)).toISOString();

        const matchId = await findOrCreateMatch(client, {
          leagueId,
          seasonId,
          homeTeamId,
          awayTeamId,
          date: matchDate,
          roundName,
        });

        if (!firstFutureMatchId && !isPlayed) firstFutureMatchId = matchId;
        if (!firstPlayedMatchId && isPlayed) firstPlayedMatchId = matchId;

        const homeStartingXI = homeTeamId === teamAId ? homeAStarting : awayBStarting;
        const awayStartingXI = awayTeamId === teamAId ? homeAStarting : awayBStarting;
        const homeBench = homeTeamId === teamAId ? homeABench : awayBBench;
        const awayBench = awayTeamId === teamAId ? homeABench : awayBBench;

        await ensureMatchDetail(client, {
          matchId,
          fieldId,
          homeCoachId,
          awayCoachId,
          createdBy: principalAdminId,
          kickoffTime: matchDate,
          homeStartingXI,
          awayStartingXI,
          homeBench,
          awayBench,
          notes: isPlayed ? 'Partido jugado de carga masiva' : 'Partido programado de carga masiva',
        });

        await ensureRefereeAssignment(client, {
          matchId,
          leagueId,
          refereeUserId: refereeId,
          assignedBy: principalAdminId,
        });

        if (isPlayed) {
          let homeScore = (i + round) % 5;
          let awayScore = (i + round + 2) % 4;
          if (homeScore === 0 && awayScore === 0) homeScore = 1;

          await client.query(
            `
            UPDATE "matches"
            SET "played" = true,
                "homeScore" = $2,
                "awayScore" = $3,
                "updatedAt" = NOW()
            WHERE id = $1;
            `,
            [matchId, homeScore, awayScore]
          );

          await client.query(
            `
            UPDATE "match_referee_assignments"
            SET "status" = 'closed', "updatedAt" = NOW()
            WHERE "matchId" = $1;
            `,
            [matchId]
          );

          const homeScorers = homeStartingXI.length ? homeStartingXI : homeBench;
          const awayScorers = awayStartingXI.length ? awayStartingXI : awayBench;

          for (let g = 0; g < homeScore; g++) {
            const scorer = homeScorers[g % Math.max(homeScorers.length, 1)] || null;
            if (!scorer?.userId) continue;
            await ensureMatchEvent(client, {
              matchId,
              leagueId,
              teamId: homeTeamId,
              playerId: scorer.userId,
              eventType: g % 4 === 0 ? 'penalty_scored' : 'goal',
              minute: 8 + g * 11,
              extraMinute: null,
              metadata: { origin: 'seed_massive' },
              recordedBy: refereeId,
            });
          }

          for (let g = 0; g < awayScore; g++) {
            const scorer = awayScorers[g % Math.max(awayScorers.length, 1)] || null;
            if (!scorer?.userId) continue;
            await ensureMatchEvent(client, {
              matchId,
              leagueId,
              teamId: awayTeamId,
              playerId: scorer.userId,
              eventType: 'goal',
              minute: 14 + g * 13,
              extraMinute: null,
              metadata: { origin: 'seed_massive' },
              recordedBy: refereeId,
            });
          }

          const cardTargetHome = homeStartingXI[0] || homeBench[0];
          const cardTargetAway = awayStartingXI[0] || awayBench[0];

          if (cardTargetHome?.userId) {
            await ensureMatchEvent(client, {
              matchId,
              leagueId,
              teamId: homeTeamId,
              playerId: cardTargetHome.userId,
              eventType: 'yellow_card',
              minute: 62,
              extraMinute: null,
              metadata: { reason: 'foul' },
              recordedBy: refereeId,
            });
          }

          if (cardTargetAway?.userId) {
            await ensureMatchEvent(client, {
              matchId,
              leagueId,
              teamId: awayTeamId,
              playerId: cardTargetAway.userId,
              eventType: round % 4 === 0 ? 'red_card' : 'yellow_card',
              minute: 74,
              extraMinute: null,
              metadata: { reason: 'late_tackle' },
              recordedBy: refereeId,
            });
          }

          await ensureTrackingFrame(client, {
            matchId,
            leagueId,
            timestampMs: 10000 + i + round,
            period: '1H',
            ballX: 11.2 + i * 0.1 + round * 0.05,
            ballY: 5.8 + i * 0.1 + round * 0.05,
            ballZ: 0.2,
            players: [
              { userId: homeAStarting[0]?.userId ?? playerA1Id, x: 12.1, y: 9.2, speed: 6.4 },
              { userId: awayBStarting[0]?.userId ?? playerB1Id, x: 18.5, y: 11.4, speed: 5.7 },
            ],
            recordedBy: refereeId,
          });

          await ensureTrackingFrame(client, {
            matchId,
            leagueId,
            timestampMs: 20000 + i + round,
            period: '2H',
            ballX: 15.2 + i * 0.1 + round * 0.05,
            ballY: 8.1 + i * 0.1 + round * 0.05,
            ballZ: 0.1,
            players: [
              { userId: homeAStarting[1]?.userId ?? playerA2Id, x: 15.9, y: 9.9, speed: 7.1 },
              { userId: awayBStarting[1]?.userId ?? playerB2Id, x: 20.3, y: 14.0, speed: 6.2 },
            ],
            recordedBy: refereeId,
          });
        } else {
          await client.query(
            `
            UPDATE "matches"
            SET "played" = false,
                "homeScore" = 0,
                "awayScore" = 0,
                "updatedAt" = NOW()
            WHERE id = $1;
            `,
            [matchId]
          );

          await client.query(
            `
            UPDATE "match_referee_assignments"
            SET "status" = 'assigned', "updatedAt" = NOW()
            WHERE "matchId" = $1;
            `,
            [matchId]
          );
        }
      }

      await recomputeLeagueStats(client, { leagueId, seasonId });

      await ensureLeagueInvitation(client, {
        code: `LIGA-DEMO-${String(i).padStart(3, '0')}`,
        leagueId,
        createdBy: principalAdminId,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await ensureTeamInvitation(client, {
        code: `TEAM-DEMO-${String(i).padStart(3, '0')}`,
        teamId: teamAId,
        createdBy: coachAId,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await ensureAuditLog(client, {
        actorUserId: principalAdminId,
        leagueId,
        seasonId,
        entityType: 'match',
        entityId: String(firstPlayedMatchId || `${leagueId}-played`),
        action: 'update',
        beforeData: { played: false, homeScore: 0, awayScore: 0 },
        afterData: { played: true, matchesGenerated: PLAYED_MATCHES_PER_LEAGUE },
        reason: `Carga masiva demo liga ${i}`,
        ip: '127.0.0.1',
        userAgent: 'seed-script',
      });

      await ensureAuditLog(client, {
        actorUserId: principalAdminId,
        leagueId,
        seasonId,
        entityType: 'referee_assignment',
        entityId: String(firstPlayedMatchId || `${leagueId}-ref`),
        action: 'create',
        beforeData: null,
        afterData: { refereeUserId: refereeId, status: 'closed' },
        reason: `Asignación arbitral liga ${i}`,
        ip: '127.0.0.1',
        userAgent: 'seed-script',
      });

      await ensureNotification(client, {
        userId: principalAdminId,
        type: 'system_info',
        title: `Datos cargados liga ${i}`,
        message: `Se cargaron datos relacionados para la liga ${i}.`,
        payload: { leagueId, seasonId, matchId: firstFutureMatchId },
      });

      await ensureNotification(client, {
        userId: refereeId,
        type: 'referee_assignment',
        title: `Asignación arbitral liga ${i}`,
        message: `Tienes partidos asignados en la liga ${i}.`,
        payload: { leagueId, futureMatchId: firstFutureMatchId, playedMatchId: firstPlayedMatchId },
      });
    }

    // Asegurar que TODOS los usuarios existentes tengan relación con al menos una liga
    const fallbackLeagueId = createdLeagueIds[0];
    const fallbackTeamId = createdTeamIds[0];
    const fallbackAdminId = admins[0];

    const uncovered = await client.query(
      `
      SELECT u.id, u.role
      FROM "users" u
      WHERE NOT (
        (u.role = 'admin' AND EXISTS (SELECT 1 FROM "leagues" l WHERE l."managerId" = u.id))
        OR (u.role = 'referee' AND EXISTS (SELECT 1 FROM "league_admins" la WHERE la."userId" = u.id))
        OR (u.role = 'coach' AND EXISTS (SELECT 1 FROM "teams" t WHERE t."trainerId" = u.id AND t."leagueId" IS NOT NULL))
        OR (u.role = 'player' AND EXISTS (
          SELECT 1
          FROM "team_members" tm
          JOIN "teams" t ON t.id = tm."teamId"
          WHERE tm."userId" = u.id AND t."leagueId" IS NOT NULL
        ))
      );
      `
    );

    for (const row of uncovered.rows) {
      const userId = Number(row.id);
      const role = String(row.role);

      if (role === 'admin' || role === 'referee') {
        await ensureLeagueAdmin(client, {
          leagueId: fallbackLeagueId,
          userId,
          leagueRole: 'assistant',
          assignedBy: fallbackAdminId,
        });
        continue;
      }

      if (role === 'coach') {
        const rescueTeamId = await findOrCreateTeam(client, {
          name: `Equipo Coach ${userId}`,
          lat: 19.45,
          lng: -99.15,
          fieldAddress: `Dirección Coach ${userId}`,
          trainerId: userId,
          leagueId: fallbackLeagueId,
        });
        await ensureTeamLeagueStats(client, {
          teamId: rescueTeamId,
          leagueId: fallbackLeagueId,
          seasonId: null,
        });
        continue;
      }

      if (role === 'player') {
        await addTeamMemberIfMissing(client, { teamId: fallbackTeamId, userId });
      }
    }

    await client.query('COMMIT');

    console.log('\n✅ Seed demo completado');
    console.log('Password para usuarios creados:', PASSWORD_PLAIN);
    console.log(`Ligas objetivo: ${TARGET_LEAGUES}`);
    console.log(`Jugadores objetivo: ${TARGET_PLAYERS}`);
    console.log(`Plantilla por equipo: ${TEAM_ROSTER_SIZE}`);
    console.log(`Partidos jugados por liga: ${PLAYED_MATCHES_PER_LEAGUE}`);
    console.log(`Partidos futuros por liga: ${FUTURE_MATCHES_PER_LEAGUE}`);
    console.log('Usuarios ejemplo: admin1@geogoal.app, coach1@geogoal.app, player1@geogoal.app, referee1@geogoal.app');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('❌ Error al sembrar datos:', error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});
