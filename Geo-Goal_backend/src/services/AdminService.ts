import { Op, col, fn } from "sequelize";
import { AppError } from "../types/errors";
import { User } from "../models/User";
import { League } from "../models/League";
import { Team } from "../models/Team";
import { LeagueAdmin } from "../models/LeagueAdmin";
import { Field } from "../models/Field";
import { TeamMember } from "../models/TeamMember";
import { TeamLeagueStat } from "../models/TeamLeagueStat";
import { Season } from "../models/Season";
import { Match } from "../models/Match";
import { MatchEvent } from "../models/MatchEvent";
import { AuditLog } from "../models/AuditLog";
import { NewsService } from "./NewsService";
import { hashPassword } from "../utils/auth";

const VALID_ROLES = ["coach", "player", "admin", "referee"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: ValidRole;
  confirmed?: boolean;
};

type UpdateUserInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: ValidRole;
  confirmed?: boolean;
};

type LeagueAdminRole = "principal" | "assistant";

type CreateFieldInput = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  capacity?: number;
  isActive?: boolean;
  notes?: string;
  leagueId?: number | null;
  teamId?: number | null;
};

type UpdateFieldInput = Partial<CreateFieldInput>;

type SeasonStatus = "draft" | "active" | "finished" | "archived";

type CreateSeasonInput = {
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  status?: SeasonStatus;
  isCurrent?: boolean;
};

type UpdateSeasonInput = Partial<CreateSeasonInput>;

type AuditLogFilters = {
  leagueId?: number;
  seasonId?: number;
  actorUserId?: number;
  entityType?: string;
  action?: "create" | "update" | "delete" | "status_change" | "manual_fix";
  from?: string;
  to?: string;
};

