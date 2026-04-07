require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PASSWORD_PLAIN = 'Demo12345!';
const TARGET_LEAGUES = 30;

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

async function addTeamMemberIfMissing(client, { teamId, userId }) {
  await client.query(
    `
    INSERT INTO "team_members" ("teamId", "userId", "createdAt", "updatedAt")
    SELECT $1, $2, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM "team_members" WHERE "teamId" = $1 AND "userId" = $2
    );
    `,
    [teamId, userId]
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

async function ensureMatchDetail(client, { matchId, fieldId, homeCoachId, awayCoachId, createdBy, kickoffTime }) {
  const kickoff = kickoffTime ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const matchDay = kickoff.slice(0, 10);

  await client.query(
    `
    INSERT INTO "match_details" (
      "matchId", "kickoffTime", "durationMinutes", "endTime", "matchDay", "fieldId", "homeCoachId", "awayCoachId",
      "homeStartingXI", "awayStartingXI", "homeBench", "awayBench", "referee", "weather", "attendance", "notes", "createdBy", "updatedBy", "createdAt", "updatedAt"
    )
        SELECT $1, $2, 90, NULL, $3::date, $4, $5, $6,
          '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, NULL, 'Soleado', NULL, 'Partido de demostración', $7, $7, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM "match_details" WHERE "matchId" = $1);
    `,
    [matchId, kickoff, matchDay, fieldId, homeCoachId, awayCoachId, createdBy]
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
    const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 10);

    const admins = [];
    const coaches = [];
    const players = [];
    const referees = [];
    const createdLeagueIds = [];
    const createdTeamIds = [];

    for (let i = 1; i <= 5; i++) {
      admins.push(
        await findOrCreateUser(client, {
          name: `Admin ${i}`,
          email: `admin${i}@geogoal.app`,
          role: 'admin',
          passwordHash,
        })
      );
    }

    for (let i = 1; i <= 8; i++) {
      coaches.push(
        await findOrCreateUser(client, {
          name: `Coach ${i}`,
          email: `coach${i}@geogoal.app`,
          role: 'coach',
          passwordHash,
        })
      );
    }

    for (let i = 1; i <= 12; i++) {
      players.push(
        await findOrCreateUser(client, {
          name: `Jugador ${i}`,
          email: `player${i}@geogoal.app`,
          role: 'player',
          passwordHash,
        })
      );
    }

    for (let i = 1; i <= 5; i++) {
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

      await ensureLeagueAdmin(client, {
        leagueId,
        userId: principalAdminId,
        leagueRole: 'principal',
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

      await addTeamMemberIfMissing(client, { teamId: teamAId, userId: playerA1Id });
      await addTeamMemberIfMissing(client, { teamId: teamAId, userId: playerA2Id });
      await addTeamMemberIfMissing(client, { teamId: teamBId, userId: playerB1Id });
      await addTeamMemberIfMissing(client, { teamId: teamBId, userId: playerB2Id });

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

      const futureMatchDate = new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000).toISOString();
      const futureMatchId = await findOrCreateMatch(client, {
        leagueId,
        seasonId,
        homeTeamId: teamAId,
        awayTeamId: teamBId,
        date: futureMatchDate,
        roundName: 'Jornada 1',
      });

      await ensureMatchDetail(client, {
        matchId: futureMatchId,
        fieldId,
        homeCoachId: coachAId,
        awayCoachId: coachBId,
        createdBy: principalAdminId,
        kickoffTime: futureMatchDate,
      });

      await ensureRefereeAssignment(client, {
        matchId: futureMatchId,
        leagueId,
        refereeUserId: refereeId,
        assignedBy: principalAdminId,
      });

      const pastMatchDate = new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000).toISOString();
      const playedMatchId = await findOrCreateMatch(client, {
        leagueId,
        seasonId,
        homeTeamId: teamBId,
        awayTeamId: teamAId,
        date: pastMatchDate,
        roundName: 'Jornada 0',
      });

      const homeScore = (i % 4) + 1;
      const awayScore = (i % 3) + 1;
      await client.query(
        `
        UPDATE "matches"
        SET "played" = true,
            "homeScore" = $2,
            "awayScore" = $3,
            "updatedAt" = NOW()
        WHERE id = $1;
        `,
        [playedMatchId, homeScore, awayScore]
      );

      await ensureMatchDetail(client, {
        matchId: playedMatchId,
        fieldId,
        homeCoachId: coachBId,
        awayCoachId: coachAId,
        createdBy: principalAdminId,
        kickoffTime: pastMatchDate,
      });

      await ensureRefereeAssignment(client, {
        matchId: playedMatchId,
        leagueId,
        refereeUserId: refereeId,
        assignedBy: principalAdminId,
      });

      await client.query(
        `
        UPDATE "match_referee_assignments"
        SET "status" = 'closed', "updatedAt" = NOW()
        WHERE "matchId" = $1;
        `,
        [playedMatchId]
      );

      await ensureMatchEvent(client, {
        matchId: playedMatchId,
        leagueId,
        teamId: teamAId,
        playerId: playerA1Id,
        eventType: 'goal',
        minute: 12,
        extraMinute: null,
        metadata: { assistBy: playerA2Id },
        recordedBy: refereeId,
      });

      await ensureMatchEvent(client, {
        matchId: playedMatchId,
        leagueId,
        teamId: teamBId,
        playerId: playerB1Id,
        eventType: 'goal',
        minute: 33,
        extraMinute: null,
        metadata: {},
        recordedBy: refereeId,
      });

      await ensureMatchEvent(client, {
        matchId: playedMatchId,
        leagueId,
        teamId: teamAId,
        playerId: playerA2Id,
        eventType: 'goal',
        minute: 78,
        extraMinute: null,
        metadata: {},
        recordedBy: refereeId,
      });

      await ensureMatchEvent(client, {
        matchId: playedMatchId,
        leagueId,
        teamId: teamBId,
        playerId: playerB2Id,
        eventType: 'yellow_card',
        minute: 81,
        extraMinute: null,
        metadata: { reason: 'foul' },
        recordedBy: refereeId,
      });

      await ensureMatchEvent(client, {
        matchId: playedMatchId,
        leagueId,
        teamId: teamAId,
        playerId: playerA1Id,
        eventType: 'red_card',
        minute: 88,
        extraMinute: null,
        metadata: { reason: 'last_man_foul' },
        recordedBy: refereeId,
      });

      const teamAPlayed = 1;
      const teamBPlayed = 1;
      const teamAGF = awayScore;
      const teamAGA = homeScore;
      const teamBGF = homeScore;
      const teamBGA = awayScore;
      const teamAWins = awayScore > homeScore ? 1 : 0;
      const teamALosses = awayScore < homeScore ? 1 : 0;
      const teamADraws = awayScore === homeScore ? 1 : 0;
      const teamBWins = homeScore > awayScore ? 1 : 0;
      const teamBLosses = homeScore < awayScore ? 1 : 0;
      const teamBDraws = homeScore === awayScore ? 1 : 0;
      const teamAPoints = teamAWins * 3 + teamADraws;
      const teamBPoints = teamBWins * 3 + teamBDraws;

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
        [teamAId, leagueId, seasonId, teamAPlayed, teamAWins, teamADraws, teamALosses, teamAPoints, teamAGF, teamAGA, teamAGF - teamAGA]
      );

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
        [teamBId, leagueId, seasonId, teamBPlayed, teamBWins, teamBDraws, teamBLosses, teamBPoints, teamBGF, teamBGA, teamBGF - teamBGA]
      );

      await ensureTrackingFrame(client, {
        matchId: playedMatchId,
        leagueId,
        timestampMs: 10000 + i,
        period: '1H',
        ballX: 11.2 + i * 0.1,
        ballY: 5.8 + i * 0.1,
        ballZ: 0.2,
        players: [
          { userId: playerA1Id, x: 12.1, y: 9.2, speed: 6.4 },
          { userId: playerB1Id, x: 18.5, y: 11.4, speed: 5.7 },
        ],
        recordedBy: refereeId,
      });

      await ensureTrackingFrame(client, {
        matchId: playedMatchId,
        leagueId,
        timestampMs: 20000 + i,
        period: '2H',
        ballX: 15.2 + i * 0.1,
        ballY: 8.1 + i * 0.1,
        ballZ: 0.1,
        players: [
          { userId: playerA2Id, x: 15.9, y: 9.9, speed: 7.1 },
          { userId: playerB2Id, x: 20.3, y: 14.0, speed: 6.2 },
        ],
        recordedBy: refereeId,
      });

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
        entityId: String(playedMatchId),
        action: 'update',
        beforeData: { played: false, homeScore: 0, awayScore: 0 },
        afterData: { played: true, homeScore, awayScore },
        reason: `Carga masiva demo liga ${i}`,
        ip: '127.0.0.1',
        userAgent: 'seed-script',
      });

      await ensureAuditLog(client, {
        actorUserId: principalAdminId,
        leagueId,
        seasonId,
        entityType: 'referee_assignment',
        entityId: String(playedMatchId),
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
        payload: { leagueId, seasonId, matchId: futureMatchId },
      });

      await ensureNotification(client, {
        userId: refereeId,
        type: 'referee_assignment',
        title: `Asignación arbitral liga ${i}`,
        message: `Tienes partidos asignados en la liga ${i}.`,
        payload: { leagueId, futureMatchId, playedMatchId },
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
    console.log(`Ligas generadas: ${TARGET_LEAGUES}`);
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
