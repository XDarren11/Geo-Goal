import { Express } from "express";
import authRoutes from "./authRoutes";
import leagueRoutes from "./leagueRoutes";
import teamRoutes from "./teamRoutes";

/**
 * Registra todas las rutas de la API en la aplicación Express.
 * Mantiene un único punto de configuración de rutas.
 */
export function registerRoutes(app: Express): void {
  app.use("/api/auth", authRoutes);
  app.use("/api/league", leagueRoutes);
  app.use("/api/teams", teamRoutes);
}
