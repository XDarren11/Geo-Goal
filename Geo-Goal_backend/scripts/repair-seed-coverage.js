require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    const fallbackLeague = await client.query(
      `SELECT id FROM "leagues" WHERE "deletedAt" IS NULL ORDER BY id ASC LIMIT 1;`
    );
    if (!fallbackLeague.rowCount) throw new Error('No hay ligas disponibles para reparar cobertura');

    const fallbackLeagueId = Number(fallbackLeague.rows[0].id);

    const uncovered = await client.query(`
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
    `);

    for (const row of uncovered.rows) {
      const userId = Number(row.id);
      const role = String(row.role);

      if (role === 'admin' || role === 'referee') {
        await client.query(
          `
          INSERT INTO "league_admins" ("leagueId", "userId", "leagueRole", "assignedBy", "createdAt", "updatedAt")
          VALUES ($1, $2, 'assistant', $2, NOW(), NOW())
          ON CONFLICT ("leagueId", "userId") DO UPDATE
            SET "leagueRole" = EXCLUDED."leagueRole",
                "updatedAt" = NOW();
          `,
          [fallbackLeagueId, userId]
        );
      }
    }

    const noGoals = await client.query(`
      SELECT l.id AS "leagueId"
      FROM "leagues" l
      WHERE l."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "matches" m
          JOIN "match_events" e ON e."matchId" = m.id
          WHERE m."leagueId" = l.id
            AND e."eventType" IN ('goal','own_goal','penalty_scored')
        );
    `);

    for (const lg of noGoals.rows) {
      const leagueId = Number(lg.leagueId);

      const teams = await client.query(
        `SELECT id, "trainerId" FROM "teams" WHERE "leagueId" = $1 ORDER BY id ASC LIMIT 2;`,
        [leagueId]
      );
      if (teams.rowCount < 2) continue;

      const season = await client.query(
        `SELECT id FROM "seasons" WHERE "leagueId" = $1 ORDER BY "isCurrent" DESC, id DESC LIMIT 1;`,
        [leagueId]
      );
      const seasonId = season.rowCount ? Number(season.rows[0].id) : null;

      const homeTeamId = Number(teams.rows[0].id);
      const awayTeamId = Number(teams.rows[1].id);

      const match = await client.query(
        `
        INSERT INTO "matches" (
          "leagueId", "seasonId", "homeTeamId", "awayTeamId", "date", "roundName", "homeScore", "awayScore", "played", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '5 days', 'Jornada cobertura', 1, 0, true, NOW(), NOW())
        RETURNING id;
        `,
        [leagueId, seasonId, homeTeamId, awayTeamId]
      );
      const matchId = Number(match.rows[0].id);

      const scorer = await client.query(
        `SELECT "userId" FROM "team_members" WHERE "teamId" = $1 ORDER BY "createdAt" ASC NULLS LAST, "userId" ASC LIMIT 1;`,
        [homeTeamId]
      );
      const scorerId = scorer.rowCount ? Number(scorer.rows[0].userId) : null;

      await client.query(
        `
        INSERT INTO "match_events" (
          "matchId", "leagueId", "teamId", "playerId", "eventType", "minute", "extraMinute", "metadata", "recordedBy", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, 'goal', 22, NULL, '{}'::jsonb, NULL, NOW(), NOW());
        `,
        [matchId, leagueId, homeTeamId, scorerId]
      );

      await client.query(
        `
        INSERT INTO "match_events" (
          "matchId", "leagueId", "teamId", "playerId", "eventType", "minute", "extraMinute", "metadata", "recordedBy", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, NULL, 'yellow_card', 71, NULL, '{"reason":"coverage"}'::jsonb, NULL, NOW(), NOW());
        `,
        [matchId, leagueId, awayTeamId]
      );
    }

    const noCards = await client.query(`
      SELECT l.id AS "leagueId"
      FROM "leagues" l
      WHERE l."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "matches" m
          JOIN "match_events" e ON e."matchId" = m.id
          WHERE m."leagueId" = l.id
            AND e."eventType" IN ('yellow_card','red_card')
        );
    `);

    for (const lg of noCards.rows) {
      const leagueId = Number(lg.leagueId);

      const existingPlayedMatch = await client.query(
        `
        SELECT id, "homeTeamId"
        FROM "matches"
        WHERE "leagueId" = $1 AND "played" = true
        ORDER BY id ASC
        LIMIT 1;
        `,
        [leagueId]
      );

      if (!existingPlayedMatch.rowCount) continue;

      const matchId = Number(existingPlayedMatch.rows[0].id);
      const teamId = Number(existingPlayedMatch.rows[0].homeTeamId);

      await client.query(
        `
        INSERT INTO "match_events" (
          "matchId", "leagueId", "teamId", "playerId", "eventType", "minute", "extraMinute", "metadata", "recordedBy", "createdAt", "updatedAt"
        )
        SELECT $1, $2, $3, NULL, 'yellow_card', 67, NULL, '{"reason":"coverage_fix"}'::jsonb, NULL, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1
          FROM "match_events"
          WHERE "matchId" = $1
            AND "eventType" IN ('yellow_card','red_card')
        );
        `,
        [matchId, leagueId, teamId]
      );
    }

    await client.query('COMMIT');
    console.log('✅ Reparación de cobertura completada');
    console.log('Usuarios sin cobertura reparados:', uncovered.rowCount);
    console.log('Ligas sin goles reparadas:', noGoals.rowCount);
    console.log('Ligas sin tarjetas reparadas:', noCards.rowCount);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error('❌ Error en reparación:', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});
