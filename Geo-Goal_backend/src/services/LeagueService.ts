import { Op, Transaction } from "sequelize";
import {League} from "../models/League";
import {Team} from "../models/Team";
import {User} from "../models/User";
import {Match} from "../models/Match";
import {MatchRefereeAssignment} from "../models/MatchRefereeAssignment";
import {Season} from "../models/Season";
import {TeamLeagueStat} from "../models/TeamLeagueStat";
import {TeamMember} from "../models/TeamMember";
import {MatchGenerator} from "../utils/MatchGenerator";
import {AppError} from "../types/errors";
import {NotificationService} from "./NotificationService";
import {AuditService} from "./AuditService";
import {
  uploadImageToSupabase,
  type UploadedImageFile,
} from "../utils/supabaseStorage";

export class LeagueService {
  private static async resolveActiveSeasonIdForLeague(
    leagueId: number,
    transaction?: Transaction
  ): Promise<number | null> {
    const activeSeasons = await Season.findAll({
      where: { leagueId, status: "active" },
      attributes: ["id"],
      limit: 2,
      order: [["id", "DESC"]],
      transaction,
    });

    if (activeSeasons.length > 1) {
      throw new AppError(409, "La liga tiene más de una temporada activa. Corrige esto antes de continuar");
    }

    return activeSeasons[0]?.id ?? null;
  }

  private static extractRoundNumber(roundName: string | null | undefined): number {
    if (!roundName) return 0;
    const match = roundName.match(/\d+/);
    if (!match) return 0;
    const parsed = Number(match[0]);
    return Number.isInteger(parsed) ? parsed : 0;
  }

  private static async appendPendingMatchesForNewTeam(
    leagueId: number,
    teamId: number,
    transaction: Transaction
  ): Promise<{
    createdCount: number;
    scheduledMatches: Array<{ id: number; date: Date }>;
    reason:
      | "no_fixture_in_league"
      | "no_rivals"
      | "already_fully_paired"
      | "created";
  }> {
    const totalLeagueMatches = await Match.count({ where: { leagueId }, transaction });
    if (totalLeagueMatches === 0) {
      return { createdCount: 0, scheduledMatches: [], reason: "no_fixture_in_league" };
    }

    const activeSeasonId = await this.resolveActiveSeasonIdForLeague(leagueId, transaction);

    const activeSeasonMatches =
      activeSeasonId == null
        ? 0
        : await Match.count({
            where: { leagueId, seasonId: activeSeasonId },
            transaction,
          });

    const nullSeasonMatches = await Match.count({
      where: { leagueId, seasonId: null },
      transaction,
    });

    // Select one deterministic fixture scope so "missing rounds" are created in the same scope users already view.
    let fixtureScopeWhere: Record<string, unknown>;
    let targetSeasonId: number | null;
    if (activeSeasonId != null && activeSeasonMatches > 0) {
      fixtureScopeWhere = { leagueId, seasonId: activeSeasonId };
      targetSeasonId = activeSeasonId;
    } else if (nullSeasonMatches > 0) {
      fixtureScopeWhere = { leagueId, seasonId: null };
      targetSeasonId = null;
    } else if (activeSeasonId != null) {
      fixtureScopeWhere = { leagueId, seasonId: activeSeasonId };
      targetSeasonId = activeSeasonId;
    } else {
      fixtureScopeWhere = { leagueId };
      targetSeasonId = null;
    }

    const leagueTeams = await Team.findAll({
      where: { leagueId },
      attributes: ["id"],
      transaction,
    });

    const rivalTeamIds = leagueTeams
      .map((t) => t.id)
      .filter((id) => Number(id) !== Number(teamId));

    if (!rivalTeamIds.length) {
      return { createdCount: 0, scheduledMatches: [], reason: "no_rivals" };
    }

    const existingMatches = await Match.findAll({
      where: {
        ...fixtureScopeWhere,
        [Op.or]: [
          {
            homeTeamId: teamId,
            awayTeamId: { [Op.in]: rivalTeamIds },
          },
          {
            awayTeamId: teamId,
            homeTeamId: { [Op.in]: rivalTeamIds },
          },
        ],
      },
      attributes: ["homeTeamId", "awayTeamId"],
      transaction,
    });

    const alreadyPairedRivals = new Set<number>();
    existingMatches.forEach((match) => {
      if (Number(match.homeTeamId) === Number(teamId)) {
        alreadyPairedRivals.add(Number(match.awayTeamId));
      }
      if (Number(match.awayTeamId) === Number(teamId)) {
        alreadyPairedRivals.add(Number(match.homeTeamId));
      }
    });

    const pendingRivals = rivalTeamIds.filter((id) => !alreadyPairedRivals.has(Number(id)));
    if (!pendingRivals.length) {
      return { createdCount: 0, scheduledMatches: [], reason: "already_fully_paired" };
    }

    const fixtureScopeMatches = await Match.findAll({
      where: fixtureScopeWhere,
      attributes: ["roundName", "date"],
      order: [["id", "ASC"]],
      transaction,
    });

    let nextRoundNumber =
      fixtureScopeMatches.reduce(
        (max, m) => Math.max(max, this.extractRoundNumber(m.roundName)),
        0
      ) + 1;

    const datedMatchesMs = fixtureScopeMatches
      .map((m) => (m.date ? new Date(m.date).getTime() : NaN))
      .filter((value) => Number.isFinite(value))
      .sort((a, b) => a - b);

    const lastScheduledDateMs = datedMatchesMs.length
      ? datedMatchesMs[datedMatchesMs.length - 1]
      : null;
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    const matchesToCreate = pendingRivals.map((rivalTeamId, index) => ({
      leagueId,
      seasonId: targetSeasonId,
      homeTeamId: teamId,
      awayTeamId: rivalTeamId,
      roundName: `Jornada ${nextRoundNumber++}`,
      played: false,
      date:
        lastScheduledDateMs == null
          ? null
          : new Date(lastScheduledDateMs + (index + 1) * oneWeekMs),
    }));

    const createdMatches = await Match.bulkCreate(matchesToCreate, {
      returning: true,
      transaction,
    });

    const scheduledMatches = createdMatches
      .filter((m) => m.date != null)
      .map((m) => ({ id: m.id, date: new Date(m.date as Date) }));

    return { createdCount: createdMatches.length, scheduledMatches, reason: "created" };
  }

