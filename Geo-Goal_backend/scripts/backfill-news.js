require('dotenv').config();
const { Client } = require('pg');

function seasonStatusLabel(status) {
  if (status === 'active') return 'se encuentra en plena competencia';
  if (status === 'finished') return 'ha concluido oficialmente';
  if (status === 'draft') return 'está en fase de planificación';
  if (status === 'archived') return 'ya fue archivada';
  return 'se mantiene disponible';
}

function matchCopy(match) {
  const home = match.homeName || 'Local';
  const away = match.awayName || 'Visitante';

  if (!match.played) {
    return {
      title: `Previa ${match.roundName}: ${home} vs ${away}`,
      summary: `${home} y ${away} afinan detalles para su cruce en ${match.roundName}. Ambos llegan con la mira puesta en sumar puntos clave.`,
    };
  }

  const homeScore = Number(match.homeScore || 0);
  const awayScore = Number(match.awayScore || 0);

  if (homeScore === awayScore) {
    return {
      title: `Crónica ${match.roundName}: empate entre ${home} y ${away}`,
      summary: `${home} y ${away} firmaron un ${homeScore}-${awayScore} en un duelo cerrado. El punto mantiene viva la pelea en la tabla.`,
    };
  }

  const winner = homeScore > awayScore ? home : away;
  const loser = homeScore > awayScore ? away : home;
  return {
    title: `Crónica ${match.roundName}: ${winner} se impone ${homeScore}-${awayScore}`,
    summary: `${winner} derrotó a ${loser} por ${homeScore}-${awayScore} y se lleva tres puntos de alto impacto para la clasificación.`,
  };
}

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    const leagues = await client.query(
      `SELECT id, name, description FROM "leagues" WHERE "deletedAt" IS NULL ORDER BY id ASC;`
    );

    let total = 0;

    for (const league of leagues.rows) {
      const leagueId = Number(league.id);

      await client.query(
        `
        INSERT INTO "news" (
          "leagueId", "seasonId", "matchId", "title", "summary", "type", "isPublished", "source", "payload", "createdAt", "updatedAt"
        )
        VALUES ($1, NULL, NULL, $2, $3, 'league', true, $4, $5::jsonb, NOW(), NOW())
        ON CONFLICT ("source") DO UPDATE
          SET "title" = EXCLUDED."title",
              "summary" = EXCLUDED."summary",
              "payload" = EXCLUDED."payload",
              "updatedAt" = NOW();
        `,
        [
          leagueId,
          `Radar de liga: ${league.name} entra en escena`,
          league.description || `${league.name} continúa su actividad competitiva con movimientos recientes en calendario, tabla y rendimiento de equipos.`,
          `league:${leagueId}`,
          JSON.stringify({ leagueId }),
        ]
      );
      total += 1;

      const season = await client.query(
        `
        SELECT id, name, year, status
        FROM "seasons"
        WHERE "leagueId" = $1
        ORDER BY "isCurrent" DESC, "updatedAt" DESC, id DESC
        LIMIT 1;
        `,
        [leagueId]
      );

      if (season.rowCount) {
        const s = season.rows[0];
        await client.query(
          `
          INSERT INTO "news" (
            "leagueId", "seasonId", "matchId", "title", "summary", "type", "isPublished", "source", "payload", "createdAt", "updatedAt"
          )
          VALUES ($1, $2, NULL, $3, $4, 'season', true, $5, $6::jsonb, NOW(), NOW())
          ON CONFLICT ("source") DO UPDATE
            SET "title" = EXCLUDED."title",
                "summary" = EXCLUDED."summary",
                "payload" = EXCLUDED."payload",
                "updatedAt" = NOW();
          `,
          [
            leagueId,
            Number(s.id),
            `Boletín de temporada: ${s.name} (${s.year})`,
            `${league.name}: la temporada ${s.name} ${seasonStatusLabel(s.status)}. Se esperan nuevas historias jornada a jornada.`,
            `season:${s.id}`,
            JSON.stringify({ leagueId, seasonId: Number(s.id), status: s.status }),
          ]
        );
        total += 1;
      }

      const matches = await client.query(
        `
        SELECT m.id, m."roundName", m."played", m."homeScore", m."awayScore", ht.name AS "homeName", at.name AS "awayName"
        FROM "matches" m
        JOIN "teams" ht ON ht.id = m."homeTeamId"
        JOIN "teams" at ON at.id = m."awayTeamId"
        WHERE m."leagueId" = $1
        ORDER BY m."updatedAt" DESC, m.id DESC
        LIMIT 20;
        `,
        [leagueId]
      );

      for (const m of matches.rows) {
        const copy = matchCopy(m);
        await client.query(
          `
          INSERT INTO "news" (
            "leagueId", "seasonId", "matchId", "title", "summary", "type", "isPublished", "source", "payload", "createdAt", "updatedAt"
          )
          VALUES ($1, NULL, $2, $3, $4, 'match', true, $5, $6::jsonb, NOW(), NOW())
          ON CONFLICT ("source") DO UPDATE
            SET "title" = EXCLUDED."title",
                "summary" = EXCLUDED."summary",
                "payload" = EXCLUDED."payload",
                "updatedAt" = NOW();
          `,
          [
            leagueId,
            Number(m.id),
            copy.title,
            copy.summary,
            `match:${m.id}`,
            JSON.stringify({
              leagueId,
              matchId: Number(m.id),
              played: Boolean(m.played),
              homeScore: Number(m.homeScore || 0),
              awayScore: Number(m.awayScore || 0),
            }),
          ]
        );
        total += 1;
      }
    }

    await client.query('COMMIT');
    console.log('✅ Backfill de noticias completado');
    console.log('rows_upsert_intent:', total);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error('❌ Error backfill noticias:', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});
