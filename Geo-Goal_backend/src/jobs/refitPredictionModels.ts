import cron from "node-cron";
import { League } from "../models/League";
import { DixonColesService } from "../services/DixonColesService";
export function startPredictionRefitCron(): void {
  cron.schedule("0 4 * * 0", async () => {
    console.log("[cron] prediction refit start");
    try {
      const leagues = await League.findAll({ attributes: ["id"] });
      for (const l of leagues) {
        try {
          await DixonColesService.fitLeague(l.id);
        } catch (e: any) {
          console.warn("[refit] liga " + l.id + ": " + e.message);
        }
      }
    } catch (err) {
      console.error("[cron] prediction refit ERROR:", err);
    }
  }, { timezone: "America/Mexico_City" });
  console.log("[cron] prediction refit registered (Sun 04:00 MX)");
}
