import api from "@/lib/axios";
import type { AutoAssignResult, MatchAnalyticsResponse, PublicNewsItem } from "@/types";

export type RefereeAssignment = {
  id: number;
  matchId: number;
  leagueId: number;
  refereeUserId: number;
  status: "assigned" | "checked_in" | "closed";
  match?: {
    id: number;
    date?: string | null;
    roundName?: string;
    homeTeam?: { id: number; name: string; logoUrl?: string | null };
    awayTeam?: { id: number; name: string; logoUrl?: string | null };
    homeTeamId?: number;
    awayTeamId?: number;
  };
};

export type LeagueReferee = {
  id: number;
  name: string;
  email?: string | null;
  role: "referee" | "admin" | string;
};

export type UpcomingLeagueMatchesResponse = {
  data: Array<{
    id: number;
    date?: string | null;
    roundName?: string;
    homeTeam?: { id: number; name: string; logoUrl?: string | null };
    awayTeam?: { id: number; name: string; logoUrl?: string | null };
    homeTeamId?: number;
    awayTeamId?: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

export async function getRefereeTodayMatches(): Promise<RefereeAssignment[]> {
  const { data } = await api.get<RefereeAssignment[]>("/league/referee/matches/today");
  return Array.isArray(data) ? data : [];
}

export type RefereeDashboardSummary = {
  stats: {
    assignedWeek: number;
    checkIns: number;
    closedMatches: number;
  };
  upcomingAssignedMatches: RefereeAssignment[];
  matchStatus: Array<{
    assignmentId: number;
    matchId: number;
    status: "pending" | "in_progress" | "closed";
    assignmentStatus: "assigned" | "checked_in" | "closed";
    match?: RefereeAssignment["match"] & { league?: { id: number; name: string } };
  }>;
  quickActions: Array<{
    key: string;
    label: string;
    description: string;
    path: string;
    recommendedMatchId: number | null;
  }>;
  recentHistory: Array<{
    assignmentId: number;
    matchId: number;
    status: "pending" | "in_progress" | "closed";
    match?: RefereeAssignment["match"] & { league?: { id: number; name: string } };
    metrics: {
      eventsCount: number;
      goals: number;
      cards: number;
      trackingFrames: number;
    };
  }>;
  weekRange: { from: string; to: string };
  summary: {
    totalEventsLogged: number;
    totalTrackingFrames: number;
  };
  news: PublicNewsItem[];
};

export async function assignRefereeToMatch(
  matchId: number,
  body: { refereeUserId: number; status?: "assigned" | "checked_in" | "closed" }
) {
  const { data } = await api.post(`/league/matches/${matchId}/referee/assign`, body);
  return data;
}

export async function getLeagueReferees(leagueId: number): Promise<LeagueReferee[]> {
  const { data } = await api.get<LeagueReferee[]>(`/league/${leagueId}/referees`);
  return Array.isArray(data) ? data : [];
}

export async function getUpcomingLeagueMatches(
  leagueId: number,
  page = 1,
  pageSize = 50
): Promise<UpcomingLeagueMatchesResponse> {
  const { data } = await api.get<UpcomingLeagueMatchesResponse>(
    `/league/${leagueId}/matches/upcoming`,
    { params: { page, pageSize } }
  );
  return data;
}

export async function registerMatchEvent(
  matchId: number,
  body: {
    eventType:
      | "goal"
      | "own_goal"
      | "penalty_scored"
      | "penalty_missed"
      | "yellow_card"
      | "red_card"
      | "substitution"
      | "foul"
      | "offside"
      | "var_review";
    minute: number;
    extraMinute?: number | null;
    teamId?: number | null;
    playerId?: number | null;
    metadata?: Record<string, unknown>;
  }
) {
  const { data } = await api.post(`/league/matches/${matchId}/referee/events`, body);
  return data;
}

export async function registerTrackingFrame(
  matchId: number,
  body: {
    timestampMs: number;
    period?: "pre" | "1H" | "HT" | "2H" | "ET" | "post" | null;
    ball?: { x?: number; y?: number; z?: number };
    players: Array<Record<string, unknown>>;
  }
) {
  const { data } = await api.post(`/league/matches/${matchId}/referee/tracking`, body);
  return data;
}

export async function registerMatchEventsBulk(
  matchId: number,
  body: {
    events: Array<{
      eventType:
        | "goal"
        | "own_goal"
        | "penalty_scored"
        | "penalty_missed"
        | "pass"
        | "key_pass"
        | "shot"
        | "tackle"
        | "recovery"
        | "interception"
        | "clearance"
        | "dribble"
        | "cross"
        | "corner_won"
        | "yellow_card"
        | "red_card"
        | "substitution"
        | "foul"
        | "offside"
        | "var_review";
      minute: number;
      extraMinute?: number | null;
      matchTimestampSec?: number | null;
      teamId?: number | null;
      playerId?: number | null;
      relatedPlayerId?: number | null;
      xStart?: number | null;
      yStart?: number | null;
      xEnd?: number | null;
      yEnd?: number | null;
      outcome?: string | null;
      source?: "manual" | "inferred" | "video" | "simulated";
      confidence?: number;
      metadata?: Record<string, unknown>;
    }>;
  }
) {
  const { data } = await api.post(`/league/matches/${matchId}/referee/events/bulk`, body);
  return data as { created: number; analyticsRows: number };
}

export async function getMatchAnalytics(matchId: number): Promise<MatchAnalyticsResponse> {
  const { data } = await api.get<MatchAnalyticsResponse>(`/league/matches/${matchId}/analytics`);
  return data;
}

export async function getRefereeDashboardSummary(): Promise<RefereeDashboardSummary> {
  const { data } = await api.get<RefereeDashboardSummary>('/league/referee/dashboard');
  return data;
}

export async function autoAssignRefereesForLeague(leagueId: number): Promise<AutoAssignResult> {
  const { data } = await api.post<AutoAssignResult>(`/league/${leagueId}/auto-assign-referees`);
  return data;
}