export class AdminService {
  static async getDashboardSummary(currentAdminId: number) {
    const managedLeagues = await League.findAll({
      where: { managerId: currentAdminId },
      attributes: ["id"],
    });

    const assignedLeagues = await LeagueAdmin.findAll({
      where: { userId: currentAdminId },
      attributes: ["leagueId"],
    });

    const leagueIds = Array.from(
      new Set<number>([
        ...managedLeagues.map((l) => l.id),
        ...assignedLeagues.map((a) => a.leagueId),
      ])
    );

    if (leagueIds.length === 0) {
      return {
        stats: {
          leagues: 0,
          nextMatches: 0,
          assignedAdmins: 0,
          recentResults: 0,
        },
        leagues: [],
        nextMatches: [],
        adminsByLeague: [],
        recentResults: [],
        goalStatsByTeam: [],
        disciplineByTeam: [],
        news: [],
      };
    }

    const now = new Date();

    const leagues = await League.findAll({
      where: { id: { [Op.in]: leagueIds } },
      attributes: ["id", "name", "description", "managerId"],
      include: [
        {
          model: Team,
          attributes: ["id"],
          required: false,
        },
      ],
      order: [["name", "ASC"]],
    });

    const nextMatches = await Match.findAll({
      where: {
        leagueId: { [Op.in]: leagueIds },
        played: false,
        date: { [Op.gte]: now },
      },
      attributes: ["id", "leagueId", "roundName", "date", "homeScore", "awayScore", "played"],
      include: [
        { model: League, attributes: ["id", "name"] },
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
      ],
      order: [["date", "ASC"]],
      limit: 10,
    });

    const recentResults = await Match.findAll({
      where: {
        leagueId: { [Op.in]: leagueIds },
        played: true,
      },
      attributes: ["id", "leagueId", "roundName", "date", "homeScore", "awayScore", "played"],
      include: [
        { model: League, attributes: ["id", "name"] },
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
      ],
      order: [["date", "DESC"], ["updatedAt", "DESC"]],
      limit: 10,
    });

    const leagueAdminRows = await LeagueAdmin.findAll({
      where: { leagueId: { [Op.in]: leagueIds } },
      attributes: ["id", "leagueId", "userId", "leagueRole", "assignedBy"],
      include: [
        { model: League, attributes: ["id", "name"] },
        { model: User, as: "adminUser", attributes: ["id", "name", "email", "role"] },
      ],
      order: [["leagueId", "ASC"], ["id", "ASC"]],
    });

    const statRows = await TeamLeagueStat.findAll({
      where: { leagueId: { [Op.in]: leagueIds } },
      attributes: ["teamId", "leagueId", "goalsFor", "goalsAgainst"],
      include: [
        { model: Team, attributes: ["id", "name"], required: true },
        { model: League, attributes: ["id", "name"], required: true },
      ],
      order: [["leagueId", "ASC"], ["teamId", "ASC"]],
    });

    const goalStatsByTeamMap = new Map<
      string,
      {
        teamId: number;
        teamName: string;
        leagueId: number;
        leagueName: string;
        goalsFor: number;
        goalsAgainst: number;
      }
    >();

    statRows.forEach((row) => {
      const key = `${row.leagueId}:${row.teamId}`;
      const prev = goalStatsByTeamMap.get(key);

      if (prev) {
        prev.goalsFor += Number(row.goalsFor ?? 0);
        prev.goalsAgainst += Number(row.goalsAgainst ?? 0);
        return;
      }

      goalStatsByTeamMap.set(key, {
        teamId: row.teamId,
        teamName: row.team?.name ?? `Equipo ${row.teamId}`,
        leagueId: row.leagueId,
        leagueName: row.league?.name ?? `Liga ${row.leagueId}`,
        goalsFor: Number(row.goalsFor ?? 0),
        goalsAgainst: Number(row.goalsAgainst ?? 0),
      });
    });

    const goalStatsByTeam = Array.from(goalStatsByTeamMap.values())
      .sort((a, b) => b.goalsFor - a.goalsFor)
      .slice(0, 10);

    const disciplineRows = (await MatchEvent.findAll({
      where: {
        leagueId: { [Op.in]: leagueIds },
        teamId: { [Op.ne]: null },
        eventType: { [Op.in]: ["yellow_card", "red_card"] },
      },
      attributes: [
        "leagueId",
        "teamId",
        "eventType",
        [fn("COUNT", col("MatchEvent.id")), "total"],
      ],
      group: ["leagueId", "teamId", "eventType"],
      raw: true,
    })) as unknown as Array<{
      leagueId: number;
      teamId: number;
      eventType: "yellow_card" | "red_card";
      total: string;
    }>;

    const disciplineTeamIds = Array.from(
      new Set<number>(disciplineRows.map((row) => Number(row.teamId)).filter((id) => Number.isInteger(id)))
    );

    const disciplineTeams = disciplineTeamIds.length
      ? await Team.findAll({
          where: { id: { [Op.in]: disciplineTeamIds } },
          attributes: ["id", "name", "leagueId"],
        })
      : [];

    const disciplineTeamMap = new Map(
      disciplineTeams.map((team) => [team.id, { name: team.name, leagueId: team.leagueId }])
    );

    const leagueMap = new Map(leagues.map((league) => [league.id, league.name]));

    const disciplineByTeamMap = new Map<
      string,
      {
        teamId: number;
        teamName: string;
        leagueId: number;
        leagueName: string;
        yellowCards: number;
        redCards: number;
      }
    >();

    disciplineRows.forEach((row) => {
      const teamId = Number(row.teamId);
      const leagueId = Number(row.leagueId);
      const key = `${leagueId}:${teamId}`;
      const prev = disciplineByTeamMap.get(key);
      const total = Number(row.total ?? 0);

      if (prev) {
        if (row.eventType === "yellow_card") prev.yellowCards += total;
        if (row.eventType === "red_card") prev.redCards += total;
        return;
      }

      disciplineByTeamMap.set(key, {
        teamId,
        teamName: disciplineTeamMap.get(teamId)?.name ?? `Equipo ${teamId}`,
        leagueId,
        leagueName: leagueMap.get(leagueId) ?? `Liga ${leagueId}`,
        yellowCards: row.eventType === "yellow_card" ? total : 0,
        redCards: row.eventType === "red_card" ? total : 0,
      });
    });

    const disciplineByTeam = Array.from(disciplineByTeamMap.values())
      .sort((a, b) => b.yellowCards + b.redCards - (a.yellowCards + a.redCards))
      .slice(0, 10);

    const adminsByLeague = leagues.map((league) => {
      const rows = leagueAdminRows.filter((row) => row.leagueId === league.id);

      return {
        leagueId: league.id,
        leagueName: league.name,
        managerId: league.managerId,
        principal: rows.find((r) => r.leagueRole === "principal")?.adminUser ?? null,
        assistants: rows
          .filter((r) => r.leagueRole === "assistant" && r.adminUser?.role === "admin")
          .map((r) => r.adminUser),
        referees: rows
          .filter((r) => r.adminUser?.role === "referee")
          .map((r) => r.adminUser),
      };
    });

    const news = await NewsService.getNewsForLeagues(leagueIds, 8);

    return {
      stats: {
        leagues: leagues.length,
        nextMatches: nextMatches.length,
        assignedAdmins: leagueAdminRows.filter((r) => r.adminUser?.role === "admin").length,
        recentResults: recentResults.length,
      },
      leagues: leagues.map((league) => ({
        id: league.id,
        name: league.name,
        description: league.description,
        managerId: league.managerId,
        teamsCount: league.teams?.length ?? 0,
      })),
      nextMatches,
      adminsByLeague,
      recentResults,
      goalStatsByTeam,
      disciplineByTeam,
      news,
    };
  }

