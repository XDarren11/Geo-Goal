/**
 * seed-heatmaps.js — genera heatmaps 14×21 por jugador para todos los partidos
 * Uso: node scripts/seed-heatmaps.js
 *
 * Preserva datos existentes en match_analytics_cache mediante merge JSONB (||).
 */

require('dotenv').config();
const { Sequelize, QueryTypes } = require('sequelize');

const db = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
});

// ── Configuración del grid ────────────────────────────────────────────────────
const ROWS = 14; // altura del campo
const COLS = 21; // anchura (col 0 = arco propio, col 20 = arco rival)

// Peaks por posición [centerRow, centerCol, spreadRow, spreadCol]
// playerId % 11 determina la posición
const POSITION_PEAKS = [
  [[7,  2, 2.0, 1.5]],                         // 0: Portero
  [[4,  4, 2.0, 2.0]],                         // 1: Central izquierdo
  [[10, 4, 2.0, 2.0]],                         // 2: Central derecho
  [[2,  4, 1.5, 2.0], [2, 12, 1.5, 2.5]],     // 3: Lateral izquierdo
  [[11, 4, 1.5, 2.0], [11,12, 1.5, 2.5]],     // 4: Lateral derecho
  [[7,  8, 3.0, 2.5]],                         // 5: Mediocampista defensivo
  [[4, 11, 2.5, 2.5]],                         // 6: Mediocampista izquierdo
  [[10,11, 2.5, 2.5]],                         // 7: Mediocampista derecho
  [[2, 14, 2.0, 2.5], [2, 18, 2.0, 2.5]],     // 8: Extremo izquierdo
  [[11,14, 2.0, 2.5], [11,18, 2.0, 2.5]],     // 9: Extremo derecho
  [[7, 18, 2.5, 2.5], [7, 14, 2.0, 2.0]],     // 10: Delantero centro
];

// ── Generación de heatmap ─────────────────────────────────────────────────────
function gaussian(r, c, cr, cc, sr, sc) {
  return Math.exp(
    -(Math.pow(r - cr, 2) / (2 * sr * sr) + Math.pow(c - cc, 2) / (2 * sc * sc))
  );
}

function generateHeatmap(playerId) {
  const peaks = POSITION_PEAKS[playerId % 11];
  let maxVal = 0;
  const raw = [];

  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      let val = peaks.reduce((s, [cr, cc, sr, sc]) => s + gaussian(r, c, cr, cc, sr, sc), 0);
      val += Math.random() * 0.08; // ruido suave
      row.push(val);
      if (val > maxVal) maxVal = val;
    }
    raw.push(row);
  }

  return raw.map(row => row.map(v => parseFloat((v / maxVal).toFixed(3))));
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await db.authenticate();
  console.log('✅ DB conectada\n');

  // Leer todos los jugadores por partido
  const stats = await db.query(
    `SELECT "matchId", "playerId" FROM player_match_stats ORDER BY "matchId", "playerId"`,
    { type: QueryTypes.SELECT }
  );

  if (!stats.length) {
    console.log('⚠️  No hay registros en player_match_stats. Ejecuta seed-analytics.js primero.');
    await db.close();
    return;
  }

  // Agrupar por matchId
  const matchMap = {};
  for (const { matchId, playerId } of stats) {
    if (!matchMap[matchId]) matchMap[matchId] = new Set();
    matchMap[matchId].add(playerId);
  }

  const matchIds = Object.keys(matchMap);
  console.log(`📋 ${matchIds.length} partidos con jugadores\n`);
  console.log('🔥 Generando y guardando heatmaps...');

  let processed = 0;
  for (const matchId of matchIds) {
    const playerIds = [...matchMap[matchId]];

    const heatmapObj = {};
    for (const pid of playerIds) {
      heatmapObj[pid] = generateHeatmap(pid);
    }

    // patch = { heatmaps: { "playerId": number[][] } }
    const patch = JSON.stringify({ heatmaps: heatmapObj });

    await db.query(
      `INSERT INTO match_analytics_cache
         ("matchId", payload, version, "computedAt", "framesAtComputeTime", "createdAt", "updatedAt")
       VALUES
         (:matchId, :patch::jsonb, 1, NOW(), 0, NOW(), NOW())
       ON CONFLICT ("matchId") DO UPDATE
         SET payload    = match_analytics_cache.payload || :patch::jsonb,
             "updatedAt" = NOW()`,
      {
        replacements: { matchId: Number(matchId), patch },
        type: QueryTypes.INSERT,
      }
    );

    processed++;
    process.stdout.write(`\r   ${processed}/${matchIds.length} partidos`);
  }

  console.log('\n');

  // ── Verificar player1@geogoal.app ────────────────────────────────────────
  console.log('🔍 Verificando player1@geogoal.app...');
  const [p1] = await db.query(
    `SELECT id FROM users WHERE email = 'player1@geogoal.app'`,
    { type: QueryTypes.SELECT }
  );

  if (p1) {
    const [statCount] = await db.query(
      `SELECT COUNT(*) AS n FROM player_match_stats WHERE "playerId" = :pid`,
      { replacements: { pid: p1.id }, type: QueryTypes.SELECT }
    );
    const [cacheCount] = await db.query(
      `SELECT COUNT(*) AS n
       FROM match_analytics_cache mac
       JOIN player_match_stats pms
         ON pms."matchId" = mac."matchId" AND pms."playerId" = :pid
       WHERE mac.payload -> 'heatmaps' IS NOT NULL`,
      { replacements: { pid: p1.id }, type: QueryTypes.SELECT }
    );
    console.log(`   id: ${p1.id}`);
    console.log(`   partidos con stats: ${statCount.n}`);
    console.log(`   partidos con heatmap: ${cacheCount.n}`);
  } else {
    console.log('   ⚠️  player1@geogoal.app no encontrado en la base de datos');
  }

  // ── Resumen final ─────────────────────────────────────────────────────────
  const [total] = await db.query(
    `SELECT COUNT(*) AS n FROM match_analytics_cache WHERE payload ? 'heatmaps'`,
    { type: QueryTypes.SELECT }
  );
  console.log(`\n✅ ${total.n} partidos con heatmaps almacenados en match_analytics_cache`);

  await db.close();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
