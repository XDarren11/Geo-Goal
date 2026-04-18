import { Op } from "sequelize";
import { AppError } from "../types/errors";
import { LeagueAdmin } from "../models/LeagueAdmin";
import { League } from "../models/League";
import { Match } from "../models/Match";
import { MatchRefereeAssignment } from "../models/MatchRefereeAssignment";
import { MatchEvent } from "../models/MatchEvent";
import { MatchTrackingFrame } from "../models/MatchTrackingFrame";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { AuditService } from "./AuditService";
import { NotificationService } from "./NotificationService";
import { NewsService } from "./NewsService";
import { MatchAnalyticsService } from "./MatchAnalyticsService";

const ALLOWED_EVENTS = new Set([
  "goal",
  "own_goal",
  "penalty_scored",
  "penalty_missed",
  "pass",
  "key_pass",
  "shot",
  "tackle",
  "recovery",
  "interception",
  "clearance",
  "dribble",
  "cross",
  "corner_won",
  "yellow_card",
  "red_card",
  "substitution",
  "foul",
  "offside",
  "var_review",
]);

type AssignRefereeInput = {
  refereeUserId: number;
  status?: "assigned" | "checked_in" | "closed";
};

type RegisterEventInput = {
  eventType: string;
  minute: number;
  extraMinute?: number | null;
  matchTimestampSec?: number | null;
  teamId?: number | null;
  playerId?: number | null;
  relatedPlayerId?: number | null;
  xStart?: number | null;
  yStart?: number | null;
  xEnd?: number | null;
  yEnd?: number | null;
  outcome?: string | null;
  source?: "manual" | "inferred" | "video" | "simulated";
  confidence?: number;
  metadata?: Record<string, unknown>;
};

type RegisterBulkEventsInput = {
  events: RegisterEventInput[];
};

type RegisterTrackingInput = {
  timestampMs: number;
  period?: "pre" | "1H" | "HT" | "2H" | "ET" | "post" | null;
  ball?: { x?: number; y?: number; z?: number };
  players: Array<Record<string, unknown>>;
  source?: "manual" | "inferred" | "video" | "simulated";
  confidence?: number;
};

function normalizeCoordinate(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Number(n.toFixed(3));
}

export class RefereeService {
  private static async ensureLeagueAdmin(leagueId: number, userId: number) {
    const league = await League.findByPk(leagueId, { attributes: ["id", "managerId"] });
    if (!league) {
      throw new AppError(404, "Liga no encontrada");
    }

    if (league.managerId === userId) {
      return league;
    }

    const assignment = await LeagueAdmin.findOne({
      where: {
        leagueId,
        userId,
        leagueRole: { [Op.in]: ["principal", "assistant"] },
      },
    });

    if (!assignment) {
      throw new AppError(403, "No tienes permisos en esta liga");
    }

    return assignment;
  }

  private static async ensureRefereeBelongsToLeague(leagueId: number, refereeUserId: number) {
    const refereeLeagueAssignment = await LeagueAdmin.findOne({
      where: {
        leagueId,
        userId: refereeUserId,
      },
    });

    if (!refereeLeagueAssignment) {
      throw new AppError(409, "El árbitro no pertenece a esta liga");
    }
  }

  private static async ensureRefereeOnMatch(matchId: number, userId: number) {
    const match = await Match.findByPk(matchId);
    if (!match) throw new AppError(404, "Partido no encontrado");

    const refereeUser = await User.findByPk(userId, { attributes: ["id", "role"] });
    if (!refereeUser) {
      throw new AppError(403, "Usuario no autorizado para registrar datos arbitrales");
    }

    if (refereeUser.role === "admin") {
      const isManager = (await League.findOne({
        where: { id: match.leagueId, managerId: userId },
        attributes: ["id"],
      })) != null;

      if (isManager) return match;

      const leagueAdmin = await LeagueAdmin.findOne({
        where: {
          leagueId: match.leagueId,
          userId,
          leagueRole: { [Op.in]: ["principal", "assistant"] },
        },
        attributes: ["id"],
      });

      if (leagueAdmin) return match;
    }

    const refAssignment = await MatchRefereeAssignment.findOne({
      where: {
        matchId,
        refereeUserId: userId,
        status: { [Op.in]: ["assigned", "checked_in"] },
      },
    });

    if (!refAssignment) {
      throw new AppError(403, "No estás asignado como árbitro a este partido");
    }

    return match;
  }

