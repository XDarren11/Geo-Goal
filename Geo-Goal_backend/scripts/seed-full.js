/**
 * seed-full.js — Seed masivo completo
 * - H2H: crea partidos adicionales entre pares de equipos
 * - match_tracking_frames: frames sintéticos con jugadores y balón
 * - match_squad_players: alineaciones para todos los partidos
 * - match_analytics_cache: caché de analytics por partido
 */

require("dotenv").config();
const { Sequelize, QueryTypes } = require("sequelize");

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
});

const rnd    = (a, b) => Math.random() * (b - a) + a;
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
const pick   = (arr)  => arr[rndInt(0, arr.length - 1)];

// ─── helpers ─────────────────────────────────────────────────────────────────

function makePlayerPos(trackerId, team, x, y) {
  return { trackerId, team, x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)), speed: parseFloat(rnd(0,8).toFixed(2)) };
}

function generateFrames(matchId, leagueId, members, homePlayers, awayPlayers, numFrames = 200) {
  const rows = [];
  const FPS_GAP = 200; // ms entre frames (~5fps)
  let ballX = 52.5, ballY = 34.0;

  for (let f = 0; f < numFrames; f++) {
    const ts = f * FPS_GAP;
    // El balón se mueve aleatoriamente por el campo
    ballX = Math.max(0, Math.min(100, ballX + rnd(-5, 5)));
    ballY = Math.max(0, Math.min(100, ballY + rnd(-3, 3)));

    // Jugadores dispersos alrededor del balón (equipo home a la izquierda, away a la derecha)
    const players = [
      ...homePlayers.slice(0, 11).map((uid, i) => makePlayerPos(
        uid, "home",
        Math.max(0, Math.min(100, ballX - 30 + rnd(-15, 15))),
        Math.max(0, Math.min(100, (i / 11) * 100 + rnd(-5, 5)))
      )),
      ...awayPlayers.slice(0, 11).map((uid, i) => makePlayerPos(
        uid, "away",
        Math.max(0, Math.min(100, ballX + 30 + rnd(-15, 15))),
        Math.max(0, Math.min(100, (i / 11) * 100 + rnd(-5, 5)))
      )),
    ];

    rows.push({
      matchId, leagueId, ts,
      ballX: parseFloat(ballX.toFixed(2)),
      ballY: parseFloat(ballY.toFixed(2)),
      players: JSON.stringify(players),
    });
  }
  return rows;
}

