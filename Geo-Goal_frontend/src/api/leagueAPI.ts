import api from "@/lib/axios";
import type { League, Team, FixtureByRound } from "@/types";

const BASE = "/league";

export async function getLeagues(): Promise<League[]> {
  const { data } = await api.get<League[]>(BASE);
  return data;
}

export async function getLeagueById(leagueId: number): Promise<League & { teams: Team[] }> {
  const { data } = await api.get<League & { teams: Team[] }>(`${BASE}/${leagueId}`);
  return data;
}

export async function createLeague(body: { name: string; description: string }): Promise<string> {
  const { data } = await api.post<string>(BASE, body);
  return data;
}

export async function updateLeague(
  leagueId: number,
  body: { name: string; description: string }
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
  type: "round-robin" | "knockout"
): Promise<{ message: string; totalMatches: number }> {
  const { data } = await api.post<{ message: string; totalMatches: number }>(
    `${BASE}/${leagueId}/calculate-fixture`,
    { type }
  );
  return data;
}

export async function getFixture(leagueId: number): Promise<FixtureByRound> {
  const { data } = await api.get<FixtureByRound>(`${BASE}/${leagueId}/fixture`);
  return data;
}

export function leagueLogoUrl(path: string | null | undefined): string {
  if (!path) return "";
  const base = import.meta.env.VITE_API_URL || "";
  return `${base.replace(/\/$/, "")}/uploads/${path}`;
}



export const updateMatchScore = async (
  matchId: number, 
  homeScore: number, 
  awayScore: number,
  homePenaltiesScore?: number,
  awayPenaltiesScore?: number 
) => {
  const payload: any = { 
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