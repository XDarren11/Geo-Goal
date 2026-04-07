import { League } from "../models/League";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { Match } from "../models/Match";
import { MatchGenerator } from "../utils/MatchGenerator";
import { AppError } from "../types/errors";
import { NotificationService } from "./NotificationService";

export class LeagueService {
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
    data: { name: string; description: string }
  ): Promise<string> {
    const league = new League({ ...data, managerId });
    await league.save();
    return "Liga Creada Correctamente";
  }

  static async getAllLeagues(managerId: number) {
    return League.findAll({
      where: { managerId },
    });
  }

  static async getLeagueById(leagueId: string, managerId: number) {
    const league = await League.findOne({
      where: { id: leagueId, managerId },
      include: [Team],
    });
    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes acceso");
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

    const uniqueRoundsInOrder: string[] = [];
    generatedMatches.forEach((m) => {
      if (!uniqueRoundsInOrder.includes(m.round)) {
        uniqueRoundsInOrder.push(m.round);
      }
    });

    const matchesToSave = generatedMatches.map((m) => ({
      ...(shouldSchedule
        ? {
            date: LeagueService.buildRoundDate(
              options!.scheduleStartDate!,
              options?.matchTime,
              uniqueRoundsInOrder.indexOf(m.round),
              daysBetweenRounds
            ),
          }
        : {}),
      leagueId: league.id,
      homeTeamId: m.home,
      awayTeamId: m.away,
      roundName: m.round,
      played: false,
    }));

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
    const groupedMatches = matches.reduce((acc: Record<string, typeof matches>, match) => {
      const round = match.roundName;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    }, {});
    return groupedMatches;
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

    const list = matches.map((m) => {
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

    return list;
  }
}
