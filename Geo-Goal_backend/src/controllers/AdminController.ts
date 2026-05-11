import type { Request, Response } from "express";
import type { AdminActorContext } from "../services/AdminOrchestrator";
import { buildAdminMediator } from "../application/admin/AdminMediator";
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
import {
  AdminAssignLeagueAdminRequest,
  AdminAuditLogFilters,
  AdminChangeSeasonStatusRequest,
  AdminCreateFieldRequest,
  AdminCreateSeasonRequest,
  AdminCreateUserRequest,
  AdminDashboardSummaryRequest,
  AdminDeleteFieldRequest,
  AdminDeleteSeasonRequest,
  AdminDeleteUserRequest,
  AdminGetAuditLogByIdRequest,
  AdminGetFieldByIdRequest,
  AdminGetSeasonByIdRequest,
  AdminListAuditLogsRequest,
  AdminListFieldsRequest,
  AdminListLeagueAdminsRequest,
  AdminListSeasonsByLeagueRequest,
  AdminListUsersByLeagueRequest,
  AdminListUsersRequest,
  AdminRemoveLeagueAdminRequest,
  AdminUpdateFieldRequest,
  AdminUpdateLeagueAdminRoleRequest,
  AdminUpdateSeasonRequest,
  AdminUpdateUserRequest,
} from "../application/admin/requests/AdminRequests";

const adminMediator = buildAdminMediator();

function adminCtx(req: Request): AdminActorContext {
  return {
    actorUserId: req.user!.id,
    ip: req.ip,
    userAgent: req.get("user-agent") ?? null,
  };
}

export class AdminController {
  static dashboardSummary = async (req: Request, res: Response): Promise<void> => {
    const data = await adminMediator.send(
      new AdminDashboardSummaryRequest(req.user!.id)
    );
    res.json(data);
  };

