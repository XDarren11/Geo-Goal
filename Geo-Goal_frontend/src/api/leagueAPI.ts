import api from "@/lib/axios";
import type { League, Team, FixtureByRound, MatchAnalyticsResponse } from "@/types";

const BASE = "/league";

function resolveMediaUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const base = import.meta.env.VITE_API_URL || "";
  return `${base.replace(/\/$/, "")}/uploads/${value}`;
}

export async function getLeagues(): Promise<League[]> {
  const { data } = await api.get<League[] | { data: League[] }>(BASE);
  if (Array.isArray(data)) return data;
  return Array.isArray((data as any)?.data) ? (data as any).data : [];
}

export async function getLeagueById(leagueId: number): Promise<League & { teams: Team[] }> {
  const { data } = await api.get<League & { teams: Team[] }>(`${BASE}/${leagueId}`);
  return data;
}

export async function createLeague(body: { name: string; description: string; lineupMode: 7 | 11; logo?: File }): Promise<string> {
  const formData = new FormData();
  formData.append("name", body.name);
  formData.append("description", body.description);
  formData.append("lineupMode", String(body.lineupMode));
  if (body.logo) formData.append("logo", body.logo);
  const { data } = await api.post<string>(BASE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateLeague(
  leagueId: number,
  body: { name: string; description: string; lineupMode?: 7 | 11 }
): Promise<string> {
  const { data } = await api.put<string>(`${BASE}/${leagueId}`, body);
  return data;
}

export async function deleteLeague(leagueId: number): Promise<string> {
  const { data } = await api.delete<string>(`${BASE}/${leagueId}`);
  return data;
}

export async function getTeamsLeague(leagueId: number): Promise<League & { teams: Team[] }> {
  const { data } = await api.get<League & { teams: Team[] }>(`${BASE}/${leagueId}/teams`);
  return data;
}

export async function getTrainerTeams(
  leagueId: number,
  email: string
): Promise<Pick<Team, "id" | "name">[]> {
  const { data } = await api.post<Pick<Team, "id" | "name">[]>(
    `${BASE}/${leagueId}/teams/find`,
    { email }
  );
  return data;
}

export async function addTeamToLeague(leagueId: number, teamId: number): Promise<string> {
  const { data } = await api.post<string>(`${BASE}/${leagueId}/teams`, { teamId });
  return data;
}

export async function removeTeamFromLeague(
  leagueId: number,
  teamId: number
): Promise<string> {
  const { data } = await api.delete<string>(`${BASE}/${leagueId}/teams/${teamId}`);
  return data;
}

export async function generateFixture(
  leagueId: number,
  type: "round-robin" | "knockout",
  options?: {
    scheduleStartDate?: string;
    matchTime?: string;
    daysBetweenRounds?: number;
    matchDuration?: number
  }
): Promise<{ message: string; totalMatches: number }> {
  const { data } = await api.post<{ message: string; totalMatches: number }>(
    `${BASE}/${leagueId}/calculate-fixture`,
    {
      type,
      ...(options?.scheduleStartDate ? { scheduleStartDate: options.scheduleStartDate } : {}),
      ...(options?.matchTime ? { matchTime: options.matchTime } : {}),
      ...(options?.daysBetweenRounds != null ? { daysBetweenRounds: options.daysBetweenRounds } : {}),
    }
  );
  return data;
}

export async function getFixture(leagueId: number): Promise<FixtureByRound> {
  const { data } = await api.get<FixtureByRound>(`${BASE}/${leagueId}/fixture`);
  return data;
}

export function leagueLogoUrl(logoPath: string | null | undefined): string {
  return resolveMediaUrl(logoPath);
}

// Alias semántico para uso en LeagueDetail
export const leagueLogoFullUrl = leagueLogoUrl;



export const updateMatchScore = async (
  matchId: number, 
  homeScore: number, 
  awayScore: number,
  homePenaltiesScore?: number,
  awayPenaltiesScore?: number 
) => {
  const payload: {
    homeScore: number;
    awayScore: number;
    homePenaltiesScore?: number;
    awayPenaltiesScore?: number;
  } = {
    homeScore: Number(homeScore),
    awayScore: Number(awayScore) 
  };
  
  if (homePenaltiesScore !== undefined && !isNaN(homePenaltiesScore)) {
    payload.homePenaltiesScore = Number(homePenaltiesScore);
  }
  if (awayPenaltiesScore !== undefined && !isNaN(awayPenaltiesScore)) {
    payload.awayPenaltiesScore = Number(awayPenaltiesScore);
  }
  const { data } = await api.post(`/league/matches/${matchId}/result`, payload);
  return data;
};

export const updateMatchSchedule = async (
  matchId: number,
  date: string
) => {
  const { data } = await api.patch(`/league/matches/${matchId}/schedule`, { date });
  return data;
};

export const getStandings = async (leagueId: number) => {
  const { data } = await api.get(`${BASE}/${leagueId}/standings`); 
  return data;
};

export const restructureFixture = async (leagueId: number) => {
  const { data } = await api.post(`${BASE}/${leagueId}/restructure-fixture`);
  return data;
};

export const getLeagueMatches = async (leagueId: number) => {
  const { data } = await api.get(`${BASE}/${leagueId}/matches`);
  return data;
};

export async function getMatchAnalytics(matchId: number): Promise<MatchAnalyticsResponse> {
  const { data } = await api.get<MatchAnalyticsResponse>(`${BASE}/matches/${matchId}/analytics`);
  return data;
}

export async function updateLeagueLogo(leagueId: number, logo: File): Promise<{ logoUrl: string }> {
  const formData = new FormData();
  formData.append("logo", logo);
  const { data } = await api.patch<{ logoUrl: string }>(
    `${BASE}/${leagueId}/logo`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}
