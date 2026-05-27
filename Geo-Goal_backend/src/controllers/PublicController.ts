import type { Request, Response } from "express";
import { buildPublicMediator } from "../application/public/PublicMediator";
import { PublicServiceAdapter } from "../services/PublicServiceAdapter";
import {
  ExportPublicFramesRequest,
  GetLeagueDetailRequest,
  GetLeaguesRequest,
  GetNewsRequest,
  GetPublicFixtureRequest,
  GetPublicFixtureWithLocationsRequest,
  GetPublicMatchAnalyticsRequest,
  GetPublicStandingsRequest,
  GetTeamProfileRequest,
} from "../application/public/requests/PublicRequests";

const publicMediator = buildPublicMediator(new PublicServiceAdapter());

export class PublicController {
  static getNews = async (req: Request, res: Response): Promise<void> => {
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const n = Number.isInteger(limit) && limit! > 0 ? limit! : 12;
    const data = await publicMediator.send(new GetNewsRequest(n));
    res.json(data);
  };

  static getLeagues = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50;
    const data = await publicMediator.send(new GetLeaguesRequest(page, pageSize));
    res.json(data);
  };

  static getLeagueDetail = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await publicMediator.send(new GetLeagueDetailRequest(leagueId));
    res.json(data);
  };

  static getStandings = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await publicMediator.send(new GetPublicStandingsRequest(leagueId));
    res.json(data);
  };

  static getFixture = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await publicMediator.send(new GetPublicFixtureRequest(leagueId));
    res.json(data);
  };

  static getFixtureWithLocations = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await publicMediator.send(
      new GetPublicFixtureWithLocationsRequest(leagueId)
    );
    res.json(data);
  };

  static getTeamProfile = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, teamId } = req.params;
    const data = await publicMediator.send(new GetTeamProfileRequest(leagueId, teamId));
    res.json(data);
  };

  static getMatchAnalytics = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await publicMediator.send(new GetPublicMatchAnalyticsRequest(matchId));
    res.json(data);
  };

  static getAdvancedAnalytics = async (req: Request, res: Response): Promise<void> => {
    const matchId = Number(req.params.matchId);
    const { TrackingAnalyticsService } = await import("../services/TrackingAnalyticsService");
    const data = await TrackingAnalyticsService.getOrCompute(matchId);
    res.json(data);
  };

  static getMatchPrediction = async (req: Request, res: Response): Promise<void> => {
    const matchId = Number(req.params.matchId);
    const { EloService } = await import("../services/EloService");
    const { DixonColesService } = await import("../services/DixonColesService");

    const [elo, poisson] = await Promise.all([
      EloService.predictMatch(matchId).catch(() => null),
      DixonColesService.predictMatch(matchId).catch(() => null),
    ]);

    res.json({ elo, poisson });
  };

  static getPlayerForm = async (req: Request, res: Response): Promise<void> => {
    const playerId = Number(req.params.userId);
    const last = Math.min(Number(req.query.last) || 5, 20);
    const { MatchAnalyticsService } = await import("../services/MatchAnalyticsService");
    const form = await MatchAnalyticsService.getPlayerForm(playerId, last);
    res.json(form);
  };

  static getWeeklyAward = async (req: Request, res: Response): Promise<void> => {
    const { WeeklyAward } = await import("../models/WeeklyAward");
    const { User } = await import("../models/User");
    const { Team } = await import("../models/Team");
    const leagueId = Number(req.params.leagueId);

    const award = await WeeklyAward.findOne({
      where: { leagueId },
      include: [
        { model: User, as: "player", attributes: ["id", "name"] },
        { model: Team, attributes: ["id", "name", "logoUrl"] },
      ],
      order: [["weekStart", "DESC"]],
    });

    if (!award) {
      res.status(404).json({ error: "No hay premio disponible aún" });
      return;
    }
    res.json(award);
  };

  // ── Fase 5: xG ───────────────────────────────────────────────────────────

  static getMatchXG = async (req: Request, res: Response): Promise<void> => {
    const matchId = Number(req.params.matchId);
    const { XGService } = await import("../services/XGService");
    const [shots, perPlayer] = await Promise.all([
      XGService.shotsForMatch(matchId),
      XGService.playerXGForMatch(matchId),
    ]);
    // totalXG por equipo derivado de los tiros
    const teamTotals: Record<number, number> = {};
    shots.forEach((s: any) => {
      if (s.teamId) teamTotals[s.teamId] = Number(((teamTotals[s.teamId] || 0) + s.xg).toFixed(3));
    });
    res.json({ shots, perPlayer, teamTotals });
  };

  // ── Fase 5: xT ───────────────────────────────────────────────────────────

  static getMatchXT = async (req: Request, res: Response): Promise<void> => {
    const matchId = Number(req.params.matchId);
    const { XTService } = await import("../services/XTService");
    const result = await XTService.computeForMatch(matchId);
    res.json(result);
  };

  // ── Fase 6: H2H ──────────────────────────────────────────────────────────

  static getH2H = async (req: Request, res: Response): Promise<void> => {
    const teamA = Number(req.params.teamA);
    const teamB = Number(req.params.teamB);
    const { Match } = await import("../models/Match");
    const { Team } = await import("../models/Team");
    const { Op } = await import("sequelize");

    const matches = await Match.findAll({
      where: {
        played: true,
        [Op.or]: [
          { homeTeamId: teamA, awayTeamId: teamB },
          { homeTeamId: teamB, awayTeamId: teamA },
        ],
      },
      order: [["date", "DESC"]],
      limit: 20,
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
      ],
    });

    let teamAWins = 0, teamBWins = 0, draws = 0, goalsA = 0, goalsB = 0;
    for (const m of matches) {
      const aHome = m.homeTeamId === teamA;
      const scoreA = aHome ? m.homeScore : m.awayScore;
      const scoreB = aHome ? m.awayScore : m.homeScore;
      goalsA += scoreA; goalsB += scoreB;
      if (scoreA > scoreB) teamAWins++;
      else if (scoreA < scoreB) teamBWins++;
      else draws++;
    }

    res.json({
      summary: {
        played: matches.length,
        teamAWins, teamBWins, draws,
        avgGoalsPerMatch: matches.length ? +((goalsA + goalsB) / matches.length).toFixed(2) : 0,
        goalsFor: { teamA: goalsA, teamB: goalsB },
      },
      recent: matches.slice(0, 10).map((m) => ({
        matchId: m.id,
        date: m.date,
        homeTeam: (m as any).homeTeam?.name ?? "",
        awayTeam: (m as any).awayTeam?.name ?? "",
        score: `${m.homeScore}-${m.awayScore}`,
        winner:
          m.homeScore > m.awayScore ? (m as any).homeTeam?.name :
          m.homeScore < m.awayScore ? (m as any).awayTeam?.name : "Empate",
      })),
    });
  };

  // ── Fase 6: Forma reciente ────────────────────────────────────────────────

  static getTeamForm = async (req: Request, res: Response): Promise<void> => {
    const teamId = Number(req.params.teamId);
    const last = Math.min(Number(req.query.last) || 5, 20);
    const { Match } = await import("../models/Match");
    const { Op } = await import("sequelize");

    const matches = await Match.findAll({
      where: {
        played: true,
        [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      order: [["date", "DESC"]],
      limit: last,
    });

    let wins = 0, drawsN = 0, losses = 0, gf = 0, ga = 0;
    const recent = matches.map((m) => {
      const isHome = m.homeTeamId === teamId;
      const scoreFor = isHome ? m.homeScore : m.awayScore;
      const scoreAgainst = isHome ? m.awayScore : m.homeScore;
      gf += scoreFor; ga += scoreAgainst;
      let result: "W" | "D" | "L";
      if (scoreFor > scoreAgainst) { wins++; result = "W"; }
      else if (scoreFor < scoreAgainst) { losses++; result = "L"; }
      else { drawsN++; result = "D"; }
      return { matchId: m.id, date: m.date, scoreFor, scoreAgainst, result };
    });

    res.json({
      summary: {
        pointsPerMatch: matches.length ? +((wins * 3 + drawsN) / matches.length).toFixed(2) : 0,
        wins, draws: drawsN, losses,
        goalsFor: gf, goalsAgainst: ga,
        streak: recent.map((r) => r.result).reverse().join(""),
      },
      recent: recent.reverse(),
    });
  };

  // ── Fase 6: Radar comparativo de jugadores ────────────────────────────────

  static comparePlayers = async (req: Request, res: Response): Promise<void> => {
    const idA = Number(req.params.id1);
    const idB = Number(req.params.id2);
    const { PlayerMatchStat } = await import("../models/PlayerMatchStat");
    const { Sequelize } = await import("sequelize");

    const buildAgg = async (pid: number) =>
      PlayerMatchStat.findOne({
        where: { playerId: pid },
        attributes: [
          [Sequelize.fn("SUM", Sequelize.col("goals")), "goals"],
          [Sequelize.fn("SUM", Sequelize.col("assists")), "assists"],
          [Sequelize.fn("SUM", Sequelize.col("passesCompleted")), "passesCompleted"],
          [Sequelize.fn("SUM", Sequelize.col("distanceMeters")), "distanceMeters"],
          [Sequelize.fn("AVG", Sequelize.col("rating")), "rating"],
          [Sequelize.fn("SUM", Sequelize.col("shots")), "shots"],
        ],
        raw: true,
      }) as Promise<Record<string, any> | null>;

    const maxes = await PlayerMatchStat.findOne({
      attributes: [
        [Sequelize.fn("MAX", Sequelize.fn("SUM", Sequelize.col("goals"))), "goals"],
        [Sequelize.fn("MAX", Sequelize.fn("SUM", Sequelize.col("assists"))), "assists"],
        [Sequelize.fn("MAX", Sequelize.fn("SUM", Sequelize.col("passesCompleted"))), "passesCompleted"],
        [Sequelize.fn("MAX", Sequelize.fn("SUM", Sequelize.col("distanceMeters"))), "distanceMeters"],
        [Sequelize.fn("MAX", Sequelize.fn("SUM", Sequelize.col("shots"))), "shots"],
      ],
      group: ["playerId"],
      order: [[Sequelize.fn("SUM", Sequelize.col("goals")), "DESC"]],
      raw: true,
    }) as Record<string, any> | null;

    const [aggA, aggB] = await Promise.all([buildAgg(idA), buildAgg(idB)]);

    const norm = (val: any, max: any) => max ? Math.min(100, Math.round((Number(val) / Number(max)) * 100)) : 0;

    const toRadar = (agg: Record<string, any> | null) => ({
      goals: norm(agg?.goals, maxes?.goals),
      assists: norm(agg?.assists, maxes?.assists),
      passing: norm(agg?.passesCompleted, maxes?.passesCompleted),
      distance: norm(agg?.distanceMeters, maxes?.distanceMeters),
      rating: agg?.rating ? Math.round((Number(agg.rating) / 10) * 100) : 0,
      shots: norm(agg?.shots, maxes?.shots),
    });

    res.json({ playerA: toRadar(aggA), playerB: toRadar(aggB) });
  };

  // ── Fase 6: Player similarity ─────────────────────────────────────────────

  static getSimilarPlayers = async (req: Request, res: Response): Promise<void> => {
    const playerId = Number(req.params.id);
    const n = Math.min(Number(req.query.n) || 5, 20);
    const { PlayerSimilarityService } = await import("../services/PlayerSimilarityService");
    const similar = await PlayerSimilarityService.findSimilar(playerId, n);
    res.json(similar);
  };

  // ── Fase 7: Eventos inferidos (revisión) ─────────────────────────────────

  static getInferredEvents = async (req: Request, res: Response): Promise<void> => {
    const matchId = Number(req.params.matchId);
    const { MatchEvent } = await import("../models/MatchEvent");
    const { User } = await import("../models/User");
    const { Team } = await import("../models/Team");

    // Traer TODOS los inferred y filtrar el flag de revisión en JS.
    // Hacer la query JSONB-aware en Sequelize es engorroso y los volúmenes
    // por partido son <500 eventos típicamente.
    const events = await MatchEvent.findAll({
      where: { matchId, source: "inferred" },
      include: [
        { model: User, as: "player", attributes: ["id", "name"], required: false },
        { model: User, as: "relatedPlayer", attributes: ["id", "name"], required: false },
        { model: Team, attributes: ["id", "name"], required: false },
      ],
      order: [["minute", "ASC"], ["matchTimestampSec", "ASC"]],
    });

    const pending = [];
    const autoApplied = [];
    for (const ev of events) {
      const meta: any = ev.metadata ?? {};
      if (meta.requiresReview === true) {
        pending.push(ev);
      } else {
        autoApplied.push(ev);
      }
    }

    // Separar también por confianza para que la UI agrupe por urgencia
    const highConf = pending.filter((e: any) => Number(e.confidence ?? 0) >= 0.6);
    const lowConf = pending.filter((e: any) => Number(e.confidence ?? 0) < 0.6);

    res.json({
      totalInferred: events.length,
      pendingCount: pending.length,
      autoAppliedCount: autoApplied.length,
      pending: pending,                // todos los pendientes
      pendingByConfidence: {
        high: highConf,                // ≥60% confianza
        low: lowConf,                  // <60% — revisar primero
      },
      autoApplied: autoApplied,        // ya aplicados, mostrar solo para referencia
    });
  };

  static confirmInferredEvent = async (req: Request, res: Response): Promise<void> => {
    const { MatchEvent } = await import("../models/MatchEvent");
    const ev = await MatchEvent.findByPk(req.params.id);
    if (!ev) { res.status(404).json({ error: "Evento no encontrado" }); return; }

    const meta = (ev.metadata as Record<string, unknown>) ?? {};
    await ev.update({
      source: "manual",
      confidence: 1.0,
      metadata: { ...meta, requiresReview: false, confirmedBy: (req as any).user?.id ?? null },
      recordedBy: (req as any).user?.id ?? null,
    });
    res.json({ confirmed: true });
  };

  static rejectInferredEvent = async (req: Request, res: Response): Promise<void> => {
    const { MatchEvent } = await import("../models/MatchEvent");
    const ev = await MatchEvent.findByPk(req.params.id);
    if (!ev) { res.status(404).json({ error: "Evento no encontrado" }); return; }
    await ev.destroy();
    res.json({ rejected: true });
  };

  static updateInferredEvent = async (req: Request, res: Response): Promise<void> => {
    const { MatchEvent } = await import("../models/MatchEvent");
    const ev = await MatchEvent.findByPk(req.params.id);
    if (!ev) { res.status(404).json({ error: "Evento no encontrado" }); return; }

    const { eventType, minute, teamId, playerId, xStart, yStart, xEnd, yEnd, outcome } = req.body;
    const meta = (ev.metadata as Record<string, unknown>) ?? {};
    await ev.update({
      ...(eventType != null && { eventType }),
      ...(minute != null && { minute }),
      ...(teamId !== undefined && { teamId }),
      ...(playerId !== undefined && { playerId }),
      ...(xStart !== undefined && { xStart }),
      ...(yStart !== undefined && { yStart }),
      ...(xEnd !== undefined && { xEnd }),
      ...(yEnd !== undefined && { yEnd }),
      ...(outcome !== undefined && { outcome }),
      source: "manual",
      confidence: 1.0,
      metadata: { ...meta, requiresReview: false, editedBy: (req as any).user?.id ?? null },
      recordedBy: (req as any).user?.id ?? null,
    });
    res.json(ev);
  };

  // ─── Fase 8: Dashboards agregados (jugador, equipo, coach) ──────────────

  static getPlayerDashboard = async (req: Request, res: Response): Promise<void> => {
    const { PlayerCareerService } = await import("../services/PlayerCareerService");
    const playerId = Number(req.params.id);
    if (!Number.isInteger(playerId) || playerId <= 0) {
      res.status(400).json({ error: "ID de jugador no válido" });
      return;
    }
    const scope = {
      seasonId: req.query.season ? Number(req.query.season) : undefined,
      leagueId: req.query.league ? Number(req.query.league) : undefined,
      teamId: req.query.team ? Number(req.query.team) : undefined,
    };
    const recentLimit = req.query.last ? Math.max(1, Math.min(50, Number(req.query.last))) : 10;
    try {
      const stats = await PlayerCareerService.getStats(playerId, scope, recentLimit);
      res.json(stats);
    } catch (err: any) {
      console.error(`[player-dashboard] ${playerId} failed:`, err.message);
      res.status(500).json({ error: "No se pudo cargar el dashboard del jugador" });
    }
  };

  static getTeamDashboard = async (req: Request, res: Response): Promise<void> => {
    const { TeamCareerService } = await import("../services/TeamCareerService");
    const teamId = Number(req.params.id);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      res.status(400).json({ error: "ID de equipo no válido" });
      return;
    }
    const scope = {
      seasonId: req.query.season ? Number(req.query.season) : undefined,
      leagueId: req.query.league ? Number(req.query.league) : undefined,
    };
    try {
      const stats = await TeamCareerService.getStats(teamId, scope);
      res.json(stats);
    } catch (err: any) {
      console.error(`[team-dashboard] ${teamId} failed:`, err.message);
      const status = err?.message?.includes("not found") ? 404 : 500;
      res.status(status).json({ error: err.message || "No se pudo cargar el dashboard del equipo" });
    }
  };

  static getCoachDashboard = async (req: Request, res: Response): Promise<void> => {
    const { CoachStatsService } = await import("../services/CoachStatsService");
    const coachId = Number(req.params.id);
    if (!Number.isInteger(coachId) || coachId <= 0) {
      res.status(400).json({ error: "ID de coach no válido" });
      return;
    }
    try {
      const stats = await CoachStatsService.getStats(coachId);
      res.json(stats);
    } catch (err: any) {
      console.error(`[coach-dashboard] ${coachId} failed:`, err.message);
      const status = err?.message?.includes("not found") ? 404 : 500;
      res.status(status).json({ error: err.message || "No se pudo cargar el dashboard del coach" });
    }
  };

  static exportFrames = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 1000;
    const data = await publicMediator.send(
      new ExportPublicFramesRequest(matchId, page, pageSize)
    );
    res.json(data);
  };

  // ─── Fase 8: Listado público de jugadores ──────────────────────────────
  //
  // Permite descubrir perfiles sin tener que navegar por equipos/partidos.
  // Filtros: search (por nombre), leagueId, teamId, minRating.
  //
  // Cálculo de stats agregadas: agrupa PlayerMatchStat por playerId, opcionalmente
  // restringido por liga/equipo.
  static getPlayersList = async (req: Request, res: Response): Promise<void> => {
    const { PlayerMatchStat } = await import("../models/PlayerMatchStat");
    const { User } = await import("../models/User");
    const { Team } = await import("../models/Team");
    const { Match } = await import("../models/Match");
    const { Sequelize, Op } = await import("sequelize");

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 30));
    const offset = (page - 1) * pageSize;

    const search = (req.query.search as string | undefined)?.trim() ?? "";
    const leagueId = req.query.league ? Number(req.query.league) : undefined;
    const teamId = req.query.team ? Number(req.query.team) : undefined;
    const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
    const sortBy = (req.query.sortBy as string | undefined) || "rating"; // rating | goals | assists | matches

    // 1. Filtros sobre PlayerMatchStat (vía include en Match si hay leagueId)
    const statWhere: any = {};
    if (teamId) statWhere.teamId = teamId;

    const matchInclude: any = { model: Match, attributes: [], required: !!leagueId };
    if (leagueId) matchInclude.where = { leagueId };

    // 2. Sort
    const sortField: Record<string, string> = {
      rating: '"avgRating"',
      goals: '"totalGoals"',
      assists: '"totalAssists"',
      matches: '"matchCount"',
    };
    const orderColumn = sortField[sortBy] || sortField.rating;

    // 3. Agregar por playerId
    const rows: any[] = await PlayerMatchStat.findAll({
      where: statWhere,
      include: [matchInclude],
      attributes: [
        "playerId",
        [Sequelize.fn("AVG", Sequelize.col("rating")), "avgRating"],
        [Sequelize.fn("SUM", Sequelize.col("goals")), "totalGoals"],
        [Sequelize.fn("SUM", Sequelize.col("assists")), "totalAssists"],
        [Sequelize.fn("SUM", Sequelize.col("PlayerMatchStat.minutesPlayed")), "totalMinutes"],
        [Sequelize.fn("COUNT", Sequelize.col("PlayerMatchStat.matchId")), "matchCount"],
      ],
      group: ["playerId"],
      having: minRating
        ? Sequelize.literal(`AVG(rating) >= ${minRating}`)
        : undefined,
      order: [[Sequelize.literal(orderColumn), "DESC NULLS LAST"]],
      subQuery: false,
      raw: true,
    });

    if (!rows.length) {
      res.json({ players: [], total: 0, page, pageSize });
      return;
    }

    // 4. Cargar info de usuarios + equipo principal (último jugado)
    const ids = rows.map((r) => Number(r.playerId)).filter((n) => Number.isInteger(n) && n > 0);

    const userWhere: any = { id: { [Op.in]: ids } };
    if (search) userWhere.name = { [Op.iLike]: `%${search}%` };

    const users = await User.findAll({
      where: userWhere,
      attributes: ["id", "name", "email", "username"],
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // 5. Para cada jugador, qué equipo es el que más jugó (recientes)
    const lastTeamRows: any[] = await PlayerMatchStat.findAll({
      where: { playerId: { [Op.in]: ids } },
      attributes: [
        "playerId",
        "teamId",
        [Sequelize.fn("COUNT", Sequelize.col("matchId")), "n"],
      ],
      group: ["playerId", "teamId"],
      raw: true,
    });
    const dominantTeam = new Map<number, number>(); // playerId → teamId (más frecuente)
    for (const r of lastTeamRows) {
      const pid = Number(r.playerId);
      const tid = Number(r.teamId);
      const n = Number(r.n);
      const prev = dominantTeam.get(pid);
      if (!prev || (lastTeamRows.find((x: any) => Number(x.playerId) === pid && Number(x.teamId) === prev)?.n ?? 0) < n) {
        dominantTeam.set(pid, tid);
      }
    }
    const teamIds = [...new Set([...dominantTeam.values()].filter((x) => x))];
    const teams = teamIds.length
      ? await Team.findAll({ where: { id: { [Op.in]: teamIds } }, attributes: ["id", "name", "logoUrl"] })
      : [];
    const teamMap = new Map(teams.map((t) => [t.id, t]));

    // 6. Combinar + filtrar por search (que se aplicó al lookup de users)
    let players = rows
      .map((r: any) => {
        const pid = Number(r.playerId);
        const u = userMap.get(pid);
        if (!u) return null; // search filtró
        const teamIdDom = dominantTeam.get(pid);
        const t = teamIdDom ? teamMap.get(teamIdDom) : null;
        return {
          playerId: pid,
          name: u.name,
          username: u.username ?? null,
          team: t ? { id: t.id, name: t.name, logoUrl: t.logoUrl } : null,
          avgRating: Number(Number(r.avgRating).toFixed(2)),
          totalGoals: Number(r.totalGoals) || 0,
          totalAssists: Number(r.totalAssists) || 0,
          totalMinutes: Number(r.totalMinutes) || 0,
          matchCount: Number(r.matchCount) || 0,
        };
      })
      .filter((p) => p != null) as Array<NonNullable<unknown>>;

    const total = players.length;
    players = players.slice(offset, offset + pageSize);

    res.json({ players, total, page, pageSize });
  };
}