  static listUsersByLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await adminMediator.send(
      new AdminListUsersByLeagueRequest(leagueId, req.user!.id)
    );
    res.json(data);
  };

  static listUsers = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50;
    const data = await adminMediator.send(new AdminListUsersRequest(page, pageSize));
    res.json(data);
  };

  static createUser = async (req: Request, res: Response): Promise<void> => {
    const result = await adminMediator.send(
      new AdminCreateUserRequest(req.body as CreateUserBodyDTO, adminCtx(req))
    );
    res.send(result);
  };

  static updateUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const result = await adminMediator.send(
      new AdminUpdateUserRequest(userId, req.body as UpdateUserBodyDTO, adminCtx(req))
    );
    res.send(result);
  };

  static deleteUser = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const result = await adminMediator.send(
      new AdminDeleteUserRequest(userId, req.user!.id, req.body, adminCtx(req))
    );
    res.send(result);
  };

  static listLeagueAdmins = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await adminMediator.send(
      new AdminListLeagueAdminsRequest(leagueId, req.user!.id)
    );
    res.json(data);
  };

  static assignLeagueAdmin = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const { userId, leagueRole } = req.body;
    const result = await adminMediator.send(
      new AdminAssignLeagueAdminRequest(
        leagueId,
        Number(userId),
        leagueRole as LeagueAdminRoleDTO,
        req.user!.id,
        req.user!.id,
        req.body,
        adminCtx(req)
      )
    );
    res.send(result);
  };

  static updateLeagueAdminRole = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, userId } = req.params;
    const { leagueRole } = req.body;
    const result = await adminMediator.send(
      new AdminUpdateLeagueAdminRoleRequest(
        leagueId,
        userId,
        leagueRole as LeagueAdminRoleDTO,
        req.user!.id,
        req.user!.id,
        req.body,
        adminCtx(req)
      )
    );
    res.send(result);
  };

  static removeLeagueAdmin = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, userId } = req.params;
    const result = await adminMediator.send(
      new AdminRemoveLeagueAdminRequest(
        leagueId,
        userId,
        req.user!.id,
        req.body,
        adminCtx(req)
      )
    );
    res.send(result);
  };

  static listFields = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50;
    const data = await adminMediator.send(new AdminListFieldsRequest(page, pageSize));
    res.json(data);
  };

  static getFieldById = async (req: Request, res: Response): Promise<void> => {
    const { fieldId } = req.params;
    const data = await adminMediator.send(new AdminGetFieldByIdRequest(fieldId));
    res.json(data);
  };

  static createField = async (req: Request, res: Response): Promise<void> => {
    const result = await adminMediator.send(
      new AdminCreateFieldRequest(req.body as CreateFieldBodyDTO, adminCtx(req))
    );
    res.send(result);
  };

  static updateField = async (req: Request, res: Response): Promise<void> => {
    const { fieldId } = req.params;
    const result = await adminMediator.send(
      new AdminUpdateFieldRequest(fieldId, req.body as UpdateFieldBodyDTO, adminCtx(req))
    );
    res.send(result);
  };

  static deleteField = async (req: Request, res: Response): Promise<void> => {
    const { fieldId } = req.params;
    const result = await adminMediator.send(
      new AdminDeleteFieldRequest(fieldId, req.body, adminCtx(req))
    );
    res.send(result);
  };

  static createSeason = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const season = await adminMediator.send(
      new AdminCreateSeasonRequest(
        leagueId,
        req.user!.id,
        req.body as CreateSeasonBodyDTO,
        adminCtx(req)
      )
    );
    res.status(201).json(season);
  };

  static listSeasonsByLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await adminMediator.send(
      new AdminListSeasonsByLeagueRequest(leagueId, req.user!.id)
    );
    res.json(data);
  };

  static getSeasonById = async (req: Request, res: Response): Promise<void> => {
    const { seasonId } = req.params;
    const data = await adminMediator.send(
      new AdminGetSeasonByIdRequest(seasonId, req.user!.id)
    );
    res.json(data);
  };

  static updateSeason = async (req: Request, res: Response): Promise<void> => {
    const { seasonId } = req.params;
    const updated = await adminMediator.send(
      new AdminUpdateSeasonRequest(
        seasonId,
        req.user!.id,
        req.body as UpdateSeasonBodyDTO,
        adminCtx(req)
      )
    );
    res.json(updated);
  };

  static changeSeasonStatus = async (req: Request, res: Response): Promise<void> => {
    const { seasonId } = req.params;
    const body: ChangeSeasonStatusBodyDTO = {
      status: req.body.status,
      reason: req.body.reason,
    };
    const updated = await adminMediator.send(
      new AdminChangeSeasonStatusRequest(seasonId, req.user!.id, body, adminCtx(req))
    );
    res.json(updated);
  };

  static deleteSeason = async (req: Request, res: Response): Promise<void> => {
    const { seasonId } = req.params;
    const result = await adminMediator.send(
      new AdminDeleteSeasonRequest(seasonId, req.user!.id, req.body, adminCtx(req))
    );
    res.send(result);
  };

  static listAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const filters: AdminAuditLogFilters = {
      leagueId: req.query.leagueId ? Number(req.query.leagueId) : undefined,
      seasonId: req.query.seasonId ? Number(req.query.seasonId) : undefined,
      actorUserId: req.query.actorUserId ? Number(req.query.actorUserId) : undefined,
      entityType: req.query.entityType ? String(req.query.entityType) : undefined,
      action: req.query.action
        ? (String(req.query.action) as AdminAuditLogFilters["action"])
        : undefined,
      from: req.query.from ? String(req.query.from) : undefined,
      to: req.query.to ? String(req.query.to) : undefined,
    };
    const data = await adminMediator.send(new AdminListAuditLogsRequest(filters));
    res.json(data);
  };

  static getAuditLogById = async (req: Request, res: Response): Promise<void> => {
    const { logId } = req.params;
    const data = await adminMediator.send(new AdminGetAuditLogByIdRequest(logId));
    res.json(data);
  };
}