  static async assignRefereeToMatch(
    matchId: string,
    input: AssignRefereeInput,
    actorUserId: number
  ) {
    const match = await Match.findByPk(matchId);
    if (!match) throw new AppError(404, "Partido no encontrado");

    await this.ensureLeagueAdmin(match.leagueId, actorUserId);

    const referee = await User.findByPk(input.refereeUserId);
    if (!referee) throw new AppError(404, "Usuario designado no encontrado");
    if (!['referee', 'admin'].includes(referee.role)) {
      throw new AppError(400, "El usuario designado debe tener rol referee o admin");
    }

    if (referee.role === 'admin') {
      const isLeagueAdmin = await LeagueAdmin.findOne({
        where: {
          leagueId: match.leagueId,
          userId: input.refereeUserId,
          leagueRole: { [Op.in]: ['principal', 'assistant'] },
        },
      });

      const isManager = await League.findOne({
        where: {
          id: match.leagueId,
          managerId: input.refereeUserId,
        },
      });

      if (!isLeagueAdmin && !isManager) {
        throw new AppError(409, "El admin designado no pertenece a esta liga");
      }
    }

    if (referee.role === 'referee') {
      await this.ensureRefereeBelongsToLeague(match.leagueId, input.refereeUserId);
    }

    if (!match.date || new Date(match.date).getTime() <= Date.now()) {
      throw new AppError(409, "Solo puedes asignar árbitro a partidos próximos");
    }

    const conflictingAssignment = await MatchRefereeAssignment.findOne({
      where: {
        refereeUserId: input.refereeUserId,
        matchId: { [Op.ne]: Number(matchId) },
        status: { [Op.in]: ["assigned", "checked_in"] },
      },
      include: [
        {
          model: Match,
          required: true,
          where: {
            date: match.date,
          },
          attributes: ["id", "date", "roundName"],
        },
      ],
    });

    if (conflictingAssignment) {
      throw new AppError(
        409,
        "El árbitro ya tiene un partido asignado en esa misma fecha y hora"
      );
    }

    const existingByMatch = await MatchRefereeAssignment.findOne({
      where: { matchId: Number(matchId) },
    });

    let assignment: MatchRefereeAssignment;
    const created = !existingByMatch;

    if (!existingByMatch) {
      assignment = await MatchRefereeAssignment.create({
        matchId: Number(matchId),
        leagueId: match.leagueId,
        refereeUserId: input.refereeUserId,
        assignedBy: actorUserId,
        status: input.status ?? "assigned",
      });
    } else {
      existingByMatch.refereeUserId = input.refereeUserId;
      existingByMatch.status = input.status ?? existingByMatch.status;
      existingByMatch.assignedBy = actorUserId;
      await existingByMatch.save();
      assignment = existingByMatch;
    }

    await AuditService.log({
      actorUserId,
      leagueId: match.leagueId,
      seasonId: match.seasonId ?? null,
      entityType: "referee_assignment",
      entityId: assignment.id,
      action: created ? "create" : "update",
      afterData: assignment.toJSON() as Record<string, unknown>,
    });

    await NotificationService.notifyRefereeAssigned(Number(matchId), input.refereeUserId);

    return created ? "Árbitro asignado correctamente" : "Asignación de árbitro actualizada";
  }

  static async getLeagueReferees(leagueId: number, actorUserId: number) {
    await this.ensureLeagueAdmin(leagueId, actorUserId);

    const rows = await LeagueAdmin.findAll({
      where: { leagueId },
      include: [
        {
          model: User,
          as: "adminUser",
          where: { role: "referee" },
          attributes: ["id", "name", "email", "role"],
          required: true,
        },
      ],
      order: [["id", "DESC"]],
    });

    return rows.map((row) => row.adminUser);
  }

  static async getUpcomingLeagueMatches(leagueId: number, actorUserId: number) {
    await this.ensureLeagueAdmin(leagueId, actorUserId);

    const now = new Date();

    return Match.findAll({
      where: {
        leagueId,
        played: false,
        date: {
          [Op.gte]: now,
        },
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
      ],
      order: [["date", "ASC"]],
    });
  }

