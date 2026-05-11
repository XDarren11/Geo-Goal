import type { RequestHandler } from "../../mediator/RequestHandler";
import { AdminOrchestrator } from "../../../services/AdminOrchestrator";
import {
  AdminAssignLeagueAdminRequest,
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
} from "../requests/AdminRequests";

export class AdminDashboardSummaryHandler
  implements RequestHandler<AdminDashboardSummaryRequest, unknown>
{
  handle(request: AdminDashboardSummaryRequest): Promise<unknown> {
    return AdminOrchestrator.getDashboardSummary(request.adminId);
  }
}

export class AdminListUsersByLeagueHandler
  implements RequestHandler<AdminListUsersByLeagueRequest, unknown>
{
  handle(request: AdminListUsersByLeagueRequest): Promise<unknown> {
    return AdminOrchestrator.listUsersByLeague(request.leagueId, request.adminId);
  }
}

export class AdminListUsersHandler implements RequestHandler<AdminListUsersRequest, unknown> {
  handle(request: AdminListUsersRequest): Promise<unknown> {
    return AdminOrchestrator.listUsers(request.page, request.pageSize);
  }
}

export class AdminCreateUserHandler implements RequestHandler<AdminCreateUserRequest, string> {
  handle(request: AdminCreateUserRequest): Promise<string> {
    return AdminOrchestrator.createUser(request.body, request.ctx);
  }
}

export class AdminUpdateUserHandler implements RequestHandler<AdminUpdateUserRequest, string> {
  handle(request: AdminUpdateUserRequest): Promise<string> {
    return AdminOrchestrator.updateUser(request.userId, request.body, request.ctx);
  }
}

export class AdminDeleteUserHandler implements RequestHandler<AdminDeleteUserRequest, string> {
  handle(request: AdminDeleteUserRequest): Promise<string> {
    return AdminOrchestrator.deleteUser(
      request.userId,
      request.currentAdminId,
      request.body,
      request.ctx
    );
  }
}

export class AdminListLeagueAdminsHandler
  implements RequestHandler<AdminListLeagueAdminsRequest, unknown>
{
  handle(request: AdminListLeagueAdminsRequest): Promise<unknown> {
    return AdminOrchestrator.listLeagueAdmins(request.leagueId, request.adminId);
  }
}

export class AdminAssignLeagueAdminHandler
  implements RequestHandler<AdminAssignLeagueAdminRequest, string>
{
  handle(request: AdminAssignLeagueAdminRequest): Promise<string> {
    return AdminOrchestrator.assignLeagueAdmin(
      request.leagueId,
      request.userId,
      request.leagueRole,
      request.currentAdminId,
      request.actingUserId,
      request.body,
      request.ctx
    );
  }
}

export class AdminUpdateLeagueAdminRoleHandler
  implements RequestHandler<AdminUpdateLeagueAdminRoleRequest, string>
{
  handle(request: AdminUpdateLeagueAdminRoleRequest): Promise<string> {
    return AdminOrchestrator.updateLeagueAdminRole(
      request.leagueId,
      request.userId,
      request.leagueRole,
      request.currentAdminId,
      request.actingUserId,
      request.body,
      request.ctx
    );
  }
}

export class AdminRemoveLeagueAdminHandler
  implements RequestHandler<AdminRemoveLeagueAdminRequest, string>
{
  handle(request: AdminRemoveLeagueAdminRequest): Promise<string> {
    return AdminOrchestrator.removeLeagueAdmin(
      request.leagueId,
      request.userId,
      request.currentAdminId,
      request.body,
      request.ctx
    );
  }
}

export class AdminListFieldsHandler implements RequestHandler<AdminListFieldsRequest, unknown> {
  handle(request: AdminListFieldsRequest): Promise<unknown> {
    return AdminOrchestrator.listFields(request.page, request.pageSize);
  }
}

export class AdminGetFieldByIdHandler implements RequestHandler<AdminGetFieldByIdRequest, unknown> {
  handle(request: AdminGetFieldByIdRequest): Promise<unknown> {
    return AdminOrchestrator.getFieldById(request.fieldId);
  }
}

export class AdminCreateFieldHandler implements RequestHandler<AdminCreateFieldRequest, string> {
  handle(request: AdminCreateFieldRequest): Promise<string> {
    return AdminOrchestrator.createField(request.body, request.ctx);
  }
}

export class AdminUpdateFieldHandler implements RequestHandler<AdminUpdateFieldRequest, string> {
  handle(request: AdminUpdateFieldRequest): Promise<string> {
    return AdminOrchestrator.updateField(request.fieldId, request.body, request.ctx);
  }
}

export class AdminDeleteFieldHandler implements RequestHandler<AdminDeleteFieldRequest, string> {
  handle(request: AdminDeleteFieldRequest): Promise<string> {
    return AdminOrchestrator.deleteField(request.fieldId, request.body, request.ctx);
  }
}

export class AdminCreateSeasonHandler implements RequestHandler<AdminCreateSeasonRequest, unknown> {
  handle(request: AdminCreateSeasonRequest): Promise<unknown> {
    return AdminOrchestrator.createSeason(
      request.leagueId,
      request.adminId,
      request.body,
      request.ctx
    );
  }
}

export class AdminListSeasonsByLeagueHandler
  implements RequestHandler<AdminListSeasonsByLeagueRequest, unknown>
{
  handle(request: AdminListSeasonsByLeagueRequest): Promise<unknown> {
    return AdminOrchestrator.listSeasonsByLeague(request.leagueId, request.adminId);
  }
}

export class AdminGetSeasonByIdHandler implements RequestHandler<AdminGetSeasonByIdRequest, unknown> {
  handle(request: AdminGetSeasonByIdRequest): Promise<unknown> {
    return AdminOrchestrator.getSeasonById(request.seasonId, request.adminId);
  }
}

export class AdminUpdateSeasonHandler implements RequestHandler<AdminUpdateSeasonRequest, unknown> {
  handle(request: AdminUpdateSeasonRequest): Promise<unknown> {
    return AdminOrchestrator.updateSeason(
      request.seasonId,
      request.adminId,
      request.body,
      request.ctx
    );
  }
}

export class AdminChangeSeasonStatusHandler
  implements RequestHandler<AdminChangeSeasonStatusRequest, unknown>
{
  handle(request: AdminChangeSeasonStatusRequest): Promise<unknown> {
    return AdminOrchestrator.changeSeasonStatus(
      request.seasonId,
      request.adminId,
      request.body,
      request.ctx
    );
  }
}

export class AdminDeleteSeasonHandler implements RequestHandler<AdminDeleteSeasonRequest, string> {
  handle(request: AdminDeleteSeasonRequest): Promise<string> {
    return AdminOrchestrator.deleteSeason(
      request.seasonId,
      request.adminId,
      request.body,
      request.ctx
    );
  }
}

export class AdminListAuditLogsHandler
  implements RequestHandler<AdminListAuditLogsRequest, unknown>
{
  handle(request: AdminListAuditLogsRequest): Promise<unknown> {
    return AdminOrchestrator.listAuditLogs(request.filters);
  }
}

export class AdminGetAuditLogByIdHandler
  implements RequestHandler<AdminGetAuditLogByIdRequest, unknown>
{
  handle(request: AdminGetAuditLogByIdRequest): Promise<unknown> {
    return AdminOrchestrator.getAuditLogById(request.logId);
  }
}
