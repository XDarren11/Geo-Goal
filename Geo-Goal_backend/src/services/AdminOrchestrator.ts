import { AdminService } from "./AdminService";
import { AuditService } from "./AuditService";
import { User } from "../models/User";
import { LeagueAdmin } from "../models/LeagueAdmin";
import { Field } from "../models/Field";
import type {
  ChangeSeasonStatusBodyDTO,
  CreateFieldBodyDTO,
  CreateSeasonBodyDTO,
  CreateUserBodyDTO,
  LeagueAdminRoleDTO,
  UpdateFieldBodyDTO,
  UpdateSeasonBodyDTO,
  UpdateUserBodyDTO,
} from "../application/admin/dto/AdminDTOs";

export type AdminActorContext = {
  actorUserId: number;
  ip?: string;
  userAgent: string | null;
};

/**
 * Orquestación admin + auditoría (antes repartida en AdminController).
 */
export class AdminOrchestrator {
  static getDashboardSummary(currentAdminId: number) {
    return AdminService.getDashboardSummary(currentAdminId);
  }

  static listUsersByLeague(leagueId: string, currentAdminId: number) {
    return AdminService.listUsersByLeague(leagueId, currentAdminId);
  }

  static listUsers() {
    return AdminService.listUsers();
  }

  static async createUser(body: CreateUserBodyDTO, ctx: AdminActorContext): Promise<string> {
    const { reason, ...input } = body;
    const result = await AdminService.createUser(input as never);

    const createdUser = await User.findOne({ where: { email: body.email } });
    if (createdUser) {
      const userData = createdUser.toJSON() as Record<string, unknown>;
      delete userData.password;
      delete userData.token;

      await AuditService.log({
        actorUserId: ctx.actorUserId,
        entityType: "user",
        entityId: createdUser.id,
        action: "create",
        afterData: userData,
        reason: reason ?? "Creación de usuario",
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent,
      });
    }

    return result;
  }

  static async updateUser(
    userId: string,
    body: UpdateUserBodyDTO,
    ctx: AdminActorContext
  ): Promise<string> {
    const { reason, ...input } = body;
    const before = await User.findByPk(userId);
    const result = await AdminService.updateUser(userId, input as never);

    const after = await User.findByPk(userId);
    if (before && after) {
      const beforeData = before.toJSON() as Record<string, unknown>;
      const afterData = after.toJSON() as Record<string, unknown>;
      delete beforeData.password;
      delete beforeData.token;
      delete afterData.password;
      delete afterData.token;

      await AuditService.log({
        actorUserId: ctx.actorUserId,
        entityType: "user",
        entityId: userId,
        action: "update",
        beforeData,
        afterData,
        reason: reason ?? "Actualización de usuario",
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent,
      });
    }

    return result;
  }

  static async deleteUser(
    userId: string,
    currentAdminId: number,
    body: { reason?: string },
    ctx: AdminActorContext
  ): Promise<string> {
    const before = await User.findByPk(userId);
    const result = await AdminService.deleteUser(userId, currentAdminId);

    if (before) {
      const beforeData = before.toJSON() as Record<string, unknown>;
      delete beforeData.password;
      delete beforeData.token;

      await AuditService.log({
        actorUserId: ctx.actorUserId,
        entityType: "user",
        entityId: userId,
        action: "delete",
        beforeData,
        reason: body.reason ?? "Eliminación de usuario",
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent,
      });
    }

    return result;
  }

  static listLeagueAdmins(leagueId: string, currentAdminId: number) {
    return AdminService.listLeagueAdmins(leagueId, currentAdminId);
  }

