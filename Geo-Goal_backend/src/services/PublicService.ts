import { Op } from "sequelize";
import { AppError } from "../types/errors";
import { League } from "../models/League";
import { Team } from "../models/Team";
import { Match } from "../models/Match";
import { TeamLeagueStat } from "../models/TeamLeagueStat";
import { Season } from "../models/Season";
import { User } from "../models/User";
import { NewsService } from "./NewsService";
import { MatchAnalyticsService } from "./MatchAnalyticsService";

export class PublicService {
  private static async ensureLeagueExists(leagueId: string): Promise<League> {
    const league = await League.findByPk(leagueId);
    if (!league) {
      throw new AppError(404, "Liga no encontrada");
    }
    return league;
  }

  static async getLeagues(page = 1, pageSize = 50) {
    const limit = Math.min(Math.max(1, pageSize), 200);
    const offset = Math.max(0, page - 1) * limit;

    const { rows, count } = await League.findAndCountAll({
      attributes: ["id", "name", "description", "createdAt"],
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit,
      offset,
    });

    return { data: rows, total: count, page, pageSize: limit };
  }

  static async getNews(limit = 12) {
    return NewsService.getPublicNews(limit);
  }

  static async getLeagueDetail(leagueId: string) {
    const league = await this.ensureLeagueExists(leagueId);

    const currentSeason = await Season.findOne({
      where: { leagueId, isCurrent: true },
    });

    const [standings, fixture, fixtureWithLocations, teamList, fieldList, recentMatches, seasons] =
      await Promise.all([
        this.getStandings(leagueId),
        this.getFixture(leagueId),
        this.getFixtureWithLocations(leagueId),
        Team.findAll({
          where: { leagueId },
          attributes: ["id", "name", "logoUrl", "trainerId", "lat", "lng", "fieldAddress"],
          include: [
            {
              model: User,
              as: "trainer",
              attributes: ["id", "name", "email"],
            },
          ],
          order: [["name", "ASC"]],
        }),
        league.$get("fields", {
          attributes: ["id", "name", "address", "lat", "lng", "city", "state", "country", "capacity", "isActive"],
          order: [["name", "ASC"]],
        }),
        Match.findAll({
          attributes: [
            "id",
            "leagueId",
            "homeTeamId",
            "awayTeamId",
            "date",
            "roundName",
            "homeScore",
            "awayScore",
            "homePenaltiesScore",
            "awayPenaltiesScore",
            "played",
            "createdAt",
            "updatedAt",
          ],
          where: { leagueId },
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
          ],
          order: [["date", "DESC"], ["updatedAt", "DESC"], ["id", "DESC"]],
          limit: 8,
        }),
        Season.findAll({
          where: { leagueId },
          attributes: ["id", "name", "year", "status", "isCurrent", "startDate", "endDate"],
          order: [["year", "DESC"], ["id", "DESC"]],
        }),
      ]);

    const news = await NewsService.getNewsForLeagues([Number(leagueId)], 8);

