import api from "@/lib/axios";
import type { League, Team, FixtureByRound, Match } from "@/types";

const BASE = "/league";

export async function getLeagues(): Promise<League[]> {
  const { data } = await api.get<League[]>(BASE);
  return data;
}

export async function getLeagueById(leagueId: number): Promise<League & { teams: Team[] }> {
  const { data } = await api.get<League & { teams: Team[] }>(`${BASE}/${leagueId}`);
  return data;
}

export async function getTeamsLeague(leagueId: number): Promise<League & { teams: Team[] }> {
  const { data } = await api.get<League & { teams: Team[] }>(`${BASE}/${leagueId}/teams`);
  return data;
}

export async function getFixture(leagueId: number): Promise<FixtureByRound> {
  const { data } = await api.get<FixtureByRound>(`${BASE}/${leagueId}/fixture`);
  return data;
}

export async function getStandings(leagueId: number) {
  const { data } = await api.get(`${BASE}/${leagueId}/standings`);
  return data;
}

export async function getLeagueMatches(leagueId: number): Promise<FixtureByRound | Match[]> {
  const { data } = await api.get(`${BASE}/${leagueId}/matches`);
  return data;
}

export async function updateMatchSchedule(matchId: number, date: string) {
  const { data } = await api.patch(`${BASE}/matches/${matchId}/schedule`, { date });
  return data;
}

export function leagueLogoUrl(path: string | null | undefined): string {
  if (!path) return "";
  const base = process.env.EXPO_PUBLIC_API_URL || "";
  return `${base.replace(/\/$/, "")}/uploads/${path}`;
}

// 👇👇👇 ¡AQUÍ ESTÁ LA MAGIA NUEVA PARA CREAR LIGAS! 👇👇👇
export async function createLeague(body: { name: string; description: string }): Promise<string> {
  const { data } = await api.post<string>(BASE, body);
  return data;
}