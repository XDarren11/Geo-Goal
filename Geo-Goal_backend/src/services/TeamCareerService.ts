/**
 * TeamCareerService — Fase 8.A
 *
 * Agrega estadísticas del equipo a lo largo de múltiples partidos.
 * Combina:
 *   - Match (W/D/L, GF/GC)
 *   - TeamMatchStat (Fase 4)
 *   - TeamEloRating + ratingHistory (Fase 3)
 *   - PlayerMatchStat (top scorers/assistants/rated)
 *   - TrackingAnalyticsService (posesión, formación, convex hull)
 *
 * Soporta filtros por scope: seasonId, leagueId.
 */
import { Op, Sequelize } from "sequelize";
import { Match } from "../models/Match";
import { Team } from "../models/Team";
import { TeamMatchStat } from "../models/TeamMatchStat";
import { TeamEloRating } from "../models/TeamEloRating";
import { PlayerMatchStat } from "../models/PlayerMatchStat";
import { User } from "../models/User";
import { TrackingAnalyticsService } from "./TrackingAnalyticsService";

export interface TeamCareerScope {
  seasonId?: number;
  leagueId?: number;
}

export interface TeamCareerStats {
  team: { id: number; name: string; logoUrl: string | null };
  scope: TeamCareerScope;

  // Resumen de liga
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  pointsPerMatch: number;

  // Avanzadas (promedios por partido)
  avgPossession: number;
  avgShotsPerMatch: number;
  avgPassAccuracy: number;
  avgDistanceTeamKm: number; // km totales del equipo por partido
  avgConvexHull: number; // m²
  avgDefensiveLine: number; // m

  // Elo
  eloRating: number;
  eloHistory: Array<{
    matchId: number;
    date: string | null;
    before: number;
    after: number;
    opponent: number;
  }>;

  // Formación
  formationDistribution: Record<string, number>;
  mostUsedFormation: string;

  // Top jugadores
  topScorers: Array<{ playerId: number; name: string; goals: number }>;
  topAssistants: Array<{ playerId: number; name: string; assists: number }>;
  topRated: Array<{ playerId: number; name: string; avgRating: number; matches: number }>;

  // Forma reciente
  recentForm: Array<{
    matchId: number;
    date: string | null;
    result: "W" | "D" | "L";
    scoreFor: number;
    scoreAgainst: number;
    opponent: string;
  }>;
  formStreak: string; // ej. "WWDLW"

  // Próximos partidos
  upcomingMatches: Array<{
    matchId: number;
    date: string | null;
    opponent: string;
    isHome: boolean;
  }>;
}

