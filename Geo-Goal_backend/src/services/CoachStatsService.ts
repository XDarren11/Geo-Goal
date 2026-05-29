/**
 * CoachStatsService — Fase 8.A (revisado)
 *
 * teamsManaged ahora viene del historial de partidos (homeCoachId / awayCoachId),
 * no solo de Team.trainerId. Así se incluyen todos los equipos dirigidos,
 * incluyendo los históricos.
 *
 * Cambios de nombres alineados con publicAPI.ts del frontend:
 *  - avgGoalsFor / avgGoalsAgainst  (era avgGoalsScored / avgGoalsConceded)
 *  - topFormedPlayers               (era topPlayersFormed)
 *  - topFormedPlayers[].goals       (era matchesUnderCoach)
 *  - teamsManaged[].teamId / teamName / matches / wins / draws / losses
 */
import { Op, Sequelize } from "sequelize";
import { User } from "../models/User";
import { Team } from "../models/Team";
import { Match } from "../models/Match";
import { MatchDetail } from "../models/MatchDetail";
import { PlayerMatchStat } from "../models/PlayerMatchStat";
import { TeamEloRating } from "../models/TeamEloRating";

export interface CoachStats {
  coach: { id: number; name: string };

  /** Todos los equipos dirigidos (histórico), con stats por equipo */
  teamsManaged: Array<{
    teamId: number;
    teamName: string;
    logoUrl: string | null;
    currentElo: number;
    matches: number;
    wins: number;
    draws: number;
    losses: number;
  }>;

  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  pointsPerMatch: number;

  formationDistribution: Record<string, number>;
  mostUsedFormation: string;
  avgGoalsFor: number;      // GF promedio por partido
  avgGoalsAgainst: number;  // GC promedio por partido
  attackingIndex: number;   // GF / (GF + GC)

  topFormedPlayers: Array<{
    playerId: number;
    name: string;
    avgRating: number;
    goals: number;
  }>;

  recentResults: Array<{
    matchId: number;
    date: string | null;
    result: "W" | "D" | "L";
    teamId: number;
    opponentName: string;
    score: string;
  }>;
}

export class CoachStatsService {
  static async getStats(coachId: number): Promise<CoachStats> {
    // ── Paso 1: coach + partidos donde fue coach (home o away) en paralelo ──
    const [coach, detailsHome, detailsAway] = await Promise.all([
      User.findByPk(coachId, { attributes: ["id", "name"] }),
      MatchDetail.findAll({ where: { homeCoachId: coachId }, attributes: ["matchId"] }),
      MatchDetail.findAll({ where: { awayCoachId: coachId }, attributes: ["matchId"] }),
    ]);

    if (!coach) throw new Error(`Coach ${coachId} not found`);

    const coachedMatchIds = Array.from(
      new Set([
        ...(detailsHome as any[]).map((d) => d.matchId),
        ...(detailsAway as any[]).map((d) => d.matchId),
      ])
    );

    // ── Paso 2: cargar partidos con detalles de equipos ──────────────────────
    const matches = coachedMatchIds.length
      ? await Match.findAll({
          where: { id: { [Op.in]: coachedMatchIds }, played: true },
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
            {
              model: MatchDetail,
              attributes: ["homeCoachId", "awayCoachId", "homeFormation", "awayFormation"],
            },
          ],
          order: [["date", "DESC"]],
        })
      : [];

    // ── Paso 3: agregar en memoria ────────────────────────────────────────────
    let wins = 0, draws = 0, losses = 0, gs = 0, gc = 0;
    const formationCounts: Record<string, number> = {};
    const recentResults: CoachStats["recentResults"] = [];

    // teamsManaged viene de historial, no de trainerId
    const teamStatsMap = new Map<
      number,
      { teamId: number; teamName: string; matches: number; wins: number; draws: number; losses: number }
    >();

    for (const m of matches as any[]) {
      const detail = m.detail ?? m.MatchDetail ?? null;
      const isHomeCoach = detail?.homeCoachId === coachId;
      const isAwayCoach = detail?.awayCoachId === coachId;
      if (!isHomeCoach && !isAwayCoach) continue;

      const myScore  = isHomeCoach ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const oppScore = isHomeCoach ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      gs += myScore;
      gc += oppScore;

      let result: "W" | "D" | "L";
      if (myScore > oppScore)      { wins++;   result = "W"; }
      else if (myScore < oppScore) { losses++; result = "L"; }
      else                         { draws++;  result = "D"; }

      const myFormation = isHomeCoach ? detail?.homeFormation : detail?.awayFormation;
      if (myFormation) formationCounts[myFormation] = (formationCounts[myFormation] || 0) + 1;

      if (recentResults.length < 10) {
        recentResults.push({
          matchId:      m.id,
          date:         m.date ? new Date(m.date).toISOString() : null,
          result,
          teamId:       isHomeCoach ? m.homeTeamId : m.awayTeamId,
          opponentName: (isHomeCoach ? m.awayTeam?.name : m.homeTeam?.name) ?? "—",
          score:        `${myScore}-${oppScore}`,
        });
      }

      // Acumular estadísticas por equipo
      const myTeamId   = isHomeCoach ? m.homeTeamId : m.awayTeamId;
      const myTeamName = ((isHomeCoach ? m.homeTeam?.name : m.awayTeam?.name) ?? "—") as string;

      if (!teamStatsMap.has(myTeamId)) {
        teamStatsMap.set(myTeamId, {
          teamId: myTeamId, teamName: myTeamName,
          matches: 0, wins: 0, draws: 0, losses: 0,
        });
      }
      const ts = teamStatsMap.get(myTeamId)!;
      ts.matches++;
      if (result === "W") ts.wins++;
      else if (result === "L") ts.losses++;
      else ts.draws++;
    }

