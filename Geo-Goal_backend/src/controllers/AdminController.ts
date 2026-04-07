import type { Request, Response } from "express";
import { AdminService } from "../services/AdminService";
import { AuditService } from "../services/AuditService";
import { User } from "../models/User";
import { LeagueAdmin } from "../models/LeagueAdmin";
import { Field } from "../models/Field";

export class AdminController {
  static dashboardSummary = async (req: Request, res: Response): Promise<void> => {
    const data = await AdminService.getDashboardSummary(req.user!.id);
    res.json(data);
  };

  // Usuarios
  static listUsersByLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await AdminService.listUsersByLeague(leagueId, req.user!.id);
    res.json(data);
  };

  static listUsers = async (_req: Request, res: Response): Promise<void> => {
    const data = await AdminService.listUsers();
    res.json(data);
  };

  static createUser = async (req: Request, res: Response): Promise<void> => {
    const result = await AdminService.createUser(req.body);

    const createdUser = await User.findOne({ where: { email: req.body.email } });
    if (createdUser) {
      const userData = createdUser.toJSON() as Record<string, unknown>;
      delete userData.password;
      delete userData.token;

      await AuditService.log({
        actorUserId: req.user!.id,
        entityType: "user",
        entityId: createdUser.id,
        action: "create",
        afterData: userData,
        reason: req.body.reason ?? "Creación de usuario",
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
      });
    }

    res.send(result);
  };

  static updateUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const before = await User.findByPk(userId);
    const result = await AdminService.updateUser(userId, req.body);

    const after = await User.findByPk(userId);
    if (before && after) {
      const beforeData = before.toJSON() as Record<string, unknown>;
      const afterData = after.toJSON() as Record<string, unknown>;
      delete beforeData.password;
      delete beforeData.token;
      delete afterData.password;
      delete afterData.token;

      await AuditService.log({
        actorUserId: req.user!.id,
        entityType: "user",
        entityId: userId,
        action: "update",
        beforeData,
        afterData,
        reason: req.body.reason ?? "Actualización de usuario",
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
      });
    }

    res.send(result);
  };

  static deleteUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const before = await User.findByPk(userId);
    const result = await AdminService.deleteUser(userId, req.user!.id);

    if (before) {
      const beforeData = before.toJSON() as Record<string, unknown>;
      delete beforeData.password;
      delete beforeData.token;

      await AuditService.log({
        actorUserId: req.user!.id,
        entityType: "user",
        entityId: userId,
        action: "delete",
        beforeData,
        reason: req.body?.reason ?? "Eliminación de usuario",
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
      });
    }

    res.send(result);
  };

  // Admins por liga
  static listLeagueAdmins = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await AdminService.listLeagueAdmins(leagueId, req.user!.id);
    res.json(data);
  };

  static assignLeagueAdmin = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const { userId, leagueRole } = req.body;

    const before = await LeagueAdmin.findOne({
      where: { leagueId, userId: Number(userId) },
    });

    const result = await AdminService.assignLeagueAdmin(
      leagueId,
      Number(userId),
      leagueRole,
      req.user!.id,
      req.user!.id
    );

    const after = await LeagueAdmin.findOne({
      where: { leagueId, userId: Number(userId) },
    });

    await AuditService.log({
      actorUserId: req.user!.id,
      leagueId: Number(leagueId),
      entityType: "league_admin_assignment",
      entityId: `${leagueId}:${userId}`,
      action: before ? "update" : "create",
      beforeData: before ? (before.toJSON() as Record<string, unknown>) : null,
      afterData: after ? (after.toJSON() as Record<string, unknown>) : null,
      reason: req.body.reason ?? "Asignación de admin de liga",
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
    });

    res.send(result);
  };

  static updateLeagueAdminRole = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, userId } = req.params;
    const { leagueRole } = req.body;

    const before = await LeagueAdmin.findOne({ where: { leagueId, userId } });

    const result = await AdminService.updateLeagueAdminRole(
      leagueId,
      userId,
      leagueRole,
      req.user!.id,
      req.user!.id
    );

    const after = await LeagueAdmin.findOne({ where: { leagueId, userId } });

    await AuditService.log({
      actorUserId: req.user!.id,
      leagueId: Number(leagueId),
      entityType: "league_admin_assignment",
      entityId: `${leagueId}:${userId}`,
      action: "update",
      beforeData: before ? (before.toJSON() as Record<string, unknown>) : null,
      afterData: after ? (after.toJSON() as Record<string, unknown>) : null,
      reason: req.body.reason ?? "Cambio de rol de admin de liga",
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
    });

    res.send(result);
  };

  static removeLeagueAdmin = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, userId } = req.params;

    const before = await LeagueAdmin.findOne({ where: { leagueId, userId } });

    const result = await AdminService.removeLeagueAdmin(leagueId, userId, req.user!.id);

    await AuditService.log({
      actorUserId: req.user!.id,
      leagueId: Number(leagueId),
      entityType: "league_admin_assignment",
      entityId: `${leagueId}:${userId}`,
      action: "delete",
      beforeData: before ? (before.toJSON() as Record<string, unknown>) : null,
      reason: req.body?.reason ?? "Remoción de admin de liga",
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
    });

    res.send(result);
  };

  // Campos
  static listFields = async (_req: Request, res: Response): Promise<void> => {
    const data = await AdminService.listFields();
    res.json(data);
  };

  static getFieldById = async (req: Request, res: Response): Promise<void> => {
    const { fieldId } = req.params;
    const data = await AdminService.getFieldById(fieldId);
    res.json(data);
  };

  static createField = async (req: Request, res: Response): Promise<void> => {
    const result = await AdminService.createField(req.body);

    const createdField = await Field.findOne({
      where: {
        name: req.body.name,
        address: req.body.address,
        lat: req.body.lat,
        lng: req.body.lng,
      },
      order: [["id", "DESC"]],
    });

    if (createdField) {
      await AuditService.log({
        actorUserId: req.user!.id,
        leagueId: createdField.leagueId ?? null,
        entityType: "field",
        entityId: createdField.id,
        action: "create",
        afterData: createdField.toJSON() as Record<string, unknown>,
        reason: req.body.reason ?? "Creación de campo",
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
      });
    }

    res.send(result);
  };

  static updateField = async (req: Request, res: Response): Promise<void> => {
    const { fieldId } = req.params;
    const before = await Field.findByPk(fieldId);
    const result = await AdminService.updateField(fieldId, req.body);

    const after = await Field.findByPk(fieldId);
    if (before && after) {
      await AuditService.log({
        actorUserId: req.user!.id,
        leagueId: after.leagueId ?? before.leagueId ?? null,
        entityType: "field",
        entityId: fieldId,
        action: "update",
        beforeData: before.toJSON() as Record<string, unknown>,
        afterData: after.toJSON() as Record<string, unknown>,
        reason: req.body.reason ?? "Actualización de campo",
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
      });
    }

    res.send(result);
  };

  static deleteField = async (req: Request, res: Response): Promise<void> => {
    const { fieldId } = req.params;
    const before = await Field.findByPk(fieldId);
    const result = await AdminService.deleteField(fieldId);

    if (before) {
      await AuditService.log({
        actorUserId: req.user!.id,
        leagueId: before.leagueId ?? null,
        entityType: "field",
        entityId: fieldId,
        action: "delete",
        beforeData: before.toJSON() as Record<string, unknown>,
        reason: req.body?.reason ?? "Eliminación de campo",
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
      });
    }

    res.send(result);
  };

  // Temporadas
  static createSeason = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const season = await AdminService.createSeason(leagueId, req.user!.id, req.body);

    await AuditService.log({
      actorUserId: req.user!.id,
      leagueId: Number(leagueId),
      seasonId: season.id,
      entityType: "season",
      entityId: season.id,
      action: "create",
      afterData: season.toJSON() as Record<string, unknown>,
      reason: req.body.reason ?? "Creación de temporada",
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
    });

    res.status(201).json(season);
  };

  static listSeasonsByLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await AdminService.listSeasonsByLeague(leagueId, req.user!.id);
    res.json(data);
  };

  static getSeasonById = async (req: Request, res: Response): Promise<void> => {
    const { seasonId } = req.params;
    const data = await AdminService.getSeasonById(seasonId, req.user!.id);
    res.json(data);
  };

  static updateSeason = async (req: Request, res: Response): Promise<void> => {
    const { seasonId } = req.params;
    const before = await AdminService.getSeasonById(seasonId, req.user!.id);
    const updated = await AdminService.updateSeason(seasonId, req.user!.id, req.body);

    await AuditService.log({
      actorUserId: req.user!.id,
      leagueId: updated.leagueId,
      seasonId: updated.id,
      entityType: "season",
      entityId: updated.id,
      action: "update",
      beforeData: before.toJSON() as Record<string, unknown>,
      afterData: updated.toJSON() as Record<string, unknown>,
      reason: req.body.reason ?? "Actualización de temporada",
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
    });

    res.json(updated);
  };

  static changeSeasonStatus = async (req: Request, res: Response): Promise<void> => {
    const { seasonId } = req.params;
    const before = await AdminService.getSeasonById(seasonId, req.user!.id);
    const updated = await AdminService.changeSeasonStatus(
      seasonId,
      req.body.status,
      req.user!.id
    );

    await AuditService.log({
      actorUserId: req.user!.id,
      leagueId: updated.leagueId,
      seasonId: updated.id,
      entityType: "season",
      entityId: updated.id,
      action: "status_change",
      beforeData: before.toJSON() as Record<string, unknown>,
      afterData: updated.toJSON() as Record<string, unknown>,
      reason: req.body.reason ?? "Cambio de estado de temporada",
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
    });

    res.json(updated);
  };

  static deleteSeason = async (req: Request, res: Response): Promise<void> => {
    const { seasonId } = req.params;
    const before = await AdminService.getSeasonById(seasonId, req.user!.id);
    const result = await AdminService.deleteSeason(seasonId, req.user!.id);

    await AuditService.log({
      actorUserId: req.user!.id,
      leagueId: before.leagueId,
      seasonId: before.id,
      entityType: "season",
      entityId: before.id,
      action: "delete",
      beforeData: before.toJSON() as Record<string, unknown>,
      reason: req.body?.reason ?? "Eliminación de temporada",
      ip: req.ip,
      userAgent: req.get("user-agent") ?? null,
    });

    res.send(result);
  };

  // Auditoría
  static listAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const data = await AdminService.listAuditLogs({
      leagueId: req.query.leagueId ? Number(req.query.leagueId) : undefined,
      seasonId: req.query.seasonId ? Number(req.query.seasonId) : undefined,
      actorUserId: req.query.actorUserId ? Number(req.query.actorUserId) : undefined,
      entityType: req.query.entityType ? String(req.query.entityType) : undefined,
      action: req.query.action
        ? (String(req.query.action) as "create" | "update" | "delete" | "status_change" | "manual_fix")
        : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
    });
    res.json(data);
  };

  static getAuditLogById = async (req: Request, res: Response): Promise<void> => {
    const { logId } = req.params;
    const data = await AdminService.getAuditLogById(logId);
    res.json(data);
  };
}
