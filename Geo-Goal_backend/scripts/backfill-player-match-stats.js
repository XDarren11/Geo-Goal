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
    await client.query('DELETE FROM "player_match_stats";');
    await client.query('DELETE FROM "team_match_stats";');

    const playedMatches = await client.query(
      `SELECT id FROM "matches" WHERE "played" = true ORDER BY id ASC;`
    );

    let processed = 0;

    for (const row of playedMatches.rows) {
      const matchId = Number(row.id);

      await client.query(
        `
        WITH base AS (
          SELECT
            msp."matchId",
            msp."teamId",
            msp."playerId",
            CASE WHEN msp."squadRole" = 'starter' THEN COALESCE(msp."minutesPlanned", 90) ELSE COALESCE(msp."minutesPlanned", 0) END::int AS "minutesPlayed"
          FROM "match_squad_players" msp
          WHERE msp."matchId" = $1
        ),
        ev AS (
          SELECT
            me."matchId",
            me."teamId",
            me."playerId",
            COUNT(*) FILTER (WHERE me."eventType" IN ('pass','key_pass'))::int AS passes,
            COUNT(*) FILTER (WHERE me."eventType" IN ('pass','key_pass') AND (COALESCE(me."outcome", '') IN ('complete','success') OR COALESCE((me."metadata"->>'completed')::boolean, false)))::int AS "passesCompleted",
            COUNT(*) FILTER (WHERE me."eventType" = 'key_pass' OR COALESCE((me."metadata"->>'isKeyPass')::boolean, false))::int AS "keyPasses",
            COUNT(*) FILTER (WHERE me."eventType" IN ('shot','goal','penalty_scored'))::int AS shots,
            COUNT(*) FILTER (WHERE me."eventType" = 'shot' AND COALESCE(me."outcome", '') IN ('on_target','goal','saved'))::int AS "shotsOnTarget",
            COUNT(*) FILTER (WHERE me."eventType" IN ('goal','penalty_scored'))::int AS goals,
            COUNT(*) FILTER (WHERE me."eventType" = 'yellow_card')::int AS "yellowCards",
            COUNT(*) FILTER (WHERE me."eventType" = 'red_card')::int AS "redCards"
          FROM "match_events" me
          WHERE me."matchId" = $1
            AND me."teamId" IS NOT NULL
            AND me."playerId" IS NOT NULL
          GROUP BY me."matchId", me."teamId", me."playerId"
        ),
        asis AS (
          SELECT
            me."matchId",
            me."teamId",
            COALESCE((me."metadata"->>'assistPlayerId')::int, me."relatedPlayerId") AS "playerId",
            COUNT(*)::int AS assists
          FROM "match_events" me
          WHERE me."matchId" = $1
            AND me."eventType" IN ('goal','penalty_scored')
            AND COALESCE((me."metadata"->>'assistPlayerId')::int, me."relatedPlayerId") IS NOT NULL
            AND me."teamId" IS NOT NULL
          GROUP BY me."matchId", me."teamId", COALESCE((me."metadata"->>'assistPlayerId')::int, me."relatedPlayerId")
        )
        INSERT INTO "player_match_stats" (
          "matchId", "teamId", "playerId", "minutesPlayed", "passes", "passesCompleted", "keyPasses",
          "shots", "shotsOnTarget", "goals", "assists", "yellowCards", "redCards", "distanceMeters", "rating", "createdAt", "updatedAt"
        )
        SELECT
          b."matchId",
          b."teamId",
          b."playerId",
          b."minutesPlayed",
          COALESCE(ev.passes, 0),
          COALESCE(ev."passesCompleted", 0),
          COALESCE(ev."keyPasses", 0),
          COALESCE(ev.shots, 0),
          COALESCE(ev."shotsOnTarget", 0),
          COALESCE(ev.goals, 0),
          COALESCE(asis.assists, 0),
          COALESCE(ev."yellowCards", 0),
          COALESCE(ev."redCards", 0),
          0,
          GREATEST(0, LEAST(10,
            5 + COALESCE(ev.goals, 0) * 1.8 + COALESCE(asis.assists, 0) * 1.2 + COALESCE(ev."keyPasses", 0) * 0.5 + COALESCE(ev."shotsOnTarget", 0) * 0.35
            - COALESCE(ev."yellowCards", 0) * 0.45 - COALESCE(ev."redCards", 0) * 1.6
          ))::float,
          NOW(),
          NOW()
        FROM base b
        LEFT JOIN ev ON ev."matchId" = b."matchId" AND ev."teamId" = b."teamId" AND ev."playerId" = b."playerId"
        LEFT JOIN asis ON asis."matchId" = b."matchId" AND asis."teamId" = b."teamId" AND asis."playerId" = b."playerId"
        ON CONFLICT ("matchId", "teamId", "playerId") DO UPDATE
        SET
          "minutesPlayed" = EXCLUDED."minutesPlayed",
          "passes" = EXCLUDED."passes",
          "passesCompleted" = EXCLUDED."passesCompleted",
          "keyPasses" = EXCLUDED."keyPasses",
          "shots" = EXCLUDED."shots",
          "shotsOnTarget" = EXCLUDED."shotsOnTarget",
          "goals" = EXCLUDED."goals",
          "assists" = EXCLUDED."assists",
          "yellowCards" = EXCLUDED."yellowCards",
          "redCards" = EXCLUDED."redCards",
          "distanceMeters" = EXCLUDED."distanceMeters",
          "rating" = EXCLUDED."rating",
          "updatedAt" = NOW();
        `,
        [matchId]
      );

      await client.query(
        `
        INSERT INTO "team_match_stats" (
          "matchId", "teamId", "minutesPlayed", "passes", "passesCompleted", "keyPasses",
          "shots", "shotsOnTarget", "goals", "assists", "yellowCards", "redCards",
          "distanceMeters", "avgRating", "createdAt", "updatedAt"
        )
        SELECT
          pms."matchId",
          pms."teamId",
          COALESCE(SUM(pms."minutesPlayed"), 0)::int,
          COALESCE(SUM(pms."passes"), 0)::int,
          COALESCE(SUM(pms."passesCompleted"), 0)::int,
          COALESCE(SUM(pms."keyPasses"), 0)::int,
          COALESCE(SUM(pms."shots"), 0)::int,
          COALESCE(SUM(pms."shotsOnTarget"), 0)::int,
          COALESCE(SUM(pms."goals"), 0)::int,
          COALESCE(SUM(pms."assists"), 0)::int,
          COALESCE(SUM(pms."yellowCards"), 0)::int,
          COALESCE(SUM(pms."redCards"), 0)::int,
          COALESCE(SUM(pms."distanceMeters"), 0)::float,
          COALESCE(AVG(pms."rating"), 0)::float,
          NOW(),
          NOW()
        FROM "player_match_stats" pms
        WHERE pms."matchId" = $1
        GROUP BY pms."matchId", pms."teamId"
        ON CONFLICT ("matchId", "teamId") DO UPDATE
        SET
          "minutesPlayed" = EXCLUDED."minutesPlayed",
          "passes" = EXCLUDED."passes",
          "passesCompleted" = EXCLUDED."passesCompleted",
          "keyPasses" = EXCLUDED."keyPasses",
          "shots" = EXCLUDED."shots",
          "shotsOnTarget" = EXCLUDED."shotsOnTarget",
          "goals" = EXCLUDED."goals",
          "assists" = EXCLUDED."assists",
          "yellowCards" = EXCLUDED."yellowCards",
          "redCards" = EXCLUDED."redCards",
          "distanceMeters" = EXCLUDED."distanceMeters",
          "avgRating" = EXCLUDED."avgRating",
          "updatedAt" = NOW();
        `,
        [matchId]
      );

      processed += 1;
    }

    await client.query('COMMIT');

    console.log('✅ Backfill player_match_stats completado');
    console.log('matches_processed:', processed);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }

  process.exit(0);
}

run().catch((error) => {
  console.error('❌ Error backfill player_match_stats:', error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});
