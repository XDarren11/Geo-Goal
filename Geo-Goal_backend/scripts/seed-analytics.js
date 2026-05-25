/**
 * seed-analytics.js — v3 (SIN LÍMITES — todas las ligas, equipos y jugadores)
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
const clamp  = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const CHUNK  = 500;

async function bulkInsert(table, cols, rows) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    let values;
    if (table === "match_events") {
      // col 13 (index 12) is metadata jsonb — needs explicit cast
      values = chunk.map(r => {
        const cols = [...r];
        cols[12] = cols[12] + "::jsonb";
        return `(${cols.join(",")})`;
      }).join(",");
    } else {
      values = chunk.map(r => `(${r.join(",")})`).join(",");
    }
    const sql = `INSERT INTO ${table} (${cols}) VALUES ${values} ON CONFLICT DO NOTHING`;
    await db.query(sql, { type: QueryTypes.INSERT });
    process.stdout.write(`\r   ${Math.min(i + CHUNK, rows.length)}/${rows.length} ${table}`);
  }
  console.log();
}

async function main() {
  await db.authenticate();
  console.log("✅ DB conectada\n");

  // ── Leer TODOS los datos ──────────────────────────────────────────────────
  const leagues = await db.query("SELECT id FROM leagues", { type: QueryTypes.SELECT });
  const teams   = await db.query("SELECT id FROM teams",   { type: QueryTypes.SELECT });
  const members = await db.query('SELECT "teamId","userId" FROM team_members', { type: QueryTypes.SELECT });
  const players = await db.query("SELECT id FROM users WHERE role='player'",  { type: QueryTypes.SELECT });

  console.log(`Ligas: ${leagues.length} | Equipos: ${teams.length} | Jugadores: ${players.length} | Miembros: ${members.length}`);

  const tp = {};
  for (const m of members) {
    if (!tp[m.teamId]) tp[m.teamId] = [];
    tp[m.teamId].push(m.userId);
  }
  const fallback = players.map(p => p.id);
  const teamIds  = teams.map(t => t.id);

  // ── 1. Marcar TODOS los partidos como jugados ─────────────────────────────
  await db.query(
    `UPDATE matches SET played=true,
      "homeScore"=FLOOR(RANDOM()*5)::int,
      "awayScore"=FLOOR(RANDOM()*5)::int,
      date=NOW()-MAKE_INTERVAL(days=>FLOOR(RANDOM()*180)::int)
     WHERE played=false`,
    { type: QueryTypes.UPDATE }
  );
  console.log("⚽ Todos los partidos marcados como jugados");

  // ── 2. Leer todos los partidos ────────────────────────────────────────────
  const allMatches = await db.query(
    `SELECT id,"homeTeamId","awayTeamId","leagueId" FROM matches WHERE played=true ORDER BY id`,
    { type: QueryTypes.SELECT }
  );
  console.log(`📋 ${allMatches.length} partidos jugados\n`);

  // ── 3. player_match_stats ─────────────────────────────────────────────────
  console.log("📈 Limpiando y regenerando player_match_stats...");
  await db.query("DELETE FROM player_match_stats WHERE true", { type: QueryTypes.DELETE });

  const statsRows = [];
  for (const m of allMatches) {
    const hp = (tp[m.homeTeamId] || fallback.slice(0, 11)).slice(0, 11);
    const ap = (tp[m.awayTeamId] || fallback.slice(11, 22)).slice(0, 11);
    for (const [u, t] of [...hp.map(u => [u, m.homeTeamId]), ...ap.map(u => [u, m.awayTeamId])]) {
      statsRows.push([
        m.id, t, u,
        rndInt(60, 90), rndInt(20, 80), rndInt(12, 70), rndInt(0, 4),
        rndInt(0, 5),   rndInt(0, 3),   rndInt(0, 2),   rndInt(0, 2),
        Math.random() < 0.15 ? 1 : 0,
        Math.random() < 0.03 ? 1 : 0,
        rndInt(4000, 12000),
        parseFloat(clamp(rnd(5, 9.5), 1, 10).toFixed(2)),
        "NOW()", "NOW()",
      ]);
    }
  }

  await bulkInsert(
    "player_match_stats",
    `"matchId","teamId","playerId","minutesPlayed","passes","passesCompleted","keyPasses","shots","shotsOnTarget","goals","assists","yellowCards","redCards","distanceMeters","rating","createdAt","updatedAt"`,
    statsRows
  );
  console.log(`   ✅ ${statsRows.length} player_match_stats\n`);

  // ── 4. MVP por partido ────────────────────────────────────────────────────
  console.log("🏆 Asignando MVP (batch SQL)...");
  await db.query(`
    UPDATE matches m SET "mvpPlayerId" = sub."playerId"
    FROM (
      SELECT DISTINCT ON ("matchId") "matchId","playerId"
      FROM player_match_stats ORDER BY "matchId", rating DESC
    ) sub WHERE m.id = sub."matchId"
  `, { type: QueryTypes.UPDATE });
  const [mc] = await db.query(`SELECT COUNT(*) as n FROM matches WHERE "mvpPlayerId" IS NOT NULL`, { type: QueryTypes.SELECT });
  console.log(`   ✅ MVP en ${mc.n} partidos\n`);

  // ── 5. match_events para TODOS los partidos ───────────────────────────────
  console.log("📋 Limpiando y regenerando match_events...");
  await db.query(`DELETE FROM match_events WHERE "recordedBy" IS NULL`, { type: QueryTypes.DELETE });

  const ET = ["goal","yellow_card","shot","pass","key_pass","interception","ball_out"];
  let evCount = 0;

  // Insertar en grupos de 200 usando parámetros ligados (safe para JSONB)
  const evBatch = [];
  for (const m of allMatches) {
    if (!m.leagueId) continue;  // saltar partidos sin liga
    const hp = (tp[m.homeTeamId] || fallback.slice(0, 11)).slice(0, 11);
    const ap = (tp[m.awayTeamId] || fallback.slice(11, 22)).slice(0, 11);
    if (!hp.length && !ap.length) continue;

    const numEv = rndInt(8, 18);
    for (let i = 0; i < numEv; i++) {
      const isHome = Math.random() > 0.5;
      const pids   = isHome ? hp : ap;
      if (!pids.length) continue;
      evBatch.push({
        mid: m.id, lid: m.leagueId,
        tid: isHome ? m.homeTeamId : m.awayTeamId,
        pid: pick(pids),
        et: pick(ET),
        min: rndInt(1, 90),
        xs: parseFloat(rnd(0, 100).toFixed(2)),
        ys: parseFloat(rnd(0, 100).toFixed(2)),
        xe: parseFloat(rnd(0, 100).toFixed(2)),
        ye: parseFloat(rnd(0, 100).toFixed(2)),
        src: Math.random() < 0.35 ? "inferred" : "manual",
        conf: parseFloat((Math.random() < 0.35 ? rnd(0.55, 0.9) : 1.0).toFixed(3)),
        meta: { requiresReview: Math.random() < 0.35 && Math.random() < 0.65, xg: parseFloat(rnd(0.02, 0.45).toFixed(3)), attackingRight: isHome },
      });
    }
  }

  const EV_CHUNK = 100;
  for (let i = 0; i < evBatch.length; i += EV_CHUNK) {
    const chunk = evBatch.slice(i, i + EV_CHUNK);
    // Construir multi-row INSERT con parámetros numerados
    const placeholders = chunk.map((_, j) => {
      const b = j * 15;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13}::jsonb,$${b+14},$${b+15})`;
    }).join(",");
    const binds = chunk.flatMap(r => [
      r.mid, r.lid, r.tid, r.pid, r.et, r.min,
      r.xs, r.ys, r.xe, r.ye,
      r.src, r.conf, JSON.stringify(r.meta),
      new Date(), new Date(),
    ]);
    await db.query(
      `INSERT INTO match_events ("matchId","leagueId","teamId","playerId","eventType","minute","xStart","yStart","xEnd","yEnd","source","confidence","metadata","createdAt","updatedAt") VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      { bind: binds, type: QueryTypes.INSERT }
    );
    evCount += chunk.length;
    process.stdout.write(`\r   ${evCount}/${evBatch.length} match_events`);
  }
  console.log(`\n   ✅ ${evCount} match_events\n`);

  // ── 6. Elo ratings para TODOS los equipos ─────────────────────────────────
  console.log("📊 Elo ratings para todos los equipos...");
  for (const t of teams) {
    const rat  = rndInt(1350, 1720);
    const gp   = rndInt(8, 30);
    const hist = JSON.stringify(Array.from({ length: Math.min(gp, 15) }, () => rndInt(1280, 1780)));
    await db.query(
      `INSERT INTO team_elo_ratings ("teamId",rating,"gamesPlayed","ratingHistory","createdAt","updatedAt")
       VALUES (:tid,:rat,:gp,:hist::jsonb,NOW(),NOW())
       ON CONFLICT ("teamId") DO UPDATE SET rating=:rat,"gamesPlayed"=:gp,"ratingHistory"=:hist::jsonb,"updatedAt"=NOW()`,
      { replacements: { tid: t.id, rat, gp, hist }, type: QueryTypes.INSERT }
    );
  }
  console.log(`   ✅ Elo para ${teams.length} equipos\n`);

  // ── 7. Weekly awards para TODAS las ligas ────────────────────────────────
  console.log("🥇 Weekly awards para todas las ligas...");
  let awc = 0;
  const allPlayerIds = fallback.length ? fallback : [players[0]?.id].filter(Boolean);
  for (const lg of leagues) {
    for (let w = 0; w < 8; w++) {
      const ws = new Date(); ws.setDate(ws.getDate() - (w + 1) * 7);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      const pid = pick(allPlayerIds);
      const tid = pick(teamIds);
      try {
        await db.query(
          `INSERT INTO weekly_awards ("leagueId","weekStart","weekEnd","playerId","teamId","avgRating","matchesInWeek","createdAt","updatedAt")
           VALUES (:l,:ws,:we,:p,:t,:avg,:mw,NOW(),NOW())`,
          {
            replacements: {
              l: lg.id, ws: ws.toISOString().split("T")[0], we: we.toISOString().split("T")[0],
              p: pid, t: tid, avg: parseFloat(rnd(7.2, 9.8).toFixed(2)), mw: rndInt(2, 5),
            },
            type: QueryTypes.INSERT,
          }
        );
        awc++;
      } catch (_) {}
    }
  }
  console.log(`   ✅ ${awc} weekly_awards\n`);

  // ── Resumen final ─────────────────────────────────────────────────────────
  console.log("📊 Resumen final:");
  for (const t of ["leagues","teams","matches","player_match_stats","match_events","team_elo_ratings","weekly_awards"]) {
    const [r] = await db.query(`SELECT COUNT(*) as n FROM ${t}`, { type: QueryTypes.SELECT });
    console.log(`   ${t}: ${r.n}`);
  }
  const [mvpRow] = await db.query(`SELECT COUNT(*) as n FROM matches WHERE "mvpPlayerId" IS NOT NULL`, { type: QueryTypes.SELECT });
  const [infRow] = await db.query(`SELECT COUNT(*) as n FROM match_events WHERE source='inferred'`, { type: QueryTypes.SELECT });
  console.log(`   matches con MVP: ${mvpRow.n}`);
  console.log(`   eventos inferidos: ${infRow.n}`);
  console.log("\n✅ Seed masivo completado.");
  await db.close();
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });

