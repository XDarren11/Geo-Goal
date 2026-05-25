/**
 * XTService — Fase 5.C
 * Expected Threat basado en la matriz pre-computada de Karun Singh.
 * https://karun.in/blog/expected-threat.html
 */

import { Op } from "sequelize";
import { MatchEvent } from "../models/MatchEvent";

// Matriz xT 8 filas × 12 columnas (fila 0 = banda inferior, col 0 = zona de portería propia)
// Fuente: Karun Singh, adaptada a orientación x izq→der (equipo ataca hacia col 11)
const XT_GRID: number[][] = [
  [0.006, 0.008, 0.010, 0.012, 0.015, 0.018, 0.022, 0.027, 0.034, 0.044, 0.062, 0.115],
  [0.007, 0.009, 0.011, 0.014, 0.017, 0.021, 0.026, 0.032, 0.041, 0.054, 0.078, 0.155],
  [0.008, 0.010, 0.013, 0.016, 0.020, 0.024, 0.030, 0.038, 0.049, 0.066, 0.099, 0.218],
  [0.009, 0.011, 0.014, 0.018, 0.022, 0.027, 0.034, 0.043, 0.057, 0.078, 0.122, 0.270],
  [0.009, 0.011, 0.014, 0.018, 0.022, 0.027, 0.034, 0.043, 0.057, 0.078, 0.122, 0.270],
  [0.008, 0.010, 0.013, 0.016, 0.020, 0.024, 0.030, 0.038, 0.049, 0.066, 0.099, 0.218],
  [0.007, 0.009, 0.011, 0.014, 0.017, 0.021, 0.026, 0.032, 0.041, 0.054, 0.078, 0.155],
  [0.006, 0.008, 0.010, 0.012, 0.015, 0.018, 0.022, 0.027, 0.034, 0.044, 0.062, 0.115],
];

const COLS = 12;
const ROWS = 8;

export class XTService {
  /**
   * Devuelve el valor xT de una posición (coords normalizadas 0-100).
   * attackingRight=true → equipo ataca hacia x=100 (columna alta del grid).
   */
  static xTAt(x: number, y: number, attackingRight = true): number {
    const xEff = attackingRight ? x : 100 - x;
    const col = Math.max(0, Math.min(COLS - 1, Math.floor((xEff / 100) * COLS)));
    const row = Math.max(0, Math.min(ROWS - 1, Math.floor((y / 100) * ROWS)));
    return XT_GRID[row][col];
  }

  /**
   * Calcula xT ganado por pase para cada jugador del partido.
   * Solo cuenta pases exitosos que aumentan la peligrosidad (delta > 0).
   */
  static async computeForMatch(
    matchId: number
  ): Promise<{
    perPlayer: Record<number, number>;
    perTeam: Record<number, number>;
    topPasses: Array<{
      playerId: number;
      teamId: number | null;
      xStart: number;
      yStart: number;
      xEnd: number;
      yEnd: number;
      xtDelta: number;
      minute: number;
    }>;
  }> {
    const passes = await MatchEvent.findAll({
      where: {
        matchId,
        eventType: { [Op.in]: ["pass", "key_pass", "cross"] },
        xStart: { [Op.ne]: null },
        yStart: { [Op.ne]: null },
        xEnd: { [Op.ne]: null },
        yEnd: { [Op.ne]: null },
      },
      order: [["minute", "ASC"]],
    });

    const perPlayer: Record<number, number> = {};
    const perTeam: Record<number, number> = {};
    const topPasses: any[] = [];

    for (const p of passes) {
      if (!p.playerId) continue;
      const meta = (p.metadata as any) || {};
      const attackingRight = meta.attackingRight !== false;

      const xtOrigin = this.xTAt(p.xStart!, p.yStart!, attackingRight);
      const xtTarget = this.xTAt(p.xEnd!, p.yEnd!, attackingRight);
      const delta = xtTarget - xtOrigin;
      if (delta <= 0) continue; // solo pases que aumentan peligrosidad

      perPlayer[p.playerId] = (perPlayer[p.playerId] || 0) + delta;
      if (p.teamId) perTeam[p.teamId] = (perTeam[p.teamId] || 0) + delta;

      topPasses.push({
        playerId: p.playerId,
        teamId: p.teamId ?? null,
        xStart: p.xStart!,
        yStart: p.yStart!,
        xEnd: p.xEnd!,
        yEnd: p.yEnd!,
        xtDelta: Number(delta.toFixed(4)),
        minute: p.minute ?? 0,
      });
    }

    // Redondear
    Object.keys(perPlayer).forEach((k) => {
      perPlayer[Number(k)] = Number(perPlayer[Number(k)].toFixed(4));
    });
    Object.keys(perTeam).forEach((k) => {
      perTeam[Number(k)] = Number(perTeam[Number(k)].toFixed(4));
    });

    // Top 20 pases más peligrosos
    topPasses.sort((a, b) => b.xtDelta - a.xtDelta);

    return { perPlayer, perTeam, topPasses: topPasses.slice(0, 20) };
  }
}

