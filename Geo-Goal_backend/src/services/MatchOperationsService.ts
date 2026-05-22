import { Op } from "sequelize";
import { Match } from "../models/Match";
import { Season } from "../models/Season";
import { TeamLeagueStat } from "../models/TeamLeagueStat";
import { MatchDetail } from "../models/MatchDetail";
import { AppError } from "../types/errors";
import { AuditService } from "./AuditService";
import { NotificationService } from "./NotificationService";
import { MatchAnalyticsService } from "./MatchAnalyticsService";
import { User } from "../models/User";
import { TeamMember } from "../models/TeamMember";

type AuditMeta = {
  actorUserId: number | null;
  reason?: string;
  ip?: string | null;
  userAgent?: string | null;
};

/**
 * Programación de partidos y actualización de marcador (antes en MatchController).
 */
export class MatchOperationsService {
  private static async resolveActiveSeasonIdForLeague(leagueId: number): Promise<number | null> {
    const activeSeason = await Season.findOne({
      where: { leagueId, status: "active" },
      attributes: ["id"],
      order: [["id", "DESC"]],
    });

    return activeSeason?.id ?? null;
  }

  // 1. REFACTORIZACIÓN: La tabla de puntos con penales independientes
  private static async updateTeamStats(teamId: number, leagueId: number): Promise<void> {
    const matches = await Match.findAll({
      where: {
        leagueId,
        [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        played: true,
      },
    });

    let points = 0,
      gamesPlayed = 0,
      wins = 0,
      draws = 0,
      losses = 0;
    let goalsFor = 0,
      goalsAgainst = 0,
      penaltyWins = 0;

    matches.forEach((match) => {
      gamesPlayed++;
      const isHome = match.homeTeamId === teamId;
      const myGoals = isHome ? match.homeScore : match.awayScore;
      const rivalGoals = isHome ? match.awayScore : match.homeScore;

      goalsFor += myGoals;
      goalsAgainst += rivalGoals;

      // Tiempo Regular
      if (myGoals > rivalGoals) {
        wins++;
        points += 3;
      } else if (myGoals === rivalGoals) {
        draws++;
        points += 1;
      } else {
        losses++;
      }

      // Penales Independientes del empate
      if (match.homePenaltiesScore !== null && match.awayPenaltiesScore !== null) {
        const myPenalties = isHome ? match.homePenaltiesScore : match.awayPenaltiesScore;
        const rivalPenalties = isHome ? match.awayPenaltiesScore : match.homePenaltiesScore;

        if (myPenalties > rivalPenalties) {
          points += 1; // Punto extra por ganar la tanda
          penaltyWins++;
        }
      }
    });

    const goalDifference = goalsFor - goalsAgainst;

    const [stat, created] = await TeamLeagueStat.findOrCreate({
      where: { teamId, leagueId },
      defaults: {
        points,
        gamesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference,
        penaltyWins,
      },
    });

    if (!created) {
      await stat.update({
        points,
        gamesPlayed,
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst,
        goalDifference,
        penaltyWins,
      });
    }
  }

  static async scheduleMatch(
    matchId: string,
    dateIso: string,
    userId: number | undefined,
    audit: AuditMeta
  ): Promise<{ message: string; match: Match }> {
    const match = await Match.findByPk(matchId);
    if (!match) {
      throw new AppError(404, "Partido no encontrado");
    }

    if (match.date && new Date(match.date).getTime() < Date.now()) {
      throw new AppError(
        409,
        "No se puede cambiar la fecha de un partido cuya fecha/hora ya pasó"
      );
    }

    const parsedDate = new Date(dateIso);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new AppError(400, "Fecha y hora inválidas");
    }

    const beforeData = match.toJSON() as Record<string, unknown>;

    if (match.seasonId == null) {
      const activeSeasonId = await this.resolveActiveSeasonIdForLeague(match.leagueId);
      if (activeSeasonId != null) {
        match.seasonId = activeSeasonId;
      }
    }

    match.date = parsedDate;
    await match.save();

    const [detail] = await MatchDetail.findOrCreate({
      where: { matchId: match.id },
      defaults: {
        matchId: match.id,
        kickoffTime: parsedDate,
        durationMinutes: 90,
        endTime: new Date(parsedDate.getTime() + 90 * 60 * 1000),
        matchDay: parsedDate.toISOString().slice(0, 10),
        homeStartingXI: [],
        awayStartingXI: [],
        homeBench: [],
        awayBench: [],
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
      },
    });

    if (detail) {
      detail.kickoffTime = parsedDate;
      detail.matchDay = parsedDate.toISOString().slice(0, 10);
      const duration = detail.durationMinutes ?? 90;
      detail.endTime = new Date(parsedDate.getTime() + duration * 60 * 1000);
      detail.updatedBy = userId ?? null;
      await detail.save();
    }

    await NotificationService.notifyMatchScheduled(match.id, parsedDate);

    await AuditService.log({
      actorUserId: audit.actorUserId,
      leagueId: match.leagueId,
      seasonId: match.seasonId ?? null,
      entityType: "match_schedule",
      entityId: match.id,
      action: "update",
      beforeData,
      afterData: match.toJSON() as Record<string, unknown>,
      reason: audit.reason ?? "Programación individual de partido",
      ip: audit.ip ?? null,
      userAgent: audit.userAgent ?? null,
    });

    return { message: "Partido programado correctamente", match };
  }

