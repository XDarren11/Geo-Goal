/**
 * PlayerCareerService — Fase 8.A
 *
 * Agrega estadísticas de TODA la carrera del jugador a través de múltiples
 * partidos. Combina:
 *   - PlayerMatchStat (Fase 4)
 *   - MatchEvent.metadata.xg (Fase 5)
 *   - TrackingAnalyticsService.heatmaps (Fase 2)
 *   - Match.mvpPlayerId (Fase 4)
 *   - WeeklyAward (Fase 4)
 *
 * Soporta filtros por scope: seasonId, leagueId, teamId.
 * NO genera datos nuevos — solo agrega lo existente.
 */
import { Op, Sequelize } from "sequelize";
import { PlayerMatchStat } from "../models/PlayerMatchStat";
import { MatchEvent } from "../models/MatchEvent";
import { Match } from "../models/Match";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { WeeklyAward } from "../models/WeeklyAward";
import { TrackingAnalyticsService } from "./TrackingAnalyticsService";

const HEATMAP_W = 21;
const HEATMAP_H = 14;

export interface PlayerCareerScope {
  seasonId?: number;
  leagueId?: number;
  teamId?: number;
}

export interface PlayerCareerStats {
  player: { id: number; name: string };
  scope: PlayerCareerScope;

  // KPIs principales
  matchesPlayed: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  keyPasses: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passesCompleted: number;
  passAccuracy: number;
  yellowCards: number;
  redCards: number;
  fouls: number;
  distanceKm: number;
  avgRating: number;
  topRating: number;

  // Logros
  mvpCount: number;
  weeklyAwards: number;

  // xG acumulado y métrica derivada
  totalXG: number;
  goalsMinusXG: number; // overperformance positiva = "clutch"

  // Histórico de partidos (últimos N por defecto)
  recentForm: Array<{
    matchId: number;
    date: string | null;
    opponent: string;
    rating: number;
    goals: number;
    assists: number;
    minutes: number;
    result: "W" | "D" | "L" | "—";
    scoreFor: number;
    scoreAgainst: number;
  }>;

  // Heatmap acumulado (suma normalizada de heatmaps de cada partido)
  aggregatedHeatmap: number[][]; // grid 14x21

  // Ranking dentro del equipo (si scope.teamId está presente)
  teamRank: {
    rating: number | null;
    goals: number | null;
    assists: number | null;
  };
}

export class PlayerCareerService {
  static async getStats(
    playerId: number,
    scope: PlayerCareerScope = {},
    recentLimit: number = 10
  ): Promise<PlayerCareerStats> {
    // 1. Cargar jugador
    const user = await User.findByPk(playerId, { attributes: ["id", "name"] });

    // 2. Construir filtros para Match
    const matchWhere: any = {};
    if (scope.seasonId) matchWhere.seasonId = scope.seasonId;
    if (scope.leagueId) matchWhere.leagueId = scope.leagueId;

    // 3. Stats por partido del jugador
    const stats: any[] = await PlayerMatchStat.findAll({
      where: {
        playerId,
        ...(scope.teamId ? { teamId: scope.teamId } : {}),
      },
      include: [
        {
          model: Match,
          where: Object.keys(matchWhere).length ? matchWhere : undefined,
          required: true,
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
          ],
        },
      ],
      order: [[{ model: Match, as: "match" } as any, "date", "DESC"]],
    });