  static async assignLeagueAdmin(
    leagueId: string,
    userId: number,
    leagueRole: LeagueAdminRoleDTO,
    currentAdminId: number,
    actingUserId: number,
    body: { reason?: string },
    ctx: AdminActorContext
  ): Promise<string> {
    const before = await LeagueAdmin.findOne({
      where: { leagueId, userId },
    });

    const result = await AdminService.assignLeagueAdmin(
      leagueId,
      userId,
      leagueRole,
      currentAdminId,
      actingUserId
    );

    const after = await LeagueAdmin.findOne({
      where: { leagueId, userId },
    });

    await AuditService.log({
      actorUserId: ctx.actorUserId,
      leagueId: Number(leagueId),
      entityType: "league_admin_assignment",
      entityId: `${leagueId}:${userId}`,
      action: before ? "update" : "create",
      beforeData: before ? (before.toJSON() as Record<string, unknown>) : null,
      afterData: after ? (after.toJSON() as Record<string, unknown>) : null,
      reason: body.reason ?? "Asignación de admin de liga",
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent,
    });

    return result;
  }

  static async updateLeagueAdminRole(
    leagueId: string,
    userId: string,
    leagueRole: LeagueAdminRoleDTO,
    currentAdminId: number,
    actingUserId: number,
    body: { reason?: string },
    ctx: AdminActorContext
  ): Promise<string> {
    const before = await LeagueAdmin.findOne({ where: { leagueId, userId } });

    const result = await AdminService.updateLeagueAdminRole(
      leagueId,
      userId,
      leagueRole,
      currentAdminId,
      actingUserId
    );

    const after = await LeagueAdmin.findOne({ where: { leagueId, userId } });

    await AuditService.log({
      actorUserId: ctx.actorUserId,
      leagueId: Number(leagueId),
      entityType: "league_admin_assignment",
      entityId: `${leagueId}:${userId}`,
      action: "update",
      beforeData: before ? (before.toJSON() as Record<string, unknown>) : null,
      afterData: after ? (after.toJSON() as Record<string, unknown>) : null,
      reason: body.reason ?? "Cambio de rol de admin de liga",
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent,
    });

    return result;
  }

  static async removeLeagueAdmin(
    leagueId: string,
    userId: string,
    currentAdminId: number,
    body: { reason?: string },
    ctx: AdminActorContext
  ): Promise<string> {
    const before = await LeagueAdmin.findOne({ where: { leagueId, userId } });

    const result = await AdminService.removeLeagueAdmin(leagueId, userId, currentAdminId);

    await AuditService.log({
      actorUserId: ctx.actorUserId,
      leagueId: Number(leagueId),
      entityType: "league_admin_assignment",
      entityId: `${leagueId}:${userId}`,
      action: "delete",
      beforeData: before ? (before.toJSON() as Record<string, unknown>) : null,
      reason: body.reason ?? "Remoción de admin de liga",
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent,
    });

    return result;
  }

  static listFields() {
    return AdminService.listFields();
  }

  static getFieldById(fieldId: string) {
    return AdminService.getFieldById(fieldId);
  }

  static async createField(body: CreateFieldBodyDTO, ctx: AdminActorContext): Promise<string> {
    const { reason, ...input } = body;
    const result = await AdminService.createField(input as never);

    const createdField = await Field.findOne({
      where: {
        name: input.name,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
      },
      order: [["id", "DESC"]],
    });

    if (createdField) {
      await AuditService.log({
        actorUserId: ctx.actorUserId,
        leagueId: createdField.leagueId ?? null,
        entityType: "field",
        entityId: createdField.id,
        action: "create",
        afterData: createdField.toJSON() as Record<string, unknown>,
        reason: reason ?? "Creación de campo",
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent,
      });
    }

    return result;
  }

  static async updateField(
    fieldId: string,
    body: UpdateFieldBodyDTO,
    ctx: AdminActorContext
  ): Promise<string> {
    const { reason, ...input } = body;
    const before = await Field.findByPk(fieldId);
    const result = await AdminService.updateField(fieldId, input as never);

    const after = await Field.findByPk(fieldId);
    if (before && after) {
      await AuditService.log({
        actorUserId: ctx.actorUserId,
        leagueId: after.leagueId ?? before.leagueId ?? null,
        entityType: "field",
        entityId: fieldId,
        action: "update",
        beforeData: before.toJSON() as Record<string, unknown>,
        afterData: after.toJSON() as Record<string, unknown>,
        reason: reason ?? "Actualización de campo",
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent,
      });
    }

    return result;
  }

