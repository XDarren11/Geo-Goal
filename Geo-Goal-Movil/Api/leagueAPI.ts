import api from "@/lib/axios";
import type { League, Team, FixtureByRound, Match } from "@/types";

const BASE = "/league";

function resolveMediaUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const base = process.env.EXPO_PUBLIC_API_URL || "";
  return `${base.replace(/\/$/, "")}/uploads/${value}`;
}

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
  return resolveMediaUrl(path);
}

export async function createLeague(body: { name: string; description: string; lineupMode: 7 | 11 }): Promise<string> {
  const { data } = await api.post<string>(BASE, body);
  return data;
}

export async function updateLeague(
  leagueId: number,
  body: { name?: string; description?: string | null; lineupMode?: 7 | 11; logo?: { uri: string; name?: string; type?: string } | null }
): Promise<string> {
  const formData = new FormData();
  if (body.name != null) formData.append('name', body.name);
  if (body.description != null) formData.append('description', body.description);
  if (body.lineupMode != null) formData.append('lineupMode', String(body.lineupMode));
  if (body.logo) {
    formData.append('logoFile', {
      uri: body.logo.uri,
      name: body.logo.name || 'logo.jpg',
      type: body.logo.type || 'image/jpeg',
    } as any);
  }
  const { data } = await api.patch<string>(`${BASE}/${leagueId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}