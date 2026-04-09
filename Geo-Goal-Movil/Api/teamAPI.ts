import api from "@/lib/axios";
import type { Team, Player } from "@/types";

const BASE = "/teams";

export async function getMyTeams(): Promise<Team[]> {
  const { data } = await api.get<Team[]>(BASE);
  return data;
}

export async function getCoachDashboardSummary(): Promise<any> {
  const { data } = await api.get(`${BASE}/coach/dashboard`);
  return data;
}

export async function getPlayerDashboardSummary(): Promise<any> {
  const { data } = await api.get(`${BASE}/player/dashboard`);
  return data;
}

export async function getMyPlayerTeams(): Promise<Team[]> {
  const { data } = await api.get<Team[]>(`${BASE}/player/me`);
  return data;
}

export async function getActiveLeagues() {
  const { data } = await api.get(`${BASE}/leagues/coach/active`);
  return data;
}

export async function getTeamById(teamId: number): Promise<Team> {
  const { data } = await api.get<Team>(`${BASE}/${teamId}`);
  return data;
}

export async function getPlayersTeam(teamId: number): Promise<Player[]> {
  const { data } = await api.get<Player[]>(`${BASE}/${teamId}/player`);
  return data;
}

export async function findPlayer(teamId: number, email: string): Promise<Player> {
  const { data } = await api.post<Player>(`${BASE}/${teamId}/player/find`, { email });
  return data;
}

export async function addPlayerToTeam(teamId: number, playerId: number): Promise<string> {
  const { data } = await api.post<string>(`${BASE}/${teamId}/player`, { playerId });
  return data;
}

export function teamLogoUrl(path: string | null | undefined): string {
  if (!path) return "";
  const base = process.env.EXPO_PUBLIC_API_URL || "";
  return `${base.replace(/\/$/, "")}/uploads/${path}`;
}
