import { Op } from "sequelize";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { TeamMember } from "../models/TeamMember";
import { League } from "../models/League";
import { Match } from "../models/Match";
import { TeamLeagueStat } from "../models/TeamLeagueStat";
import { MatchEvent } from "../models/MatchEvent";
import { MatchDetail } from "../models/MatchDetail";
import { Notification } from "../models/Notification";
import { AppError } from "../types/errors";
import { NewsService } from "./NewsService";
import {
  deleteSupabaseObject,
  uploadImageToSupabase,
  type UploadedImageFile,
} from "../utils/supabaseStorage";

export class TeamService {
  static async getPlayerDashboard(userId: number) {
    const teams = await Team.findAll({
      include: [
        {
          model: User,
          as: "players",
          where: { id: userId },
          attributes: [],
          through: { attributes: [] },
        },
        {
          model: League,
          attributes: ["id", "name"],
          required: false,
        },
      ],
      attributes: ["id", "name", "leagueId", "lat", "lng", "fieldAddress", "logoUrl"],
    });

    if (teams.length === 0) {
      return {
        nextMatch: null,
        recentTeamResults: [],
        personalPerformance: {
          averageRating: 0,
          minutes: 0,
          contributions: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          radar: [
            { metric: "Ataque", value: 0 },
            { metric: "Creación", value: 0 },
            { metric: "Disciplina", value: 0 },
            { metric: "Constancia", value: 0 },
            { metric: "Impacto", value: 0 },
          ],
        },
        recentEvents: [],
        actionableNotifications: [],
        performanceTrend: [],
        achievements: [],
        news: [],
      };
    }

    const teamIds = teams.map((team) => team.id);
    const now = new Date();

    const nextMatch = await Match.findOne({
      where: {
        played: false,
        date: { [Op.gte]: now },
        [Op.or]: [{ homeTeamId: { [Op.in]: teamIds } }, { awayTeamId: { [Op.in]: teamIds } }],
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "lat", "lng", "fieldAddress", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
        { model: League, attributes: ["id", "name"] },
      ],
      order: [["date", "ASC"]],
    });

    const recentTeamResults = await Match.findAll({
      where: {
        played: true,
        [Op.or]: [{ homeTeamId: { [Op.in]: teamIds } }, { awayTeamId: { [Op.in]: teamIds } }],
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
        { model: League, attributes: ["id", "name"] },
      ],
      order: [["date", "DESC"], ["updatedAt", "DESC"]],
      limit: 10,
    });

    const playerEvents = await MatchEvent.findAll({
      where: {
        teamId: { [Op.in]: teamIds },
        playerId: userId,
      },
      include: [
        {
          model: Match,
          attributes: ["id", "date", "roundName", "homeTeamId", "awayTeamId", "homeScore", "awayScore", "played", "leagueId"],
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
            { model: League, attributes: ["id", "name"] },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 500,
    });

    const goalEventsForAssist = await MatchEvent.findAll({
      where: {
        teamId: { [Op.in]: teamIds },
        eventType: { [Op.in]: ["goal", "penalty_scored"] },
      },
      attributes: ["matchId", "metadata"],
      order: [["createdAt", "DESC"]],
      limit: 500,
    });

    let goals = 0;
    let yellowCards = 0;
    let redCards = 0;
    const minutesByMatch = new Map<number, number>();

    playerEvents.forEach((event) => {
      const metadata = (event.metadata ?? {}) as Record<string, unknown>;
      const rawMinutes = metadata.minutesPlayed ?? metadata.minutes;
      const minutes = rawMinutes != null && !Number.isNaN(Number(rawMinutes)) ? Number(rawMinutes) : 0;

      if (["goal", "penalty_scored"].includes(event.eventType)) goals += 1;
      if (event.eventType === "yellow_card") yellowCards += 1;
      if (event.eventType === "red_card") redCards += 1;

      if (event.matchId) {
        const prev = minutesByMatch.get(event.matchId) ?? 0;
        minutesByMatch.set(event.matchId, Math.max(prev, minutes));
      }
    });

    let assists = 0;
    const assistsByMatch = new Map<number, number>();
    goalEventsForAssist.forEach((event) => {
      const metadata = (event.metadata ?? {}) as Record<string, unknown>;
      const assistId = metadata.assistPlayerId != null && !Number.isNaN(Number(metadata.assistPlayerId))
        ? Number(metadata.assistPlayerId)
        : null;
      if (assistId === userId) {
        assists += 1;
        assistsByMatch.set(event.matchId, (assistsByMatch.get(event.matchId) ?? 0) + 1);
      }
    });

    const minutes = Array.from(minutesByMatch.values()).reduce((acc, value) => acc + value, 0);
    const contributions = goals + assists;

    const playedMatchesForRating = Math.max(minutesByMatch.size, 1);
    const averageRatingRaw =
      6 +
      (goals * 1.1 + assists * 0.9 + contributions * 0.2 + minutes / 180 - yellowCards * 0.2 - redCards * 0.6) /
        playedMatchesForRating;
    const averageRating = Math.min(10, Math.max(1, Number(averageRatingRaw.toFixed(2))));

    const normalize = (value: number, max: number) => Math.round(Math.min(100, (value / Math.max(max, 1)) * 100));

    const radar = [
      { metric: "Ataque", value: normalize(goals * 10, 60) },
      { metric: "Creación", value: normalize(assists * 12, 60) },
      { metric: "Disciplina", value: Math.max(0, 100 - normalize(yellowCards * 8 + redCards * 20, 100)) },
      { metric: "Constancia", value: normalize(minutes, 900) },
      { metric: "Impacto", value: normalize(contributions * 10, 80) },
    ];

    const recentEvents = playerEvents
      .filter((event) => ["goal", "penalty_scored", "yellow_card", "red_card", "substitution"].includes(event.eventType))
      .slice(0, 10)
      .map((event) => ({
        id: event.id,
        eventType: event.eventType,
        minute: event.minute,
        extraMinute: event.extraMinute,
        metadata: event.metadata,
        createdAt: event.createdAt,
        match: event.match,
      }));

    const goalsByMatch = new Map<number, number>();
    const cardsByMatch = new Map<number, number>();

    playerEvents.forEach((event) => {
      if (!event.matchId) return;
      if (["goal", "penalty_scored"].includes(event.eventType)) {
        goalsByMatch.set(event.matchId, (goalsByMatch.get(event.matchId) ?? 0) + 1);
      }
      if (["yellow_card", "red_card"].includes(event.eventType)) {
        cardsByMatch.set(event.matchId, (cardsByMatch.get(event.matchId) ?? 0) + (event.eventType === "red_card" ? 2 : 1));
      }
    });

    const uniqueRecentMatches = Array.from(
      new Map(
        playerEvents
          .filter((event) => event.match)
          .map((event) => [event.matchId, event.match])
      ).values()
    )
      .sort((a, b) => {
        const ad = a.date ? new Date(a.date).getTime() : 0;
        const bd = b.date ? new Date(b.date).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 6);

    const performanceTrend = uniqueRecentMatches
      .map((match, idx) => {
        const matchGoals = goalsByMatch.get(match.id) ?? 0;
        const matchAssists = assistsByMatch.get(match.id) ?? 0;
        const matchCardsWeight = cardsByMatch.get(match.id) ?? 0;
        const matchMinutes = minutesByMatch.get(match.id) ?? 0;

        const ratingRaw = 6 + matchGoals * 1.2 + matchAssists + matchMinutes / 120 - matchCardsWeight * 0.3;
        const rating = Math.min(10, Math.max(1, Number(ratingRaw.toFixed(1))));

        return {
          matchId: match.id,
          label: `M${idx + 1}`,
          rating,
          minutes: matchMinutes,
          contributions: matchGoals + matchAssists,
        };
      })
      .reverse();

    const achievements = [
      {
        key: "first_contribution",
        title: "Primer impacto",
        description: "Registrar al menos 1 contribución (gol/asistencia)",
        unlocked: contributions >= 1,
      },
      {
        key: "playmaker",
        title: "Creador",
        description: "Alcanzar 3 asistencias",
        unlocked: assists >= 3,
      },
      {
        key: "finisher",
        title: "Finalizador",
        description: "Marcar 5 goles",
        unlocked: goals >= 5,
      },
      {
        key: "iron_man",
        title: "Pulmón de acero",
        description: "Jugar 450+ minutos",
        unlocked: minutes >= 450,
      },
      {
        key: "clean_discipline",
        title: "Juego limpio",
        description: "Mantenerse sin tarjetas rojas",
        unlocked: redCards === 0,
      },
      {
        key: "elite_form",
        title: "Forma élite",
        description: "Rating promedio de 8.0+",
        unlocked: averageRating >= 8,
      },
    ];

    const notifications = await Notification.findAll({
      where: {
        userId,
      },
      order: [["createdAt", "DESC"]],
      limit: 30,
    });

    const actionableNotifications = notifications
      .filter((n) => ["match_scheduled", "team_callup", "lineup_update", "match_day"].includes(n.type) || !n.readAt)
      .slice(0, 8)
      .map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        payload: n.payload,
        readAt: n.readAt,
        createdAt: n.createdAt,
        actionUrl:
          typeof (n.payload as Record<string, unknown>)?.matchId === "number"
            ? `/public/matches/${(n.payload as Record<string, unknown>).matchId}/detail`
            : null,
      }));

    let nextMatchPayload = null as any;
    if (nextMatch) {
      const detail = await MatchDetail.findOne({
        where: { matchId: nextMatch.id },
        attributes: ["fieldId"],
      });

      nextMatchPayload = {
        ...nextMatch.toJSON(),
        fieldId: detail?.fieldId ?? null,
        fieldAddress: nextMatch.homeTeam?.fieldAddress ?? null,
        location: nextMatch.homeTeam
          ? {
              lat: nextMatch.homeTeam.lat,
              lng: nextMatch.homeTeam.lng,
              fieldAddress: nextMatch.homeTeam.fieldAddress,
            }
          : null,
      };
    }

    const leagueIdsForNews = teams
      .map((team) => Number(team.leagueId))
      .filter((id) => Number.isInteger(id) && id > 0);
    const news = await NewsService.getNewsForLeagues(leagueIdsForNews, 8);

    return {
      nextMatch: nextMatchPayload,
      recentTeamResults,
      personalPerformance: {
        averageRating,
        minutes,
        contributions,
        goals,
        assists,
        yellowCards,
        redCards,
        radar,
      },
      recentEvents,
      actionableNotifications,
      performanceTrend,
      achievements,
      news,
    };
  }

