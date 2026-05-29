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
/** Límite de partidos para el heatmap acumulado.
 *  Calcular el heatmap de toda la carrera (100+ partidos) es O(N)
 *  y no aporta información adicional relevante (la normalización aplana todo).
 */
const HEATMAP_MATCH_LIMIT = 30;

export interface PlayerCareerScope {
  seasonId?: number;
  leagueId?: number;
  teamId?: number;
}

export interface PlayerCareerStats {
  player: { id: number; name: string; username: string | null };
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

  // Totales derivados — nombres alineados con publicAPI.ts del frontend
  totalXG: number;
  xG: number;           // alias de totalXG (compatibilidad frontend)
  goalsMinusXG: number;
  tackles: number;      // no está en el modelo → siempre 0

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
  /** Alias de recentForm para compatibilidad con frontend */
  recentMatches: PlayerCareerStats["recentForm"];

  /** Historial de rating en orden cronológico (máx. 30 partidos con rating) */
  ratingHistory: Array<{ date: string; rating: number }>;

  /** Equipos donde ha jugado, ordenados por partidos desc */
  topTeams: Array<{
    teamId: number;
    teamName: string;
    matches: number;
    goals: number;
    avgRating: number;
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
    // ── Paso 1: user + stats principales en paralelo ─────────────────────────
    const matchWhere: any = {};
    if (scope.seasonId) matchWhere.seasonId = scope.seasonId;
    if (scope.leagueId) matchWhere.leagueId = scope.leagueId;

    const [user, stats] = await Promise.all([
      User.findByPk(playerId, { attributes: ["id", "name", "username"] }),
      PlayerMatchStat.findAll({
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
      }),
    ]);

    // ── Paso 2: agregar KPIs en memoria ──────────────────────────────────────
    const agg = (stats as any[]).reduce(
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

    const matchIds = (stats as any[]).map((s) => s.matchId);

    // ── Paso 3: todas las queries independientes en paralelo ──────────────────
    const mvpWhere: any = { mvpPlayerId: playerId };
    if (scope.seasonId) mvpWhere.seasonId = scope.seasonId;
    if (scope.leagueId) mvpWhere.leagueId = scope.leagueId;

    const weeklyAwardsWhere: any = { playerId };
    if (scope.leagueId) weeklyAwardsWhere.leagueId = scope.leagueId;

    const hasMatches = matchIds.length > 0;

    const [fouls, shotEvents, mvpCount, weeklyAwards, rankTuple] =
      await Promise.all([
        // 3a. Faltas
        hasMatches
          ? MatchEvent.count({
              where: { playerId, eventType: "foul", matchId: { [Op.in]: matchIds } },
            })
          : Promise.resolve(0),

        // 3b. Eventos de disparo para xG
        hasMatches
          ? MatchEvent.findAll({
              where: {
                playerId,
                eventType: { [Op.in]: ["shot", "goal", "penalty_scored"] },
                matchId: { [Op.in]: matchIds },
              },
              attributes: ["metadata"],
            })
          : Promise.resolve([]),

        // 3c. MVPs
        Match.count({ where: mvpWhere }),

        // 3d. Premios semanales
        WeeklyAward.count({ where: weeklyAwardsWhere }),

        // NOTA: heatmap eliminado del flujo principal (→ endpoint /heatmap separado)

        // 3e. Ranking en equipo (3 queries en paralelo entre sí)
        scope.teamId
          ? Promise.all([
              this.computeRankInTeam(playerId, scope.teamId, "rating", "AVG"),
              this.computeRankInTeam(playerId, scope.teamId, "goals", "SUM"),
              this.computeRankInTeam(playerId, scope.teamId, "assists", "SUM"),
            ])
          : Promise.resolve([null, null, null] as [null, null, null]),
      ]);

    // ── Paso 4: calcular xG total ─────────────────────────────────────────────
    let totalXG = 0;
    for (const e of shotEvents as any[]) {
      const xg = Number(((e.metadata ?? {}) as any).xg);
      if (Number.isFinite(xg)) totalXG += xg;
    }

    // ── Paso 5: forma reciente (en memoria, sin queries adicionales) ───────────
    const recentForm = (stats as any[]).slice(0, recentLimit).map((s) => {
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

    const [rankRating, rankGoals, rankAssists] = rankTuple as [
      number | null,
      number | null,
      number | null
    ];

    // ── Paso 6: topTeams y ratingHistory (en memoria, sin queries extra) ──────

    // Equipos donde jugó: agrupamos TODOS los stats (no solo los recientes)
    const teamGrouped = new Map<
      number,
      { teamId: number; teamName: string; matches: number; goals: number; ratingSum: number; ratingCount: number }
    >();
    for (const s of stats as any[]) {
      const tid = s.teamId;
      const hTeam = s.match?.homeTeam;
      const aTeam = s.match?.awayTeam;
      const tName: string = (hTeam?.id === tid ? hTeam?.name : aTeam?.name) ?? "—";
      if (!teamGrouped.has(tid)) {
        teamGrouped.set(tid, { teamId: tid, teamName: tName, matches: 0, goals: 0, ratingSum: 0, ratingCount: 0 });
      }
      const tg = teamGrouped.get(tid)!;
      tg.matches++;
      tg.goals     += s.goals   || 0;
      tg.ratingSum += s.rating  || 0;
      if (s.rating) tg.ratingCount++;
    }
    const topTeams = Array.from(teamGrouped.values())
      .map((t) => ({
        teamId:    t.teamId,
        teamName:  t.teamName,
        matches:   t.matches,
        goals:     t.goals,
        avgRating: t.ratingCount > 0 ? Number((t.ratingSum / t.ratingCount).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.matches - a.matches);

    // Historial de rating en orden cronológico (los últimos 30 con rating > 0)
    const ratingHistory = (stats as any[])
      .slice(0, 30)
      .filter((s) => s.rating > 0)
      .reverse()
      .map((s) => ({
        date:   s.match?.date ? new Date(s.match.date).toISOString() : "",
        rating: Number((s.rating as number).toFixed(2)),
      }));

    return {
      player: { id: playerId, name: user?.name ?? "—", username: (user as any)?.username ?? null },
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
      passAccuracy:
        agg.passes > 0
          ? Number((agg.passesCompleted / agg.passes).toFixed(3))
          : 0,
      yellowCards: agg.yellowCards,
      redCards: agg.redCards,
      fouls: fouls as number,
      distanceKm: Number((agg.distance / 1000).toFixed(2)),
      avgRating:
        agg.ratingCount > 0
          ? Number((agg.ratingSum / agg.ratingCount).toFixed(2))
          : 0,
      topRating: Number(agg.topRating.toFixed(2)),
      mvpCount: mvpCount as number,
      weeklyAwards: weeklyAwards as number,
      totalXG:      Number(totalXG.toFixed(2)),
      xG:           Number(totalXG.toFixed(2)),  // alias para el frontend
      goalsMinusXG: Number((agg.goals - totalXG).toFixed(2)),
      tackles:      0,  // columna no existe en player_match_stats
      recentForm,
      recentMatches: recentForm,  // alias para el frontend
      ratingHistory,
      topTeams,
      aggregatedHeatmap: [], // heatmap disponible en GET /public/players/:id/heatmap
      teamRank: {
        rating: rankRating,
        goals: rankGoals,
        assists: rankAssists,
      },
    };
  }

  /**
   * Endpoint rápido: lee heatmaps SOLO de partidos ya cacheados.
   * Una sola query batch a match_analytics_cache — nunca dispara recomputación.
   *
   * @returns heatmap normalizado (0-1), matchesWithData, totalMatches
   */
  static async getHeatmapCached(
    playerId: number,
    scope: PlayerCareerScope = {}
  ): Promise<{
    heatmap: number[][];
    matchesWithData: number;
    totalMatches: number;
  }> {
    const { MatchAnalyticsCache } = await import("../models/MatchAnalyticsCache");

    const matchWhere: any = {};
    if (scope.seasonId) matchWhere.seasonId = scope.seasonId;
    if (scope.leagueId) matchWhere.leagueId = scope.leagueId;

    // 1. Obtener los matchIds del jugador (solo su stats)
    const statsRows = await PlayerMatchStat.findAll({
      where: {
        playerId,
        ...(scope.teamId ? { teamId: scope.teamId } : {}),
      },
      include: [
        {
          model: Match,
          where: Object.keys(matchWhere).length ? matchWhere : undefined,
          required: true,
          attributes: ["id"],
        },
      ],
      attributes: ["matchId"],
      order: [[{ model: Match, as: "match" } as any, "date", "DESC"]],
      limit: HEATMAP_MATCH_LIMIT,
    });

    const matchIds = (statsRows as any[]).map((s) => s.matchId);
    const totalMatches = matchIds.length;

    if (totalMatches === 0) {
      return {
        heatmap: Array.from({ length: HEATMAP_H }, () => Array(HEATMAP_W).fill(0)),
        matchesWithData: 0,
        totalMatches: 0,
      };
    }

    // 2. Una sola query batch — extrae SOLO la grilla del jugador vía JSONB path.
    //    Evita deserializar el payload completo (~MB) por partido.
    //    payload->'heatmaps'->'<playerId>' → devuelve el array 14×21 directamente.
    const { literal } = await import("sequelize");
    const cached = await MatchAnalyticsCache.findAll({
      where: { matchId: { [Op.in]: matchIds } },
      attributes: [
        "matchId",
        [literal(`payload->'heatmaps'->'${playerId}'`), "playerHeatmap"],
      ],
      raw: true,
    }) as unknown as Array<{ matchId: number; playerHeatmap: number[][] | null }>;

    // 3. Agregar heatmaps en memoria
    const sum: number[][] = Array.from({ length: HEATMAP_H }, () =>
      Array(HEATMAP_W).fill(0)
    );
    let matchesWithData = 0;

    for (const row of cached) {
      const heatmap = row.playerHeatmap;
      if (!Array.isArray(heatmap) || heatmap.length !== HEATMAP_H) continue;
      for (let y = 0; y < HEATMAP_H; y++) {
        const gridRow = heatmap[y];
        if (!Array.isArray(gridRow) || gridRow.length !== HEATMAP_W) continue;
        for (let x = 0; x < HEATMAP_W; x++) {
          sum[y][x] += Number(gridRow[x]) || 0;
        }
      }
      matchesWithData++;
    }

    if (matchesWithData === 0) {
      return { heatmap: sum, matchesWithData: 0, totalMatches };
    }

    // 4. Normalizar 0-1
    let max = 0;
    for (const row of sum) for (const v of row) if (v > max) max = v;
    if (max > 0) {
      for (let y = 0; y < HEATMAP_H; y++)
        for (let x = 0; x < HEATMAP_W; x++)
          sum[y][x] = Number((sum[y][x] / max).toFixed(3));
    }

    return { heatmap: sum, matchesWithData, totalMatches };
  }

  /**
   * Suma los heatmaps del jugador en paralelo y normaliza a 0-1.
   *
   * Optimizaciones vs versión original:
   *  1. Promise.allSettled — todas las queries de cache van en paralelo
   *     en lugar de una-a-una (el loop for-await era el principal cuello de botella).
   *  2. Cap de HEATMAP_MATCH_LIMIT partidos — calcular el heatmap de 200 partidos
   *     no aporta más información que los últimos 30 (la normalización los aplana).
   */
  private static async aggregateHeatmap(
    playerId: number,
    matchIds: number[]
  ): Promise<number[][]> {
    const sum: number[][] = Array.from({ length: HEATMAP_H }, () =>
      Array(HEATMAP_W).fill(0)
    );

    if (!matchIds.length) return sum;

    // Limitar a los últimos N partidos
    const limitedIds = matchIds.slice(0, HEATMAP_MATCH_LIMIT);

    // Queries en paralelo en lugar del antiguo for...of secuencial
    const results = await Promise.allSettled(
      limitedIds.map((mId) => TrackingAnalyticsService.getOrCompute(mId))
    );

    let contributedMatches = 0;
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const heatmap = (result.value.heatmaps as any)?.[playerId];
      if (!Array.isArray(heatmap) || heatmap.length !== HEATMAP_H) continue;
      for (let y = 0; y < HEATMAP_H; y++) {
        const row = heatmap[y];
        if (!Array.isArray(row) || row.length !== HEATMAP_W) continue;
        for (let x = 0; x < HEATMAP_W; x++) {
          sum[y][x] += Number(row[x]) || 0;
        }
      }
      contributedMatches++;
    }

    if (contributedMatches === 0) return sum;

    // Normalizar 0-1
    let max = 0;
    for (const row of sum) for (const v of row) if (v > max) max = v;
    if (max > 0) {
      for (let y = 0; y < HEATMAP_H; y++)
        for (let x = 0; x < HEATMAP_W; x++)
          sum[y][x] = Number((sum[y][x] / max).toFixed(3));
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