  static async deleteField(
    fieldId: string,
    body: { reason?: string },
    ctx: AdminActorContext
  ): Promise<string> {
    const before = await Field.findByPk(fieldId);
    const result = await AdminService.deleteField(fieldId);

    if (before) {
      await AuditService.log({
        actorUserId: ctx.actorUserId,
        leagueId: before.leagueId ?? null,
        entityType: "field",
        entityId: fieldId,
        action: "delete",
        beforeData: before.toJSON() as Record<string, unknown>,
        reason: body.reason ?? "Eliminación de campo",
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent,
      });
    }

    return result;
  }

  static async createSeason(
    leagueId: string,
    currentAdminId: number,
    body: CreateSeasonBodyDTO,
    ctx: AdminActorContext
  ) {
    const { reason, ...input } = body;
    const season = await AdminService.createSeason(leagueId, currentAdminId, input as never);

    await AuditService.log({
      actorUserId: ctx.actorUserId,
      leagueId: Number(leagueId),
      seasonId: season.id,
      entityType: "season",
      entityId: season.id,
      action: "create",
      afterData: season.toJSON() as Record<string, unknown>,
      reason: reason ?? "Creación de temporada",
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent,
    });

    return season;
  }

  static listSeasonsByLeague(leagueId: string, currentAdminId: number) {
    return AdminService.listSeasonsByLeague(leagueId, currentAdminId);
  }

  static getSeasonById(seasonId: string, currentAdminId: number) {
    return AdminService.getSeasonById(seasonId, currentAdminId);
  }

  static async updateSeason(
    seasonId: string,
    currentAdminId: number,
    body: UpdateSeasonBodyDTO,
    ctx: AdminActorContext
  ) {
    const { reason, ...input } = body;
    const before = await AdminService.getSeasonById(seasonId, currentAdminId);
    const updated = await AdminService.updateSeason(seasonId, currentAdminId, input as never);

    await AuditService.log({
      actorUserId: ctx.actorUserId,
      leagueId: updated.leagueId,
      seasonId: updated.id,
      entityType: "season",
      entityId: updated.id,
      action: "update",
      beforeData: before.toJSON() as Record<string, unknown>,
      afterData: updated.toJSON() as Record<string, unknown>,
      reason: reason ?? "Actualización de temporada",
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent,
    });

    return updated;
  }

  static async changeSeasonStatus(
    seasonId: string,
    currentAdminId: number,
    body: ChangeSeasonStatusBodyDTO,
    ctx: AdminActorContext
  ) {
    const before = await AdminService.getSeasonById(seasonId, currentAdminId);
    const updated = await AdminService.changeSeasonStatus(
      seasonId,
      body.status,
      currentAdminId
    );

    await AuditService.log({
      actorUserId: ctx.actorUserId,
      leagueId: updated.leagueId,
      seasonId: updated.id,
      entityType: "season",
      entityId: updated.id,
      action: "status_change",
      beforeData: before.toJSON() as Record<string, unknown>,
      afterData: updated.toJSON() as Record<string, unknown>,
      reason: body.reason ?? "Cambio de estado de temporada",
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent,
    });

    return updated;
  }

  static async deleteSeason(
    seasonId: string,
    currentAdminId: number,
    body: { reason?: string },
    ctx: AdminActorContext
  ): Promise<string> {
    const before = await AdminService.getSeasonById(seasonId, currentAdminId);
    const result = await AdminService.deleteSeason(seasonId, currentAdminId);

    await AuditService.log({
      actorUserId: ctx.actorUserId,
      leagueId: before.leagueId,
      seasonId: before.id,
      entityType: "season",
      entityId: before.id,
      action: "delete",
      beforeData: before.toJSON() as Record<string, unknown>,
      reason: body.reason ?? "Eliminación de temporada",
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent,
    });

    return result;
  }

  static listAuditLogs(filters: Parameters<typeof AdminService.listAuditLogs>[0]) {
    return AdminService.listAuditLogs(filters);
  }

  static getAuditLogById(logId: string) {
    return AdminService.getAuditLogById(logId);
  }
}
