import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardView from "@/views/Dashboard";
import LoginView from "@/views/Auth/Login";
import RegisterView from "@/views/Auth/Register";
import ConfirmAccountView from "@/views/Auth/ConfirmAccount";
import RequestNewCode from "@/views/Auth/RequestNewCode";
import ForgotPasswordView from "@/views/Auth/ForgotPassword";
import NewPasswordView from "@/views/Auth/NewPassword";
import { RoleGuard } from "@/components/RoleGuard";
import PublicHomeView from "@/views/public/Home";
import PublicLeagueView from "@/views/public/League";
import PublicMatchDetailView from "@/views/public/MatchDetail";

import LeagueListView from "@/views/league/LeagueList";
import CreateLeagueView from "@/views/league/CreateLeague";
import LeagueDetailView from "@/views/league/LeagueDetail";
import LeagueAdminsView from "@/views/league/LeagueAdmins";
import JoinLeagueView from "@/views/league/JoinLeague";

import TeamListView from "@/views/team/TeamList";
import CreateTeamView from "@/views/team/CreateTeam";
import TeamDetailView from "@/views/team/TeamDetail";
import JoinTeamView from "@/views/team/JoinTeam";
import MyTeamsView from "@/views/team/MyTeams";

import StandingsView from "@/views/shared/Standings";
import ResultsView from "@/views/shared/Results";
import NewsView from "@/views/shared/News";
import StandingsTableView from "./views/shared/Standings/StandingsTableView";
import LeagueMatchesView from "./views/shared/Results/LeagueMatchesView";
import TeamDashboardView from "./views/league/JoinLeague/TeamDashboardView";
import UserManagementView from "@/views/admin/UserManagement";
import FieldManagementView from "@/views/admin/FieldManagement";
import SeasonManagementView from "@/views/admin/SeasonManagement";
import FriendlyMatchManagementView from "@/views/admin/FriendlyMatchManagement";
import AuditLogsView from "@/views/admin/AuditLogs";
import RefereeCenterView from "@/views/admin/RefereeCenter";
import CoachTeamsView from "./views/team/TeamView/CoachTeamsView";
import AccountManagementView from "@/views/account/AccountManagement";

const ACCESS_TOKEN_KEY = "AUTH_TOKEN";
const REFRESH_TOKEN_KEY = "AUTH_REFRESH_TOKEN";

function hasStoredSession() {
  return !!localStorage.getItem(ACCESS_TOKEN_KEY) && !!localStorage.getItem(REFRESH_TOKEN_KEY);
}

function EntryRedirect() {
  return <Navigate to={hasStoredSession() ? "/dashboard" : "/public"} replace />;
}

function PublicOnlyRedirect() {
  return hasStoredSession() ? <Navigate to="/dashboard" replace /> : <PublicHomeView />;
}

function GuestOnlyRedirect({ children }: { children: React.ReactNode }) {
  return hasStoredSession() ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EntryRedirect />} />
        <Route path="/public" element={<PublicOnlyRedirect />} />
        <Route path="/public/leagues/:leagueId" element={<PublicLeagueView />} />
        <Route path="/public/matches/:matchId/detail" element={<PublicMatchDetailView />} />

        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardView />} />

          <Route
            path="/leagues"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <LeagueListView />
              </RoleGuard>
            }
          />
          <Route
            path="/leagues/new"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <CreateLeagueView />
              </RoleGuard>
            }
          />
          <Route
            path="/leagues/admins"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <LeagueAdminsView />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <UserManagementView />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/fields"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <FieldManagementView />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/seasons"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <SeasonManagementView />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <AuditLogsView />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/friendly-matches"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <FriendlyMatchManagementView />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/referee"
            element={
              <RoleGuard allowedRoles={["admin", "referee"]}>
                <RefereeCenterView />
              </RoleGuard>
            }
          />
          <Route
            path="/leagues/:leagueId"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <LeagueDetailView />
              </RoleGuard>
            }
          />
          <Route
            path="/leagues/join"
            element={
              <RoleGuard allowedRoles={["coach", "referee"]}>
                <JoinLeagueView />
              </RoleGuard>
            }
          />

          <Route
            path="/teams"
            element={
              <RoleGuard allowedRoles={["coach"]}>
                <TeamListView />
              </RoleGuard>
            }
          />
          <Route
            path="/teams/new"
            element={
              <RoleGuard allowedRoles={["coach"]}>
                <CreateTeamView />
              </RoleGuard>
            }
          />
          <Route
            path="/teams/:teamId"
            element={
              <RoleGuard allowedRoles={["admin", "coach", "player"]}>
                <TeamDetailView />
              </RoleGuard>
            }
          />
          <Route
            path="/teams/join"
            element={
              <RoleGuard allowedRoles={["player"]}>
                <JoinTeamView />
              </RoleGuard>
            }
          />
          <Route
            path="/my-teams"
            element={
              <RoleGuard allowedRoles={["player"]}>
                <MyTeamsView />
              </RoleGuard>
            }
          />

          <Route path="/standings" element={<StandingsView />} />
          <Route path="/league/:leagueId/standings" element={<StandingsTableView />} />
          
          <Route path="/results" element={<ResultsView />} />

          <Route path="/leagues/:leagueId/results" element={
              <LeagueMatchesView />
            }
          />

          <Route path="/coach/teams" element={<CoachTeamsView />} />

          <Route path="/leagues/:leagueId/teams/:teamId/dashboard" element={<TeamDashboardView />} />

          <Route path="/news" element={<NewsView />} />
          <Route
            path="/account"
            element={
              <RoleGuard allowedRoles={["admin", "coach", "player", "referee"]}>
                <AccountManagementView />
              </RoleGuard>
            }
          />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<GuestOnlyRedirect><LoginView /></GuestOnlyRedirect>} />
          <Route path="/auth/register" element={<GuestOnlyRedirect><RegisterView /></GuestOnlyRedirect>} />
          <Route path="/auth/confirm-account" element={<GuestOnlyRedirect><ConfirmAccountView /></GuestOnlyRedirect>} />
          <Route path="/auth/request-code" element={<GuestOnlyRedirect><RequestNewCode /></GuestOnlyRedirect>} />
          <Route path="/auth/forgot-password" element={<GuestOnlyRedirect><ForgotPasswordView /></GuestOnlyRedirect>} />
          <Route path="/auth/new-password" element={<GuestOnlyRedirect><NewPasswordView /></GuestOnlyRedirect>} />
          <Route path="/auth/new-password/:token" element={<GuestOnlyRedirect><NewPasswordView /></GuestOnlyRedirect>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
