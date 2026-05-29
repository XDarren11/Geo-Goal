/**
 * PlayerSimilarityService — Fase 6.D
 * Encuentra jugadores con perfil estadístico similar usando cosine distance.
 */

import { Op } from "sequelize";
import { PlayerMatchStat } from "../models/PlayerMatchStat.js";
import { User } from "../models/User.js";

export class PlayerSimilarityService {
  /**
   * Encuentra los N jugadores más similares a un jugador dado.
   * Requiere al menos 3 partidos jugados para incluir a un jugador en el pool.
   */
  static async findSimilar(
    playerId: number,
    limit = 5
  ): Promise<Array<{ playerId: number; name: string; similarity: number }>> {
    const targetVec = await this.buildVector(playerId);
    if (!targetVec) return [];

    // Todos los jugadores con ≥3 partidos
    const rows = (await PlayerMatchStat.findAll({
      attributes: ["playerId"],
      group: ["playerId"],
      raw: true,
    })) as any[];

    const others: Array<{ playerId: number; similarity: number }> = [];

    for (const row of rows) {
      if (row.playerId === playerId) continue;
      const v = await this.buildVector(row.playerId);
      if (!v) continue;
      const sim = this.cosine(targetVec, v);
      if (!isNaN(sim)) others.push({ playerId: row.playerId, similarity: sim });
    }

    others.sort((a, b) => b.similarity - a.similarity);
    const top = others.slice(0, limit);

    const users = await User.findAll({
      where: { id: { [Op.in]: top.map((t) => t.playerId) } },
      attributes: ["id", "name"],
    });
    const nameMap = new Map(users.map((u) => [u.id, u.name]));

    return top.map((t) => ({
      playerId: t.playerId,
      name: nameMap.get(t.playerId) ?? "?",
      similarity: Number(t.similarity.toFixed(3)),
    }));
  }

  /**
   * Construye el vector de features de un jugador (normalizado por minutos).
   * [goalsPerMatch, assistsPerMatch, passesCompletedPerMatch, distanceKmPerMatch, avgRating, shotsPerMatch]
   */
  private static async buildVector(playerId: number): Promise<number[] | null> {
    const stats = await PlayerMatchStat.findAll({
      where: { playerId },
      attributes: ["goals", "assists", "passesCompleted", "distanceMeters", "rating", "shots", "minutesPlayed"],
    });
    if (stats.length < 1) return null;

    const n = stats.length;
    const minutesTotal = stats.reduce((s, x) => s + (x.minutesPlayed || 0), 0) || n * 90;
    const minutesNorm = minutesTotal / 90;

    return [
      stats.reduce((s, x) => s + (x.goals || 0), 0) / minutesNorm,
      stats.reduce((s, x) => s + (x.assists || 0), 0) / minutesNorm,
      stats.reduce((s, x) => s + (x.passesCompleted || 0), 0) / minutesNorm,
      stats.reduce((s, x) => s + ((x.distanceMeters || 0) / 1000), 0) / minutesNorm,
      stats.reduce((s, x) => s + (x.rating || 6), 0) / n,
      stats.reduce((s, x) => s + (x.shots || 0), 0) / minutesNorm,
    ];
  }

  private static cosine(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] ** 2;
      normB += b[i] ** 2;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