    // 4. Agregar KPIs
    const agg = stats.reduce(
      (acc, s) => ({
        matches: acc.matches + 1,
        minutes: acc.minutes + (s.minutesPlayed || 0),
        goals: acc.goals + (s.goals || 0),
        assists: acc.assists + (s.assists || 0),
        keyPasses: acc.keyPasses + (s.keyPasses || 0),
        shots: acc.shots + (s.shots || 0),
        shotsOnTarget: acc.shotsOnTarget + (s.shotsOnTarget || 0),
        passes: acc.passes + (s.passes || 0),
        passesCompleted: acc.passesCompleted + (s.passesCompleted || 0),
        yellowCards: acc.yellowCards + (s.yellowCards || 0),
        redCards: acc.redCards + (s.redCards || 0),
        distance: acc.distance + (s.distanceMeters || 0),
        ratingSum: acc.ratingSum + (s.rating || 0),
        ratingCount: acc.ratingCount + (s.rating ? 1 : 0),
        topRating: Math.max(acc.topRating, s.rating || 0),
      }),
      {
        matches: 0, minutes: 0, goals: 0, assists: 0, keyPasses: 0,
        shots: 0, shotsOnTarget: 0, passes: 0, passesCompleted: 0,
        yellowCards: 0, redCards: 0, distance: 0,
        ratingSum: 0, ratingCount: 0, topRating: 0,
      }
    );

    // 5. Faltas (vienen de MatchEvent, no de PlayerMatchStat)
    const matchIds = stats.map((s) => s.matchId);
    const fouls = matchIds.length
      ? await MatchEvent.count({
          where: { playerId, eventType: "foul", matchId: { [Op.in]: matchIds } },
        })
      : 0;

    // 6. xG acumulado desde MatchEvent.metadata.xg
    let totalXG = 0;
    if (matchIds.length) {
      const shotEvents = await MatchEvent.findAll({
        where: {
          playerId,
          eventType: { [Op.in]: ["shot", "goal", "penalty_scored"] },
          matchId: { [Op.in]: matchIds },
        },
        attributes: ["metadata"],
      });
      for (const e of shotEvents) {
        const meta = (e.metadata ?? {}) as Record<string, unknown>;
        const xg = Number((meta as any).xg);
        if (Number.isFinite(xg)) totalXG += xg;
      }
    }

    // 7. MVP count (Match.mvpPlayerId)
    const mvpWhere: any = { mvpPlayerId: playerId };
    if (scope.seasonId) mvpWhere.seasonId = scope.seasonId;
    if (scope.leagueId) mvpWhere.leagueId = scope.leagueId;
    const mvpCount = await Match.count({ where: mvpWhere });

    // 8. Weekly awards
    const weeklyAwardsWhere: any = { playerId };
    if (scope.leagueId) weeklyAwardsWhere.leagueId = scope.leagueId;
    const weeklyAwards = await WeeklyAward.count({ where: weeklyAwardsWhere });

    // 9. Forma reciente (últimos N partidos)
    const recentForm = stats.slice(0, recentLimit).map((s) => {
      const m = s.match;
      const home = m.homeTeam;
      const away = m.awayTeam;
      const isMyTeamHome = s.teamId === home?.id;
      const opp = isMyTeamHome ? away?.name : home?.name;
      const scoreFor = isMyTeamHome ? m.homeScore : m.awayScore;
      const scoreAgainst = isMyTeamHome ? m.awayScore : m.homeScore;
      let result: "W" | "D" | "L" | "—" = "—";
      if (m.played) {
        if (scoreFor > scoreAgainst) result = "W";
        else if (scoreFor < scoreAgainst) result = "L";
        else result = "D";
      }
      return {
        matchId: s.matchId,
        date: m.date ? new Date(m.date).toISOString() : null,
        opponent: opp ?? "—",
        rating: Number((s.rating ?? 0).toFixed(2)),
        goals: s.goals,
        assists: s.assists,
        minutes: s.minutesPlayed,
        result,
        scoreFor: scoreFor ?? 0,
        scoreAgainst: scoreAgainst ?? 0,
      };
    });

    // 10. Heatmap acumulado
    const aggregatedHeatmap = await this.aggregateHeatmap(playerId, matchIds);

    // 11. Ranking en su equipo (si scope.teamId)
    const teamRank: PlayerCareerStats["teamRank"] = {
      rating: null,
      goals: null,
      assists: null,
    };
    if (scope.teamId) {
      teamRank.rating = await this.computeRankInTeam(playerId, scope.teamId, "rating", "AVG");
      teamRank.goals = await this.computeRankInTeam(playerId, scope.teamId, "goals", "SUM");
      teamRank.assists = await this.computeRankInTeam(playerId, scope.teamId, "assists", "SUM");
    }

