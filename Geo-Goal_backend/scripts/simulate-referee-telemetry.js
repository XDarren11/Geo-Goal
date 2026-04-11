require('dotenv').config();
const { Client } = require('pg');

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function clampCoord(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Number(value.toFixed(3));
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[randomInt(0, arr.length - 1)];
}

async function insertEvent(client, payload) {
  const {
    matchId,
    leagueId,
    teamId,
    playerId,
    relatedPlayerId = null,
    eventType,
    minute,
    extraMinute = null,
    matchTimestampSec,
    xStart = null,
    yStart = null,
    xEnd = null,
    yEnd = null,
    outcome = null,
    source = 'simulated',
    confidence = 0.9,
    metadata = {},
    recordedBy = null,
  } = payload;

  await client.query(
    `
    INSERT INTO "match_events" (
      "matchId", "leagueId", "teamId", "playerId", "relatedPlayerId", "eventType",
      "minute", "extraMinute", "matchTimestampSec", "xStart", "yStart", "xEnd", "yEnd",
      "outcome", "source", "confidence", "metadata", "recordedBy", "createdAt", "updatedAt"
    )
    SELECT
      $1::int, $2::int, $3::int, $4::int, $5::int, $6::varchar,
      $7::int, $8::int, $9::int, $10::float, $11::float, $12::float, $13::float,
      $14::varchar, $15::varchar, $16::float, $17::jsonb, $18::int, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1
      FROM "match_events"
      WHERE "matchId" = $1::int
        AND "eventType" = $6::varchar
        AND COALESCE("playerId", -1) = COALESCE($4::int, -1)
        AND COALESCE("relatedPlayerId", -1) = COALESCE($5::int, -1)
        AND COALESCE("matchTimestampSec", -1) = COALESCE($9::int, -1)
    );
    `,
    [
      matchId,
      leagueId,
      teamId,
      playerId,
      relatedPlayerId,
      eventType,
      minute,
      extraMinute,
      matchTimestampSec,
      xStart,
      yStart,
      xEnd,
      yEnd,
      outcome,
      source,
      Math.max(0, Math.min(1, Number(confidence))),
      JSON.stringify(metadata),
      recordedBy,
    ]
  );
}

