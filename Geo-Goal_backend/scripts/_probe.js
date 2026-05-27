require("dotenv").config();
const { Sequelize, QueryTypes } = require("sequelize");
const db = new Sequelize(process.env.DATABASE_URL, { dialect:"postgres", logging:false, dialectOptions:{ssl:{require:true,rejectUnauthorized:false}} });
async function main() {
  const cols = await db.query(`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='match_tracking_frames' ORDER BY ordinal_position`, {type:QueryTypes.SELECT});
  console.log("match_tracking_frames:", cols.map(c=>`${c.column_name}(${c.data_type})`).join(", "));
  const [cnt] = await db.query(`SELECT COUNT(*) as n FROM match_tracking_frames`, {type:QueryTypes.SELECT});
  console.log("count:", cnt.n);
  // H2H: check team pairs that played multiple times
  const h2h = await db.query(`SELECT "homeTeamId","awayTeamId", COUNT(*) as n FROM matches WHERE played=true GROUP BY "homeTeamId","awayTeamId" HAVING COUNT(*)>1 LIMIT 5`, {type:QueryTypes.SELECT});
  console.log("H2H pairs (>1 match):", JSON.stringify(h2h));
  // match_squad_players
  const sq = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='match_squad_players' ORDER BY ordinal_position`, {type:QueryTypes.SELECT});
  console.log("match_squad_players:", sq.map(c=>c.column_name).join(", "));
  const [sqcnt] = await db.query(`SELECT COUNT(*) as n FROM match_squad_players`, {type:QueryTypes.SELECT});
  console.log("match_squad_players count:", sqcnt.n);
  await db.close();
}
main().catch(e=>{console.error(e.message);process.exit(1);});