  private static async ensureLeagueAccess(leagueId: string, currentAdminId: number): Promise<League> {
    const league = await League.findByPk(leagueId);
    if (!league) {
      throw new AppError(404, "Liga no encontrada");
    }

    if (league.managerId === currentAdminId) {
      return league;
    }

    const assignment = await LeagueAdmin.findOne({
      where: { leagueId, userId: currentAdminId },
    });

    if (!assignment) {
      throw new AppError(403, "No tienes acceso a esta liga");
    }

    return league;
  }

  static async listUsersByLeague(leagueId: string, currentAdminId: number) {
    const league = await this.ensureLeagueAccess(leagueId, currentAdminId);

    const teams = await Team.findAll({
      where: { leagueId },
      attributes: ["id", "trainerId"],
    });

    const teamIds = teams.map((team) => team.id);
    const coachIds = teams.map((team) => team.trainerId);

    const leagueAdmins = await LeagueAdmin.findAll({
      where: { leagueId },
      attributes: ["userId"],
    });
    const leagueAdminIds = leagueAdmins.map((row) => row.userId);

    let playerIds: number[] = [];
    if (teamIds.length > 0) {
      const teamMembers = await TeamMember.findAll({
        where: { teamId: teamIds },
        attributes: ["userId"],
      });
      playerIds = teamMembers.map((tm) => tm.userId);
    }

    const userIds = Array.from(
      new Set<number>([
        league.managerId,
        ...leagueAdminIds,
        ...coachIds,
        ...playerIds,
      ])
    );

    return User.findAll({
      where: { id: userIds },
      attributes: ["id", "name", "email", "role", "confirmed", "createdAt", "updatedAt"],
      order: [["id", "ASC"]],
    });
  }

  static async listUsers(page = 1, pageSize = 50) {
    const limit = Math.min(Math.max(1, pageSize), 200);
    const offset = Math.max(0, page - 1) * limit;

    const { rows, count } = await User.findAndCountAll({
      attributes: ["id", "name", "email", "role", "confirmed", "createdAt", "updatedAt"],
      order: [["id", "ASC"]],
      limit,
      offset,
    });

    return { data: rows, total: count, page, pageSize: limit };
  }

  static async createUser(input: CreateUserInput): Promise<string> {
    const { name, email, password, role, confirmed } = input;

    if (!VALID_ROLES.includes(role)) {
      throw new AppError(400, "Rol no válido");
    }

    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      throw new AppError(409, "El usuario ya está registrado");
    }

