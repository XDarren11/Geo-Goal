import { League } from "../models/League";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { Match } from "../models/Match";
import { MatchGenerator } from "../utils/MatchGenerator";
import { AppError } from "../types/errors";

export class LeagueService {
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
    await league.destroy();
    return `Liga: ${name} eliminada correctamente`;
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

  static async addTeamToLeague(
    leagueId: string,
    managerId: number,
    teamId: number
  ): Promise<string> {
    const league = await League.findOne({
      where: { id: leagueId, managerId },
    });
    if (!league) {
      throw new AppError(404, "Liga no encontrada o no tienes permisos");
    }
    const team = await Team.findByPk(teamId);
    if (!team) {
      throw new AppError(404, "Equipo no encontrado");
    }
    if (team.leagueId) {
      throw new AppError(409, "Este equipo ya está registrado en una liga");
    }
    team.leagueId = league.id;
    await team.save();
    return `El equipo "${team.name}" se agregó correctamente`;
  }

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
    type: "round-robin" | "knockout"
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
    const matchesToSave = generatedMatches.map((m) => ({
      leagueId: league.id,
      homeTeamId: m.home,
      awayTeamId: m.away,
      roundName: m.round,
      played: false,
    }));
    await Match.bulkCreate(matchesToSave);
    return {
      message: "Pareos generado exitosamente",
      totalMatches: matchesToSave.length,
    };
  }

  static async getLeagueFixture(leagueId: string) {
    const matches = await Match.findAll({
      where: { leagueId },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
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
}