    return {
      player: { id: playerId, name: user?.name ?? "—" },
      scope,
      matchesPlayed: agg.matches,
      minutesPlayed: agg.minutes,
      goals: agg.goals,
      assists: agg.assists,
      keyPasses: agg.keyPasses,
      shots: agg.shots,
      shotsOnTarget: agg.shotsOnTarget,
      passes: agg.passes,
      passesCompleted: agg.passesCompleted,
      passAccuracy: agg.passes > 0 ? Number((agg.passesCompleted / agg.passes).toFixed(3)) : 0,
      yellowCards: agg.yellowCards,
      redCards: agg.redCards,
      fouls,
      distanceKm: Number((agg.distance / 1000).toFixed(2)),
      avgRating: agg.ratingCount > 0 ? Number((agg.ratingSum / agg.ratingCount).toFixed(2)) : 0,
      topRating: Number(agg.topRating.toFixed(2)),
      mvpCount,
      weeklyAwards,
      totalXG: Number(totalXG.toFixed(2)),
      goalsMinusXG: Number((agg.goals - totalXG).toFixed(2)),
      recentForm,
      aggregatedHeatmap,
      teamRank,
    };
  }

  /**
   * Suma los heatmaps individuales del jugador a través de todos los matchIds
   * dados y normaliza a 0-1.
   * Si TrackingAnalyticsService falla para algún partido, se ignora ese partido.
   */
  private static async aggregateHeatmap(
    playerId: number,
    matchIds: number[]
  ): Promise<number[][]> {
    const sum: number[][] = Array.from({ length: HEATMAP_H }, () =>
      Array(HEATMAP_W).fill(0)
    );

    let contributedMatches = 0;
    for (const mId of matchIds) {
      try {
        const analytics = await TrackingAnalyticsService.getOrCompute(mId);
        const heatmap = (analytics.heatmaps as any)?.[playerId];
        if (!Array.isArray(heatmap) || heatmap.length !== HEATMAP_H) continue;
        for (let y = 0; y < HEATMAP_H; y++) {
          const row = heatmap[y];
          if (!Array.isArray(row) || row.length !== HEATMAP_W) continue;
          for (let x = 0; x < HEATMAP_W; x++) {
            sum[y][x] += Number(row[x]) || 0;
          }
        }
        contributedMatches++;
      } catch {
        // ignore — partido sin tracking analytics aún
      }
    }

    if (contributedMatches === 0) return sum;

    // Normalizar 0-1
    let max = 0;
    for (const row of sum) {
      for (const v of row) if (v > max) max = v;
    }
    if (max > 0) {
      for (let y = 0; y < HEATMAP_H; y++) {
        for (let x = 0; x < HEATMAP_W; x++) {
          sum[y][x] = Number((sum[y][x] / max).toFixed(3));
        }
      }
    }
    return sum;
  }

  /**
   * Devuelve la posición (1-indexed) del jugador dentro de su equipo
   * ordenado por SUM(field) o AVG(field) descendente.
   */
  private static async computeRankInTeam(
    playerId: number,
    teamId: number,
    field: string,
    aggFn: "SUM" | "AVG"
  ): Promise<number | null> {
    try {
      const rows = await PlayerMatchStat.findAll({
        where: { teamId },
        attributes: [
          "playerId",
          [Sequelize.fn(aggFn, Sequelize.col(field)), "total"],
        ],
        group: ["playerId"],
        order: [[Sequelize.literal('"total"'), "DESC"]],
        raw: true,
      });
      const idx = rows.findIndex((r: any) => Number(r.playerId) === playerId);
      return idx >= 0 ? idx + 1 : null;
    } catch {
      return null;
    }
  }
}
