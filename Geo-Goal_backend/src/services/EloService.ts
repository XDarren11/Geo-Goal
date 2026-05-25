/**
 * EloService — Fase 3.A
 *
 * Mantiene ratings Elo por equipo y predice resultados.
 *
 * Fórmulas:
 *   E_A = 1 / (1 + 10^((R_B + H - R_A) / 400))   H=100 si A es local
 *   R_A' = R_A + K · M · (S_A - E_A)
 *   K = 30, M = log(|goalDiff|+1)+1
 */

import { TeamEloRating } from "../models/TeamEloRating";
import { Match } from "../models/Match";

const K = 30;
const HOME_ADVANTAGE = 100;
const INITIAL_RATING = 1500;

export interface EloPrediction {
  home: { winProb: number; elo: number };
  draw: { prob: number };
  away: { winProb: number; elo: number };
}

export class EloService {
  /** Calcula probabilidades de victoria/empate/derrota para un partido pendiente. */
  static async predictMatch(matchId: number): Promise<EloPrediction> {
    const match = await Match.findByPk(matchId, {
      attributes: ["id", "homeTeamId", "awayTeamId"],
    });
    if (!match) throw new Error(`Match ${matchId} not found`);

    const [hr, ar] = await Promise.all([
      this._getOrInit(match.homeTeamId),
      this._getOrInit(match.awayTeamId),
    ]);

    const Eh = this._expected(hr.rating + HOME_ADVANTAGE, ar.rating);

    // Draw probability: empírica del fútbol — decrece cuando hay favorito claro
    const delta = Math.abs(hr.rating - ar.rating);
    const drawProb = Math.max(0.12, 0.30 - delta / 2000);

    const remaining = 1 - drawProb;
    return {
      home: { winProb: +(Eh * remaining).toFixed(3), elo: Math.round(hr.rating) },
      draw: { prob: +drawProb.toFixed(3) },
      away: { winProb: +((1 - Eh) * remaining).toFixed(3), elo: Math.round(ar.rating) },
    };
  }

  /** Actualiza ratings de ambos equipos tras un partido jugado. Idempotente. */
  static async updateAfterMatch(matchId: number): Promise<void> {
    const match = await Match.findByPk(matchId, {
      attributes: ["id", "homeTeamId", "awayTeamId", "homeScore", "awayScore", "played"],
    });
    if (!match?.played) return;

    const [hr, ar] = await Promise.all([
      this._getOrInit(match.homeTeamId),
      this._getOrInit(match.awayTeamId),
    ]);

    // Idempotencia: skip si ya procesamos este partido
    if (hr.lastMatchId === matchId || ar.lastMatchId === matchId) return;

    const Eh = this._expected(hr.rating + HOME_ADVANTAGE, ar.rating);
    const Ea = 1 - Eh;

    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const Sh = homeScore > awayScore ? 1 : homeScore < awayScore ? 0 : 0.5;
    const Sa = 1 - Sh;

    const margin = Math.log(Math.abs(homeScore - awayScore) + 1) + 1;

    const newHome = hr.rating + K * margin * (Sh - Eh);
    const newAway = ar.rating + K * margin * (Sa - Ea);

    await Promise.all([
      hr.update({
        rating: newHome,
        gamesPlayed: hr.gamesPlayed + 1,
        lastMatchId: matchId,
        ratingHistory: [
          ...hr.ratingHistory.slice(-49),
          { matchId, before: +hr.rating.toFixed(1), after: +newHome.toFixed(1), opponent: ar.teamId, result: Sh, date: new Date().toISOString() },
        ],
      }),
      ar.update({
        rating: newAway,
        gamesPlayed: ar.gamesPlayed + 1,
        lastMatchId: matchId,
        ratingHistory: [
          ...ar.ratingHistory.slice(-49),
          { matchId, before: +ar.rating.toFixed(1), after: +newAway.toFixed(1), opponent: hr.teamId, result: Sa, date: new Date().toISOString() },
        ],
      }),
    ]);

    console.log(
      `[elo] match ${matchId}: team ${match.homeTeamId} ${hr.rating.toFixed(0)}→${newHome.toFixed(0)} | ` +
      `team ${match.awayTeamId} ${ar.rating.toFixed(0)}→${newAway.toFixed(0)}`
    );
  }

  /** Re-computa todos los ratings recorriendo el historial ordenado de partidos de una liga. */
  static async rebuildLeague(leagueId: number): Promise<void> {
    const { Op } = await import("sequelize");
    const matches = await Match.findAll({
      where: { leagueId, played: true, homeScore: { [Op.ne]: null } },
      order: [["date", "ASC"]],
      attributes: ["id", "homeTeamId", "awayTeamId", "homeScore", "awayScore", "played"],
    });

    // Reset ratings de los equipos involucrados
    const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
    await TeamEloRating.destroy({ where: { teamId: teamIds } });

    // Reprocesar en orden cronológico (sin idempotencia, ya fueron borrados)
    for (const m of matches) {
      await this.updateAfterMatch(m.id);
    }
    console.log(`[elo] rebuild liga ${leagueId}: ${matches.length} partidos procesados`);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private static _expected(rA: number, rB: number): number {
    return 1 / (1 + Math.pow(10, (rB - rA) / 400));
  }

  private static async _getOrInit(teamId: number): Promise<TeamEloRating> {
    const [row] = await TeamEloRating.findOrCreate({
      where: { teamId },
      defaults: { teamId, rating: INITIAL_RATING, gamesPlayed: 0, ratingHistory: [] },
    });
    return row;
  }
}

