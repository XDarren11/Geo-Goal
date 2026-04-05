import { BrowserRouter, Routes, Route } from "react-router-dom";
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

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardView />} index />

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
              <RoleGuard allowedRoles={["coach"]}>
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
              <RoleGuard allowedRoles={["coach"]}>
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

          <Route path="/leagues/:leagueId/teams/:teamId/dashboard" element={<TeamDashboardView />} />

          <Route path="/news" element={<NewsView />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/auth/login" element={<LoginView />} />
          <Route path="/auth/register" element={<RegisterView />} />
          <Route path="/auth/confirm-account" element={<ConfirmAccountView />} />
          <Route path="/auth/request-code" element={<RequestNewCode />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordView />} />
          <Route path="/auth/new-password" element={<NewPasswordView />} />
          <Route path="/auth/new-password/:token" element={<NewPasswordView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
