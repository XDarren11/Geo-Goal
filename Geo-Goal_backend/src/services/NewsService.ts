import { Op } from "sequelize";
import { League } from "../models/League";
import { Match } from "../models/Match";
import { News } from "../models/News";
import { Season } from "../models/Season";
import { Team } from "../models/Team";

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  type: "match" | "season" | "league";
  createdAt: string;
  leagueId?: number;
  leagueName?: string;
  matchId?: number;
};

export class NewsService {
  private static seasonStatusLabel(status: string) {
    if (status === "active") return "se encuentra en plena competencia";
    if (status === "finished") return "ha concluido oficialmente";
    if (status === "draft") return "está en fase de planificación";
    if (status === "archived") return "ya fue archivada";
    return "se mantiene disponible";
  }

  private static buildMatchCopy(match: Match) {
    const home = match.homeTeam?.name ?? "Local";
    const away = match.awayTeam?.name ?? "Visitante";

    if (!match.played) {
      return {
        title: `Previa ${match.roundName}: ${home} vs ${away}`,
        summary: `${home} y ${away} afinan detalles para su cruce en ${match.roundName}. Ambos llegan con la mira puesta en sumar puntos clave.`,
      };
    }

    const homeScore = Number(match.homeScore ?? 0);
    const awayScore = Number(match.awayScore ?? 0);

    if (homeScore === awayScore) {
      return {
        title: `Crónica ${match.roundName}: empate entre ${home} y ${away}`,
        summary: `${home} y ${away} firmaron un ${homeScore}-${awayScore} en un duelo cerrado. El punto mantiene viva la pelea en la tabla.`,
      };
    }

    const winner = homeScore > awayScore ? home : away;
    const loser = homeScore > awayScore ? away : home;

    return {
      title: `Crónica ${match.roundName}: ${winner} se impone ${homeScore}-${awayScore}`,
      summary: `${winner} derrotó a ${loser} por ${homeScore}-${awayScore} y se lleva tres puntos de alto impacto para la clasificación.`,
    };
  }

  private static toView(item: News): NewsItem {
    return {
      id: String(item.id),
      title: item.title,
      summary: item.summary,
      type: item.type,
      createdAt: item.createdAt?.toISOString?.() ?? new Date().toISOString(),
      leagueId: item.leagueId ?? undefined,
      leagueName: item.league?.name,
      matchId: item.matchId ?? undefined,
    };
  }

  private static async ensureGeneratedNews(leagueIds: number[]): Promise<void> {
    if (!leagueIds.length) return;

    const [leagues, seasons, matches] = await Promise.all([
      League.findAll({
        where: { id: { [Op.in]: leagueIds } },
        attributes: ["id", "name", "description", "createdAt", "updatedAt"],
      }),
      Season.findAll({
        where: { leagueId: { [Op.in]: leagueIds } },
        attributes: ["id", "leagueId", "name", "year", "status", "isCurrent", "updatedAt"],
        order: [["updatedAt", "DESC"]],
      }),
      Match.findAll({
        where: { leagueId: { [Op.in]: leagueIds } },
        attributes: ["id", "leagueId", "roundName", "homeScore", "awayScore", "played", "updatedAt"],
        include: [
          { model: Team, as: "homeTeam", attributes: ["id", "name"] },
          { model: Team, as: "awayTeam", attributes: ["id", "name"] },
        ],
        order: [["updatedAt", "DESC"], ["id", "DESC"]],
        limit: 80,
      }),
    ]);

    const currentSeasonByLeague = new Map<number, Season>();
    for (const season of seasons) {
      if (season.isCurrent && !currentSeasonByLeague.has(season.leagueId)) {
        currentSeasonByLeague.set(season.leagueId, season);
      }
    }

    for (const league of leagues) {
      await News.upsert({
        leagueId: league.id,
        seasonId: null,
        matchId: null,
        title: `Radar de liga: ${league.name} entra en escena`,
        summary:
          league.description ||
          `${league.name} continúa su actividad competitiva con movimientos recientes en calendario, tabla y rendimiento de equipos.`,
        type: "league",
        isPublished: true,
        source: `league:${league.id}`,
        payload: { leagueId: league.id },
      });

      const season = currentSeasonByLeague.get(league.id);
      if (season) {
        await News.upsert({
          leagueId: league.id,
          seasonId: season.id,
          matchId: null,
          title: `Boletín de temporada: ${season.name} (${season.year})`,
          summary: `${league.name}: la temporada ${season.name} ${this.seasonStatusLabel(season.status)}. Se esperan nuevas historias jornada a jornada.`,
          type: "season",
          isPublished: true,
          source: `season:${season.id}`,
          payload: { leagueId: league.id, seasonId: season.id, seasonStatus: season.status },
        });
      }
    }

    for (const match of matches) {
      const copy = this.buildMatchCopy(match);
      await News.upsert({
        leagueId: match.leagueId,
        seasonId: null,
        matchId: match.id,
        title: copy.title,
        summary: copy.summary,
        type: "match",
        isPublished: true,
        source: `match:${match.id}`,
        payload: {
          leagueId: match.leagueId,
          matchId: match.id,
          played: match.played,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
        },
      });
    }
  }

  static async getNewsForLeagues(leagueIds: number[], limit = 8): Promise<NewsItem[]> {
    const uniqueLeagueIds = Array.from(new Set(leagueIds.filter((id) => Number.isInteger(id) && id > 0)));
    if (!uniqueLeagueIds.length) return [];

    await this.ensureGeneratedNews(uniqueLeagueIds);

    const rows = await News.findAll({
      where: {
        isPublished: true,
        leagueId: { [Op.in]: uniqueLeagueIds },
      },
      include: [{ model: League, attributes: ["id", "name"], required: false }],
      order: [["createdAt", "DESC"], ["id", "DESC"]],
      limit,
    });

    return rows.map((row) => this.toView(row));
  }

  static async getPublicNews(limit = 12): Promise<NewsItem[]> {
    const leagues = await League.findAll({
      attributes: ["id"],
      order: [["updatedAt", "DESC"], ["id", "DESC"]],
      limit: 20,
    });

    return this.getNewsForLeagues(leagues.map((l) => l.id), limit);
  }
}