  static async getTodayAssignedMatches(userId: number) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const assignments = await MatchRefereeAssignment.findAll({
      where: {
        refereeUserId: userId,
        status: { [Op.in]: ["assigned", "checked_in"] },
      },
      include: [
        {
          model: Match,
          where: {
            date: {
              [Op.gte]: start,
              [Op.lte]: end,
            },
          },
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
          ],
        },
      ],
      order: [[{ model: Match, as: "match" }, "date", "ASC"]],
    });

    return assignments;
  }

  static async getRefereeDashboard(userId: number) {
    const now = new Date();
    const weekStart = new Date(now);
    const day = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - day);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekAssignments = await MatchRefereeAssignment.findAll({
      where: { refereeUserId: userId },
      include: [
        {
          model: Match,
          required: true,
          where: {
            date: {
              [Op.gte]: weekStart,
              [Op.lte]: weekEnd,
            },
          },
          include: [
            { model: League, attributes: ["id", "name"] },
            { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
          ],
        },
      ],
      order: [[{ model: Match, as: "match" }, "date", "ASC"]],
    });

    const upcomingAssignments = await MatchRefereeAssignment.findAll({
      where: {
        refereeUserId: userId,
        status: { [Op.in]: ["assigned", "checked_in"] },
      },
      include: [
        {
          model: Match,
          required: true,
          where: {
            date: { [Op.gte]: now },
          },
          include: [
            { model: League, attributes: ["id", "name"] },
            { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
          ],
        },
      ],
      order: [[{ model: Match, as: "match" }, "date", "ASC"]],
      limit: 12,
    });

    const statusAssignments = await MatchRefereeAssignment.findAll({
      where: { refereeUserId: userId },
      include: [
        {
          model: Match,
          required: true,
          include: [
            { model: League, attributes: ["id", "name"] },
            { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
          ],
        },
      ],
      order: [[{ model: Match, as: "match" }, "date", "ASC"]],
      limit: 20,
    });

    const toState = (assignment: MatchRefereeAssignment) => {
      const match = assignment.match;
      if (!match) return "pending" as const;
      if (assignment.status === "closed" || match.played) return "closed" as const;
      if (assignment.status === "checked_in") return "in_progress" as const;
      if (match.date && new Date(match.date).getTime() <= Date.now() && !match.played) return "in_progress" as const;
      return "pending" as const;
    };

    const matchStatus = statusAssignments.slice(0, 12).map((assignment) => ({
      assignmentId: assignment.id,
      matchId: assignment.matchId,
      status: toState(assignment),
      assignmentStatus: assignment.status,
      match: assignment.match,
    }));

    const historyAssignments = statusAssignments
      .slice()
      .sort((a, b) => {
        const ad = a.match?.date ? new Date(a.match.date).getTime() : 0;
        const bd = b.match?.date ? new Date(b.match.date).getTime() : 0;
        return bd - ad;
      })
      .slice(0, 8);

    const historyMatchIds = historyAssignments.map((a) => a.matchId);

    const events = historyMatchIds.length
      ? await MatchEvent.findAll({
          where: {
            matchId: { [Op.in]: historyMatchIds },
            recordedBy: userId,
          },
          attributes: ["matchId", "eventType"],
        })
      : [];

    const trackingFrames = historyMatchIds.length
      ? await MatchTrackingFrame.findAll({
          where: {
            matchId: { [Op.in]: historyMatchIds },
            recordedBy: userId,
          },
          attributes: ["matchId"],
        })
      : [];

    const eventMetrics = new Map<number, { eventsCount: number; goals: number; cards: number }>();
    events.forEach((e) => {
      const row = eventMetrics.get(e.matchId) ?? { eventsCount: 0, goals: 0, cards: 0 };
      row.eventsCount += 1;
      if (["goal", "own_goal", "penalty_scored"].includes(e.eventType)) row.goals += 1;
      if (["yellow_card", "red_card"].includes(e.eventType)) row.cards += 1;
      eventMetrics.set(e.matchId, row);
    });

    const trackingMetrics = new Map<number, number>();
    trackingFrames.forEach((f) => {
      trackingMetrics.set(f.matchId, (trackingMetrics.get(f.matchId) ?? 0) + 1);
    });

    const recentHistory = historyAssignments.map((assignment) => ({
      assignmentId: assignment.id,
      matchId: assignment.matchId,
      status: toState(assignment),
      match: assignment.match,
      metrics: {
        eventsCount: eventMetrics.get(assignment.matchId)?.eventsCount ?? 0,
        goals: eventMetrics.get(assignment.matchId)?.goals ?? 0,
        cards: eventMetrics.get(assignment.matchId)?.cards ?? 0,
        trackingFrames: trackingMetrics.get(assignment.matchId) ?? 0,
      },
    }));

    const recommendedMatchId = upcomingAssignments[0]?.matchId ?? null;

    const quickActions = [
      {
        key: "register_event",
        label: "Registrar evento",
        description: "Captura goles, tarjetas y acciones clave.",
        path: "/admin/referee",
        recommendedMatchId,
      },
      {
        key: "tracking",
        label: "Enviar tracking",
        description: "Sube frames de seguimiento en vivo.",
        path: "/admin/referee",
        recommendedMatchId,
      },
      {
        key: "close_report",
        label: "Cerrar acta",
        description: "Finaliza partido y deja constancia arbitral.",
        path: "/admin/referee",
        recommendedMatchId,
      },
    ];

    const stats = {
      assignedWeek: weekAssignments.length,
      checkIns: weekAssignments.filter((a) => ["checked_in", "closed"].includes(a.status)).length,
      closedMatches: weekAssignments.filter((a) => a.status === "closed" || a.match?.played).length,
    };

    const leagueIdsForNews = Array.from(
      new Set(
        statusAssignments
          .map((a) => Number(a.leagueId ?? a.match?.leagueId ?? 0))
          .filter((id) => Number.isInteger(id) && id > 0)
      )
    );
    const news = await NewsService.getNewsForLeagues(leagueIdsForNews, 8);

    return {
      stats,
      upcomingAssignedMatches: upcomingAssignments,
      matchStatus,
      quickActions,
      recentHistory,
      weekRange: {
        from: weekStart.toISOString(),
        to: weekEnd.toISOString(),
      },
      summary: {
        totalEventsLogged: events.length,
        totalTrackingFrames: trackingFrames.length,
      },
      news,
    };
  }

  static async registerEvent(matchId: string, userId: number, input: RegisterEventInput) {
    const match = await this.ensureRefereeOnMatch(Number(matchId), userId);

    if (!ALLOWED_EVENTS.has(input.eventType)) {
      throw new AppError(400, "Tipo de evento no permitido");
    }

    if (input.minute == null || Number(input.minute) < 0 || Number(input.minute) > 130) {
      throw new AppError(400, "Minuto inválido");
    }

    if (input.teamId != null) {
      const validTeam = [match.homeTeamId, match.awayTeamId].includes(Number(input.teamId));
      if (!validTeam) {
        throw new AppError(400, "El equipo no pertenece al partido");
      }
    }

    const event = await MatchEvent.create({
      matchId: Number(matchId),
      leagueId: match.leagueId,
      teamId: input.teamId ?? null,
      playerId: input.playerId ?? null,
      relatedPlayerId: input.relatedPlayerId ?? null,
      eventType: input.eventType as MatchEvent["eventType"],
      minute: Number(input.minute),
      extraMinute: input.extraMinute ?? null,
      matchTimestampSec:
        input.matchTimestampSec != null && !Number.isNaN(Number(input.matchTimestampSec))
          ? Number(input.matchTimestampSec)
          : Number(input.minute) * 60 + Number(input.extraMinute ?? 0),
      xStart: normalizeCoordinate(input.xStart),
      yStart: normalizeCoordinate(input.yStart),
      xEnd: normalizeCoordinate(input.xEnd),
      yEnd: normalizeCoordinate(input.yEnd),
      outcome: input.outcome ?? null,
      source: input.source ?? "manual",
      confidence: input.confidence != null ? Math.max(0, Math.min(1, Number(input.confidence))) : 1,
      metadata: input.metadata ?? {},
      recordedBy: userId,
    });

    await AuditService.log({
      actorUserId: userId,
      leagueId: match.leagueId,
      seasonId: match.seasonId ?? null,
      entityType: "match_event",
      entityId: event.id,
      action: "create",
      afterData: event.toJSON() as Record<string, unknown>,
    });

    await MatchAnalyticsService.recalculateForMatch(Number(matchId));

    return event;
  }

  static async registerBulkEvents(matchId: string, userId: number, input: RegisterBulkEventsInput) {
    const events = Array.isArray(input.events) ? input.events : [];
    if (!events.length) {
      throw new AppError(400, "events debe contener al menos un evento");
    }

    const match = await this.ensureRefereeOnMatch(Number(matchId), userId);
    const created: MatchEvent[] = [];

    for (const eventInput of events) {
      if (!ALLOWED_EVENTS.has(String(eventInput.eventType))) {
        throw new AppError(400, `Tipo de evento no permitido: ${eventInput.eventType}`);
      }

      if (eventInput.minute == null || Number(eventInput.minute) < 0 || Number(eventInput.minute) > 130) {
        throw new AppError(400, `Minuto inválido en evento: ${eventInput.minute}`);
      }

      if (eventInput.teamId != null) {
        const validTeam = [match.homeTeamId, match.awayTeamId].includes(Number(eventInput.teamId));
        if (!validTeam) {
          throw new AppError(400, `teamId inválido en evento: ${eventInput.teamId}`);
        }
      }

      const createdEvent = await MatchEvent.create({
        matchId: Number(matchId),
        leagueId: match.leagueId,
        teamId: eventInput.teamId ?? null,
        playerId: eventInput.playerId ?? null,
        relatedPlayerId: eventInput.relatedPlayerId ?? null,
        eventType: eventInput.eventType as MatchEvent["eventType"],
        minute: Number(eventInput.minute),
        extraMinute: eventInput.extraMinute ?? null,
        matchTimestampSec:
          eventInput.matchTimestampSec != null && !Number.isNaN(Number(eventInput.matchTimestampSec))
            ? Number(eventInput.matchTimestampSec)
            : Number(eventInput.minute) * 60 + Number(eventInput.extraMinute ?? 0),
        xStart: normalizeCoordinate(eventInput.xStart),
        yStart: normalizeCoordinate(eventInput.yStart),
        xEnd: normalizeCoordinate(eventInput.xEnd),
        yEnd: normalizeCoordinate(eventInput.yEnd),
        outcome: eventInput.outcome ?? null,
        source: eventInput.source ?? "manual",
        confidence:
          eventInput.confidence != null
            ? Math.max(0, Math.min(1, Number(eventInput.confidence)))
            : 1,
        metadata: eventInput.metadata ?? {},
        recordedBy: userId,
      });

      created.push(createdEvent);
    }

    await AuditService.log({
      actorUserId: userId,
      leagueId: match.leagueId,
      seasonId: match.seasonId ?? null,
      entityType: "match_event_bulk",
      entityId: Number(matchId),
      action: "create",
      afterData: { createdEvents: created.length } as Record<string, unknown>,
    });

    const analytics = await MatchAnalyticsService.recalculateForMatch(Number(matchId));

    return {
      created: created.length,
      analyticsRows: analytics.rows,
    };
  }

  static async registerTrackingFrame(matchId: string, userId: number, input: RegisterTrackingInput) {
    const match = await this.ensureRefereeOnMatch(Number(matchId), userId);

    if (!Array.isArray(input.players)) {
      throw new AppError(400, "players debe ser un arreglo");
    }

    if (input.players.length > 60) {
      throw new AppError(400, "players supera el límite permitido");
    }

    if (!input.timestampMs || Number.isNaN(Number(input.timestampMs))) {
      throw new AppError(400, "timestampMs es obligatorio");
    }

    const frame = await MatchTrackingFrame.create({
      matchId: Number(matchId),
      leagueId: match.leagueId,
      timestampMs: Number(input.timestampMs),
      period: input.period ?? null,
      ballX: input.ball?.x ?? null,
      ballY: input.ball?.y ?? null,
      ballZ: input.ball?.z ?? null,
      players: input.players,
      source: input.source ?? "manual",
      confidence: input.confidence != null ? Math.max(0, Math.min(1, Number(input.confidence))) : 1,
      recordedBy: userId,
    });

    return frame;
  }

  static async getMatchAnalytics(matchId: number) {
    return MatchAnalyticsService.getMatchAnalytics(matchId);
  }
}
