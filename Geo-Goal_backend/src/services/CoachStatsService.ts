/**
 * CoachStatsService — Fase 8.A
 *
 * Stats agregadas del coach a través de los partidos donde aparece como
 * homeCoachId/awayCoachId (en MatchDetail) o como trainerId del equipo.
 *
 * Combina:
 *   - Team.trainerId (equipos que dirige actualmente)
 *   - MatchDetail.homeCoachId / awayCoachId (partidos donde dirigió)
 *   - Match (resultados)
 *   - TeamEloRating (Elo actual de sus equipos)
 *   - PlayerMatchStat (mejores jugadores bajo su dirección)
 *   - MatchDetail.homeFormation / awayFormation (estilo táctico)
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
  teamsManaged: Array<{
    id: number;
    name: string;
    logoUrl: string | null;
    currentElo: number;
  }>;

  // Resumen global
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  pointsPerMatch: number;

  // Estilo
  formationDistribution: Record<string, number>;
  mostUsedFormation: string;
  avgGoalsScored: number;
  avgGoalsConceded: number;
  attackingIndex: number; // 0 = muy defensivo, 1 = muy ofensivo

  // Jugadores formados
  topPlayersFormed: Array<{
    playerId: number;
    name: string;
    teamId: number;
    teamName: string;
    avgRating: number;
    matchesUnderCoach: number;
  }>;

  // Forma reciente
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
    const coach = await User.findByPk(coachId, { attributes: ["id", "name"] });
    if (!coach) throw new Error(`Coach ${coachId} not found`);

    // 1. Equipos donde es trainer principal
    const teams = await Team.findAll({
      where: { trainerId: coachId },
      attributes: ["id", "name", "logoUrl"],
    });

    // 2. Match IDs donde aparece como coach (en MatchDetail)
    const detailsHome = await MatchDetail.findAll({
      where: { homeCoachId: coachId },
      attributes: ["matchId"],
    });
    const detailsAway = await MatchDetail.findAll({
      where: { awayCoachId: coachId },
      attributes: ["matchId"],
    });
    const coachedMatchIds = Array.from(
      new Set([
        ...detailsHome.map((d) => d.matchId),
        ...detailsAway.map((d) => d.matchId),
      ])
    );

    // 3. Partidos jugados donde dirigió + detail para formación
    const matches: any[] = coachedMatchIds.length
      ? await Match.findAll({
          where: { id: { [Op.in]: coachedMatchIds }, played: true },
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
            {
              model: MatchDetail,
              attributes: [
                "homeCoachId",
                "awayCoachId",
                "homeFormation",
                "awayFormation",
              ],
            },
          ],
          order: [["date", "DESC"]],
        })
      : [];

    // 4. Agregados W/D/L + estilo táctico
    let wins = 0,
      draws = 0,
      losses = 0,
      gs = 0,
      gc = 0;
    const formationCounts: Record<string, number> = {};
    const recentResults: CoachStats["recentResults"] = [];

    for (const m of matches) {
      const detail = m.detail ?? m.MatchDetail ?? null;
      const isHomeCoach = detail?.homeCoachId === coachId;
      const isAwayCoach = detail?.awayCoachId === coachId;
      if (!isHomeCoach && !isAwayCoach) continue;

      const myScore = isHomeCoach ? m.homeScore : m.awayScore;
      const oppScore = isHomeCoach ? m.awayScore : m.homeScore;
      gs += myScore || 0;
      gc += oppScore || 0;

      let result: "W" | "D" | "L";
      if (myScore > oppScore) {
        wins++;
        result = "W";
      } else if (myScore < oppScore) {
        losses++;
        result = "L";
      } else {
        draws++;
        result = "D";
      }

      const myFormation = isHomeCoach
        ? detail?.homeFormation
        : detail?.awayFormation;
      if (myFormation) {
        formationCounts[myFormation] = (formationCounts[myFormation] || 0) + 1;
      }

      if (recentResults.length < 10) {
        const oppName = isHomeCoach
          ? m.awayTeam?.name ?? "—"
          : m.homeTeam?.name ?? "—";
        recentResults.push({
          matchId: m.id,
          date: m.date ? new Date(m.date).toISOString() : null,
          result,
          teamId: isHomeCoach ? m.homeTeamId : m.awayTeamId,
          opponentName: oppName,
          score: `${myScore ?? 0}-${oppScore ?? 0}`,
        });
      }
    }

    // 5. Elo actual de sus equipos
    const teamIds = teams.map((t) => t.id);
    const elos = teamIds.length
      ? await TeamEloRating.findAll({
          where: { teamId: { [Op.in]: teamIds } },
          attributes: ["teamId", "rating"],
        })
      : [];
    const eloMap = new Map(elos.map((e) => [e.teamId, Number(e.rating)]));

    // 6. Top jugadores formados (con >= 3 partidos bajo este coach)
    const topPlayersFormed = await this.computeTopPlayersFormed(
      teams,
      coachedMatchIds
    );

    const totalMatches = matches.length;
    const total = totalMatches; // alias para legibilidad
    return {
      coach: { id: coach.id, name: coach.name },
      teamsManaged: teams.map((t) => ({
        id: t.id,
        name: t.name,
        logoUrl: t.logoUrl,
        currentElo: Math.round(eloMap.get(t.id) ?? 1500),
      })),
      totalMatches,
      wins,
      draws,
      losses,
      winRate: total > 0 ? Number((wins / total).toFixed(3)) : 0,
      pointsPerMatch:
        total > 0 ? Number(((wins * 3 + draws) / total).toFixed(2)) : 0,
      formationDistribution: formationCounts,
      mostUsedFormation:
        Object.entries(formationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        "—",
      avgGoalsScored: total > 0 ? Number((gs / total).toFixed(2)) : 0,
      avgGoalsConceded: total > 0 ? Number((gc / total).toFixed(2)) : 0,
      attackingIndex:
        gs + gc > 0 ? Number((gs / (gs + gc)).toFixed(3)) : 0.5,
      topPlayersFormed,
      recentResults,
    };
  }

  /**
   * Top 10 jugadores con mayor AVG(rating) en partidos del coach.
   * Requiere al menos 3 partidos jugados.
   */
  private static async computeTopPlayersFormed(
    teams: Team[],
    matchIds: number[]
  ): Promise<CoachStats["topPlayersFormed"]> {
    if (!teams.length || !matchIds.length) return [];

    const teamIds = teams.map((t) => t.id);
    const rows: any[] = await PlayerMatchStat.findAll({
      where: {
        teamId: { [Op.in]: teamIds },
        matchId: { [Op.in]: matchIds },
      },
      attributes: [
        "playerId",
        "teamId",
        [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"],
        [Sequelize.fn("COUNT", Sequelize.col("matchId")), "matchCount"],
      ],
      group: ["playerId", "teamId"],
      having: Sequelize.literal('COUNT("matchId") >= 3'),
      order: [[Sequelize.literal('"avgRating"'), "DESC"]],
      limit: 10,
      raw: true,
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
    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

    return rows.map((r) => ({
      playerId: Number(r.playerId),
      name: userMap.get(Number(r.playerId)) ?? "—",
      teamId: Number(r.teamId),
      teamName: teamMap.get(Number(r.teamId)) ?? "—",
      avgRating: Number(Number(r.avgRating).toFixed(2)),
      matchesUnderCoach: Number(r.matchCount),
    }));
  }
}
