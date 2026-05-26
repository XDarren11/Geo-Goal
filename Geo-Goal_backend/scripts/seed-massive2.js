require("dotenv").config();
const { Sequelize, QueryTypes } = require("sequelize");
const db = new Sequelize(process.env.DATABASE_URL, {
  dialect:"postgres", logging:false,
  dialectOptions:{ssl:{require:true,rejectUnauthorized:false}},
  pool:{max:5,min:0,acquire:60000,idle:10000},
});
const rndInt=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const rnd=(a,b)=>Math.random()*(b-a)+a;
const pick=(arr)=>arr[rndInt(0,arr.length-1)];
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const CHUNK=400;
const NAMES=["Carlos","Luis","Miguel","Jorge","Andres","Diego","Alejandro","Roberto","Fernando","David","Mario","Sergio","Rafael","Juan","Pablo","Rodrigo","Ivan","Gabriel","Oscar","Daniel","Hector","Eduardo","Ricardo","Alberto","Enrique","Cristian","Arturo","Javier","Raul","Marco"];
const LNAMES=["Garcia","Martinez","Lopez","Gonzalez","Rodriguez","Hernandez","Perez","Sanchez","Ramirez","Torres","Flores","Rivera","Cruz","Morales","Reyes","Jimenez","Castillo","Ortiz","Mendoza","Ruiz","Vargas","Romero","Guerrero","Navarro","Ramos","Diaz","Medina","Aguilar","Rios","Gutierrez"];
const TPFX=["Real","Atletico","Deportivo","Club","Tigres","Leones","Aguilas","Condores","Lobos","Rayos","Venados","Pumas","Gallos","Dragones","Halcones","Panthers","Warriors","Kings","Stars","United"];
const TSFX=["FC","SC","CF","United","City","Athletic","Rangers","Strikers","Elite","Pro","Green","Red","Blue","Juniors","Rovers","Sporting","Total","Express","Force","Squad"];
const ROUNDS=["Jornada 1","Jornada 2","Jornada 3","Jornada 4","Jornada 5","Jornada 6","Jornada 7","Jornada 8","Semifinal","Final","Cuartos","Fase de grupos"];
const POSITIONS=["GK","DEF","DEF","DEF","DEF","MID","MID","MID","MID","ATT","ATT"];