    const hashedPassword = await hashPassword(password);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      confirmed: confirmed ?? true,
    });

    return "Usuario creado correctamente";
  }

  static async updateUser(userId: string, input: UpdateUserInput): Promise<string> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    if (input.email && input.email !== user.email) {
      const emailTaken = await User.findOne({
        where: {
          email: input.email,
          id: { [Op.ne]: user.id },
        },
      });

      if (emailTaken) {
        throw new AppError(409, "El email ya está en uso");
      }

      user.email = input.email;
    }

    if (input.name != null) user.name = input.name;

    if (input.role != null) {
      if (!VALID_ROLES.includes(input.role)) {
        throw new AppError(400, "Rol no válido");
      }
      user.role = input.role;
    }

    if (typeof input.confirmed === "boolean") {
      user.confirmed = input.confirmed;
    }

    if (input.password) {
      user.password = await hashPassword(input.password);
    }

    await user.save();
    return "Usuario actualizado correctamente";
  }

  static async deleteUser(userId: string, currentAdminId: number): Promise<string> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    if (Number(userId) === currentAdminId) {
      throw new AppError(400, "No puedes eliminar tu propia cuenta");
    }

    await user.destroy();
    return "Usuario eliminado correctamente";
  }

  static async listLeagueAdmins(leagueId: string, currentAdminId: number) {
    await this.ensureLeagueAccess(leagueId, currentAdminId);

    return LeagueAdmin.findAll({
      where: { leagueId },
      include: [
        {
          model: User,
          as: "adminUser",
          attributes: ["id", "name", "email", "role"],
        },
      ],
      order: [["id", "ASC"]],
    });
  }

  static async assignLeagueAdmin(
    leagueId: string,
    userId: number,
    leagueRole: LeagueAdminRole,
    assignedBy: number,
    currentAdminId: number
  ): Promise<string> {
    await this.ensureLeagueAccess(leagueId, currentAdminId);

    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError(404, "Usuario no encontrado");
    }

    if (!["admin", "referee"].includes(user.role)) {
      throw new AppError(400, "Solo usuarios con rol admin o referee pueden ser asignados a la liga");
    }

    if (leagueRole === "principal" && user.role !== "admin") {
      throw new AppError(400, "Solo usuarios admin pueden ser principal en la liga");
    }

    if (leagueRole === "principal") {
      const currentPrincipal = await LeagueAdmin.findOne({
        where: {
          leagueId,
          leagueRole: "principal",
          userId: { [Op.ne]: userId },
        },
      });

      if (currentPrincipal) {
        throw new AppError(409, "La liga ya tiene un admin principal");
      }
    }

    const [assignment, created] = await LeagueAdmin.findOrCreate({
      where: { leagueId, userId },
      defaults: {
        leagueId: Number(leagueId),
        userId,
        leagueRole,
        assignedBy,
      },
    });

    if (!created) {
      assignment.leagueRole = leagueRole;
      assignment.assignedBy = assignedBy;
      await assignment.save();
      return "Asignación actualizada correctamente";
    }

    return "Admin asignado correctamente a la liga";
  }

  static async updateLeagueAdminRole(
    leagueId: string,
    userId: string,
    leagueRole: LeagueAdminRole,
    assignedBy: number,
    currentAdminId: number
  ): Promise<string> {
    await this.ensureLeagueAccess(leagueId, currentAdminId);

    const assignment = await LeagueAdmin.findOne({ where: { leagueId, userId } });

    if (!assignment) {
      throw new AppError(404, "Asignación no encontrada");
    }

    const assignedUser = await User.findByPk(userId, { attributes: ["id", "role"] });
    if (!assignedUser) {
      throw new AppError(404, "Usuario no encontrado");
    }

    if (leagueRole === "principal") {
      if (assignedUser.role !== "admin") {
        throw new AppError(400, "Solo usuarios admin pueden ser principal en la liga");
      }

      const currentPrincipal = await LeagueAdmin.findOne({
        where: {
          leagueId,
          leagueRole: "principal",
          userId: { [Op.ne]: Number(userId) },
        },
      });

      if (currentPrincipal) {
        throw new AppError(409, "La liga ya tiene un admin principal");
      }
    }

    assignment.leagueRole = leagueRole;
    assignment.assignedBy = assignedBy;
    await assignment.save();

    return "Rol de admin de liga actualizado correctamente";
  }

  static async removeLeagueAdmin(
    leagueId: string,
    userId: string,
    currentAdminId: number
  ): Promise<string> {
    await this.ensureLeagueAccess(leagueId, currentAdminId);

    const assignment = await LeagueAdmin.findOne({ where: { leagueId, userId } });

    if (!assignment) {
      throw new AppError(404, "Asignación no encontrada");
    }

    await assignment.destroy();
    return "Admin removido de la liga correctamente";
  }

  static async listFields(page = 1, pageSize = 50) {
    const limit = Math.min(Math.max(1, pageSize), 200);
    const offset = Math.max(0, page - 1) * limit;

    const { rows, count } = await Field.findAndCountAll({
      include: [
        { model: League, attributes: ["id", "name"] },
        { model: Team, attributes: ["id", "name"] },
      ],
      order: [["id", "ASC"]],
      limit,
      offset,
    });

    return { data: rows, total: count, page, pageSize: limit };
  }

  static async getFieldById(fieldId: string) {
    const field = await Field.findByPk(fieldId, {
      include: [
        { model: League, attributes: ["id", "name"] },
        { model: Team, attributes: ["id", "name"] },
      ],
    });

    if (!field) {
      throw new AppError(404, "Campo no encontrado");
    }

    return field;
  }

  static async createField(input: CreateFieldInput): Promise<string> {
    if (input.leagueId) {
      const league = await League.findByPk(input.leagueId);
      if (!league) throw new AppError(404, "Liga no encontrada");
    }

    if (input.teamId) {
      const team = await Team.findByPk(input.teamId);
      if (!team) throw new AppError(404, "Equipo no encontrado");
    }

    await Field.create({
      ...input,
      isActive: input.isActive ?? true,
      leagueId: input.leagueId ?? null,
      teamId: input.teamId ?? null,
    });

    return "Campo creado correctamente";
  }

  static async updateField(fieldId: string, input: UpdateFieldInput): Promise<string> {
    const field = await Field.findByPk(fieldId);

    if (!field) {
      throw new AppError(404, "Campo no encontrado");
    }

    if (input.leagueId !== undefined) {
      if (input.leagueId === null) {
        field.leagueId = null;
      } else {
        const league = await League.findByPk(input.leagueId);
        if (!league) throw new AppError(404, "Liga no encontrada");
        field.leagueId = input.leagueId;
      }
    }

    if (input.teamId !== undefined) {
      if (input.teamId === null) {
        field.teamId = null;
      } else {
        const team = await Team.findByPk(input.teamId);
        if (!team) throw new AppError(404, "Equipo no encontrado");
        field.teamId = input.teamId;
      }
    }

    if (input.name != null) field.name = input.name;
    if (input.address != null) field.address = input.address;
    if (input.lat != null) field.lat = Number(input.lat);
    if (input.lng != null) field.lng = Number(input.lng);
    if (input.city !== undefined) field.city = input.city ?? null;
    if (input.state !== undefined) field.state = input.state ?? null;
    if (input.country !== undefined) field.country = input.country ?? null;
    if (input.capacity !== undefined) field.capacity = input.capacity ?? null;
    if (typeof input.isActive === "boolean") field.isActive = input.isActive;
    if (input.notes !== undefined) field.notes = input.notes ?? null;

    await field.save();
    return "Campo actualizado correctamente";
  }

  static async deleteField(fieldId: string): Promise<string> {
    const field = await Field.findByPk(fieldId);

    if (!field) {
      throw new AppError(404, "Campo no encontrado");
    }

    await field.destroy();
    return "Campo eliminado correctamente";
  }

  static async createSeason(
    leagueId: string,
    currentAdminId: number,
    input: CreateSeasonInput
  ): Promise<Season> {
    await this.ensureLeagueAccess(leagueId, currentAdminId);

    if (new Date(input.startDate) > new Date(input.endDate)) {
      throw new AppError(400, "La fecha de inicio debe ser menor o igual a la fecha de fin");
    }

    const status = input.status ?? "draft";
    const shouldBeCurrent = input.isCurrent ?? status === "active";

    if (status === "active") {
      const activeSeason = await Season.findOne({
        where: { leagueId, status: "active" },
      });
      if (activeSeason) {
        throw new AppError(409, "La liga ya tiene una temporada activa");
      }
    }

    if (shouldBeCurrent) {
      await Season.update(
        { isCurrent: false },
        { where: { leagueId } }
      );
    }

    const season = await Season.create({
      leagueId: Number(leagueId),
      name: input.name,
      year: input.year,
      startDate: input.startDate,
      endDate: input.endDate,
      status,
      isCurrent: shouldBeCurrent,
      createdBy: currentAdminId,
      updatedBy: currentAdminId,
    });

    return season;
  }

  static async listSeasonsByLeague(leagueId: string, currentAdminId: number) {
    await this.ensureLeagueAccess(leagueId, currentAdminId);

    return Season.findAll({
      where: { leagueId },
      order: [["startDate", "DESC"], ["id", "DESC"]],
    });
  }

  static async getSeasonById(seasonId: string, currentAdminId: number) {
    const season = await Season.findByPk(seasonId, {
      include: [{ model: League, attributes: ["id", "name", "managerId"] }],
    });

    if (!season) {
      throw new AppError(404, "Temporada no encontrada");
    }

    await this.ensureLeagueAccess(String(season.leagueId), currentAdminId);
    return season;
  }

  static async updateSeason(
    seasonId: string,
    currentAdminId: number,
    input: UpdateSeasonInput
  ) {
    const season = await Season.findByPk(seasonId);
    if (!season) {
      throw new AppError(404, "Temporada no encontrada");
    }

    await this.ensureLeagueAccess(String(season.leagueId), currentAdminId);

    const nextStart = input.startDate ?? season.startDate;
    const nextEnd = input.endDate ?? season.endDate;
    if (new Date(nextStart) > new Date(nextEnd)) {
      throw new AppError(400, "La fecha de inicio debe ser menor o igual a la fecha de fin");
    }

    if (input.status === "active" && season.status !== "active") {
      const activeSeason = await Season.findOne({
        where: {
          leagueId: season.leagueId,
          status: "active",
          id: { [Op.ne]: season.id },
        },
      });

      if (activeSeason) {
        throw new AppError(409, "La liga ya tiene una temporada activa");
      }
    }

    if (input.isCurrent === true || input.status === "active") {
      await Season.update(
        { isCurrent: false },
        { where: { leagueId: season.leagueId, id: { [Op.ne]: season.id } } }
      );
    }

    if (input.name != null) season.name = input.name;
    if (input.year != null) season.year = input.year;
    if (input.startDate != null) season.startDate = input.startDate;
    if (input.endDate != null) season.endDate = input.endDate;
    if (input.status != null) season.status = input.status;
    if (typeof input.isCurrent === "boolean") season.isCurrent = input.isCurrent;
    season.updatedBy = currentAdminId;

    if (season.status === "active") {
      season.isCurrent = true;
    }

    await season.save();
    return season;
  }

  static async changeSeasonStatus(
    seasonId: string,
    status: SeasonStatus,
    currentAdminId: number
  ) {
    const season = await Season.findByPk(seasonId);
    if (!season) {
      throw new AppError(404, "Temporada no encontrada");
    }

    await this.ensureLeagueAccess(String(season.leagueId), currentAdminId);

    if (status === "active") {
      const activeSeason = await Season.findOne({
        where: {
          leagueId: season.leagueId,
          status: "active",
          id: { [Op.ne]: season.id },
        },
      });
      if (activeSeason) {
        throw new AppError(409, "La liga ya tiene una temporada activa");
      }

      await Season.update(
        { isCurrent: false },
        { where: { leagueId: season.leagueId, id: { [Op.ne]: season.id } } }
      );
      season.isCurrent = true;
    }

    season.status = status;
    season.updatedBy = currentAdminId;
    await season.save();

    return season;
  }

  static async deleteSeason(seasonId: string, currentAdminId: number): Promise<string> {
    const season = await Season.findByPk(seasonId);
    if (!season) {
      throw new AppError(404, "Temporada no encontrada");
    }

    await this.ensureLeagueAccess(String(season.leagueId), currentAdminId);

    const matchesCount = await Match.count({
      where: { seasonId: season.id },
    });

    if (matchesCount > 0) {
      throw new AppError(409, "No puedes eliminar una temporada con partidos asociados");
    }

    await season.destroy();
    return "Temporada eliminada correctamente";
  }

  static async listAuditLogs(filters: AuditLogFilters) {
    const where: any = {};

    if (filters.leagueId) where.leagueId = filters.leagueId;
    if (filters.seasonId) where.seasonId = filters.seasonId;
    if (filters.actorUserId) where.actorUserId = filters.actorUserId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.action) where.action = filters.action;

    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt[Op.gte] = new Date(filters.from);
      if (filters.to) where.createdAt[Op.lte] = new Date(filters.to);
    }

    return AuditLog.findAll({
      where,
      include: [
        { model: User, as: "actor", attributes: ["id", "name", "email", "role"] },
        { model: League, attributes: ["id", "name"] },
        { model: Season, attributes: ["id", "name", "year"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: 300,
    });
  }

  static async getAuditLogById(logId: string) {
    const log = await AuditLog.findByPk(logId, {
      include: [
        { model: User, as: "actor", attributes: ["id", "name", "email", "role"] },
        { model: League, attributes: ["id", "name"] },
        { model: Season, attributes: ["id", "name", "year"] },
      ],
    });

    if (!log) {
      throw new AppError(404, "Registro de auditoría no encontrado");
    }

    return log;
  }

  // --- Friendly Matches ---

  static async createFriendlyMatch(
    adminId: number,
    input: {
      homeTeamId: number;
      awayTeamId: number;
      roundName?: string;
      date?: string;
    }
  ): Promise<Match> {
    if (input.homeTeamId === input.awayTeamId) {
      throw new AppError(400, "Un equipo no puede jugar contra sí mismo");
    }

    const [homeTeam, awayTeam] = await Promise.all([
      Team.findByPk(input.homeTeamId),
      Team.findByPk(input.awayTeamId),
    ]);

    if (!homeTeam) throw new AppError(404, `Equipo local (id=${input.homeTeamId}) no encontrado`);
    if (!awayTeam) throw new AppError(404, `Equipo visitante (id=${input.awayTeamId}) no encontrado`);

    if (homeTeam.leagueId == null || awayTeam.leagueId == null) {
      throw new AppError(400, "Ambos equipos deben pertenecer a una liga que administres");
    }

    const [managedLeagues, assignedLeagues] = await Promise.all([
      League.findAll({ where: { managerId: adminId }, attributes: ["id"] }),
      LeagueAdmin.findAll({ where: { userId: adminId }, attributes: ["leagueId"] }),
    ]);

    const accessibleIds = new Set<number>([
      ...managedLeagues.map((l) => l.id),
      ...assignedLeagues.map((a) => a.leagueId),
    ]);

    if (!accessibleIds.has(homeTeam.leagueId)) {
      throw new AppError(403, `No tienes acceso a la liga del equipo ${homeTeam.name}`);
    }
    if (!accessibleIds.has(awayTeam.leagueId)) {
      throw new AppError(403, `No tienes acceso a la liga del equipo ${awayTeam.name}`);
    }

    let parsedDate: Date | null = null;
    if (input.date) {
      parsedDate = new Date(input.date);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError(400, "Fecha inválida");
      }
    }

    return Match.create({
      type: "friendly",
      leagueId: null,
      seasonId: null,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      roundName: input.roundName || "Amistoso",
      date: parsedDate,
      homeScore: 0,
      awayScore: 0,
      played: false,
    });
  }

  static async listFriendlyMatches(adminId: number, page = 1, pageSize = 50) {
    const [managedLeagues, assignedLeagues] = await Promise.all([
      League.findAll({ where: { managerId: adminId }, attributes: ["id"] }),
      LeagueAdmin.findAll({ where: { userId: adminId }, attributes: ["leagueId"] }),
    ]);

    const accessibleIds = [
      ...managedLeagues.map((l) => l.id),
      ...assignedLeagues.map((a) => a.leagueId),
    ];

    if (accessibleIds.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }

    const teams = await Team.findAll({
      where: { leagueId: { [Op.in]: accessibleIds } },
      attributes: ["id"],
    });
    const teamIds = teams.map((t) => t.id);

    if (teamIds.length === 0) {
      return { data: [], total: 0, page, pageSize };
    }

    const limit = Math.min(Math.max(1, pageSize), 200);
    const offset = Math.max(0, page - 1) * limit;

    const { rows, count } = await Match.findAndCountAll({
      where: {
        type: "friendly",
        [Op.or]: [
          { homeTeamId: { [Op.in]: teamIds } },
          { awayTeamId: { [Op.in]: teamIds } },
        ],
      },
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl", "leagueId"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl", "leagueId"] },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return { data: rows, total: count, page, pageSize: limit };
  }

  static async deleteFriendlyMatch(matchId: string, adminId: number): Promise<string> {
    const match = await Match.findByPk(matchId, {
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "leagueId"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "leagueId"] },
      ],
    });

    if (!match) {
      throw new AppError(404, "Partido no encontrado");
    }

    if (match.type !== "friendly") {
      throw new AppError(400, "Solo se pueden eliminar partidos amistosos desde esta ruta");
    }

    const teamLeagueIds = [
      match.homeTeam?.leagueId,
      match.awayTeam?.leagueId,
    ].filter((id): id is number => id != null);

    const [managedLeagues, assignedLeagues] = await Promise.all([
      League.findAll({ where: { managerId: adminId }, attributes: ["id"] }),
      LeagueAdmin.findAll({ where: { userId: adminId }, attributes: ["leagueId"] }),
    ]);

    const accessibleIds = new Set([
      ...managedLeagues.map((l) => l.id),
      ...assignedLeagues.map((a) => a.leagueId),
    ]);

    const hasAccess = teamLeagueIds.some((id) => accessibleIds.has(id));
    if (!hasAccess) {
      throw new AppError(403, "No tienes permiso para eliminar este partido amistoso");
    }

    await match.destroy();
    return "Partido amistoso eliminado correctamente";
  }
}
