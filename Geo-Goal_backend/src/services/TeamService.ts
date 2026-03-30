import fs from "fs";
import path from "path";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { TeamMember } from "../models/TeamMember";
import { AppError } from "../types/errors";

const UPLOADS_DIR = "public/uploads";

export class TeamService {
  static async getMyTeams(trainerId: number) {
    return Team.findAll({
      where: { trainerId },
    });
  }

  static async getTeamById(teamId: string, trainerId: number) {
    const team = await Team.findOne({
      where: { id: teamId, trainerId },
    });
    if (!team) {
      throw new AppError(404, "Equipo no encontrado");
    }
    return team;
  }

  static async createTeam(
    trainerId: number,
    data: {
      name: string;
      lat: number;
      lng: number;
      fieldAddress: string;
      logoUrl?: string | null;
    }
  ): Promise<string> {
    const team = new Team({
      ...data,
      trainerId,
      leagueId: null,
      logoUrl: data.logoUrl ?? null,
    });
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
      logoUrl?: string | null;
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
    if (data.logoUrl !== undefined) {
      if (team.logoUrl) {
        const oldPath = path.resolve(UPLOADS_DIR, team.logoUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      team.logoUrl = data.logoUrl ?? null;
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
    if (team.logoUrl) {
      const oldPath = path.resolve(UPLOADS_DIR, team.logoUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await team.destroy();
    return `El equipo ${name} ha sido eliminado correctamente`;
  }

  static async findPlayer(
    teamId: string,
    trainerId: number,
    email: string
  ) {
    const team = await Team.findOne({
      where: { id: teamId, trainerId },
    });
    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no eres el DT");
    }
    const player = await User.findOne({
      where: { email },
      attributes: ["id", "name", "email"],
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
    await team.$add("player", player);
    return "Jugador agregado al equipo correctamente";
  }

  static async getPlayersTeam(teamId: string, trainerId: number) {
    const team = await Team.findOne({
      where: { id: teamId, trainerId },
      include: [
        {
          model: User,
          as: "players",
          attributes: ["id", "name", "email"],
          through: { attributes: [] },
        },
      ],
    });
    if (!team) {
      throw new AppError(404, "Equipo no encontrado o no eres el DT");
    }
    return team.players;
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
}