  // 2. REFACTORIZACIÓN: Guardar el score permitiendo penales y ceros
  static async updateScore(
    matchId: string,
    homeScore: number,
    awayScore: number,
    homePenaltiesScore: number | undefined | null, // Acepta null explícito
    awayPenaltiesScore: number | undefined | null, // Acepta null explícito
    audit: AuditMeta
  ): Promise<{ message: string }> {
    const match = await Match.findByPk(matchId);
    if (!match) {
      throw new AppError(404, "Partido no encontrado");
    }

    const beforeData = match.toJSON() as Record<string, unknown>;

    match.homeScore = homeScore;
    match.awayScore = awayScore;

    // Quitamos la condición de (homeScore === awayScore)
    // El "??" garantiza que si React mandó un 0, se guarda el 0.
    // Si React mandó null o undefined, se borra/ignora (null).
    match.homePenaltiesScore = homePenaltiesScore ?? null;
    match.awayPenaltiesScore = awayPenaltiesScore ?? null;

    match.played = true;
    await match.save();

    await AuditService.log({
      actorUserId: audit.actorUserId,
      leagueId: match.leagueId,
      seasonId: match.seasonId ?? null,
      entityType: "match",
      entityId: match.id,
      action: "manual_fix",
      beforeData,
      afterData: match.toJSON() as Record<string, unknown>,
      reason: audit.reason ?? "Actualización de marcador",
      ip: audit.ip ?? null,
      userAgent: audit.userAgent ?? null,
    });

    // Se actualizan ambos equipos
    await Promise.all([
      MatchOperationsService.updateTeamStats(match.homeTeamId, match.leagueId),
      MatchOperationsService.updateTeamStats(match.awayTeamId, match.leagueId),
    ]);

    await MatchAnalyticsService.recalculateForMatch(match.id);

    return { message: "Marcador actualizado y tabla recalculada con regla de penales" };
  }

  static async getMatchPlayers(matchId: string): Promise<any[]> {
    const match = await Match.findByPk(matchId);
    if (!match) return [];

    const members = await TeamMember.findAll({
      where: {
        teamId: { [Op.in]: [match.homeTeamId, match.awayTeamId] }
      },
      include: [{ model: User, attributes: ['id', 'name'] }] 
    });

    return members.map((m: any) => ({
      id: m.User?.id || m.userId, 
      name: m.User?.name || "Sin nombre",
      teamId: m.teamId
    }));
  }
}