  private static buildRoundDate(
    scheduleStartDate: string,
    matchTime: string | undefined,
    roundIndex: number,
    daysBetweenRounds: number
  ): Date {
    const base = new Date(scheduleStartDate);
    if (Number.isNaN(base.getTime())) {
      throw new AppError(400, "Fecha inicial inválida para programación");
    }

    const [hh, mm] = (matchTime || "20:00").split(":").map(Number);
    base.setHours(hh ?? 20, mm ?? 0, 0, 0);
    base.setDate(base.getDate() + roundIndex * daysBetweenRounds);
    return base;
  }

  static async createLeague(
    managerId: number,
    data: { name: string; description: string; logoFile?: UploadedImageFile | null }
  ): Promise<string> {
    const league = new League({
      name: data.name,
      description: data.description,
      managerId,
    });
    if (data.logoFile) {
      const uploadedLogo = await uploadImageToSupabase(data.logoFile, "leagues");
      league.logoUrl = uploadedLogo.url;
    }
    await league.save();
    return "Liga Creada Correctamente";
  }

  static async getAllLeagues(managerId: number) {
    return League.findAll({
      where: { managerId },
    });
  }

  static async getLeagueById(leagueId: string, _managerId: number) {
    const league = await League.findOne({
      where: { id: leagueId },
      include: [Team],
    });
    if (!league) {
      throw new AppError(404, "Liga no encontrada");
    }
    return league;
  }

  static async updateLeague(
    leagueId: string,
    managerId: number,
    data: { name: string; description: string }
  ): Promise<string> {
    const league = await League.findOne({
      where: { id: leagueId, managerId },
    });
    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes permisos");
    }
    league.name = data.name;
    league.description = data.description;
    await league.save();
    return `Liga: ${league.name} actualizada correctamente`;
  }