export class TeamCareerService {
  static async getStats(
    teamId: number,
    scope: TeamCareerScope = {}
  ): Promise<TeamCareerStats> {
    const team = await Team.findByPk(teamId, {
      attributes: ["id", "name", "logoUrl"],
    });
    if (!team) {
      throw new Error(`Team ${teamId} not found`);
    }

    // 1. Filtros para partidos jugados
    const matchWhere: any = {
      played: true,
      [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    };
    if (scope.seasonId) matchWhere.seasonId = scope.seasonId;
    if (scope.leagueId) matchWhere.leagueId = scope.leagueId;

    const matches: any[] = await Match.findAll({
      where: matchWhere,
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name"] },
      ],
      order: [["date", "DESC"]],
    });

    // 2. Agregar W/D/L
    let wins = 0,
      draws = 0,
      losses = 0,
      gf = 0,
      ga = 0;
    const recentForm: TeamCareerStats["recentForm"] = [];

    for (const m of matches) {
      const isHome = m.homeTeamId === teamId;
      const scoreFor = isHome ? m.homeScore : m.awayScore;
      const scoreAgainst = isHome ? m.awayScore : m.homeScore;
      gf += scoreFor || 0;
      ga += scoreAgainst || 0;

      let result: "W" | "D" | "L";
      if (scoreFor > scoreAgainst) {
        wins++;
        result = "W";
      } else if (scoreFor < scoreAgainst) {
        losses++;
        result = "L";
      } else {
        draws++;
        result = "D";
      }

      if (recentForm.length < 5) {
        recentForm.push({
          matchId: m.id,
          date: m.date ? new Date(m.date).toISOString() : null,
          result,
          scoreFor: scoreFor || 0,
          scoreAgainst: scoreAgainst || 0,
          opponent: (isHome ? m.awayTeam?.name : m.homeTeam?.name) ?? "—",
        });
      }
    }

    // 3. TeamMatchStat agregado
    const matchIds = matches.map((m) => m.id);
    const teamStats = matchIds.length
      ? await TeamMatchStat.findAll({
          where: { teamId, matchId: { [Op.in]: matchIds } },
        })
      : [];

    const avgShots =
      teamStats.length > 0
        ? teamStats.reduce((s, x) => s + (x.shots || 0), 0) / teamStats.length
        : 0;
    const totalPasses = teamStats.reduce((s, x) => s + (x.passes || 0), 0);
    const totalPassesCompleted = teamStats.reduce(
      (s, x) => s + (x.passesCompleted || 0),
      0
    );
    const avgPassAccuracy =
      totalPasses > 0 ? totalPassesCompleted / totalPasses : 0;
    const totalDistance = teamStats.reduce(
      (s, x) => s + (x.distanceMeters || 0),
      0
    );
    const avgDistanceKm =
      teamStats.length > 0 ? totalDistance / 1000 / teamStats.length : 0;

    // 4. Posesión + formación + hull + def line (de TrackingAnalyticsService)
    let possSum = 0,
      possCount = 0;
    let hullSum = 0,
      hullCount = 0;
    let defLineSum = 0,
      defLineCount = 0;
    const formationCounts: Record<string, number> = {};

    for (const m of matches) {
      try {
        const analytics = await TrackingAnalyticsService.getOrCompute(m.id);
        const isHome = m.homeTeamId === teamId;

        const possession = isHome
          ? analytics.possession?.home
          : analytics.possession?.away;
        if (typeof possession === "number") {
          possSum += possession;
          possCount += 1;
        }

        const formation = isHome
          ? analytics.observedFormation?.home
          : analytics.observedFormation?.away;
        if (formation && formation !== "?" && formation !== "—") {
          formationCounts[formation] = (formationCounts[formation] || 0) + 1;
        }

        const hull = isHome
          ? analytics.convexHull?.home
          : analytics.convexHull?.away;
        if (typeof hull === "number") {
          hullSum += hull;
          hullCount += 1;
        }

        const defLine = isHome
          ? analytics.defensiveLine?.home
          : analytics.defensiveLine?.away;
        if (typeof defLine === "number") {
          defLineSum += defLine;
          defLineCount += 1;
        }
      } catch {
        // partido sin tracking analytics — ignorar
      }
    }

    const mostUsedFormation =
      Object.entries(formationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "—";

    // 5. Elo
    const elo = await TeamEloRating.findByPk(teamId);
    const eloHistory = ((elo?.ratingHistory as any[]) ?? [])
      .slice(-15)
      .map((h: any) => ({
        matchId: Number(h.matchId),
        date: h.date ?? null,
        before: Number(h.before),
        after: Number(h.after),
        opponent: Number(h.opponent),
      }));

    // 6. Top jugadores
    const topScorersRaw = await this.topPlayers(teamId, matchIds, "goals", "SUM", 5);
    const topScorers = topScorersRaw.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      goals: Number((p as any).goals ?? 0),
    }));
    const topAssistantsRaw = await this.topPlayers(teamId, matchIds, "assists", "SUM", 5);
    const topAssistants = topAssistantsRaw.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      assists: Number((p as any).assists ?? 0),
    }));
    const topRated = await this.topRatedPlayers(teamId, matchIds, 5);

    // 7. Próximos partidos
    const upcoming = await Match.findAll({
      where: {
        played: false,
        date: { [Op.gte]: new Date() },
        [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        ...(scope.leagueId ? { leagueId: scope.leagueId } : {}),
        ...(scope.seasonId ? { seasonId: scope.seasonId } : {}),
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["name"] },
        { model: Team, as: "awayTeam", attributes: ["name"] },
      ],
      order: [["date", "ASC"]],
      limit: 3,
    });

    const total = matches.length;
    return {
      team: { id: team.id, name: team.name, logoUrl: team.logoUrl },
      scope,
      matchesPlayed: total,
      wins,
      draws,
      losses,
      points: wins * 3 + draws,
      goalsFor: gf,
      goalsAgainst: ga,
      goalDiff: gf - ga,
      pointsPerMatch: total > 0 ? Number(((wins * 3 + draws) / total).toFixed(2)) : 0,
      avgPossession: possCount > 0 ? Number((possSum / possCount).toFixed(3)) : 0.5,
      avgShotsPerMatch: Number(avgShots.toFixed(1)),
      avgPassAccuracy: Number(avgPassAccuracy.toFixed(3)),
      avgDistanceTeamKm: Number(avgDistanceKm.toFixed(2)),
      avgConvexHull: hullCount > 0 ? Number((hullSum / hullCount).toFixed(0)) : 0,
      avgDefensiveLine: defLineCount > 0 ? Number((defLineSum / defLineCount).toFixed(1)) : 0,
      eloRating: Math.round(elo?.rating ?? 1500),
      eloHistory,
      formationDistribution: formationCounts,
      mostUsedFormation,
      topScorers,
      topAssistants,
      topRated,
      recentForm,
      formStreak: recentForm.map((r) => r.result).reverse().join(""),
      upcomingMatches: upcoming.map((m: any) => ({
        matchId: m.id,
        date: m.date ? new Date(m.date).toISOString() : null,
        opponent: (m.homeTeamId === teamId ? m.awayTeam?.name : m.homeTeam?.name) ?? "—",
        isHome: m.homeTeamId === teamId,
      })),
    };
  }

  /** Helper: top N jugadores por SUM/AVG de un campo */
  private static async topPlayers(
    teamId: number,
    matchIds: number[],
    field: string,
    aggFn: "SUM" | "AVG",
    limit: number
  ): Promise<Array<{ playerId: number; name: string; [key: string]: any }>> {
    if (matchIds.length === 0) return [];

    const rows: any[] = await PlayerMatchStat.findAll({
      where: { teamId, matchId: { [Op.in]: matchIds } },
      attributes: [
        "playerId",
        [Sequelize.fn(aggFn, Sequelize.col(field)), "total"],
      ],
      group: ["playerId"],
      order: [[Sequelize.literal('"total"'), "DESC"]],
      limit,
      raw: true,
    });

    const ids = rows.map((r) => Number(r.playerId)).filter((n) => Number.isInteger(n) && n > 0);
    const users = await User.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ["id", "name"],
    });
    const nameMap = new Map(users.map((u) => [u.id, u.name]));

    const labelKey = field;
    return rows.map((r) => ({
      playerId: Number(r.playerId),
      name: nameMap.get(Number(r.playerId)) ?? "—",
      [labelKey]: Number(r.total),
    }));
  }

  /** Top rated: AVG(rating) con mínimo de partidos para evitar one-game wonders */
  private static async topRatedPlayers(
    teamId: number,
    matchIds: number[],
    limit: number
  ): Promise<TeamCareerStats["topRated"]> {
    if (matchIds.length === 0) return [];

    const rows: any[] = await PlayerMatchStat.findAll({
      where: { teamId, matchId: { [Op.in]: matchIds } },
      attributes: [
        "playerId",
        [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"],
        [Sequelize.fn("COUNT", Sequelize.col("matchId")), "matchCount"],
      ],
      group: ["playerId"],
      having: Sequelize.literal('COUNT("matchId") >= 2'),
      order: [[Sequelize.literal('"avgRating"'), "DESC"]],
      limit,
      raw: true,
    });

    const ids = rows.map((r) => Number(r.playerId)).filter((n) => Number.isInteger(n) && n > 0);
    const users = await User.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ["id", "name"],
    });
    const nameMap = new Map(users.map((u) => [u.id, u.name]));

    return rows.map((r) => ({
      playerId: Number(r.playerId),
      name: nameMap.get(Number(r.playerId)) ?? "—",
      avgRating: Number(Number(r.avgRating).toFixed(2)),
      matches: Number(r.matchCount),
    }));
  }
}