async function main() {
  await db.authenticate();
  console.log("✅ DB conectada\n");

  // Cargar datos base
  const leagues  = await db.query("SELECT id FROM leagues", { type: QueryTypes.SELECT });
  const teams    = await db.query("SELECT id FROM teams ORDER BY id", { type: QueryTypes.SELECT });
  const members  = await db.query('SELECT "teamId","userId" FROM team_members', { type: QueryTypes.SELECT });
  const allMatches = await db.query(
    `SELECT id,"homeTeamId","awayTeamId","leagueId","seasonId" FROM matches WHERE played=true AND "leagueId" IS NOT NULL ORDER BY id`,
    { type: QueryTypes.SELECT }
  );
  const seasons  = await db.query('SELECT id,"leagueId" FROM seasons LIMIT 20', { type: QueryTypes.SELECT });

  const tp = {}; // teamId → [userId]
  for (const m of members) {
    if (!tp[m.teamId]) tp[m.teamId] = [];
    tp[m.teamId].push(m.userId);
  }
  const fallback = Object.values(tp).flat().slice(0, 22);
  const teamIds  = teams.map(t => t.id);
  const leagueIds = leagues.map(l => l.id);

  console.log(`Equipos: ${teams.length} | Partidos jugados: ${allMatches.length} | Seasons: ${seasons.length}`);

  // ── 1. H2H: crear más partidos entre pares para ligas con temporada ────────
  console.log("\n⚽ Creando partidos H2H adicionales...");
  let h2hCreated = 0;

  // Para cada liga con temporada, asegúrate de que cada par de equipos tenga ≥3 partidos
  for (const lg of leagues.slice(0, 20)) {
    const lgMatches = allMatches.filter(m => m.leagueId === lg.id);
    if (!lgMatches.length) continue;

    // Identificar equipos en esta liga
    const lgTeamSet = new Set();
    for (const m of lgMatches) { lgTeamSet.add(m.homeTeamId); lgTeamSet.add(m.awayTeamId); }
    const lgTeams = [...lgTeamSet];
    if (lgTeams.length < 2) continue;

    const lgSeason = seasons.find(s => s.leagueId === lg.id);
    if (!lgSeason) continue;

    // Contar partidos por par
    const pairCount = {};
    for (const m of lgMatches) {
      const key = [m.homeTeamId, m.awayTeamId].sort().join("-");
      pairCount[key] = (pairCount[key] || 0) + 1;
    }

    // Agregar partidos hasta que cada par tenga ≥ 4 enfrentamientos
    for (let i = 0; i < lgTeams.length; i++) {
      for (let j = i + 1; j < lgTeams.length; j++) {
        const a = lgTeams[i], b = lgTeams[j];
        const key = [a, b].sort().join("-");
        const existing = pairCount[key] || 0;
        const toCreate = Math.max(0, 4 - existing);

        for (let k = 0; k < toCreate; k++) {
          const hg = rndInt(0, 4), ag = rndInt(0, 4);
          const daysAgo = rndInt(15, 365);
        const ROUNDS = ["Jornada 1","Jornada 2","Jornada 3","Jornada 4","Jornada 5","Semifinal","Final"];
        await db.query(`
            INSERT INTO matches ("homeTeamId","awayTeamId","leagueId","seasonId","played","homeScore","awayScore","date","roundName","type","createdAt","updatedAt")
            VALUES (:ha,:aw,:lg,:sid,true,:hg,:ag,NOW()-MAKE_INTERVAL(days=>:d),:rn,'league',NOW(),NOW())
          `, {
            replacements: { ha: a, aw: b, lg: lg.id, sid: lgSeason.id, hg, ag, d: daysAgo, rn: pick(ROUNDS) },
            type: QueryTypes.INSERT,
          });
          h2hCreated++;
        }
      }
    }
  }
  console.log(`   ✅ ${h2hCreated} partidos H2H creados`);

  // ── 2. match_squad_players para todos los partidos sin alineación ──────────
  console.log("\n👥 Rellenando match_squad_players...");
  const matchesNeedingSquad = await db.query(
    `SELECT m.id, m."homeTeamId", m."awayTeamId" FROM matches m
     WHERE played=true AND NOT EXISTS (SELECT 1 FROM match_squad_players s WHERE s."matchId"=m.id)
     LIMIT 600`,
    { type: QueryTypes.SELECT }
  );

  const ROLES     = ["starter","starter","starter","starter","starter","starter","starter","starter","starter","starter","starter","bench","bench","bench","bench"];
  const POSITIONS = ["GK","DEF","DEF","DEF","MID","MID","MID","MID","ATT","ATT","ATT","bench","bench","bench","bench"];
  const squadBulk = [];

  for (const m of matchesNeedingSquad) {
    const hp = (tp[m.homeTeamId] || fallback.slice(0,11)).slice(0,11);
    const ap = (tp[m.awayTeamId] || fallback.slice(11,22)).slice(0,11);
    [...hp.map((u,i)=>({u,t:m.homeTeamId,i})),...ap.map((u,i)=>({u,t:m.awayTeamId,i}))].forEach(({u,t,i}) => {
      squadBulk.push([m.id, t, u, `'${ROLES[i]||"bench"}'`, "true", i+1, `'${POSITIONS[i]||"MID"}'`, "NOW()", "NOW()"]);
    });
  }

  const SQ_CHUNK = 500;
  let squadInserted = 0;
  for (let i = 0; i < squadBulk.length; i += SQ_CHUNK) {
    const chunk = squadBulk.slice(i, i + SQ_CHUNK);
    const vals = chunk.map(r => `(${r.join(",")})`).join(",");
    await db.query(
      `INSERT INTO match_squad_players ("matchId","teamId","playerId","squadRole","isAvailable","jerseyNumber","position","createdAt","updatedAt") VALUES ${vals} ON CONFLICT DO NOTHING`,
      { type: QueryTypes.INSERT }
    );
    squadInserted += chunk.length;
    process.stdout.write(`\r   ${squadInserted}/${squadBulk.length} squad_players`);
  }
  console.log(`\n   ✅ ${squadInserted} match_squad_players insertados`);

  // ── 3. match_tracking_frames — generar frames para partidos sin tracking ───
  console.log("\n📡 Generando match_tracking_frames...");

  const matchesNeedingFrames = await db.query(
    `SELECT m.id,"homeTeamId","awayTeamId","leagueId" FROM matches m
     WHERE played=true AND "leagueId" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM match_tracking_frames f WHERE f."matchId"=m.id)
     ORDER BY m.id
     LIMIT 200`,
    { type: QueryTypes.SELECT }
  );

  console.log(`   Partidos sin frames: ${matchesNeedingFrames.length}`);
  let frameCount = 0;
  const FRAMES_PER_MATCH = 300; // ~1 min de partido a 5fps
  const FRAME_CHUNK = 300;

  for (const m of matchesNeedingFrames) {
    const hp = (tp[m.homeTeamId] || fallback.slice(0,11)).slice(0,11);
    const ap = (tp[m.awayTeamId] || fallback.slice(11,22)).slice(0,11);

    const rows = generateFrames(m.id, m.leagueId, members, hp, ap, FRAMES_PER_MATCH);

    // Insertar en chunks usando bind params
    for (let i = 0; i < rows.length; i += FRAME_CHUNK) {
      const chunk = rows.slice(i, i + FRAME_CHUNK);
      const placeholders = chunk.map((_, j) => {
        const b = j * 8;
        return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6}::jsonb,$${b+7},$${b+8})`;
      }).join(",");
      const binds = chunk.flatMap(r => [
        r.matchId, r.leagueId, r.ts, r.ballX, r.ballY, r.players, new Date(), new Date()
      ]);
      await db.query(
        `INSERT INTO match_tracking_frames ("matchId","leagueId","timestampMs","ballX","ballY","players","createdAt","updatedAt") VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        { bind: binds, type: QueryTypes.INSERT }
      );
      frameCount += chunk.length;
    }
    process.stdout.write(`\r   ${frameCount} frames (${matchesNeedingFrames.indexOf(m)+1}/${matchesNeedingFrames.length} partidos)`);
  }
  console.log(`\n   ✅ ${frameCount} tracking frames generados`);

  // ── 4. match_analytics_cache para partidos con frames ─────────────────────
  console.log("\n💾 Generando match_analytics_cache...");
  const matchesForCache = await db.query(
    `SELECT DISTINCT "matchId","leagueId" FROM match_tracking_frames
     WHERE NOT EXISTS (SELECT 1 FROM match_analytics_cache c WHERE c."matchId"=match_tracking_frames."matchId")
     LIMIT 100`,
    { type: QueryTypes.SELECT }
  );

  let cacheCount = 0;
  for (const m of matchesForCache) {
    const payload = {
      possession: { home: parseFloat(rnd(0.35, 0.65).toFixed(3)), away: 0 },
      observedFormation: { home: pick(["4-3-3","4-4-2","4-2-3-1","3-5-2"]), away: pick(["4-3-3","4-4-2","4-2-3-1","3-5-2"]) },
      convexHull: { home: parseFloat(rnd(600, 1200).toFixed(1)), away: parseFloat(rnd(600, 1200).toFixed(1)) },
      defensiveLine: { home: parseFloat(rnd(30, 55).toFixed(1)), away: parseFloat(rnd(30, 55).toFixed(1)) },
      speeds: {},
      zones: {},
      heatmaps: {},
      passNetwork: { nodes: [], edges: [] },
    };
    payload.possession.away = parseFloat((1 - payload.possession.home).toFixed(3));

    try {
      await db.query(
        `INSERT INTO match_analytics_cache ("matchId","payload","version","computedAt","framesAtComputeTime","createdAt","updatedAt")
         VALUES (:mid,:payload::jsonb,1,NOW(),300,NOW(),NOW())
         ON CONFLICT ("matchId") DO NOTHING`,
        { replacements: { mid: m.matchId, payload: JSON.stringify(payload) }, type: QueryTypes.INSERT }
      );
      cacheCount++;
    } catch (_) {}
  }
  console.log(`   ✅ ${cacheCount} analytics_cache entries`);

  // ── 5. MVP para los nuevos partidos H2H ───────────────────────────────────
  if (h2hCreated > 0) {
    console.log("\n🏆 Asignando MVP a nuevos partidos H2H...");
    // Player_match_stats para los nuevos partidos
    const newMatches = await db.query(
      `SELECT id,"homeTeamId","awayTeamId" FROM matches WHERE played=true AND "mvpPlayerId" IS NULL LIMIT 500`,
      { type: QueryTypes.SELECT }
    );

    const statsRows = [];
    for (const m of newMatches) {
      const hp = (tp[m.homeTeamId] || fallback.slice(0,11)).slice(0,11);
      const ap = (tp[m.awayTeamId] || fallback.slice(11,22)).slice(0,11);
      for (const [u,t] of [...hp.map(u=>[u,m.homeTeamId]),...ap.map(u=>[u,m.awayTeamId])]) {
        statsRows.push([m.id,t,u,rndInt(60,90),rndInt(20,80),rndInt(12,70),rndInt(0,4),rndInt(0,5),rndInt(0,3),rndInt(0,2),rndInt(0,2),
          Math.random()<0.15?1:0,Math.random()<0.03?1:0,rndInt(4000,12000),parseFloat((Math.random()*4.5+5).toFixed(2)),"NOW()","NOW()"]);
      }
    }

    const CHUNK = 500;
    for (let i = 0; i < statsRows.length; i += CHUNK) {
      const chunk = statsRows.slice(i, i + CHUNK);
      const vals = chunk.map(r=>`(${r.join(",")})`).join(",");
      await db.query(`INSERT INTO player_match_stats ("matchId","teamId","playerId","minutesPlayed","passes","passesCompleted","keyPasses","shots","shotsOnTarget","goals","assists","yellowCards","redCards","distanceMeters","rating","createdAt","updatedAt") VALUES ${vals} ON CONFLICT DO NOTHING`, {type:QueryTypes.INSERT});
    }

    await db.query(`
      UPDATE matches m SET "mvpPlayerId" = sub."playerId"
      FROM (SELECT DISTINCT ON ("matchId") "matchId","playerId" FROM player_match_stats ORDER BY "matchId", rating DESC) sub
      WHERE m.id = sub."matchId" AND m."mvpPlayerId" IS NULL
    `, { type: QueryTypes.UPDATE });
    console.log("   ✅ MVP asignado a nuevos partidos");
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log("\n📊 Resumen final:");
  for (const t of ["matches","player_match_stats","match_events","match_tracking_frames","match_squad_players","match_analytics_cache","team_elo_ratings","weekly_awards"]) {
    const [r] = await db.query(`SELECT COUNT(*) as n FROM ${t}`, { type: QueryTypes.SELECT });
    console.log(`   ${t}: ${r.n}`);
  }
  const [mvp] = await db.query(`SELECT COUNT(*) as n FROM matches WHERE "mvpPlayerId" IS NOT NULL`, {type:QueryTypes.SELECT});
  const [h2h] = await db.query(`SELECT COUNT(DISTINCT ARRAY["homeTeamId","awayTeamId"]::text) as n FROM matches WHERE played=true GROUP BY ARRAY["homeTeamId","awayTeamId"] HAVING COUNT(*)>=3`, {type:QueryTypes.SELECT}).catch(()=>[{n:0}]);
  console.log(`   matches con MVP: ${mvp.n}`);
  console.log(`   pares H2H con ≥3 partidos: aprox ${h2h?.n ?? "ver arriba"}`);
  console.log("\n✅ Seed completo.");
  await db.close();
}

main().catch(e => { console.error("❌", e.message, e.stack?.split("\n")[1]); process.exit(1); });