    const allTeamIds = Array.from(teamStatsMap.keys());

    // Enriquecer con logoUrl y Elo (1 batch query de cada uno)
    const [teamRows, eloRows] = allTeamIds.length
      ? await Promise.all([
          Team.findAll({ where: { id: { [Op.in]: allTeamIds } }, attributes: ["id", "logoUrl"] }),
          TeamEloRating.findAll({ where: { teamId: { [Op.in]: allTeamIds } }, attributes: ["teamId", "rating"] }),
        ])
      : [[], []];

    const logoMap = new Map((teamRows as any[]).map((t) => [t.id, t.logoUrl ?? null]));
    const eloMap  = new Map((eloRows as any[]).map((e) => [e.teamId, Math.round(Number(e.rating))]));

    const teamsManaged = Array.from(teamStatsMap.values())
      .map((ts) => ({
        ...ts,
        logoUrl:    logoMap.get(ts.teamId) ?? null,
        currentElo: eloMap.get(ts.teamId)  ?? 1500,
      }))
      .sort((a, b) => b.matches - a.matches);

    // ── Paso 4: top jugadores (necesita los teamIds del historial) ────────────
    const topFormedPlayers = await this.computeTopPlayersFormed(allTeamIds, coachedMatchIds);

    const totalMatches = (matches as any[]).length;

    return {
      coach: { id: coach.id, name: coach.name },
      teamsManaged,
      totalMatches,
      wins, draws, losses,
      winRate:         totalMatches > 0 ? Number((wins / totalMatches).toFixed(3)) : 0,
      pointsPerMatch:  totalMatches > 0 ? Number(((wins * 3 + draws) / totalMatches).toFixed(2)) : 0,
      formationDistribution: formationCounts,
      mostUsedFormation:
        Object.entries(formationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—",
      avgGoalsFor:     totalMatches > 0 ? Number((gs / totalMatches).toFixed(2)) : 0,
      avgGoalsAgainst: totalMatches > 0 ? Number((gc / totalMatches).toFixed(2)) : 0,
      attackingIndex:  gs + gc > 0 ? Number((gs / (gs + gc)).toFixed(3)) : 0.5,
      topFormedPlayers,
      recentResults,
    };
  }

  /**
   * Top 10 jugadores por AVG(rating) en los partidos del coach.
   * Requiere al menos 3 partidos. Incluye suma de goles.
   */
  private static async computeTopPlayersFormed(
    teamIds: number[],
    matchIds: number[]
  ): Promise<CoachStats["topFormedPlayers"]> {
    if (!teamIds.length || !matchIds.length) return [];

    const rows: any[] = await PlayerMatchStat.findAll({
      where: {
        teamId:  { [Op.in]: teamIds },
        matchId: { [Op.in]: matchIds },
      },
      attributes: [
        "playerId",
        [Sequelize.fn("AVG", Sequelize.col("rating")),    "avgRating"],
        [Sequelize.fn("SUM", Sequelize.col("goals")),     "totalGoals"],
        [Sequelize.fn("COUNT", Sequelize.col("matchId")), "matchCount"],
      ],
      group:   ["playerId"],
      having:  Sequelize.literal('COUNT("matchId") >= 3'),
      order:   [[Sequelize.literal('"avgRating"'), "DESC"]],
      limit:   10,
      raw:     true,
    });

    if (!rows.length) return [];

    const playerIds = rows
      .map((r) => Number(r.playerId))
      .filter((n) => Number.isInteger(n) && n > 0);

    const users = await User.findAll({
      where: { id: { [Op.in]: playerIds } },
      attributes: ["id", "name"],
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    return rows.map((r) => ({
      playerId:  Number(r.playerId),
      name:      userMap.get(Number(r.playerId)) ?? "—",
      avgRating: Number(Number(r.avgRating).toFixed(2)),
      goals:     Number(r.totalGoals || 0),
    }));
  }
}