    return {
      league,
      currentSeason,
      standings,
      fixture,
      fixtureWithLocations,
      teams: teamList,
      fields: fieldList,
      recentMatches,
      seasons,
      news,
    };
  }

  static async getStandings(leagueId: string) {
    await this.ensureLeagueExists(leagueId);
    return TeamLeagueStat.findAll({
      attributes: [
        "id",
        "teamId",
        "leagueId",
        "points",
        "gamesPlayed",
        "wins",
        "draws",
        "losses",
        "goalsFor",
        "goalsAgainst",
        "goalDifference",
        "penaltyWins",
        "createdAt",
        "updatedAt",
      ],
      where: { leagueId },
      include: [
        {
          model: Team,
          attributes: ["id", "name", "logoUrl"],
        },
      ],
      order: [
        ["points", "DESC"],
        ["goalDifference", "DESC"],
        ["goalsFor", "DESC"],
        ["id", "ASC"],
      ],
    });
  }

  static async getFixture(leagueId: string) {
    await this.ensureLeagueExists(leagueId);

    const matches = await Match.findAll({
      attributes: [
        "id",
        "leagueId",
        "homeTeamId",
        "awayTeamId",
        "date",
        "roundName",
        "homeScore",
        "awayScore",
        "homePenaltiesScore",
        "awayPenaltiesScore",
        "played",
        "createdAt",
        "updatedAt",
      ],
      where: { leagueId },
      include: [
        {
          model: Team,
          as: "homeTeam",
          attributes: ["id", "name", "logoUrl", "lat", "lng", "fieldAddress"],
        },
        {
          model: Team,
          as: "awayTeam",
          attributes: ["id", "name", "logoUrl", "lat", "lng", "fieldAddress"],
        },
      ],
      order: [["roundName", "ASC"], ["id", "ASC"]],
    });

    return matches.reduce((acc: Record<string, typeof matches>, match) => {
      const round = match.roundName;
      if (!acc[round]) {
        acc[round] = [];
      }
      acc[round].push(match);
      return acc;
    }, {});
  }

  static async getFixtureWithLocations(leagueId: string) {
    await this.ensureLeagueExists(leagueId);

    const matches = await Match.findAll({
      attributes: [
        "id",
        "leagueId",
        "homeTeamId",
        "awayTeamId",
        "date",
        "roundName",
        "homeScore",
        "awayScore",
        "homePenaltiesScore",
        "awayPenaltiesScore",
        "played",
        "createdAt",
        "updatedAt",
      ],
      where: { leagueId },
      include: [
        {
          model: Team,
          as: "homeTeam",
          attributes: ["id", "name", "logoUrl", "lat", "lng", "fieldAddress"],
        },
        {
          model: Team,
          as: "awayTeam",
          attributes: ["id", "name", "logoUrl"],
        },
      ],
      order: [["roundName", "ASC"], ["id", "ASC"]],
    });

    return matches.map((match) => {
      const homeTeam = match.homeTeam as Team | null;
      const hasLocation =
        homeTeam != null &&
        homeTeam.lat != null &&
        homeTeam.lng != null &&
        !Number.isNaN(Number(homeTeam.lat)) &&
        !Number.isNaN(Number(homeTeam.lng));

      return {
        id: match.id,
        roundName: match.roundName,
        date: match.date,
        played: match.played,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        location: hasLocation
          ? {
              lat: homeTeam!.lat,
              lng: homeTeam!.lng,
              fieldAddress: homeTeam!.fieldAddress,
            }
          : null,
      };
    });
  }

  static async getTeamProfile(leagueId: string, teamId: string) {
    await this.ensureLeagueExists(leagueId);

    const team = await Team.findOne({
      where: { id: teamId, leagueId },
      include: [
        {
          model: User,
          as: "trainer",
          attributes: ["id", "name", "email", "role"],
        },
      ],
    });

    if (!team) {
      throw new AppError(404, "Equipo no encontrado");
    }

    const stats = await TeamLeagueStat.findOne({
      attributes: [
        "id",
        "teamId",
        "leagueId",
        "points",
        "gamesPlayed",
        "wins",
        "draws",
        "losses",
        "goalsFor",
        "goalsAgainst",
        "goalDifference",
        "penaltyWins",
        "createdAt",
        "updatedAt",
      ],
      where: { leagueId, teamId },
      order: [["id", "DESC"]],
    });

    const upcomingMatches = await Match.findAll({
      attributes: [
        "id",
        "leagueId",
        "homeTeamId",
        "awayTeamId",
        "date",
        "roundName",
        "homeScore",
        "awayScore",
        "homePenaltiesScore",
        "awayPenaltiesScore",
        "played",
        "createdAt",
        "updatedAt",
      ],
      where: {
        leagueId,
        played: false,
        [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: [
        {
          model: Team,
          as: "homeTeam",
          attributes: ["id", "name", "logoUrl"],
        },
        {
          model: Team,
          as: "awayTeam",
          attributes: ["id", "name", "logoUrl"],
        },
      ],
      order: [["date", "ASC"], ["roundName", "ASC"], ["id", "ASC"]],
      limit: 3,
    });

    const recentMatches = await Match.findAll({
      attributes: [
        "id",
        "leagueId",
        "homeTeamId",
        "awayTeamId",
        "date",
        "roundName",
        "homeScore",
        "awayScore",
        "homePenaltiesScore",
        "awayPenaltiesScore",
        "played",
        "createdAt",
        "updatedAt",
      ],
      where: {
        leagueId,
        played: true,
        [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: [
        {
          model: Team,
          as: "homeTeam",
          attributes: ["id", "name", "logoUrl"],
        },
        {
          model: Team,
          as: "awayTeam",
          attributes: ["id", "name", "logoUrl"],
        },
      ],
      order: [["date", "DESC"], ["updatedAt", "DESC"], ["id", "DESC"]],
      limit: 3,
    });

    return {
      team,
      stats,
      upcomingMatches,
      recentMatches,
    };
  }

  static buildPublicNews(input: {
    league: League;
    currentSeason: Season | null;
    recentMatches: Match[];
  }) {
    const items: Array<{
      id: string;
      title: string;
      summary: string;
      type: "match" | "season" | "league";
      createdAt: string;
    }> = [];

    if (input.currentSeason) {
      items.push({
        id: `season-${input.currentSeason.id}`,
        title: `Temporada ${input.currentSeason.name}`,
        summary: `La temporada ${input.currentSeason.year} está ${input.currentSeason.status === "active" ? "activa" : "disponible"} para consulta pública.`,
        type: "season",
        createdAt: input.currentSeason.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      });
    }

    input.recentMatches.slice(0, 5).forEach((match) => {
      items.push({
        id: `match-${match.id}`,
        title: `${match.homeTeam?.name || "Local"} vs ${match.awayTeam?.name || "Visitante"}`,
        summary: match.played
          ? `Resultado público: ${match.homeScore}-${match.awayScore} en ${match.roundName}.`
          : `Partido programado para ${match.roundName}.`,
        type: "match",
        createdAt: match.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      });
    });

    items.push({
      id: `league-${input.league.id}`,
      title: `Información pública de ${input.league.name}`,
      summary: input.league.description || "Liga registrada en Geo-Goal y visible en la portada pública.",
      type: "league",
      createdAt: input.league.createdAt?.toISOString?.() ?? new Date().toISOString(),
    });

    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);
  }

  static async getMatchAnalytics(matchId: string) {
    const id = Number(matchId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, "ID de partido no válido");
    }
    return MatchAnalyticsService.getMatchAnalytics(id);
  }

  static async exportFrames(matchId: string, page = 1, pageSize = 1000) {
    const id = Number(matchId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, "ID de partido no válido");
    }
    return MatchAnalyticsService.exportFrames(id, page, pageSize);
  }
}
