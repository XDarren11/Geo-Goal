require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();

  const uncovered = await c.query(`
    SELECT u.id, u.email, u.role
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
    )
    ORDER BY u.id;
  `);

  const noGoals = await c.query(`
    SELECT COUNT(*)::int AS c
    FROM "leagues" l
    WHERE NOT EXISTS (
      SELECT 1
      FROM "matches" m
      JOIN "match_events" e ON e."matchId" = m.id
      WHERE m."leagueId" = l.id
        AND e."eventType" IN ('goal','own_goal','penalty_scored')
    );
  `);

  const noCards = await c.query(`
    SELECT COUNT(*)::int AS c
    FROM "leagues" l
    WHERE NOT EXISTS (
      SELECT 1
      FROM "matches" m
      JOIN "match_events" e ON e."matchId" = m.id
      WHERE m."leagueId" = l.id
        AND e."eventType" IN ('yellow_card','red_card')
    );
  `);

  const nonZeroStats = await c.query(`
    SELECT COUNT(*)::int AS c
    FROM "team_league_stats"
    WHERE "goalsFor" > 0 OR "goalsAgainst" > 0;
  `);

  console.log('users_without_league_relation:', uncovered.rows.length);
  console.log('leagues_without_goal_events:', noGoals.rows[0].c);
  console.log('leagues_without_card_events:', noCards.rows[0].c);
  console.log('team_league_stats_non_zero_goals:', nonZeroStats.rows[0].c);

  if (uncovered.rows.length) console.log('sample_uncovered:', uncovered.rows.slice(0, 10));

  await c.end();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
