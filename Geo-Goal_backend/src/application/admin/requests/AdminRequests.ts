import type { Request } from "../../mediator/Request";
import type { AdminActorContext } from "../../../services/AdminOrchestrator";
import type {
  AuditReasonBodyDTO,
  ChangeSeasonStatusBodyDTO,
  CreateFieldBodyDTO,
  CreateSeasonBodyDTO,
  CreateUserBodyDTO,
  LeagueAdminRoleDTO,
  UpdateFieldBodyDTO,
  UpdateSeasonBodyDTO,
  UpdateUserBodyDTO,
} from "../dto/AdminDTOs";

abstract class AR<T> implements Request<T> {
  abstract readonly requestName: string;
}

export class AdminDashboardSummaryRequest extends AR<unknown> {
  readonly requestName = "admin.dashboardSummary";
  constructor(public readonly adminId: number) {
    super();
  }
}

export class AdminListUsersByLeagueRequest extends AR<unknown> {
  readonly requestName = "admin.listUsersByLeague";
  constructor(
    public readonly leagueId: string,
    public readonly adminId: number
  ) {
    super();
  }
}

export class AdminListUsersRequest extends AR<unknown> {
  readonly requestName = "admin.listUsers";
  constructor(
    public readonly page = 1,
    public readonly pageSize = 50
  ) {
    super();
  }
}

export class AdminCreateUserRequest extends AR<string> {
  readonly requestName = "admin.createUser";
  constructor(
    public readonly body: CreateUserBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminUpdateUserRequest extends AR<string> {
  readonly requestName = "admin.updateUser";
  constructor(
    public readonly userId: string,
    public readonly body: UpdateUserBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminDeleteUserRequest extends AR<string> {
  readonly requestName = "admin.deleteUser";
  constructor(
    public readonly userId: string,
    public readonly currentAdminId: number,
    public readonly body: AuditReasonBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminListLeagueAdminsRequest extends AR<unknown> {
  readonly requestName = "admin.listLeagueAdmins";
  constructor(
    public readonly leagueId: string,
    public readonly adminId: number
  ) {
    super();
  }
}

export class AdminAssignLeagueAdminRequest extends AR<string> {
  readonly requestName = "admin.assignLeagueAdmin";
  constructor(
    public readonly leagueId: string,
    public readonly userId: number,
    public readonly leagueRole: LeagueAdminRoleDTO,
    public readonly currentAdminId: number,
    public readonly actingUserId: number,
    public readonly body: AuditReasonBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminUpdateLeagueAdminRoleRequest extends AR<string> {
  readonly requestName = "admin.updateLeagueAdminRole";
  constructor(
    public readonly leagueId: string,
    public readonly userId: string,
    public readonly leagueRole: LeagueAdminRoleDTO,
    public readonly currentAdminId: number,
    public readonly actingUserId: number,
    public readonly body: AuditReasonBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminRemoveLeagueAdminRequest extends AR<string> {
  readonly requestName = "admin.removeLeagueAdmin";
  constructor(
    public readonly leagueId: string,
    public readonly userId: string,
    public readonly currentAdminId: number,
    public readonly body: AuditReasonBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminListFieldsRequest extends AR<unknown> {
  readonly requestName = "admin.listFields";
  constructor(
    public readonly page = 1,
    public readonly pageSize = 50
  ) {
    super();
  }
}

export class AdminGetFieldByIdRequest extends AR<unknown> {
  readonly requestName = "admin.getFieldById";
  constructor(public readonly fieldId: string) {
    super();
  }
}

export class AdminCreateFieldRequest extends AR<string> {
  readonly requestName = "admin.createField";
  constructor(
    public readonly body: CreateFieldBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminUpdateFieldRequest extends AR<string> {
  readonly requestName = "admin.updateField";
  constructor(
    public readonly fieldId: string,
    public readonly body: UpdateFieldBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminDeleteFieldRequest extends AR<string> {
  readonly requestName = "admin.deleteField";
  constructor(
    public readonly fieldId: string,
    public readonly body: AuditReasonBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminCreateSeasonRequest extends AR<unknown> {
  readonly requestName = "admin.createSeason";
  constructor(
    public readonly leagueId: string,
    public readonly adminId: number,
    public readonly body: CreateSeasonBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminListSeasonsByLeagueRequest extends AR<unknown> {
  readonly requestName = "admin.listSeasonsByLeague";
  constructor(
    public readonly leagueId: string,
    public readonly adminId: number
  ) {
    super();
  }
}

export class AdminGetSeasonByIdRequest extends AR<unknown> {
  readonly requestName = "admin.getSeasonById";
  constructor(
    public readonly seasonId: string,
    public readonly adminId: number
  ) {
    super();
  }
}

export class AdminUpdateSeasonRequest extends AR<unknown> {
  readonly requestName = "admin.updateSeason";
  constructor(
    public readonly seasonId: string,
    public readonly adminId: number,
    public readonly body: UpdateSeasonBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminChangeSeasonStatusRequest extends AR<unknown> {
  readonly requestName = "admin.changeSeasonStatus";
  constructor(
    public readonly seasonId: string,
    public readonly adminId: number,
    public readonly body: ChangeSeasonStatusBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export class AdminDeleteSeasonRequest extends AR<string> {
  readonly requestName = "admin.deleteSeason";
  constructor(
    public readonly seasonId: string,
    public readonly adminId: number,
    public readonly body: AuditReasonBodyDTO,
    public readonly ctx: AdminActorContext
  ) {
    super();
  }
}

export type AdminAuditLogFilters = {
  leagueId?: number;
  seasonId?: number;
  actorUserId?: number;
  entityType?: string;
  action?: "create" | "update" | "delete" | "status_change" | "manual_fix";
  from?: string;
  to?: string;
};

export class AdminListAuditLogsRequest extends AR<unknown> {
  readonly requestName = "admin.listAuditLogs";
  constructor(public readonly filters: AdminAuditLogFilters) {
    super();
  }
}

export class AdminGetAuditLogByIdRequest extends AR<unknown> {
  readonly requestName = "admin.getAuditLogById";
  constructor(public readonly logId: string) {
    super();
  }
}
