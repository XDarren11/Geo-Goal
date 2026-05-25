import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import { corsConfig } from "./config/cors";
import { connectDB } from "./config/db";
import { registerRoutes } from "./routes";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";
import { startDailyReminderCron } from "./jobs/dailyMatchReminders";
import { startPredictionRefitCron } from "./jobs/refitPredictionModels";
import { startWeeklyAwardsCron } from "./jobs/weeklyAwards";

dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

connectDB();
startDailyReminderCron();
startPredictionRefitCron();
startWeeklyAwardsCron();

const app = express();

app.use(cors(corsConfig));
app.use(morgan("dev"));
// Límite alto para aceptar batches de tracking frames del AI service.
// Un partido de 90 min con frame_skip=4 genera ~33k frames ≈ 9 MB de JSON.
// 50mb deja margen para videos largos o frame_skip=0.
app.use(express.json({ limit: "50mb" }));

registerRoutes(app);
setupSwagger(app);

app.use(errorHandler);

export default app;;