async function run(){
  await db.authenticate(); console.log("DB OK\n");
  const leagues=await db.query("SELECT id FROM leagues ORDER BY id",{type:QueryTypes.SELECT});
  const [coachRow]=await db.query("SELECT id FROM users WHERE role='coach' LIMIT 1",{type:QueryTypes.SELECT});
  const defaultCoach=coachRow?.id||67;
  const seasons=await db.query('SELECT id,"leagueId" FROM seasons',{type:QueryTypes.SELECT});
  const seasonMap={}; for(const s of seasons) seasonMap[s.leagueId]=s.id;

  // 1. Batch-create teams + players usando SQL puro
  console.log("Creando equipos y jugadores en batch...");
  const existingLg=await db.query(
    'SELECT DISTINCT "leagueId" as lid,"homeTeamId" as tid FROM matches WHERE "leagueId" IS NOT NULL UNION SELECT DISTINCT "leagueId","awayTeamId" FROM matches WHERE "leagueId" IS NOT NULL',
    {type:QueryTypes.SELECT}
  );
  const lgTeamCount={};
  for(const r of existingLg){if(r.lid&&r.tid){if(!lgTeamCount[r.lid])lgTeamCount[r.lid]=new Set();lgTeamCount[r.lid].add(r.tid);}}

  // Build all teams to create as array, then batch insert
  const teamsToCreate=[];
  for(const lg of leagues){
    const sid=seasonMap[lg.id]; if(!sid) continue;
    const cur=(lgTeamCount[lg.id]||new Set()).size;
    const toCreate=Math.max(0,10-cur);
    for(let t=0;t<toCreate;t++){
      teamsToCreate.push({lgId:lg.id,sid,name:`${pick(TPFX)} ${pick(TSFX)} L${lg.id}T${t+1}`});
    }
  }
  console.log(`  Equipos a crear: ${teamsToCreate.length}`);

  // Insert teams in batch
  let newT=0,newP=0;
  const TCHUNK=50;
  const createdTeamIds=[];
  for(let i=0;i<teamsToCreate.length;i+=TCHUNK){
    const chunk=teamsToCreate.slice(i,i+TCHUNK);
    const vals=chunk.map(t=>`('${t.name}',${rnd(19,21)},${rnd(-99.5,-98.5)},'Campo ${t.name}',${defaultCoach},NOW(),NOW())`).join(",");
    const result=await db.query(`INSERT INTO teams (name,lat,lng,"fieldAddress","trainerId","createdAt","updatedAt") VALUES ${vals} RETURNING id`,{type:QueryTypes.SELECT});
    for(let j=0;j<result.length;j++){
      const teamId=result[j].id;
      createdTeamIds.push({teamId,lgId:teamsToCreate[i+j].lgId,sid:teamsToCreate[i+j].sid});
      newT++;
    }
    process.stdout.write(`\r  Equipos: ${Math.min(i+TCHUNK,teamsToCreate.length)}/${teamsToCreate.length}`);
  }
  console.log(`\n  ${newT} equipos creados`);

  // Batch insert team_league_stats
  if(createdTeamIds.length){
    const tlsVals=createdTeamIds.map(t=>`(${t.teamId},${t.lgId},NOW(),NOW())`).join(",");
    await db.query(`INSERT INTO team_league_stats ("teamId","leagueId","createdAt","updatedAt") VALUES ${tlsVals} ON CONFLICT DO NOTHING`,{type:QueryTypes.INSERT});
  }

  // Batch insert players for all new teams (15 per team)
  if(createdTeamIds.length){
    const playerVals=[];
    const ts=Date.now();
    for(const {teamId} of createdTeamIds){
      for(let p=0;p<5;p++){   // 5 jugadores por equipo (ahorro de espacio)
        const nm=`${pick(NAMES)} ${pick(LNAMES)}`;
        const em=`s${teamId}p${p}t${ts+p}@geo.test`;
        playerVals.push(`('${nm}','${em}','$2b$10$seedseedseedseedseedsu','player',0,NOW(),NOW())`);
      }
    }
    console.log(`  Insertando ${playerVals.length} jugadores...`);
    const insertedPlayers=[];
    for(let i=0;i<playerVals.length;i+=CHUNK){
      const chunk=playerVals.slice(i,i+CHUNK);
      const res=await db.query(`INSERT INTO users (name,email,password,role,"tokenVersion","createdAt","updatedAt") VALUES ${chunk.join(",")} ON CONFLICT DO NOTHING RETURNING id`,{type:QueryTypes.SELECT});
      insertedPlayers.push(...res.map(r=>r.id));
      newP+=res.length;
      process.stdout.write(`\r  Jugadores: ${newP}/${playerVals.length}`);
    }
    console.log(`\n  ${newP} jugadores creados`);

    // Batch assign players to teams (15 per team)
    const memberVals=[];
    for(let i=0;i<createdTeamIds.length;i++){
      const {teamId}=createdTeamIds[i];
      const pids=insertedPlayers.slice(i*15,(i+1)*15);
      for(const pid of pids) memberVals.push(`(${teamId},${pid},NOW(),NOW())`);
    }
    if(memberVals.length){
      for(let i=0;i<memberVals.length;i+=CHUNK){
        await db.query(`INSERT INTO team_members ("teamId","userId","createdAt","updatedAt") VALUES ${memberVals.slice(i,i+CHUNK).join(",")} ON CONFLICT DO NOTHING`,{type:QueryTypes.INSERT});
      }
      console.log(`  ${memberVals.length} miembros asignados`);
    }
  }

  // Reload data
  const allLgTeamsRow=await db.query(
    'SELECT "leagueId" as lid,"homeTeamId" as tid FROM matches WHERE "leagueId" IS NOT NULL UNION SELECT "leagueId","awayTeamId" FROM matches WHERE "leagueId" IS NOT NULL UNION SELECT "leagueId","teamId" FROM team_league_stats',
    {type:QueryTypes.SELECT}
  );
  const lgTeamsMap={};
  for(const r of allLgTeamsRow){if(r.lid&&r.tid){if(!lgTeamsMap[r.lid])lgTeamsMap[r.lid]=[];if(!lgTeamsMap[r.lid].includes(r.tid))lgTeamsMap[r.lid].push(r.tid);}}

  const memberRows=await db.query('SELECT "teamId","userId" FROM team_members',{type:QueryTypes.SELECT});
  const tp={};
  for(const m of memberRows){if(!tp[m.teamId])tp[m.teamId]=[];tp[m.teamId].push(m.userId);}
  const playerIdsAll=(await db.query("SELECT id FROM users WHERE role='player' ORDER BY id",{type:QueryTypes.SELECT})).map(r=>r.id);
  const fallback=playerIdsAll.slice(0,22);

  // 2. H2H masivo
  console.log("\nGenerando partidos H2H (5 pasados + 4 futuros por par)...");
  let pastC=0,futC=0;
  const MCOLS=`"homeTeamId","awayTeamId","leagueId","seasonId","played","homeScore","awayScore","date","roundName","type","createdAt","updatedAt"`;
  for(const lg of leagues){
    const sid=seasonMap[lg.id]; if(!sid) continue;
    const lgTeams=lgTeamsMap[lg.id]||[]; if(lgTeams.length<2) continue;
    const exPairs=await db.query(`SELECT CONCAT("homeTeamId",'-',"awayTeamId") as k,COUNT(*) as n FROM matches WHERE "leagueId"=${lg.id} GROUP BY 1`,{type:QueryTypes.SELECT});
    const pairCnt={}; for(const p of exPairs) pairCnt[p.k]=Number(p.n);
    const pastVals=[],futVals=[];
    for(let i=0;i<lgTeams.length;i++){for(let j=0;j<lgTeams.length;j++){
      if(i===j) continue;
      const a=lgTeams[i],b=lgTeams[j],ex=pairCnt[`${a}-${b}`]||0;
      for(let k=0;k<Math.max(0,3-ex);k++){const hg=rndInt(0,4),ag=rndInt(0,4),d=rndInt(7,300)+k*14;pastVals.push(`(${a},${b},${lg.id},${sid},true,${hg},${ag},NOW()-MAKE_INTERVAL(days=>${d}),'${pick(ROUNDS)}','league',NOW(),NOW())`);pastC++;}
      for(let k=0;k<2;k++){const d=rndInt(3,20)+k*7;futVals.push(`(${a},${b},${lg.id},${sid},false,0,0,NOW()+MAKE_INTERVAL(days=>${d}),'${pick(ROUNDS)}','league',NOW(),NOW())`);futC++;}
    }}
    for(let i=0;i<pastVals.length;i+=CHUNK) await db.query(`INSERT INTO matches (${MCOLS}) VALUES ${pastVals.slice(i,i+CHUNK).join(",")}`,{type:QueryTypes.INSERT});
    for(let i=0;i<futVals.length;i+=CHUNK) await db.query(`INSERT INTO matches (${MCOLS}) VALUES ${futVals.slice(i,i+CHUNK).join(",")}`,{type:QueryTypes.INSERT});
    process.stdout.write(`\r  ${pastC}p/${futC}f`);
  }
  console.log(`\n  ${pastC} pasados + ${futC} futuros`);

  // 3. Stats
  console.log("\nplayer_match_stats...");
  const newPlayed=await db.query(`SELECT m.id,"homeTeamId","awayTeamId" FROM matches m WHERE played=true AND NOT EXISTS(SELECT 1 FROM player_match_stats s WHERE s."matchId"=m.id) ORDER BY m.id`,{type:QueryTypes.SELECT});
  const SCOLS=`"matchId","teamId","playerId","minutesPlayed","passes","passesCompleted","keyPasses","shots","shotsOnTarget","goals","assists","yellowCards","redCards","distanceMeters","rating","createdAt","updatedAt"`;
  const sRows=[];
  for(const m of newPlayed){
    const hp=(tp[m.homeTeamId]||fallback.slice(0,11)).slice(0,11);
    const ap=(tp[m.awayTeamId]||fallback.slice(11,22)).slice(0,11);
    for(const[u,t]of[...hp.map(u=>[u,m.homeTeamId]),...ap.map(u=>[u,m.awayTeamId])]){
      sRows.push([m.id,t,u,rndInt(60,90),rndInt(20,80),rndInt(12,70),rndInt(0,4),rndInt(0,5),rndInt(0,3),rndInt(0,2),rndInt(0,2),Math.random()<0.15?1:0,Math.random()<0.03?1:0,rndInt(4000,12000),parseFloat(clamp(rnd(5,9.5),1,10).toFixed(2)),"NOW()","NOW()"]);
    }
  }
  for(let i=0;i<sRows.length;i+=CHUNK){
    await db.query(`INSERT INTO player_match_stats (${SCOLS}) VALUES ${sRows.slice(i,i+CHUNK).map(r=>`(${r.join(",")})`).join(",")} ON CONFLICT DO NOTHING`,{type:QueryTypes.INSERT});
    process.stdout.write(`\r  ${Math.min(i+CHUNK,sRows.length)}/${sRows.length}`);
  }
  console.log(`\n  ${sRows.length} stats`);

  // 4. MVP
  await db.query(`UPDATE matches m SET "mvpPlayerId"=sub."playerId" FROM (SELECT DISTINCT ON("matchId") "matchId","playerId" FROM player_match_stats ORDER BY "matchId",rating DESC) sub WHERE m.id=sub."matchId" AND m."mvpPlayerId" IS NULL`,{type:QueryTypes.UPDATE});
  console.log("MVP asignado");

  // 5. Squad players
  console.log("Squad players...");
  const noSquad=await db.query(`SELECT m.id,"homeTeamId","awayTeamId" FROM matches m WHERE played=true AND NOT EXISTS(SELECT 1 FROM match_squad_players s WHERE s."matchId"=m.id) ORDER BY m.id LIMIT 3000`,{type:QueryTypes.SELECT});
  const sqRows=[];
  for(const m of noSquad){
    const hp=(tp[m.homeTeamId]||fallback.slice(0,11)).slice(0,11);
    const ap=(tp[m.awayTeamId]||fallback.slice(11,22)).slice(0,11);
    [...hp.map((u,i)=>({u,t:m.homeTeamId,i})),...ap.map((u,i)=>({u,t:m.awayTeamId,i}))].forEach(({u,t,i})=>{
      sqRows.push([m.id,t,u,"'starter'","true",i+1,`'${POSITIONS[i]||"MID"}'`,"NOW()","NOW()"]);
    });
  }
  for(let i=0;i<sqRows.length;i+=CHUNK){
    await db.query(`INSERT INTO match_squad_players ("matchId","teamId","playerId","squadRole","isAvailable","jerseyNumber","position","createdAt","updatedAt") VALUES ${sqRows.slice(i,i+CHUNK).map(r=>`(${r.join(",")})`).join(",")} ON CONFLICT DO NOTHING`,{type:QueryTypes.INSERT});
    process.stdout.write(`\r  ${Math.min(i+CHUNK,sqRows.length)}/${sqRows.length}`);
  }
  console.log(`\n  ${sqRows.length} squad_players`);

  // 6. Eventos
  console.log("match_events...");
  const noEv=await db.query(`SELECT m.id,"homeTeamId","awayTeamId","leagueId" FROM matches m WHERE played=true AND "leagueId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM match_events e WHERE e."matchId"=m.id) ORDER BY m.id LIMIT 500`,{type:QueryTypes.SELECT});
  const ET=["goal","yellow_card","shot","pass","key_pass","interception","ball_out"];
  const evBatch=[];
  for(const m of noEv){
    const hp=(tp[m.homeTeamId]||fallback.slice(0,11)).slice(0,11);
    const ap=(tp[m.awayTeamId]||fallback.slice(11,22)).slice(0,11);
    for(let i=0;i<rndInt(8,16);i++){
      const isHome=Math.random()>0.5,pids=isHome?hp:ap; if(!pids.length)continue;
      const src=Math.random()<0.35?"inferred":"manual";
      evBatch.push({mid:m.id,lid:m.leagueId,tid:isHome?m.homeTeamId:m.awayTeamId,pid:pick(pids),et:pick(ET),min:rndInt(1,90),xs:parseFloat(rnd(0,100).toFixed(2)),ys:parseFloat(rnd(0,100).toFixed(2)),xe:parseFloat(rnd(0,100).toFixed(2)),ye:parseFloat(rnd(0,100).toFixed(2)),src,conf:parseFloat((src==="inferred"?rnd(0.55,0.9):1.0).toFixed(3)),meta:{requiresReview:src==="inferred"&&Math.random()<0.65,xg:parseFloat(rnd(0.02,0.45).toFixed(3))}});
    }
  }
  const EVC=80; let evDone=0;
  for(let i=0;i<evBatch.length;i+=EVC){
    const chunk=evBatch.slice(i,i+EVC);
    const ph=chunk.map((_,j)=>{const b=j*15;return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13}::jsonb,$${b+14},$${b+15})`;}).join(",");
    const binds=chunk.flatMap(r=>[r.mid,r.lid,r.tid,r.pid,r.et,r.min,r.xs,r.ys,r.xe,r.ye,r.src,r.conf,JSON.stringify(r.meta),new Date(),new Date()]);
    await db.query(`INSERT INTO match_events ("matchId","leagueId","teamId","playerId","eventType","minute","xStart","yStart","xEnd","yEnd","source","confidence","metadata","createdAt","updatedAt") VALUES ${ph} ON CONFLICT DO NOTHING`,{bind:binds,type:QueryTypes.INSERT});
    evDone+=chunk.length; process.stdout.write(`\r  ${evDone}/${evBatch.length}`);
  }
  console.log(`\n  ${evDone} eventos`);

  // 7. Tracking frames (limitado a 400 partidos)
  console.log("Tracking frames...");
  const noFrames=await db.query(`SELECT m.id,"homeTeamId","awayTeamId","leagueId" FROM matches m WHERE played=true AND "leagueId" IS NOT NULL AND NOT EXISTS(SELECT 1 FROM match_tracking_frames f WHERE f."matchId"=m.id) ORDER BY m.id LIMIT 100`,{type:QueryTypes.SELECT});
  let frDone=0;
  for(const m of noFrames){
    const hp=(tp[m.homeTeamId]||fallback.slice(0,11)).slice(0,11);
    const ap=(tp[m.awayTeamId]||fallback.slice(11,22)).slice(0,11);
    let bx=52.5,by=34; const frames=[];
    for(let f=0;f<50;f++){  // 50 frames por partido (ahorro espacio)
      bx=clamp(bx+rnd(-6,6),2,98); by=clamp(by+rnd(-4,4),2,98);
      const pl=JSON.stringify([...hp.slice(0,11).map((uid,i)=>({trackerId:uid,team:"home",x:parseFloat(clamp(bx-25+rnd(-15,15),0,100).toFixed(2)),y:parseFloat(((i/11)*100+rnd(-5,5)).toFixed(2)),speed:parseFloat(rnd(0,8).toFixed(2))})),...ap.slice(0,11).map((uid,i)=>({trackerId:uid,team:"away",x:parseFloat(clamp(bx+25+rnd(-15,15),0,100).toFixed(2)),y:parseFloat(((i/11)*100+rnd(-5,5)).toFixed(2)),speed:parseFloat(rnd(0,8).toFixed(2))}))]);
      frames.push({mid:m.id,lid:m.leagueId,ts:f*200,bx:parseFloat(bx.toFixed(2)),by:parseFloat(by.toFixed(2)),pl});
    }
    const ph=frames.map((_,j)=>{const b=j*8;return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6}::jsonb,$${b+7},$${b+8})`;}).join(",");
    const binds=frames.flatMap(r=>[r.mid,r.lid,r.ts,r.bx,r.by,r.pl,new Date(),new Date()]);
    await db.query(`INSERT INTO match_tracking_frames ("matchId","leagueId","timestampMs","ballX","ballY","players","createdAt","updatedAt") VALUES ${ph} ON CONFLICT DO NOTHING`,{bind:binds,type:QueryTypes.INSERT});
    frDone+=frames.length;
    process.stdout.write(`\r  ${frDone}fr (${noFrames.indexOf(m)+1}/${noFrames.length})`);
  }
  console.log(`\n  ${frDone} frames`);

  // 8. Elo + Awards
  const allTeams=await db.query("SELECT id FROM teams",{type:QueryTypes.SELECT});
  for(const t of allTeams){
    const rat=rndInt(1350,1720),gp=rndInt(8,30),hist=JSON.stringify(Array.from({length:Math.min(gp,15)},()=>rndInt(1280,1780)));
    await db.query(`INSERT INTO team_elo_ratings ("teamId",rating,"gamesPlayed","ratingHistory","createdAt","updatedAt") VALUES (:t,:r,:g,:h::jsonb,NOW(),NOW()) ON CONFLICT("teamId") DO UPDATE SET rating=:r,"gamesPlayed"=:g,"ratingHistory"=:h::jsonb,"updatedAt"=NOW()`,{replacements:{t:t.id,r:rat,g:gp,h:hist},type:QueryTypes.INSERT});
  }
  console.log(`Elo para ${allTeams.length} equipos`);

  const allTids=allTeams.map(t=>t.id); let awc=0;
  for(const lg of leagues){
    for(let w=0;w<10;w++){
      const ws=new Date(); ws.setDate(ws.getDate()-(w+1)*7);
      const we=new Date(ws); we.setDate(we.getDate()+6);
      try{await db.query(`INSERT INTO weekly_awards ("leagueId","weekStart","weekEnd","playerId","teamId","avgRating","matchesInWeek","createdAt","updatedAt") VALUES (:l,:ws,:we,:p,:t,:avg,:mw,NOW(),NOW())`,{replacements:{l:lg.id,ws:ws.toISOString().split("T")[0],we:we.toISOString().split("T")[0],p:pick(playerIdsAll),t:pick(allTids),avg:parseFloat(rnd(7.2,9.8).toFixed(2)),mw:rndInt(2,5)},type:QueryTypes.INSERT});awc++;}catch(_){}
    }
  }
  console.log(`${awc} weekly awards`);

  // Resumen
  console.log("\n=== RESUMEN ===");
  for(const t of ["leagues","teams","users","matches","player_match_stats","match_events","match_tracking_frames","match_squad_players","team_elo_ratings","weekly_awards"]){
    const [r]=await db.query(`SELECT COUNT(*) as n FROM ${t}`,{type:QueryTypes.SELECT});
    console.log(`  ${t}: ${r.n}`);
  }
  const [pl]=await db.query("SELECT COUNT(*) as n FROM matches WHERE played=true",{type:QueryTypes.SELECT});
  const [up]=await db.query("SELECT COUNT(*) as n FROM matches WHERE played=false",{type:QueryTypes.SELECT});
  const [h2h]=await db.query(`SELECT COUNT(*) as n FROM (SELECT "homeTeamId","awayTeamId" FROM matches WHERE played=true GROUP BY 1,2 HAVING COUNT(*)>=3) x`,{type:QueryTypes.SELECT});
  console.log(`\n  Jugados:${pl.n} | Proximos:${up.n} | H2H pares>=3:${h2h.n}`);
  console.log("\n=== COMPLETADO ===");
  await db.close();
}
run().catch(e=>{console.error("ERROR:",e.message);process.exit(1);});
