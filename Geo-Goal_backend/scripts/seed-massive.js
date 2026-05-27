/**
 * seed-massive.js
 * Seed súper masivo:
 *  - Crea equipos adicionales en cada liga (hasta 10 por liga)
 *  - Crea jugadores y los asigna a los nuevos equipos
 *  - Genera partidos pasados (jugados, con stats, MVP) y futuros (próximos) para H2H
 *  - Genera tracking frames, squad players, eventos, Elo, weekly awards
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
const CHUNK  = 400;

const FIRST_NAMES = ["Carlos","Luis","Miguel","José","Jorge","Andrés","Diego","Alejandro","Roberto","Fernando","David","Mario","Sergio","Rafael","Juan","Pablo","Emilio","Marcos","Rodrigo","Iván","Cristian","Gabriel","Óscar","Arturo","Daniel","Héctor","Eduardo","Ricardo","Alberto","Enrique"];
const LAST_NAMES  = ["García","Martínez","López","González","Rodríguez","Hernández","Pérez","Sánchez","Ramírez","Torres","Flores","Rivera","Cruz","Morales","Reyes","Jiménez","Castillo","Ortiz","Mendoza","Ruiz","Vargas","Romero","Guerrero","Navarro","Ramos","Díaz","Medina","Aguilar","Ríos","Gutiérrez"];
const TEAM_PREFIXES = ["Real","Atlético","Deportivo","Club","Fuerza","Tigres","Leones","Águilas","Cóndores","Jaguares","Lobos","Rayos","Venados","Pumas","Gallos","Piratas","Dragones","Halcones","Búhos","Panteras"];
const TEAM_SUFFIXES = ["FC","SC","CF","United","City","Athletic","Rangers","Warriors","Stars","Kings","Sporting","Juniors","Rovers","Strikers","Elite","Pro","Total","Green","Red","Blue"];
const ROUNDS = ["Jornada 1","Jornada 2","Jornada 3","Jornada 4","Jornada 5","Jornada 6","Jornada 7","Jornada 8","Semifinal","Final","Cuartos","Fase de grupos"];
const POSITIONS = ["GK","DEF","DEF","DEF","DEF","MID","MID","MID","MID","ATT","ATT"];
const ROLES     = Array(11).fill("starter");

async function bulkExec(sql, rows, chunk = CHUNK) {
  for (let i = 0; i < rows.length; i += chunk) {
    const c = rows.slice(i, i + chunk);
    const vals = c.map(r => `(${r.join(",")})`).join(",");
    await db.query(sql.replace("__VALUES__", vals), { type: QueryTypes.INSERT });
    process.stdout.write(`\r   ${Math.min(i + chunk, rows.length)}/${rows.length}`);
  }
  console.log();
}

// ── Generar frames de tracking sintéticos ─────────────────────────────────────
function makeFrames(matchId, leagueId, homePids, awayPids, n = 250) {
  const rows = [];
  let bx = 52.5, by = 34;
  for (let f = 0; f < n; f++) {
    bx = clamp(bx + rnd(-6, 6), 2, 98);
    by = clamp(by + rnd(-4, 4), 2, 98);
    const players = [
      ...homePids.slice(0, 11).map((uid, i) => ({
        trackerId: uid, team: "home",
        x: parseFloat(clamp(bx - 25 + rnd(-15, 15), 0, 100).toFixed(2)),
        y: parseFloat(((i / 11) * 100 + rnd(-5, 5)).toFixed(2)),
        speed: parseFloat(rnd(0, 8).toFixed(2)),
      })),
      ...awayPids.slice(0, 11).map((uid, i) => ({
        trackerId: uid, team: "away",
        x: parseFloat(clamp(bx + 25 + rnd(-15, 15), 0, 100).toFixed(2)),
        y: parseFloat(((i / 11) * 100 + rnd(-5, 5)).toFixed(2)),
        speed: parseFloat(rnd(0, 8).toFixed(2)),
      })),
    ];
    rows.push({ matchId, leagueId, ts: f * 200, bx: parseFloat(bx.toFixed(2)), by: parseFloat(by.toFixed(2)), pl: JSON.stringify(players) });
  }
  return rows;
}

async function main() {
  await db.authenticate();
  console.log("✅ DB conectada\n");

  // ── Cargar datos base ─────────────────────────────────────────────────────
  const leagues = await db.query("SELECT id, name FROM leagues ORDER BY id", { type: QueryTypes.SELECT });
  const existingTeams = await db.query("SELECT id FROM teams ORDER BY id", { type: QueryTypes.SELECT });
  const existingMembers = await db.query('SELECT "teamId","userId" FROM team_members', { type: QueryTypes.SELECT });
  const seasons = await db.query('SELECT id,"leagueId" FROM seasons', { type: QueryTypes.SELECT });
  const existingLeagueTeams = await db.query('SELECT "leagueId","teamId" FROM team_league_stats', { type: QueryTypes.SELECT });

  const tp = {}; // teamId → [userId]
  for (const m of existingMembers) {
    if (!tp[m.teamId]) tp[m.teamId] = [];
    tp[m.teamId].push(m.userId);
  }

  const leagueTeamMap = {}; // leagueId → Set<teamId>
  for (const r of existingLeagueTeams) {
    if (!leagueTeamMap[r.leagueId]) leagueTeamMap[r.leagueId] = new Set();
    leagueTeamMap[r.leagueId].add(r.teamId);
  }

  let allPlayers = await db.query("SELECT id FROM users WHERE role='player' ORDER BY id", { type: QueryTypes.SELECT });
  let fallback = allPlayers.map(p => p.id);

  // Get coach IDs for trainer assignment
  const coaches = await db.query("SELECT id FROM users WHERE role='coach' LIMIT 50", { type: QueryTypes.SELECT });
  const coachIds = coaches.map(c => c.id);
  const defaultCoach = coachIds[0] || 67;

  // ── 1. Crear nuevos equipos (hasta 10 por liga) ───────────────────────────
  console.log("\n🏟️  Creando equipos y jugadores nuevos...");
  const TARGET_TEAMS_PER_LEAGUE = 10;
  let newTeamsCount = 0;
  let newPlayersCount = 0;
  const newTeamsByLeague = {}; // leagueId → [teamId]

  for (const lg of leagues) {
    const lgSeason = seasons.find(s => s.leagueId === lg.id);
    if (!lgSeason) continue;

    const currentTeamIds = [...(leagueTeamMap[lg.id] || [])];
    const needed = Math.max(0, TARGET_TEAMS_PER_LEAGUE - currentTeamIds.length);
    if (needed === 0) continue;

    newTeamsByLeague[lg.id] = [];

    for (let t = 0; t < needed; t++) {
      const teamName = `${pick(TEAM_PREFIXES)} ${pick(TEAM_SUFFIXES)} ${lg.id}-${t+1}`;

      // Crear equipo (con todos los campos NOT NULL requeridos)
      const [teamResult] = await db.query(
        `INSERT INTO teams (name, lat, lng, "fieldAddress","trainerId","createdAt","updatedAt")
         VALUES (:n, :lat, :lng, :addr, :trainer, NOW(), NOW()) RETURNING id`,
        { replacements: {
            n: teamName,
            lat: parseFloat(rnd(19.0, 21.0).toFixed(6)),
            lng: parseFloat(rnd(-99.5, -98.5).toFixed(6)),
            addr: `Cancha ${teamName}`,
            trainer: pick(coachIds) || defaultCoach,
          }, type: QueryTypes.SELECT }
      );
      const teamId = teamResult.id;
      newTeamsCount++;
      tp[teamId] = [];
      newTeamsByLeague[lg.id].push(teamId);

      try {
        await db.query(
          `INSERT INTO team_league_stats ("teamId","leagueId","seasonId","createdAt","updatedAt") VALUES (:t,:l,:s,NOW(),NOW()) ON CONFLICT DO NOTHING`,
          { replacements: { t: teamId, l: lg.id, s: lgSeason.id }, type: QueryTypes.INSERT }
        );
      } catch (_) {}

      // Crear 15 jugadores para el equipo
      for (let p = 0; p < 15; p++) {
        const pname = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
        const email = `player_${teamId}_${p}_${Date.now()}@geo.local`;
        try {
          const [playerResult] = await db.query(
            `INSERT INTO users (name, email, password, role, "tokenVersion","createdAt","updatedAt") VALUES (:n,:e,'$2b$10$seed.placeholder.hash.not.real','player',0,NOW(),NOW()) RETURNING id`,
            { replacements: { n: pname, e: email }, type: QueryTypes.SELECT }
          );
          const playerId = playerResult.id;
          tp[teamId].push(playerId);
          fallback.push(playerId);
          newPlayersCount++;

          // Agregar como miembro del equipo
          await db.query(
            `INSERT INTO team_members ("teamId","userId","createdAt","updatedAt") VALUES (:t,:p,NOW(),NOW()) ON CONFLICT DO NOTHING`,
            { replacements: { t: teamId, p: playerId }, type: QueryTypes.INSERT }
          );
        } catch (_) {}
      }
    }
  }
  console.log(`   ✅ ${newTeamsCount} equipos y ${newPlayersCount} jugadores creados`);

  // ── 2. Recargar todos los equipos por liga ────────────────────────────────
  const allLeagueTeams = await db.query(
    `SELECT tls."leagueId", tls."teamId" FROM team_league_stats tls`,
    { type: QueryTypes.SELECT }
  );
  const lgTeamsMap = {}; // leagueId → [teamId]
  for (const r of allLeagueTeams) {
    if (!lgTeamsMap[r.leagueId]) lgTeamsMap[r.leagueId] = [];
    lgTeamsMap[r.leagueId].push(r.teamId);
  }

  // También agregar equipos detectados desde partidos existentes
  const matchTeams = await db.query(
    `SELECT "leagueId","homeTeamId" as tid FROM matches WHERE "leagueId" IS NOT NULL
     UNION SELECT "leagueId","awayTeamId" FROM matches WHERE "leagueId" IS NOT NULL`,
    { type: QueryTypes.SELECT }
  );
  for (const r of matchTeams) {
    if (!lgTeamsMap[r.leagueId]) lgTeamsMap[r.leagueId] = [];
    if (!lgTeamsMap[r.leagueId].includes(r.tid)) lgTeamsMap[r.leagueId].push(r.tid);
  }

  // ── 3. Crear partidos H2H masivos (pasados + futuros) ────────────────────
  console.log("\n⚽ Creando partidos H2H masivos (pasados + futuros)...");
  let pastCreated = 0, futureCreated = 0;

  for (const lg of leagues) {
    const lgSeason = seasons.find(s => s.leagueId === lg.id);
    if (!lgSeason) continue;

    const lgTeams = lgTeamsMap[lg.id] || [];
    if (lgTeams.length < 2) continue;

    // Contar partidos existentes por par
    const existingPairs = await db.query(
      `SELECT "homeTeamId" as a,"awayTeamId" as b, COUNT(*) as n FROM matches WHERE "leagueId"=:lid GROUP BY "homeTeamId","awayTeamId"`,
      { replacements: { lid: lg.id }, type: QueryTypes.SELECT }
    );
    const pairCount = {};
    for (const p of existingPairs) {
      pairCount[`${p.a}-${p.b}`] = Number(p.n);
    }

    // Para cada par: asegurar 5 pasados + 4 futuros
    const insertValues = [];
    for (let i = 0; i < lgTeams.length; i++) {
      for (let j = 0; j < lgTeams.length; j++) {
        if (i === j) continue;
        const a = lgTeams[i], b = lgTeams[j];
        const existingAB = pairCount[`${a}-${b}`] || 0;

        // Partidos pasados (jugados)
        const pastNeeded = Math.max(0, 5 - existingAB);
        for (let k = 0; k < pastNeeded; k++) {
          const hg = rndInt(0, 4), ag = rndInt(0, 4);
          const daysAgo = rndInt(7, 400) + k * 14;
          insertValues.push(`(${a},${b},${lg.id},${lgSeason.id},true,${hg},${ag},NOW()-MAKE_INTERVAL(days=>${daysAgo}),'${pick(ROUNDS)}','league',NOW(),NOW())`);
          pastCreated++;
        }

        // Partidos futuros (próximos, no jugados)
        const futNeeded = 4;
        for (let k = 0; k < futNeeded; k++) {
          const daysAhead = rndInt(3, 14) + k * 7;
          insertValues.push(`(${a},${b},${lg.id},${lgSeason.id},false,0,0,NOW()+MAKE_INTERVAL(days=>${daysAhead}),'${pick(ROUNDS)}','league',NOW(),NOW())`);
          futureCreated++;
        }
      }
    }

    // Insertar en chunks
    const SQL = `INSERT INTO matches ("homeTeamId","awayTeamId","leagueId","seasonId","played","homeScore","awayScore","date","roundName","type","createdAt","updatedAt") VALUES __VALUES__`;
    for (let i = 0; i < insertValues.length; i += CHUNK) {
      const c = insertValues.slice(i, i + CHUNK);
      await db.query(SQL.replace("__VALUES__", c.join(",")), { type: QueryTypes.INSERT });
    }
    process.stdout.write(`\r   Liga ${lg.id}: ${lgTeams.length} equipos, ${pastCreated}p/${futureCreated}f partidos`);
  }
  console.log(`\n   ✅ ${pastCreated} partidos pasados + ${futureCreated} futuros creados`);

  // ── 4. player_match_stats para partidos jugados nuevos ───────────────────
  console.log("\n📈 Generando player_match_stats para nuevos partidos...");
  const newPlayedMatches = await db.query(
    `SELECT m.id,"homeTeamId","awayTeamId","leagueId" FROM matches m
     WHERE played=true AND "leagueId" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM player_match_stats s WHERE s."matchId"=m.id)
     ORDER BY m.id`,
    { type: QueryTypes.SELECT }
  );
  console.log(`   ${newPlayedMatches.length} partidos nuevos sin stats`);

  const statsRows = [];
  for (const m of newPlayedMatches) {
    const hp = (tp[m.homeTeamId] || fallback.slice(0,11)).slice(0,11);
    const ap = (tp[m.awayTeamId] || fallback.slice(11,22)).slice(0,11);
    for (const [u, t] of [...hp.map(u=>[u,m.homeTeamId]),...ap.map(u=>[u,m.awayTeamId])]) {
      statsRows.push([
        m.id, t, u,
        rndInt(60,90), rndInt(20,80), rndInt(12,70), rndInt(0,4),
        rndInt(0,5), rndInt(0,3), rndInt(0,2), rndInt(0,2),
        Math.random()<0.15?1:0, Math.random()<0.03?1:0,
        rndInt(4000,12000), parseFloat(clamp(rnd(5,9.5),1,10).toFixed(2)),
        "NOW()","NOW()",
      ]);
    }
  }

  if (statsRows.length) {
    const SCOLS = `"matchId","teamId","playerId","minutesPlayed","passes","passesCompleted","keyPasses","shots","shotsOnTarget","goals","assists","yellowCards","redCards","distanceMeters","rating","createdAt","updatedAt"`;
    await bulkExec(`INSERT INTO player_match_stats (${SCOLS}) VALUES __VALUES__ ON CONFLICT DO NOTHING`, statsRows);
  }
  console.log(`   ✅ ${statsRows.length} filas de stats`);

  // ── 5. MVP para los nuevos partidos ───────────────────────────────────────
  console.log("🏆 Asignando MVP a nuevos partidos...");
  await db.query(`
    UPDATE matches m SET "mvpPlayerId" = sub."playerId"
    FROM (SELECT DISTINCT ON ("matchId") "matchId","playerId" FROM player_match_stats ORDER BY "matchId", rating DESC) sub
    WHERE m.id = sub."matchId" AND m."mvpPlayerId" IS NULL
  `, { type: QueryTypes.UPDATE });
  const [mvpc] = await db.query(`SELECT COUNT(*) as n FROM matches WHERE "mvpPlayerId" IS NOT NULL`, { type: QueryTypes.SELECT });
  console.log(`   ✅ MVP en ${mvpc.n} partidos`);

  // ── 6. match_squad_players para nuevos partidos ───────────────────────────
  console.log("\n👥 Generando match_squad_players...");
  const noSquadMatches = await db.query(
    `SELECT m.id,"homeTeamId","awayTeamId" FROM matches m WHERE played=true
     AND NOT EXISTS (SELECT 1 FROM match_squad_players s WHERE s."matchId"=m.id)
     ORDER BY m.id LIMIT 1000`,
    { type: QueryTypes.SELECT }
  );

  const squadRows = [];
  for (const m of noSquadMatches) {
    const hp = (tp[m.homeTeamId] || fallback.slice(0,11)).slice(0,11);
    const ap = (tp[m.awayTeamId] || fallback.slice(11,22)).slice(0,11);
    [...hp.map((u,i)=>({u,t:m.homeTeamId,i})),...ap.map((u,i)=>({u,t:m.awayTeamId,i}))].forEach(({u,t,i})=>{
      squadRows.push([m.id, t, u, `'${ROLES[i]||"bench"}'`, "true", i+1, `'${POSITIONS[i]||"MID"}'`, "NOW()","NOW()"]);
    });
  }
  if (squadRows.length) {
    const SQCOLS = `"matchId","teamId","playerId","squadRole","isAvailable","jerseyNumber","position","createdAt","updatedAt"`;
    await bulkExec(`INSERT INTO match_squad_players (${SQCOLS}) VALUES __VALUES__ ON CONFLICT DO NOTHING`, squadRows);
  }
  console.log(`   ✅ ${squadRows.length} squad_players`);

  // ── 7. match_events para nuevos partidos ─────────────────────────────────
  console.log("\n📋 Generando match_events...");
  const noEventsMatches = await db.query(
    `SELECT m.id,"homeTeamId","awayTeamId","leagueId" FROM matches m
     WHERE played=true AND "leagueId" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM match_events e WHERE e."matchId"=m.id)
     ORDER BY m.id LIMIT 800`,
    { type: QueryTypes.SELECT }
  );
  const ET = ["goal","yellow_card","shot","pass","key_pass","interception","ball_out"];
  const evBatch = [];
  for (const m of noEventsMatches) {
    const hp = (tp[m.homeTeamId] || fallback.slice(0,11)).slice(0,11);
    const ap = (tp[m.awayTeamId] || fallback.slice(11,22)).slice(0,11);
    for (let i = 0; i < rndInt(8,18); i++) {
      const isHome = Math.random() > 0.5;
      const pids = isHome ? hp : ap;
      if (!pids.length) continue;
      const src = Math.random()<0.35?"inferred":"manual";
      evBatch.push({
        mid: m.id, lid: m.leagueId,
        tid: isHome ? m.homeTeamId : m.awayTeamId,
        pid: pick(pids), et: pick(ET),
        min: rndInt(1,90),
        xs: parseFloat(rnd(0,100).toFixed(2)), ys: parseFloat(rnd(0,100).toFixed(2)),
        xe: parseFloat(rnd(0,100).toFixed(2)), ye: parseFloat(rnd(0,100).toFixed(2)),
        src, conf: parseFloat((src==="inferred"?rnd(0.55,0.9):1.0).toFixed(3)),
        meta: { requiresReview: src==="inferred"&&Math.random()<0.65, xg: parseFloat(rnd(0.02,0.45).toFixed(3)), attackingRight: isHome },
      });
    }
  }
  const EV_CHUNK = 80;
  let evDone = 0;
  for (let i = 0; i < evBatch.length; i += EV_CHUNK) {
    const chunk = evBatch.slice(i, i + EV_CHUNK);
    const ph = chunk.map((_,j)=>{ const b=j*15; return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13}::jsonb,$${b+14},$${b+15})`; }).join(",");
    const binds = chunk.flatMap(r=>[r.mid,r.lid,r.tid,r.pid,r.et,r.min,r.xs,r.ys,r.xe,r.ye,r.src,r.conf,JSON.stringify(r.meta),new Date(),new Date()]);
    await db.query(`INSERT INTO match_events ("matchId","leagueId","teamId","playerId","eventType","minute","xStart","yStart","xEnd","yEnd","source","confidence","metadata","createdAt","updatedAt") VALUES ${ph} ON CONFLICT DO NOTHING`, { bind: binds, type: QueryTypes.INSERT });
    evDone += chunk.length;
    process.stdout.write(`\r   ${evDone}/${evBatch.length} eventos`);
  }
  console.log(`\n   ✅ ${evDone} match_events`);

  // ── 8. match_tracking_frames para nuevos partidos ─────────────────────────
  console.log("\n📡 Generando tracking frames para nuevos partidos...");
  const noFramesMatches = await db.query(
    `SELECT m.id,"homeTeamId","awayTeamId","leagueId" FROM matches m
     WHERE played=true AND "leagueId" IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM match_tracking_frames f WHERE f."matchId"=m.id)
     ORDER BY m.id LIMIT 300`,
    { type: QueryTypes.SELECT }
  );
  let framesDone = 0;
  for (const m of noFramesMatches) {
    const hp = (tp[m.homeTeamId] || fallback.slice(0,11)).slice(0,11);
    const ap = (tp[m.awayTeamId] || fallback.slice(11,22)).slice(0,11);
    const rows = makeFrames(m.id, m.leagueId, hp, ap, 250);
    const FR_CHUNK = 250;
    for (let i = 0; i < rows.length; i += FR_CHUNK) {
      const chunk = rows.slice(i, i + FR_CHUNK);
      const ph = chunk.map((_,j)=>{ const b=j*8; return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6}::jsonb,$${b+7},$${b+8})`; }).join(",");
      const binds = chunk.flatMap(r=>[r.matchId,r.leagueId,r.ts,r.bx,r.by,r.pl,new Date(),new Date()]);
      await db.query(`INSERT INTO match_tracking_frames ("matchId","leagueId","timestampMs","ballX","ballY","players","createdAt","updatedAt") VALUES ${ph} ON CONFLICT DO NOTHING`, { bind: binds, type: QueryTypes.INSERT });
      framesDone += chunk.length;
    }
    process.stdout.write(`\r   ${framesDone} frames (${noFramesMatches.indexOf(m)+1}/${noFramesMatches.length} partidos)`);
  }
  console.log(`\n   ✅ ${framesDone} tracking frames`);

  // ── 9. Elo para todos los equipos ─────────────────────────────────────────
  console.log("\n📊 Elo ratings para todos los equipos...");
  const allTeams = await db.query("SELECT id FROM teams", { type: QueryTypes.SELECT });
  for (const t of allTeams) {
    const rat = rndInt(1350,1720), gp = rndInt(8,30);
    const hist = JSON.stringify(Array.from({length:Math.min(gp,15)},()=>rndInt(1280,1780)));
    await db.query(`INSERT INTO team_elo_ratings ("teamId",rating,"gamesPlayed","ratingHistory","createdAt","updatedAt") VALUES (:tid,:rat,:gp,:hist::jsonb,NOW(),NOW()) ON CONFLICT ("teamId") DO UPDATE SET rating=:rat,"gamesPlayed"=:gp,"ratingHistory"=:hist::jsonb,"updatedAt"=NOW()`,
      { replacements:{tid:t.id,rat,gp,hist}, type:QueryTypes.INSERT });
  }
  console.log(`   ✅ Elo para ${allTeams.length} equipos`);

  // ── 10. Weekly awards para todas las ligas ────────────────────────────────
  console.log("\n🥇 Weekly awards...");
  const playerIds = fallback;
  const teamIds = allTeams.map(t=>t.id);
  let awc = 0;
  for (const lg of leagues) {
    for (let w = 0; w < 10; w++) {
      const ws = new Date(); ws.setDate(ws.getDate()-(w+1)*7);
      const we = new Date(ws); we.setDate(we.getDate()+6);
      try {
        await db.query(`INSERT INTO weekly_awards ("leagueId","weekStart","weekEnd","playerId","teamId","avgRating","matchesInWeek","createdAt","updatedAt") VALUES (:l,:ws,:we,:p,:t,:avg,:mw,NOW(),NOW())`,
          { replacements:{l:lg.id,ws:ws.toISOString().split("T")[0],we:we.toISOString().split("T")[0],p:pick(playerIds),t:pick(teamIds),avg:parseFloat(rnd(7.2,9.8).toFixed(2)),mw:rndInt(2,5)}, type:QueryTypes.INSERT });
        awc++;
      } catch(_){}
    }
  }
  console.log(`   ✅ ${awc} weekly_awards`);

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log("\n📊 RESUMEN FINAL:");
  for (const t of ["leagues","teams","users","matches","player_match_stats","match_events","match_tracking_frames","match_squad_players","team_elo_ratings","weekly_awards"]) {
    const [r] = await db.query(`SELECT COUNT(*) as n FROM ${t}`, { type:QueryTypes.SELECT });
    console.log(`   ${t}: ${r.n}`);
  }
  const [played] = await db.query(`SELECT COUNT(*) as n FROM matches WHERE played=true`, {type:QueryTypes.SELECT});
  const [upcoming] = await db.query(`SELECT COUNT(*) as n FROM matches WHERE played=false`, {type:QueryTypes.SELECT});
  const [mvp] = await db.query(`SELECT COUNT(*) as n FROM matches WHERE "mvpPlayerId" IS NOT NULL`, {type:QueryTypes.SELECT});
  const [inf] = await db.query(`SELECT COUNT(*) as n FROM match_events WHERE source='inferred'`, {type:QueryTypes.SELECT});
  const [h2hPairs] = await db.query(`SELECT COUNT(*) as n FROM (SELECT "homeTeamId","awayTeamId" FROM matches WHERE played=true GROUP BY "homeTeamId","awayTeamId" HAVING COUNT(*)>=3) x`, {type:QueryTypes.SELECT});
  console.log(`   partidos jugados: ${played.n} | próximos: ${upcoming.n}`);
  console.log(`   MVP asignado: ${mvp.n} | eventos inferidos: ${inf.n}`);
  console.log(`   pares H2H con ≥3 partidos: ${h2hPairs.n}`);
  console.log("\n✅ Seed masivo completado.");
  await db.close();
}

main().catch(e=>{ console.error("❌", e.message); process.exit(1); });







