/**
 * DixonColesService — Fase 3.B
 *
 * Ajusta un modelo Poisson-Dixon-Coles por liga y predice marcadores exactos.
 *
 * Modelo:
 *   λ_home = α_home · β_away · γ
 *   λ_away = α_away · β_home
 *   P(i,j) = τ(i,j) · Poisson(i,λ_home) · Poisson(j,λ_away)
 *
 * τ: corrección para 0-0, 1-0, 0-1, 1-1 (Poisson sobrestima estos marcadores)
 */

import { Op } from "sequelize";
import { Match } from "../models/Match";
import { LeaguePredictionModel } from "../models/LeaguePredictionModel";

interface TeamParams { alpha: number; beta: number }

interface ScoreProb { score: string; prob: number }

export interface DixonColesPrediction {
  expectedGoals: { home: number; away: number };
  outcomes: { homeWin: number; draw: number; awayWin: number };
  topScores: ScoreProb[];
}

// Factorial memoizado (suficiente para 0-10)
const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];
const fact = (n: number) => FACT[n] ?? FACT[FACT.length - 1];

function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return Math.pow(lambda, k) * Math.exp(-lambda) / fact(k);
}

function dcTau(i: number, j: number, lH: number, lA: number, rho: number): number {
  if (i === 0 && j === 0) return 1 - lH * lA * rho;
  if (i === 0 && j === 1) return 1 + lH * rho;
  if (i === 1 && j === 0) return 1 + lA * rho;
  if (i === 1 && j === 1) return 1 - rho;
  return 1;
}

export class DixonColesService {
  /**
   * Ajusta el modelo para una liga.
   * Usa descenso de gradiente con 200 iteraciones sobre NLL Poisson.
   * Para ligas con <10 partidos lanza error (no hay suficientes datos).
   */
  static async fitLeague(leagueId: number): Promise<{ matchesUsed: number; loss: number }> {
    const matches = await Match.findAll({
      where: {
        leagueId,
        played: true,
        homeScore: { [Op.ne]: null },
        awayScore: { [Op.ne]: null },
      },
      attributes: ["id", "homeTeamId", "awayTeamId", "homeScore", "awayScore"],
    });

    if (matches.length < 10) {
      throw new Error(
        `Liga ${leagueId}: ${matches.length} partidos jugados (mínimo 10)`
      );
    }

    const teamIds = [...new Set(matches.flatMap((m) => [m.homeTeamId, m.awayTeamId]))];
    const params: Record<number, TeamParams> = {};
    teamIds.forEach((id) => (params[id] = { alpha: 1.0, beta: 1.0 }));

    const LR = 0.005;
    const ITERS = 200;
    let loss = 0;

    for (let iter = 0; iter < ITERS; iter++) {
      loss = 0;
      const grads: Record<number, TeamParams> = {};
      teamIds.forEach((id) => (grads[id] = { alpha: 0, beta: 0 }));

      for (const m of matches) {
        const aH = params[m.homeTeamId].alpha;
        const bA = params[m.awayTeamId].beta;
        const aA = params[m.awayTeamId].alpha;
        const bH = params[m.homeTeamId].beta;

        const lH = aH * bA * 1.3;
        const lA = aA * bH;

        const i = m.homeScore ?? 0;
        const j = m.awayScore ?? 0;

        // log-likelihood Poisson (gradiente analítico)
        if (lH > 0 && lA > 0) {
          const ll = i * Math.log(lH) - lH + j * Math.log(lA) - lA;
          loss -= ll;
          // ∂(-ll)/∂α_H = bA·γ - i/α_H
          grads[m.homeTeamId].alpha += bA * 1.3 - i / aH;
          // ∂(-ll)/∂β_A = aH·γ - i/β_A
          grads[m.awayTeamId].beta += aH * 1.3 - i / bA;
          // ∂(-ll)/∂α_A = bH - j/α_A
          grads[m.awayTeamId].alpha += bH - j / aA;
          // ∂(-ll)/∂β_H = aA - j/β_H
          grads[m.homeTeamId].beta += aA - j / bH;
        }
      }

      const n = matches.length;
      for (const id of teamIds) {
        params[id].alpha = Math.max(0.05, params[id].alpha - LR * grads[id].alpha / n);
        params[id].beta = Math.max(0.05, params[id].beta - LR * grads[id].beta / n);
      }
    }

    await LeaguePredictionModel.upsert({
      leagueId,
      teamParams: params as unknown as Record<string, unknown>,
      homeAdvantage: 1.3,
      rho: -0.1,
      loss,
      fittedAt: new Date(),
      matchesUsed: matches.length,
    });

    console.log(
      `[dixon-coles] liga ${leagueId}: fit con ${matches.length} partidos, loss=${loss.toFixed(2)}`
    );
    return { matchesUsed: matches.length, loss };
  }

  /**
   * Predice un partido usando el modelo de su liga.
   * Si no hay modelo ajustado, lanza error (capturado en el endpoint para devolver null).
   */
  static async predictMatch(matchId: number): Promise<DixonColesPrediction> {
    const match = await Match.findByPk(matchId, {
      attributes: ["id", "leagueId", "homeTeamId", "awayTeamId"],
    });
    if (!match?.leagueId) throw new Error("Match sin liga");

    const model = await LeaguePredictionModel.findByPk(match.leagueId);
    if (!model) throw new Error(`Modelo no ajustado para liga ${match.leagueId}`);

    const p = model.teamParams as Record<string, TeamParams>;
    const home = p[String(match.homeTeamId)];
    const away = p[String(match.awayTeamId)];
    if (!home || !away) throw new Error("Equipos sin parámetros en el modelo");

    const lH = home.alpha * away.beta * model.homeAdvantage;
    const lA = away.alpha * home.beta;
    const rho = model.rho;

    const MAX = 10;
    let homeWin = 0, draw = 0, awayWin = 0;
    const flat: ScoreProb[] = [];

    for (let i = 0; i <= MAX; i++) {
      for (let j = 0; j <= MAX; j++) {
        const p =
          poissonPmf(lH, i) *
          poissonPmf(lA, j) *
          dcTau(i, j, lH, lA, rho);
        flat.push({ score: `${i}-${j}`, prob: p });
        if (i > j) homeWin += p;
        else if (i < j) awayWin += p;
        else draw += p;
      }
    }

    // Normalizar (τ hace que la suma no sea exactamente 1)
    const total = homeWin + draw + awayWin || 1;
    flat.sort((a, b) => b.prob - a.prob);

    return {
      expectedGoals: { home: +lH.toFixed(2), away: +lA.toFixed(2) },
      outcomes: {
        homeWin: +(homeWin / total).toFixed(3),
        draw: +(draw / total).toFixed(3),
        awayWin: +(awayWin / total).toFixed(3),
      },
      topScores: flat.slice(0, 5).map((s) => ({
        score: s.score,
        prob: +(s.prob / total).toFixed(3),
      })),
    };
  }
}


