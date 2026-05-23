import { Mediator } from "../mediator/Mediator";
import {
  AdminAssignLeagueAdminHandler,
  AdminChangeSeasonStatusHandler,
  AdminCreateFieldHandler,
  AdminCreateFriendlyMatchHandler,
  AdminCreateSeasonHandler,
  AdminCreateUserHandler,
  AdminDashboardSummaryHandler,
  AdminDeleteFieldHandler,
  AdminDeleteFriendlyMatchHandler,
  AdminDeleteSeasonHandler,
  AdminDeleteUserHandler,
  AdminGetAuditLogByIdHandler,
  AdminGetFieldByIdHandler,
  AdminGetSeasonByIdHandler,
  AdminListAuditLogsHandler,
  AdminListFieldsHandler,
  AdminListFriendlyMatchesHandler,
  AdminListLeagueAdminsHandler,
  AdminListSeasonsByLeagueHandler,
  AdminListUsersByLeagueHandler,
  AdminListUsersHandler,
  AdminRemoveLeagueAdminHandler,
  AdminUpdateFieldHandler,
  AdminUpdateLeagueAdminRoleHandler,
  AdminUpdateSeasonHandler,
  AdminUpdateUserHandler,
} from "./handlers/AdminHandlers";

export function buildAdminMediator(): Mediator {
  const m = new Mediator();
  m.register("admin.dashboardSummary", new AdminDashboardSummaryHandler());
  m.register("admin.listUsersByLeague", new AdminListUsersByLeagueHandler());
  m.register("admin.listUsers", new AdminListUsersHandler());
  m.register("admin.createUser", new AdminCreateUserHandler());
  m.register("admin.updateUser", new AdminUpdateUserHandler());
  m.register("admin.deleteUser", new AdminDeleteUserHandler());
  m.register("admin.listLeagueAdmins", new AdminListLeagueAdminsHandler());
  m.register("admin.assignLeagueAdmin", new AdminAssignLeagueAdminHandler());
  m.register("admin.updateLeagueAdminRole", new AdminUpdateLeagueAdminRoleHandler());
  m.register("admin.removeLeagueAdmin", new AdminRemoveLeagueAdminHandler());
  m.register("admin.listFields", new AdminListFieldsHandler());
  m.register("admin.getFieldById", new AdminGetFieldByIdHandler());
  m.register("admin.createField", new AdminCreateFieldHandler());
  m.register("admin.updateField", new AdminUpdateFieldHandler());
  m.register("admin.deleteField", new AdminDeleteFieldHandler());
  m.register("admin.createSeason", new AdminCreateSeasonHandler());
  m.register("admin.listSeasonsByLeague", new AdminListSeasonsByLeagueHandler());
  m.register("admin.getSeasonById", new AdminGetSeasonByIdHandler());
  m.register("admin.updateSeason", new AdminUpdateSeasonHandler());
  m.register("admin.changeSeasonStatus", new AdminChangeSeasonStatusHandler());
  m.register("admin.deleteSeason", new AdminDeleteSeasonHandler());
  m.register("admin.listAuditLogs", new AdminListAuditLogsHandler());
  m.register("admin.getAuditLogById", new AdminGetAuditLogByIdHandler());
  m.register("admin.createFriendlyMatch", new AdminCreateFriendlyMatchHandler());
  m.register("admin.listFriendlyMatches", new AdminListFriendlyMatchesHandler());
  m.register("admin.deleteFriendlyMatch", new AdminDeleteFriendlyMatchHandler());
  return m;
}
