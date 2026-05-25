import cron from "node-cron";
import { Sequelize, Op } from "sequelize";
import { League } from "../models/League.js";
import { Match } from "../models/Match.js";
import { PlayerMatchStat } from "../models/PlayerMatchStat.js";
import { WeeklyAward } from "../models/WeeklyAward.js";
import { NotificationService } from "../services/NotificationService.js";
import { User } from "../models/User.js";
import { Team } from "../models/Team.js";

/**
 * Cron semanal: domingos a las 23:30 MX.
 * Determina el "Jugador de la Jornada" por liga y notifica al ganador.
 */
export function startWeeklyAwardsCron(): void {
  cron.schedule(
    "30 23 * * 0",
    async () => {
      console.log("[cron] weekly awards — start");
      try {
        const now = new Date();
        const weekEnd = new Date(now);
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 6);

        const leagues = await League.findAll({ attributes: ["id", "name"] });

        for (const league of leagues) {
          try {
            const matchesInWeek = await Match.findAll({
              where: {
                leagueId: league.id,
                played: true,
                date: { [Op.between]: [weekStart, weekEnd] },
              },
              attributes: ["id"],
            });

            if (matchesInWeek.length === 0) continue;
            const matchIds = matchesInWeek.map((m) => m.id);

            // Promedio de rating por jugador en la semana (mínimo 1 partido)
            const rows = (await PlayerMatchStat.findAll({
              where: { matchId: { [Op.in]: matchIds } },
              attributes: [
                "playerId",
                "teamId",
                [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"],
                [Sequelize.fn("COUNT", Sequelize.col("matchId")), "matchCount"],
              ],
              group: ["playerId", "teamId"],
              order: [[Sequelize.literal('"avgRating"'), "DESC"]],
              limit: 1,
              raw: true,
            })) as any[];

            if (!rows.length) continue;
            const top = rows[0];

            const avgRating = Number(top.avgRating);
            if (avgRating < 6.5) continue; // nadie merece el premio esta semana

            await WeeklyAward.upsert({
              leagueId: league.id,
              weekStart: weekStart.toISOString().slice(0, 10),
              weekEnd: weekEnd.toISOString().slice(0, 10),
              playerId: top.playerId,
              teamId: top.teamId,
              avgRating,
              matchesInWeek: Number(top.matchCount),
            });

            const leagueName = (league as any).name ?? `Liga ${league.id}`;
            await NotificationService.sendToUser(top.playerId, {
              type: "weekly_award",
              title: "🌟 Jugador de la Jornada",
              message: `Eres el mejor de la semana en ${leagueName} con rating ${avgRating.toFixed(2)}`,
              payload: { leagueId: league.id, weekStart: weekStart.toISOString() },
            });

            console.log(
              `[weekly-award] liga ${league.id}: playerId ${top.playerId} rating ${avgRating.toFixed(2)}`
            );
          } catch (e: any) {
            console.warn(`[weekly-award] liga ${league.id}: ${e.message}`);
          }
        }
      } catch (err) {
        console.error("[cron] weekly awards — ERROR:", err);
      }
      console.log("[cron] weekly awards — done");
    },
    { timezone: "America/Mexico_City" }
  );

  console.log("[cron] weekly awards registered (Sun 23:30 MX)");
}