  static async getCoachDashboard(trainerId: number) {
    const teams = await Team.findAll({
      where: { trainerId },
      attributes: ["id", "name", "leagueId"],
      include: [{ model: League, attributes: ["id", "name"], required: false }],
    });

    if (teams.length === 0) {
      return {
        stats: {
          playedMatches: 0,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          streak: "-",
        },
        upcomingMatches: [],
        recentResults: [],
        trend: { W: 0, D: 0, L: 0 },
        topPlayers: [],
        preMatchChecklist: [],
        goalsByTeam: [],
        cardsByTeam: [],
        news: [],
      };
    }

    const teamIds = teams.map((team) => team.id);
    const teamMap = new Map(teams.map((team) => [team.id, team]));

    const statsRows = await TeamLeagueStat.findAll({
      where: { teamId: { [Op.in]: teamIds } },
      attributes: ["teamId", "points", "goalsFor", "goalsAgainst", "gamesPlayed"],
    });

    const stats = statsRows.reduce(
      (acc, row) => {
        acc.playedMatches += Number(row.gamesPlayed ?? 0);
        acc.points += Number(row.points ?? 0);
        acc.goalsFor += Number(row.goalsFor ?? 0);
        acc.goalsAgainst += Number(row.goalsAgainst ?? 0);
        return acc;
      },
      { playedMatches: 0, points: 0, goalsFor: 0, goalsAgainst: 0 }
    );

    const now = new Date();

    const upcomingMatches = await Match.findAll({
      where: {
        played: false,
        date: { [Op.gte]: now },
        [Op.or]: [{ homeTeamId: { [Op.in]: teamIds } }, { awayTeamId: { [Op.in]: teamIds } }],
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "lat", "lng", "fieldAddress", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
        { model: League, attributes: ["id", "name"] },
      ],
      order: [["date", "ASC"]],
      limit: 10,
    });

    const recentMatches = await Match.findAll({
      where: {
        played: true,
        [Op.or]: [{ homeTeamId: { [Op.in]: teamIds } }, { awayTeamId: { [Op.in]: teamIds } }],
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
        { model: League, attributes: ["id", "name"] },
      ],
      order: [["date", "DESC"], ["updatedAt", "DESC"]],
      limit: 10,
    });

    const recentResults = recentMatches.map((match) => {
      const isHome = teamIds.includes(match.homeTeamId);
      const teamScore = isHome ? Number(match.homeScore ?? 0) : Number(match.awayScore ?? 0);
      const rivalScore = isHome ? Number(match.awayScore ?? 0) : Number(match.homeScore ?? 0);
      const result = teamScore > rivalScore ? "W" : teamScore < rivalScore ? "L" : "D";

      return {
        ...match.toJSON(),
        result,
      };
    });

    const trend = recentResults.slice(0, 5).reduce(
      (acc, match) => {
        if (match.result === "W") acc.W += 1;
        if (match.result === "D") acc.D += 1;
        if (match.result === "L") acc.L += 1;
        return acc;
      },
      { W: 0, D: 0, L: 0 }
    );

    const streak = recentResults
      .slice(0, 5)
      .map((match) => match.result)
      .join("-") || "-";

    const events = await MatchEvent.findAll({
      where: {
        teamId: { [Op.in]: teamIds },
      },
      attributes: ["playerId", "eventType", "metadata"],
      order: [["id", "DESC"]],
      limit: 300,
    });

    const playerStats = new Map<
      number,
      { playerId: number; goals: number; assists: number; yellowCards: number; redCards: number; minutes: number }
    >();
    const assistNameStats = new Map<string, { name: string; goals: number; assists: number; yellowCards: number; redCards: number; minutes: number }>();

    const addToPlayer = (playerId: number, patch: Partial<{ goals: number; assists: number; yellowCards: number; redCards: number; minutes: number }>) => {
      const current = playerStats.get(playerId) ?? {
        playerId,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        minutes: 0,
      };

      current.goals += patch.goals ?? 0;
      current.assists += patch.assists ?? 0;
      current.yellowCards += patch.yellowCards ?? 0;
      current.redCards += patch.redCards ?? 0;
      current.minutes += patch.minutes ?? 0;
      playerStats.set(playerId, current);
    };

    events.forEach((event) => {
      const metadata = (event.metadata ?? {}) as Record<string, unknown>;
      const rawMinutes = metadata.minutesPlayed ?? metadata.minutes;
      const minutes = rawMinutes != null && !Number.isNaN(Number(rawMinutes)) ? Number(rawMinutes) : 0;

      if (event.playerId) {
        if (["goal", "penalty_scored"].includes(event.eventType)) {
          addToPlayer(event.playerId, { goals: 1, minutes });
        } else if (event.eventType === "yellow_card") {
          addToPlayer(event.playerId, { yellowCards: 1, minutes });
        } else if (event.eventType === "red_card") {
          addToPlayer(event.playerId, { redCards: 1, minutes });
        } else {
          addToPlayer(event.playerId, { minutes });
        }
      }

      if (["goal", "penalty_scored"].includes(event.eventType)) {
        const assistPlayerId = metadata.assistPlayerId != null && !Number.isNaN(Number(metadata.assistPlayerId))
          ? Number(metadata.assistPlayerId)
          : null;
        const assistPlayerName = typeof metadata.assistPlayerName === "string" ? metadata.assistPlayerName.trim() : "";

        if (assistPlayerId) {
          addToPlayer(assistPlayerId, { assists: 1 });
        } else if (assistPlayerName) {
          const current = assistNameStats.get(assistPlayerName) ?? {
            name: assistPlayerName,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            minutes: 0,
          };
          current.assists += 1;
          assistNameStats.set(assistPlayerName, current);
        }
      }
    });

    const playerIds = Array.from(playerStats.keys());
    const playerRows = playerIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: playerIds } },
          attributes: ["id", "name"],
        })
      : [];
    const playerNameMap = new Map(playerRows.map((row) => [row.id, row.name]));

    const topPlayersById = Array.from(playerStats.values()).map((row) => ({
      playerId: row.playerId,
      name: playerNameMap.get(row.playerId) ?? `Jugador ${row.playerId}`,
      goals: row.goals,
      assists: row.assists,
      yellowCards: row.yellowCards,
      redCards: row.redCards,
      minutes: row.minutes,
    }));

    const topPlayersByName = Array.from(assistNameStats.values()).map((row, idx) => ({
      playerId: -(idx + 1),
      ...row,
    }));

    const topPlayers = [...topPlayersById, ...topPlayersByName]
      .sort((a, b) => {
        const scoreA = a.goals * 4 + a.assists * 3 + a.minutes / 90 - a.yellowCards * 0.2 - a.redCards * 0.5;
        const scoreB = b.goals * 4 + b.assists * 3 + b.minutes / 90 - b.yellowCards * 0.2 - b.redCards * 0.5;
        return scoreB - scoreA;
      })
      .slice(0, 8);

    const cardsByTeamMap = new Map<number, { teamId: number; teamName: string; yellowCards: number; redCards: number }>();
    teamIds.forEach((teamId) => {
      const team = teamMap.get(teamId);
      cardsByTeamMap.set(teamId, {
        teamId,
        teamName: team?.name ?? `Equipo ${teamId}`,
        yellowCards: 0,
        redCards: 0,
      });
    });

    events.forEach((event) => {
      if (!event.teamId) return;
      const row = cardsByTeamMap.get(event.teamId);
      if (!row) return;

      if (event.eventType === "yellow_card") row.yellowCards += 1;
      if (event.eventType === "red_card") row.redCards += 1;
    });

    const goalsByTeam = teams.map((team) => {
      const rowStats = statsRows.filter((row) => row.teamId === team.id);
      return {
        teamId: team.id,
        teamName: team.name,
        goalsFor: rowStats.reduce((acc, row) => acc + Number(row.goalsFor ?? 0), 0),
        goalsAgainst: rowStats.reduce((acc, row) => acc + Number(row.goalsAgainst ?? 0), 0),
      };
    });

    const cardsByTeam = Array.from(cardsByTeamMap.values());

    const leagueIdsForNews = teams
      .map((team) => Number(team.leagueId))
      .filter((id) => Number.isInteger(id) && id > 0);
    const news = await NewsService.getNewsForLeagues(leagueIdsForNews, 8);

    const matchIds = upcomingMatches.map((match) => match.id);
    const detailRows = matchIds.length
      ? await MatchDetail.findAll({
          where: { matchId: { [Op.in]: matchIds } },
          attributes: ["matchId", "fieldId", "homeStartingXI", "awayStartingXI"],
        })
      : [];
    const detailMap = new Map(detailRows.map((row) => [row.matchId, row]));

    const playerCountByTeamEntries = await Promise.all(
      teamIds.map(async (teamId) => {
        const count = await TeamMember.count({ where: { teamId } });
        return [teamId, count] as const;
      })
    );
    const playerCountByTeam = new Map(playerCountByTeamEntries);

    const preMatchChecklist = upcomingMatches.slice(0, 6).map((match) => {
      const isHome = teamIds.includes(match.homeTeamId);
      const myTeamId = isHome ? match.homeTeamId : match.awayTeamId;
      const myTeam = teamMap.get(myTeamId);
      const opponent = isHome ? match.awayTeam : match.homeTeam;
      const detail = detailMap.get(match.id);
      const lineup = isHome ? detail?.homeStartingXI : detail?.awayStartingXI;
      const lineupCount = Array.isArray(lineup) ? lineup.length : 0;

      return {
        matchId: match.id,
        teamId: myTeamId,
        teamName: myTeam?.name ?? "Mi equipo",
        opponentName: opponent?.name ?? "Rival",
        leagueName: (match.league as League | undefined)?.name ?? "Liga",
        roundName: match.roundName,
        date: match.date,
        checklist: {
          convocatoria: (playerCountByTeam.get(myTeamId) ?? 0) >= 11,
          alineacion: lineupCount >= 11,
          cancha: Boolean(detail?.fieldId || match.homeTeam?.fieldAddress),
          horario: Boolean(match.date),
        },
      };
    });

    return {
      stats: {
        ...stats,
        streak,
      },
      upcomingMatches: upcomingMatches.map((match) => {
        const isHome = teamIds.includes(match.homeTeamId);
        const myTeamId = isHome ? match.homeTeamId : match.awayTeamId;
        const myTeam = teamMap.get(myTeamId);
        const opponent = isHome ? match.awayTeam : match.homeTeam;

        return {
          ...match.toJSON(),
          teamId: myTeamId,
          teamName: myTeam?.name ?? "Mi equipo",
          opponentName: opponent?.name ?? "Rival",
          leagueName: (match.league as League | undefined)?.name ?? "Liga",
          location: match.homeTeam
            ? {
                lat: match.homeTeam.lat,
                lng: match.homeTeam.lng,
                fieldAddress: match.homeTeam.fieldAddress,
              }
            : null,
        };
      }),
      recentResults,
      trend,
      topPlayers,
      preMatchChecklist,
      goalsByTeam,
      cardsByTeam,
      news,
    };
  }

  static async getMyTeams(trainerId: number) {
    return Team.findAll({
      where: { trainerId },
    });
  }

  static async getPlayerTeams(userId: number) {
    return Team.findAll({
      include: [
        {
          model: User,
          as: "players",
          where: { id: userId },
          attributes: [],
          through: { attributes: [] },
        },
        {
          model: League,
          attributes: ["id", "name"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  }

  static async getTeamById(teamId: string, userId: number, role: string) {
    let accessTeam: Team | null = null;

    if (role === "admin") {
      accessTeam = await Team.findByPk(teamId);
    }

    if (role === "coach") {
      accessTeam = await Team.findOne({
        where: { id: teamId, trainerId: userId },
      });
    }

    if (role === "player") {
      const membership = await TeamMember.findOne({
        where: { teamId: Number(teamId), userId },
        attributes: ["userId"],
      });

      if (!membership) {
        throw new AppError(403, "No tienes acceso a este equipo");
      }

      accessTeam = await Team.findByPk(teamId);
    }

    if (!accessTeam) {
      throw new AppError(404, "Equipo no encontrado");
    }

    const team = await Team.findByPk(teamId, {
      include: [
        {
          model: User,
          as: "trainer",
          attributes: ["id", "name", "email"],
        },
        {
          model: League,
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });

    if (!team) {
      throw new AppError(404, "Equipo no encontrado");
    }

    const statsRows = await TeamLeagueStat.findAll({
      where: { teamId: Number(teamId) },
      attributes: [
        "gamesPlayed",
        "wins",
        "draws",
        "losses",
        "points",
        "goalsFor",
        "goalsAgainst",
        "goalDifference",
      ],
    });

    const stats = statsRows.reduce(
      (acc, row) => {
        acc.playedMatches += Number(row.gamesPlayed ?? 0);
        acc.wins += Number(row.wins ?? 0);
        acc.draws += Number(row.draws ?? 0);
        acc.losses += Number(row.losses ?? 0);
        acc.points += Number(row.points ?? 0);
        acc.goalsFor += Number(row.goalsFor ?? 0);
        acc.goalsAgainst += Number(row.goalsAgainst ?? 0);
        acc.goalDifference += Number(row.goalDifference ?? 0);
        return acc;
      },
      {
        playedMatches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
      }
    );

    const recentMatches = await Match.findAll({
      where: {
        played: true,
        [Op.or]: [
          { homeTeamId: Number(teamId) },
          { awayTeamId: Number(teamId) },
        ],
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
      ],
      order: [["date", "DESC"], ["updatedAt", "DESC"]],
      limit: 5,
    });

    return {
      ...team.toJSON(),
      stats,
      recentMatches,
    };
  }

  static async createTeam(
    trainerId: number,
    data: {
      name: string;
      lat: number;
      lng: number;
      fieldAddress: string;
      logoFile?: UploadedImageFile | null;
    }
  ): Promise<string> {
    // Un coach puede tener varios equipos, pero solo uno por liga.
    // La restricción por liga se aplica al momento de inscribir el equipo.
    const team = new Team({
      name: data.name,
      lat: data.lat,
      lng: data.lng,
      fieldAddress: data.fieldAddress,
      trainerId,
      leagueId: null,
    });
    if (data.logoFile) {
      const uploadedLogo = await uploadImageToSupabase(data.logoFile, "teams");
      team.logoUrl = uploadedLogo.url;
    }
    await team.save();
    return "Equipo creado correctamente";
  }

  static async updateTeam(
    teamId: string,
    trainerId: number,
    data: {
      name?: string;
      lat?: number;
      lng?: number;
      fieldAddress?: string;
      logoFile?: UploadedImageFile;
    }
  ): Promise<string> {
    const team = await Team.findOne({
      where: { id: teamId, trainerId },
    });
    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no eres el DT");
    }
    if (data.name != null) team.name = data.name;
    if (data.lat != null) team.lat = Number(data.lat);
    if (data.lng != null) team.lng = Number(data.lng);
    if (data.fieldAddress != null) team.fieldAddress = data.fieldAddress;
    if (data.logoFile) {
      const uploadedLogo = await uploadImageToSupabase(data.logoFile, "teams", team.logoUrl);
      team.logoUrl = uploadedLogo.url;
    }
    await team.save();
    return "Equipo actualizado correctamente";
  }

  static async deleteTeam(teamId: string, trainerId: number): Promise<string> {
    const team = await Team.findOne({
      where: { id: teamId, trainerId },
    });
    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no eres el DT");
    }
    const name = team.name;
    await deleteSupabaseObject(team.logoUrl);
    await team.destroy();
    return `El equipo ${name} ha sido eliminado correctamente`;
  }

  static async findPlayer(
    teamId: string,
    trainerId: number,
    emailOrUsername: string
  ) {
    const team = await Team.findOne({
      where: { id: teamId, trainerId },
    });
    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no eres el DT");
    }
    const normalizedSearch = emailOrUsername.trim().replace(/^@+/, "").toLowerCase();
    const player = await User.findOne({
      where: {
        [Op.or]: [
          { email: emailOrUsername.trim().toLowerCase() },
          { username: normalizedSearch },
        ],
      },
      attributes: ["id", "name", "email", "username"],
    });
    if (!player) {
      throw new AppError(404, "Usuario no encontrado");
    }
    return player;
  }

  static async addPlayerToTeam(
    teamId: string,
    trainerId: number,
    playerId: number
  ): Promise<string> {
    const team = await Team.findOne({
      where: { id: teamId, trainerId },
    });
    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no eres el DT");
    }
    const player = await User.findByPk(playerId);
    if (!player) {
      throw new AppError(404, "Jugador no encontrado");
    }
    const exists = await TeamMember.findOne({
      where: { teamId: team.id, userId: player.id },
    });
    if (exists) {
      throw new AppError(409, "El jugador ya forma parte de este equipo");
    }

    const existingMembership = await TeamMember.findOne({
      where: { userId: player.id },
    });

    if (existingMembership && team.leagueId) {
      const memberships = await TeamMember.findAll({
        where: { userId: player.id },
        attributes: ["teamId"],
      });

      const existingTeamIds = memberships.map((m) => m.teamId);

      if (existingTeamIds.length > 0) {
        const teamInSameLeague = await Team.findOne({
          where: {
            id: existingTeamIds,
            leagueId: team.leagueId,
          },
          attributes: ["name"],
        });

        if (teamInSameLeague) {
          throw new AppError(
            409,
            `El jugador ya pertenece a un equipo de esta liga (${teamInSameLeague.name})`
          );
        }
      }
    }

    await team.$add("player", player);
    return "Jugador agregado al equipo correctamente";
  }

  static async getPlayersTeam(teamId: string, userId: number, role: string) {
    const whereClause: any = { id: teamId };

    if (role === "admin") {
      // Admin can view roster for any team.
    } else if (role === "coach") {
      whereClause.trainerId = userId;
    } else if (role === "player") {
      const membership = await TeamMember.findOne({
        where: { teamId: Number(teamId), userId },
        attributes: ["userId"],
      });

      if (!membership) {
        throw new AppError(403, "No tienes acceso a este equipo");
      }
    } else {
      throw new AppError(403, "Acción no permitida");
    }

    const team = await Team.findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: "players",
          attributes: ["id", "name", "email"],
          through: { attributes: ["playerName", "jerseyNumber", "preferredPosition", "avatarUrl"] },
        },
      ],
    });
    if (!team) {
      throw new AppError(404, "Equipo no encontrado");
    }
    return team.players.map((player) => {
      const membership = (player as any).TeamMember;
      return {
        id: player.id,
        name: player.name,
        email: player.email,
        playerName: membership?.playerName ?? player.name,
        jerseyNumber: membership?.jerseyNumber ?? null,
        preferredPosition: membership?.preferredPosition ?? null,
        avatarUrl: membership?.avatarUrl ?? null,
      };
    });
  }

  static async removePlayerFromTeam(
    teamId: string,
    playerId: string,
    trainerId: number
  ): Promise<string> {
    const team = await Team.findOne({
      where: { id: teamId, trainerId },
    });
    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no eres el DT");
    }
    const teamMember = await TeamMember.findOne({
      where: { teamId, userId: playerId },
    });
    if (!teamMember) {
      throw new AppError(404, "El jugador no pertenece a este equipo");
    }
    await teamMember.destroy();
    return "Jugador eliminado del equipo correctamente";
  }

  static async getCoachActiveLeagues(trainerId: number) {
    return League.findAll({
      include: [
        {
          model: Team,
          where: { trainerId },
          attributes: ["id", "name", "logoUrl"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
  }

  static async getTeamDashboard(leagueId: string, teamId: string) {
    const upcomingMatches = await Match.findAll({
      where: {
        leagueId,
        played: false,
        [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
      ],
      order: [["roundName", "ASC"]],
      limit: 3,
    });

    const lastMatches = await Match.findAll({
      where: {
        leagueId,
        played: true,
        [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
      ],
      order: [["updatedAt", "DESC"]],
      limit: 3,
    });

    const allPlayedMatches = await Match.findAll({
      where: {
        leagueId,
        played: true,
        [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      order: [["id", "ASC"]],
    });

    const chartData = allPlayedMatches.map((match) => {
      const isHome = match.homeTeamId === Number(teamId);
      const gf = isHome ? match.homeScore : match.awayScore;
      const gc = isHome ? match.awayScore : match.homeScore;
      const roundLabel = match.roundName.replace("Jornada ", "J");
      return { round: roundLabel, gf, gc };
    });

    return {
      upcomingMatches,
      lastMatches,
      chartData,
    };
  }

  static async updatePlayerAvatar(
    teamId: string,
    userId: number,
    avatarFile: UploadedImageFile
  ): Promise<{ avatarUrl: string }> {
    const result = await this.updatePlayerProfile(teamId, userId, { avatarFile });
    return { avatarUrl: result.avatarUrl ?? "" };
  }

  static async updatePlayerProfile(
    teamId: string,
    userId: number,
    payload: {
      playerName?: string;
      jerseyNumber?: number | null;
      avatarFile?: UploadedImageFile | null;
    }
  ): Promise<{ playerName: string | null; jerseyNumber: number | null; avatarUrl: string | null }> {
    const member = await TeamMember.findOne({
      where: { teamId: Number(teamId), userId },
    });

    if (!member) {
      throw new AppError(404, "No perteneces a este equipo");
    }

    if (typeof payload.playerName === "string") {
      const normalizedPlayerName = payload.playerName.trim();
      member.playerName = normalizedPlayerName.length > 0 ? normalizedPlayerName : null;
    }

    if (payload.jerseyNumber !== undefined) {
      const normalizedJersey = payload.jerseyNumber === null ? null : Number(payload.jerseyNumber);

      if (normalizedJersey !== null) {
        if (!Number.isInteger(normalizedJersey) || normalizedJersey < 1 || normalizedJersey > 99) {
          throw new AppError(400, "El dorsal debe ser un número entre 1 y 99");
        }

        const conflict = await TeamMember.findOne({
          where: {
            teamId: Number(teamId),
            jerseyNumber: normalizedJersey,
            userId: { [Op.ne]: userId },
          },
        });

        if (conflict) {
          throw new AppError(409, `El dorsal ${normalizedJersey} ya está en uso en este equipo`);
        }
      }

      member.jerseyNumber = normalizedJersey;
    }

    if (payload.avatarFile) {
      const uploadedAvatar = await uploadImageToSupabase(payload.avatarFile, "avatars", member.avatarUrl);
      member.avatarUrl = uploadedAvatar.url;
    }

    await member.save();

    return {
      playerName: member.playerName,
      jerseyNumber: member.jerseyNumber,
      avatarUrl: member.avatarUrl,
    };
  }
}
