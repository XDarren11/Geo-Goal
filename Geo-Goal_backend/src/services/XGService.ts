/**
 * XGService — Fase 5.A
 * Calcula Expected Goals (xG) con fórmula logística calibrada
 * sobre datos públicos de fútbol profesional.
 */

import { Op } from "sequelize";
import { MatchEvent } from "../models/MatchEvent.js";

const GOAL_X = 100;          // coords normalizadas: portería derecha en x=100
const GOAL_Y_CENTER = 50;    // centro vertical
const PITCH_LENGTH_M = 105;
const PITCH_WIDTH_M = 68;
const GOAL_WIDTH_M = 7.32;

export class XGService {
  /**
   * Calcula xG para un tiro dado.
   * Coordenadas normalizadas 0-100.
   * Por defecto el ataque va hacia x=100.
   */
  static computeXG(params: {
    x: number;
    y: number;
    isPenalty?: boolean;
    isHeader?: boolean;
    attackingRight?: boolean; // false → ataque hacia x=0
  }): number {
    if (params.isPenalty) return 0.76;

    const attackingRight = params.attackingRight !== false;
    const targetX = attackingRight ? GOAL_X : 0;

    // Convertir a metros
    const dx_m = (targetX - params.x) * (PITCH_LENGTH_M / 100);
    const dy_m = (GOAL_Y_CENTER - params.y) * (PITCH_WIDTH_M / 100);
    const distance = Math.sqrt(dx_m * dx_m + dy_m * dy_m);

    // Ángulo al arco
    const angle = Math.atan2(GOAL_WIDTH_M, distance);

    let xg = 1 / (1 + Math.exp(3.5 - 0.1 * distance - 4 * angle));

    // Penalización cabezazo
    if (params.isHeader) xg *= 0.65;

    return Math.max(0.005, Math.min(0.99, Number(xg.toFixed(4))));
  }

  /**
   * Calcula y persiste xG en metadata de cada tiro del partido.
   * Devuelve totales por equipo.
   */
  static async computeForMatch(
    matchId: number
  ): Promise<{ totalXG: { home: number; away: number }; perPlayer: Record<number, number> }> {
    const shots = await MatchEvent.findAll({
      where: {
        matchId,
        eventType: { [Op.in]: ["shot", "goal", "penalty_scored", "penalty_missed"] },
      },
    });

    const totals = { home: 0, away: 0 };
    const perPlayer: Record<number, number> = {};

    for (const ev of shots) {
      const x = ev.xStart ?? null;
      const y = ev.yStart ?? null;
      if (x == null || y == null) continue;

      const meta = ((ev.metadata as Record<string, unknown>) || {});
      const xg = this.computeXG({
        x: Number(x),
        y: Number(y),
        isPenalty:
          ev.eventType === "penalty_scored" || ev.eventType === "penalty_missed",
        isHeader: meta.isHeader === true,
        attackingRight: meta.attackingRight !== false,
      });

      await ev.update({ metadata: { ...meta, xg } });

      // Agrupar por equipo (asumimos homeTeamId proviene de match, usamos metadata.side)
      if ((meta as any).side === "home") totals.home += xg;
      else totals.away += xg;

      if (ev.playerId) {
        perPlayer[ev.playerId] = Number(
          ((perPlayer[ev.playerId] || 0) + xg).toFixed(3)
        );
      }
    }

    totals.home = Number(totals.home.toFixed(3));
    totals.away = Number(totals.away.toFixed(3));
    return { totalXG: totals, perPlayer };
  }

  /**
   * Lee los tiros ya procesados (con metadata.xg) y devuelve sum xG por jugador.
   */
  static async playerXGForMatch(matchId: number): Promise<Record<number, number>> {
    const shots = await MatchEvent.findAll({
      where: {
        matchId,
        eventType: { [Op.in]: ["shot", "goal", "penalty_scored"] },
      },
    });
    const sums: Record<number, number> = {};
    for (const s of shots) {
      if (!s.playerId) continue;
      const xg = (s.metadata as any)?.xg ?? 0;
      sums[s.playerId] = Number(((sums[s.playerId] || 0) + xg).toFixed(3));
    }
    return sums;
  }

  /**
   * Devuelve la lista completa de tiros con su xG para el shot map.
   */
  static async shotsForMatch(matchId: number): Promise<
    Array<{
      playerId: number | null;
      teamId: number | null;
      eventType: string;
      x: number;
      y: number;
      xg: number;
      outcome: string;
      minute: number;
    }>
  > {
    const shots = await MatchEvent.findAll({
      where: {
        matchId,
        eventType: { [Op.in]: ["shot", "goal", "penalty_scored", "penalty_missed"] },
      },
      order: [["minute", "ASC"]],
    });

    return shots
      .map((s) => {
      const x = s.xStart ?? null;
      const y = s.yStart ?? null;
      if (x == null || y == null) return null;
        const meta = (s.metadata as any) || {};
        let outcome = "missed";
        if (s.eventType === "goal" || s.eventType === "penalty_scored") outcome = "goal";
        else if (meta.onTarget) outcome = "on_target";
        return {
          playerId: s.playerId ?? null,
          teamId: s.teamId ?? null,
          eventType: s.eventType,
          x: Number(x),
          y: Number(y),
          xg: meta.xg ?? this.computeXG({ x: Number(x), y: Number(y) }),
          outcome,
          minute: s.minute ?? 0,
        };
      })
      .filter(Boolean) as any[];
  }
}