async function insertTracking(client, payload) {
  const {
    matchId,
    leagueId,
    timestampMs,
    period,
    ballX,
    ballY,
    ballZ,
    players,
    source = 'simulated',
    confidence = 0.9,
    recordedBy = null,
  } = payload;

  await client.query(
    `
    INSERT INTO "match_tracking_frames" (
      "matchId", "leagueId", "timestampMs", "period", "ballX", "ballY", "ballZ", "players",
      "source", "confidence", "recordedBy", "createdAt", "updatedAt"
    )
    SELECT $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM "match_tracking_frames" WHERE "matchId" = $1 AND "timestampMs" = $3
    );
    `,
    [
      matchId,
      leagueId,
      timestampMs,
      period,
      ballX,
      ballY,
      ballZ,
      JSON.stringify(players ?? []),
      source,
      Math.max(0, Math.min(1, Number(confidence))),
      recordedBy,
    ]
  );
}

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    const limit = Number(process.env.SIM_TELEMETRY_MATCH_LIMIT || 0);

    const matchesRes = await client.query(
      `
      SELECT m.id, m."leagueId", m."homeTeamId", m."awayTeamId",
             mra."refereeUserId",
             l."managerId"
      FROM "matches" m
      JOIN "leagues" l ON l.id = m."leagueId"
      LEFT JOIN "match_referee_assignments" mra ON mra."matchId" = m.id
      WHERE m.played = true
      ORDER BY m.id ASC
      ${limit > 0 ? 'LIMIT ' + Number(limit) : ''};
      `
    );

    let matchesProcessed = 0;

    for (const match of matchesRes.rows) {
      const matchId = Number(match.id);
      const leagueId = Number(match.leagueId);
      const homeTeamId = Number(match.homeTeamId);
      const awayTeamId = Number(match.awayTeamId);
      const recordedBy = Number(match.refereeUserId || match.managerId || 0) || null;

      const squadRes = await client.query(
        `
        SELECT "teamId", "playerId", "squadRole"
        FROM "match_squad_players"
        WHERE "matchId" = $1
          AND "teamId" IN ($2, $3)
        ORDER BY CASE WHEN "squadRole" = 'starter' THEN 0 ELSE 1 END, "playerId" ASC;
        `,
        [matchId, homeTeamId, awayTeamId]
      );

      const homePlayers = squadRes.rows.filter((r) => Number(r.teamId) === homeTeamId).slice(0, 9).map((r) => Number(r.playerId));
      const awayPlayers = squadRes.rows.filter((r) => Number(r.teamId) === awayTeamId).slice(0, 9).map((r) => Number(r.playerId));

      if (!homePlayers.length || !awayPlayers.length) continue;

      for (let i = 0; i < 14; i++) {
        const fromHome = pickRandom(homePlayers);
        const toHome = pickRandom(homePlayers.filter((p) => p !== fromHome));
        if (fromHome && toHome) {
          const minute = randomInt(2, 88);
          const completed = Math.random() > 0.18;
          await insertEvent(client, {
            matchId,
            leagueId,
            teamId: homeTeamId,
            playerId: fromHome,
            relatedPlayerId: completed ? toHome : null,
            eventType: Math.random() > 0.86 ? 'key_pass' : 'pass',
            minute,
            matchTimestampSec: minute * 60 + randomInt(0, 59),
            xStart: clampCoord(randomBetween(8, 92)),
            yStart: clampCoord(randomBetween(5, 95)),
            xEnd: clampCoord(randomBetween(10, 98)),
            yEnd: clampCoord(randomBetween(5, 95)),
            outcome: completed ? 'complete' : 'incomplete',
            source: 'simulated',
            confidence: randomBetween(0.62, 0.95),
            metadata: { completed, origin: 'simulate_referee_telemetry' },
            recordedBy,
          });
        }

        const fromAway = pickRandom(awayPlayers);
        const toAway = pickRandom(awayPlayers.filter((p) => p !== fromAway));
        if (fromAway && toAway) {
          const minute = randomInt(2, 88);
          const completed = Math.random() > 0.2;
          await insertEvent(client, {
            matchId,
            leagueId,
            teamId: awayTeamId,
            playerId: fromAway,
            relatedPlayerId: completed ? toAway : null,
            eventType: Math.random() > 0.88 ? 'key_pass' : 'pass',
            minute,
            matchTimestampSec: minute * 60 + randomInt(0, 59),
            xStart: clampCoord(randomBetween(8, 92)),
            yStart: clampCoord(randomBetween(5, 95)),
            xEnd: clampCoord(randomBetween(10, 98)),
            yEnd: clampCoord(randomBetween(5, 95)),
            outcome: completed ? 'complete' : 'incomplete',
            source: 'simulated',
            confidence: randomBetween(0.62, 0.95),
            metadata: { completed, origin: 'simulate_referee_telemetry' },
            recordedBy,
          });
        }
      }

      for (let i = 0; i < 3; i++) {
        const hs = pickRandom(homePlayers);
        const as = pickRandom(awayPlayers);
        const minuteH = randomInt(8, 89);
        const minuteA = randomInt(8, 89);
        if (hs) {
          await insertEvent(client, {
            matchId,
            leagueId,
            teamId: homeTeamId,
            playerId: hs,
            eventType: 'shot',
            minute: minuteH,
            matchTimestampSec: minuteH * 60 + randomInt(0, 59),
            xStart: clampCoord(randomBetween(60, 100)),
            yStart: clampCoord(randomBetween(20, 80)),
            xEnd: 100,
            yEnd: 50,
            outcome: Math.random() > 0.45 ? 'on_target' : 'off_target',
            source: 'simulated',
            confidence: randomBetween(0.7, 0.96),
            metadata: { origin: 'simulate_referee_telemetry' },
            recordedBy,
          });
        }
        if (as) {
          await insertEvent(client, {
            matchId,
            leagueId,
            teamId: awayTeamId,
            playerId: as,
            eventType: 'shot',
            minute: minuteA,
            matchTimestampSec: minuteA * 60 + randomInt(0, 59),
            xStart: clampCoord(randomBetween(60, 100)),
            yStart: clampCoord(randomBetween(20, 80)),
            xEnd: 100,
            yEnd: 50,
            outcome: Math.random() > 0.47 ? 'on_target' : 'off_target',
            source: 'simulated',
            confidence: randomBetween(0.7, 0.96),
            metadata: { origin: 'simulate_referee_telemetry' },
            recordedBy,
          });
        }
      }

      for (let frame = 0; frame < 8; frame++) {
        const playersFrame = [
          ...homePlayers.slice(0, 7).map((p, idx) => ({
            userId: p,
            teamId: homeTeamId,
            x: clampCoord(14 + idx * 8 + frame * 1.3 + randomBetween(-2, 2)),
            y: clampCoord(8 + idx * 6 + randomBetween(-3, 3)),
            speed: Number(randomBetween(3.2, 8.5).toFixed(2)),
          })),
          ...awayPlayers.slice(0, 7).map((p, idx) => ({
            userId: p,
            teamId: awayTeamId,
            x: clampCoord(86 - idx * 8 - frame * 1.1 + randomBetween(-2, 2)),
            y: clampCoord(90 - idx * 6 + randomBetween(-3, 3)),
            speed: Number(randomBetween(3.1, 8.2).toFixed(2)),
          })),
        ];

        await insertTracking(client, {
          matchId,
          leagueId,
          timestampMs: 30000 + frame * 7000 + matchId,
          period: frame < 4 ? '1H' : '2H',
          ballX: clampCoord(10 + frame * 9 + randomBetween(-2, 2)),
          ballY: clampCoord(18 + ((frame * 9) % 55)),
          ballZ: Number(randomBetween(0, 1.3).toFixed(2)),
          players: playersFrame,
          source: 'simulated',
          confidence: Number(randomBetween(0.72, 0.97).toFixed(3)),
          recordedBy,
        });
      }

      matchesProcessed += 1;
    }

    await client.query('COMMIT');

    console.log('✅ Simulación de datos arbitrales completada');
    console.log('matches_processed:', matchesProcessed);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('❌ Error simulando datos arbitrales:', error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});