static async deleteLeague(leagueId: string, managerId: number): Promise<string> {
    
    const league = await League.findOne({
      where: { id: leagueId, managerId },
    });

    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes permisos");
    }

    const name = league.name;

    await Team.update(
      { leagueId: null }, 
      { where: { leagueId: leagueId } }
    );

    await league.destroy();

    return `Liga: ${name} finalizada. El historial se guardó y los equipos fueron liberados.`;
  }

  static async getTrainerTeams(
    leagueId: string,
    managerId: number,
    email: string
  ) {
    const league = await League.findOne({
      where: { id: leagueId, managerId },
    });
    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes permisos");
    }
    const trainer = await User.findOne({ where: { email } });
    if (!trainer) {
      throw new AppError(404, "Entrenador no encontrado");
    }
    return Team.findAll({
      where: { trainerId: trainer.id },
      attributes: ["id", "name"],
    });
  }

  // static async addTeamToLeague(
  //   leagueId: string,
  //   managerId: number,
  //   teamId: number
  // ): Promise<string> {
  //   const league = await League.findOne({
  //     where: { id: leagueId, managerId },
  //   });
  //   if (!league) {
  //     throw new AppError(404, "Liga no encontrada o no tienes permisos");
  //   }
  //   const team = await Team.findByPk(teamId);
  //   if (!team) {
  //     throw new AppError(404, "Equipo no encontrado");
  //   }
  //   if (team.leagueId) {
  //     throw new AppError(409, "Este equipo ya está registrado en una liga");
  //   }
  //   team.leagueId = league.id;
  //   await team.save();
  //   return `El equipo "${team.name}" se agregó correctamente`;
  // }

  static async getTeamsLeague(leagueId: string, managerId: number) {
    const league = await League.findOne({
      where: { id: leagueId, managerId },
      attributes: [],
      include: [
        {
          model: Team,
          attributes: ["id", "name"],
          required: false,
        },
      ],
    });
    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes acceso");
    }
    return league;
  }

  static async removeTeamFromLeague(
    leagueId: string,
    teamId: string,
    managerId: number
  ): Promise<string> {
    const league = await League.findOne({
      where: { id: leagueId, managerId },
    });
    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes permisos");
    }
    const team = await Team.findOne({
      where: { id: teamId, leagueId: league.id },
    });
    if (!team) {
      throw new AppError(404, "El equipo no existe en esta liga");
    }
    team.leagueId = null;
    await team.save();
    return "Equipo eliminado de la liga correctamente";
  }

  static async generateFixture(
    leagueId: string,
    managerId: number,
    type: "round-robin" | "knockout",
    options?: {
      scheduleStartDate?: string;
      matchTime?: string;
      daysBetweenRounds?: number;
      matchDuration?: number;
    }
  ): Promise<{ message: string; totalMatches: number }> {
    const league = await League.findOne({
      where: { id: leagueId, managerId },
      include: [Team],
    });
    if (!league) {
      throw new AppError(404, "Liga no encontrada");
    }
    const teams = league.teams;
    const activeSeasonId = await this.resolveActiveSeasonIdForLeague(Number(league.id));

    if (teams.length < 2) {
      throw new AppError(
        400,
        "Necesitas al menos 2 equipos para crear un fixture"
      );
    }
    const teamIds = teams.map((t) => t.id);
    let generatedMatches: { home: number; away: number; round: string }[] = [];
    if (type === "round-robin") {
      generatedMatches = MatchGenerator.generateRoundRobin(teamIds);
    } else if (type === "knockout") {
      generatedMatches = MatchGenerator.generateKnockout(teamIds);
    } else {
      throw new AppError(400, "Tipo de torneo no válido");
    }

    const shouldSchedule = Boolean(options?.scheduleStartDate);
    const daysBetweenRounds = options?.daysBetweenRounds ?? 7;
    const matchDuration = options?.matchDuration ?? 60;

    const uniqueRoundsInOrder: string[] = [];
    generatedMatches.forEach((m) => {
      if (!uniqueRoundsInOrder.includes(m.round)) {
        uniqueRoundsInOrder.push(m.round);
      }
    });

    const matchCounterPerRound: Record<string, number> = {};

    const matchesToSave = generatedMatches.map((m) => {
    // Inicializar o incrementar el contador para esta ronda específica
    if (matchCounterPerRound[m.round] === undefined) {
      matchCounterPerRound[m.round] = 0;
    } else {
      matchCounterPerRound[m.round]++;
    }

    let matchDate: Date | null = null;

    if (shouldSchedule) {
      // 1. Calculamos la fecha base de la jornada (Jornada 1, Jornada 2, etc.)
      const baseDate = LeagueService.buildRoundDate(
        options!.scheduleStartDate!,
        options?.matchTime,
        uniqueRoundsInOrder.indexOf(m.round),
        daysBetweenRounds
      );

      // 2. Le sumamos los minutos correspondientes según el índice del partido
      matchDate = new Date(baseDate);
      const minutesToAdd = matchCounterPerRound[m.round] * matchDuration;
      matchDate.setMinutes(matchDate.getMinutes() + minutesToAdd);
    }

    return {
      date: matchDate,
      leagueId: league.id,
      seasonId: activeSeasonId,
      homeTeamId: m.home,
      awayTeamId: m.away,
      roundName: m.round,
      played: false,
    };
  });

    const createdMatches = await Match.bulkCreate(matchesToSave, { returning: true });

    if (shouldSchedule) {
      await Promise.all(
        createdMatches.map((m) => {
          if (!m.date) return Promise.resolve();
          return NotificationService.notifyMatchScheduled(m.id, new Date(m.date));
        })
      );
    }

    return {
      message: shouldSchedule
        ? "Pareos y calendario generados exitosamente"
        : "Pareos generado exitosamente",
      totalMatches: matchesToSave.length,
    };
  }

  static async getLeagueFixture(leagueId: string) {
    const matches = await Match.findAll({
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
      order: [["roundName", "ASC"]],
    });
    return matches.reduce((acc: Record<string, typeof matches>, match) => {
      const round = match.roundName;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    }, {});
  }

  /**
   * Devuelve los partidos de la liga con ubicación para el mapa.
   * Usa la ubicación del equipo local (homeTeam). Si no tiene lat/lng, location es null.
   * Si no hay partidos, devuelve [] para que el front muestre "sin ubicaciones registradas".
   */
  static async getFixtureWithLocations(leagueId: string) {
    const matches = await Match.findAll({
      where: { leagueId },
      include: [
        {
          model: Team,
          as: "homeTeam",
          attributes: ["id", "name", "lat", "lng", "fieldAddress"],
        },
        {
          model: Team,
          as: "awayTeam",
          attributes: ["id", "name"],
        },
      ],
      order: [["roundName", "ASC"], ["id", "ASC"]],
    });

    return matches.map((m) => {
      const home = m.homeTeam as Team & { lat?: number; lng?: number; fieldAddress?: string };
      const hasLocation =
          home &&
          home.lat != null &&
          home.lng != null &&
          !Number.isNaN(Number(home.lat)) &&
          !Number.isNaN(Number(home.lng));

      return {
        id: m.id,
        roundName: m.roundName,
        date: m.date,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeTeamName: home?.name ?? "Local",
        awayTeamName: (m as any).awayTeam?.name ?? "Visitante",
        location: hasLocation
            ? {
              lat: Number(home.lat),
              lng: Number(home.lng),
              fieldAddress: home.fieldAddress ?? null,
            }
            : null,
      };
    });
  }

  static async canUserAccessLeague(
    userId: number,
    role: string,
    leagueId: number
  ): Promise<boolean> {
    if (role === "admin") return true;

    if (role === "coach") {
      const team = await Team.findOne({
        where: { trainerId: userId, leagueId },
        attributes: ["id"],
      });
      return !!team;
    }

    if (role === "player") {
      const leagueTeams = await Team.findAll({
        where: { leagueId },
        attributes: ["id"],
      });

      const leagueTeamIds = leagueTeams.map((t) => t.id);
      if (!leagueTeamIds.length) return false;

      const member = await TeamMember.findOne({
        where: {
          userId,
          teamId: leagueTeamIds,
        },
        attributes: ["userId"],
      });

      return !!member;
    }

    return false;
  }

  static async addTeamToLeague(leagueId: string, teamId: number): Promise<string> {
    const sequelize = Match.sequelize;
    if (!sequelize) {
      throw new AppError(500, "No hay conexión de base de datos disponible");
    }

    const result = await sequelize.transaction(async (transaction) => {
      const league = await League.findByPk(leagueId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const team = await Team.findByPk(teamId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!team || !league) {
        throw new AppError(404, "Equipo o Liga no encontrados");
      }

      if (team.leagueId && team.leagueId !== league.id) {
        throw new AppError(409, "Este equipo ya pertenece a otra liga");
      }

      const coachTeamInLeague = await Team.findOne({
        where: {
          trainerId: team.trainerId,
          leagueId: league.id,
        },
        attributes: ["id", "name"],
        transaction,
      });

      if (coachTeamInLeague && coachTeamInLeague.id !== team.id) {
        throw new AppError(
          409,
          `El entrenador ya dirige otro equipo en esta liga (${coachTeamInLeague.name})`
        );
      }

      // Verificar que ningún jugador del equipo ya esté en otro equipo de esta liga
      const teamMembers = await TeamMember.findAll({
        where: { teamId: team.id },
        attributes: ["userId"],
        transaction,
      });

      if (teamMembers.length > 0) {
        const memberUserIds = teamMembers.map((m) => m.userId);

        // Obtener equipos que ya están en esta liga (excepto este equipo)
        const teamsInLeague = await Team.findAll({
          where: { leagueId: league.id, id: { [Op.ne]: team.id } },
          attributes: ["id", "name"],
          transaction,
        });

        if (teamsInLeague.length > 0) {
          const teamsInLeagueIds = teamsInLeague.map((t) => t.id);

          const conflictingMember = await TeamMember.findOne({
            where: {
              userId: { [Op.in]: memberUserIds },
              teamId: { [Op.in]: teamsInLeagueIds },
            },
            include: [{ model: User, attributes: ["name"] }],
            transaction,
          });

          if (conflictingMember) {
            const conflictTeam = teamsInLeague.find(
              (t) => t.id === conflictingMember.teamId
            );
            throw new AppError(
              409,
              `Un jugador del equipo ya pertenece a otro equipo de esta liga (${conflictTeam?.name ?? "equipo rival"})`
            );
          }
        }
      }

      team.leagueId = league.id;
      await team.save({ transaction });

      await TeamLeagueStat.findOrCreate({
        where: {
          teamId: team.id,
          leagueId: league.id,
        },
        defaults: {
          points: 0,
          gamesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
        },
        transaction,
      });

      const appendResult = await this.appendPendingMatchesForNewTeam(
        Number(league.id),
        team.id,
        transaction
      );

      return {
        teamName: team.name,
        appendedMatches: appendResult.createdCount,
        scheduledMatches: appendResult.scheduledMatches,
        appendReason: appendResult.reason,
      };
    });

    if (result.scheduledMatches.length) {
      await Promise.all(
        result.scheduledMatches.map((match) =>
          NotificationService.notifyMatchScheduled(match.id, match.date)
        )
      );
    }

    const appendedMatches = result.appendedMatches;

    if (appendedMatches > 0) {
      return `Equipo ${result.teamName} agregado a la liga. Se programaron ${appendedMatches} partidos nuevos sin alterar el fixture existente`;
    }

    if (result.appendReason === "no_fixture_in_league") {
      return `Equipo ${result.teamName} agregado a la liga. No se crearon partidos porque la liga aún no tiene fixture generado`;
    }

    if (result.appendReason === "already_fully_paired") {
      return `Equipo ${result.teamName} agregado a la liga. No se crearon partidos porque ya tenía cruces contra todos los rivales en el fixture actual`;
    }

    return `Equipo ${result.teamName} agregado a la liga`;
  }

  static async getStandings(
    leagueId: string,
    userId: number | undefined,
    role: string | undefined
  ): Promise<unknown> {
    if (userId == null || role == null) {
      throw new AppError(401, "No autorizado");
    }

    const leagueIdNum = Number(leagueId);
    const canAccess = await LeagueService.canUserAccessLeague(userId, role, leagueIdNum);
    if (!canAccess) {
      throw new AppError(403, "No tienes acceso a la tabla de esta liga");
    }

    return TeamLeagueStat.findAll({
      where: { leagueId },
      attributes: [
        "points",
        "gamesPlayed",
        "wins",
        "draws",
        "losses",
        "goalsFor",
        "goalsAgainst",
        "goalDifference",
        "penaltyWins",
      ],
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
      ],
    });
  }

  static async getLeagueMatchesGrouped(
    leagueId: string,
    userId: number | undefined,
    role: string | undefined
  ): Promise<Record<string, unknown[]>> {
    if (userId == null || role == null) {
      throw new AppError(401, "No autorizado");
    }

    const leagueIdNum = Number(leagueId);
    const canAccess = await LeagueService.canUserAccessLeague(userId, role, leagueIdNum);
    if (!canAccess) {
      throw new AppError(403, "No tienes acceso a los resultados de esta liga");
    }

    const matches = await Match.findAll({
      where: { leagueId },
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
      order: [["id", "ASC"]],
    });

    return matches.reduce<Record<string, unknown[]>>((acc, match) => {
      const round = match.roundName;
      if (!acc[round]) {
        acc[round] = [];
      }
      acc[round].push(match);
      return acc;
    }, {});
  }

  static async restructureFixture(
    leagueId: string,
    audit: {
      actorUserId: number | null;
      reason?: string;
      ip?: string | null;
      userAgent?: string | null;
    }
  ): Promise<{ message: string; newMatchesGenerated: number }> {
    const league = await League.findByPk(leagueId);
    if (!league) {
      throw new AppError(404, "Liga no encontrada");
    }

    const teams = await Team.findAll({ where: { leagueId } });
    const teamIds = teams.map((t) => t.id);
    const activeSeasonId = await this.resolveActiveSeasonIdForLeague(Number(leagueId));

    if (teamIds.length < 2) {
      throw new AppError(
        400,
        "Se necesitan al menos 2 equipos activos para generar partidos"
      );
    }

    const playedMatches = await Match.findAll({
      where: { leagueId, seasonId: activeSeasonId, played: true },
    });

    const unplayedMatches = await Match.findAll({
      where: { leagueId, seasonId: activeSeasonId, played: false },
      attributes: ["id"],
    });
    const unplayedMatchIds = unplayedMatches.map((m) => m.id);

    if (unplayedMatchIds.length > 0) {
      await MatchRefereeAssignment.destroy({
        where: { matchId: { [Op.in]: unplayedMatchIds } },
      });
    }

    await Match.destroy({
      where: { leagueId, seasonId: activeSeasonId, played: false },
    });

    const unplayedPairs: { home: number; away: number }[] = [];

    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        const teamA = teamIds[i];
        const teamB = teamIds[j];

        const alreadyPlayed = playedMatches.some(
          (m) =>
            (m.homeTeamId === teamA && m.awayTeamId === teamB) ||
            (m.homeTeamId === teamB && m.awayTeamId === teamA)
        );

        if (!alreadyPlayed) {
          unplayedPairs.push({ home: teamA, away: teamB });
        }
      }
    }

    let maxRoundNumber = 0;
    playedMatches.forEach((m) => {
      const matchNumber = m.roundName.match(/\d+/);
      const num = matchNumber ? parseInt(matchNumber[0], 10) : 0;
      if (num > maxRoundNumber) {
        maxRoundNumber = num;
      }
    });

    let currentRoundNum = maxRoundNumber + 1;
    const newMatchesToSave: Array<{
      leagueId: string;
      seasonId: number | null;
      homeTeamId: number;
      awayTeamId: number;
      roundName: string;
      played: boolean;
    }> = [];

    while (unplayedPairs.length > 0) {
      const teamsPlayingThisRound = new Set<number>();
      let i = 0;

      while (i < unplayedPairs.length) {
        const pair = unplayedPairs[i];

        if (!teamsPlayingThisRound.has(pair.home) && !teamsPlayingThisRound.has(pair.away)) {
          newMatchesToSave.push({
            leagueId,
            seasonId: activeSeasonId,
            homeTeamId: pair.home,
            awayTeamId: pair.away,
            roundName: `Jornada ${currentRoundNum}`,
            played: false,
          });

          teamsPlayingThisRound.add(pair.home);
          teamsPlayingThisRound.add(pair.away);

          unplayedPairs.splice(i, 1);
        } else {
          i++;
        }
      }

      currentRoundNum++;
    }

    if (newMatchesToSave.length > 0) {
      await Match.bulkCreate(newMatchesToSave);
    }

    await AuditService.log({
      actorUserId: audit.actorUserId,
      leagueId: Number(leagueId),
      seasonId: activeSeasonId,
      entityType: "fixture",
      entityId: String(leagueId),
      action: "manual_fix",
      beforeData: {
        previouslyPlayedMatches: playedMatches.length,
      },
      afterData: {
        newMatchesGenerated: newMatchesToSave.length,
      },
      reason: audit.reason ?? "Reestructuración de fixture",
      ip: audit.ip ?? null,
      userAgent: audit.userAgent ?? null,
    });

    return {
      message: "Calendario reestructurado exitosamente",
      newMatchesGenerated: newMatchesToSave.length,
    };
  }

  static async updateLeagueLogo(
    leagueId: string,
    logoFile: UploadedImageFile
  ): Promise<{ logoUrl: string }> {
    const league = await League.findByPk(leagueId);
    if (!league) {
      throw new AppError(404, "Liga no encontrada");
    }
    const uploadedLogo = await uploadImageToSupabase(logoFile, "leagues", league.logoUrl);
    league.logoUrl = uploadedLogo.url;
    await league.save();
    return { logoUrl: uploadedLogo.url };
  }
}
