import cron from "node-cron";
import { Op } from "sequelize";
import { Match } from "../models/Match";
import { Team } from "../models/Team";
import { NotificationService } from "../services/NotificationService";

/**
 * Cron diario: a las 8 AM notifica a players + followers de los partidos que se juegan HOY.
 * Se registra una sola vez al arrancar el servidor.
 */
export function startDailyReminderCron(): void {
  // "0 8 * * *" = todos los días a las 08:00
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log("[cron] daily match reminders — start");
      try {
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0
        );
        const endOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );

        const matchesToday = await Match.findAll({
          where: {
            date: { [Op.between]: [startOfDay, endOfDay] },
            played: false,
          },
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
          ],
        });

        console.log(`[cron] ${matchesToday.length} match(es) today`);

        for (const match of matchesToday) {
          const homeName = (match as any).homeTeam?.name ?? "Local";
          const awayName = (match as any).awayTeam?.name ?? "Visitante";
          const time = match.date
            ? new Date(match.date).toLocaleTimeString("es-MX", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "hora por confirmar";

          const notifPayload = {
            type: "match_reminder_today",
            title: `Hoy: ${homeName} vs ${awayName}`,
            message: `${match.roundName ?? "Partido"} a las ${time}`,
            payload: { matchId: match.id },
          };

          await Promise.all([
            NotificationService.broadcastToTeamFollowers(match.homeTeamId, notifPayload),
            NotificationService.broadcastToTeamFollowers(match.awayTeamId, notifPayload),
            NotificationService.notifyMatchParticipants(match.id, notifPayload),
          ]);
        }

        console.log("[cron] daily match reminders — done");
      } catch (err) {
        console.error("[cron] daily match reminders — ERROR:", err);
      }
    },
    { timezone: "America/Mexico_City" }
  );

  console.log("[cron] daily match reminders registered (08:00 MX)");
}

