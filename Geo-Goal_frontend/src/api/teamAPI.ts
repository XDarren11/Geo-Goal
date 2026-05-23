import api from "@/lib/axios";
import type { Team, Player, CoachDashboardSummary, PlayerDashboardSummary } from "@/types";

const BASE = "/teams";

function resolveMediaUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const base = import.meta.env.VITE_API_URL || "";
  return `${base.replace(/\/$/, "")}/uploads/${value}`;
}

export async function getMyTeams(): Promise<Team[]> {
  const { data } = await api.get<Team[]>(BASE);
  return data;
}

export async function getCoachDashboardSummary(): Promise<CoachDashboardSummary> {
  const { data } = await api.get<CoachDashboardSummary>(`${BASE}/coach/dashboard`);
  return data;
}

export async function getPlayerDashboardSummary(): Promise<PlayerDashboardSummary> {
  const { data } = await api.get<PlayerDashboardSummary>(`${BASE}/player/dashboard`);
  return data;
}

export async function getMyPlayerTeams(): Promise<Team[]> {
  const { data } = await api.get<Team[]>(`${BASE}/player/me`);
  return data;
}

export async function getTeamById(teamId: number): Promise<Team> {
  const { data } = await api.get<Team>(`${BASE}/${teamId}`);
  return data;
}

export async function createTeam(body: {
  name: string;
  lat: number;
  lng: number;
  fieldAddress: string;
  logo?: File;
}): Promise<string> {
  const formData = new FormData();
  formData.append("name", body.name);
  formData.append("lat", String(body.lat));
  formData.append("lng", String(body.lng));
  formData.append("fieldAddress", body.fieldAddress);
  if (body.logo) formData.append("logo", body.logo);
  const { data } = await api.post<string>(BASE, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function updateTeam(
  teamId: number,
  body: {
    name?: string;
    lat?: number;
    lng?: number;
    fieldAddress?: string;
    logo?: File;
  }
): Promise<string> {
  const formData = new FormData();
  if (body.name != null) formData.append("name", body.name);
  if (body.lat != null) formData.append("lat", String(body.lat));
  if (body.lng != null) formData.append("lng", String(body.lng));
  if (body.fieldAddress != null) formData.append("fieldAddress", body.fieldAddress);
  if (body.logo) formData.append("logo", body.logo);
  const { data } = await api.put<string>(`${BASE}/${teamId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteTeam(teamId: number): Promise<string> {
  const { data } = await api.delete<string>(`${BASE}/${teamId}`);
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

export async function getPlayersTeam(teamId: number): Promise<Player[]> {
  const { data } = await api.get<Player[]>(`${BASE}/${teamId}/player`);
  return data;
}

export async function removePlayerFromTeam(
  teamId: number,
  playerId: number
): Promise<string> {
  const { data } = await api.delete<string>(`${BASE}/${teamId}/player/${playerId}`);
  return data;
}

export async function updateCoachLineup(
  matchId: number,
  body: {
    startingXI: Array<Record<string, unknown>>;
    bench?: Array<Record<string, unknown>>;
    unavailable?: Array<Record<string, unknown>>;
    formation?: string;
  }
): Promise<{ message: string; data: unknown }> {
  const { data } = await api.put<{ message: string; data: unknown }>(
    `${BASE}/matches/${matchId}/lineup`,
    body
  );
  return data;
}

export function teamLogoUrl(path: string | null | undefined): string {
  return resolveMediaUrl(path);
}

export const getActiveLeagues = async () => {
  const { data } = await api.get(`${BASE}/leagues/coach/active`);
  return data;
};

export const getTeamDashboard = async (leagueId: number, teamId: number) => {
  const { data } = await api.get(`${BASE}/leagues/${leagueId}/teams/${teamId}/dashboard`);
  return data;
};

export async function updatePlayerAvatar(teamId: number, avatar: File): Promise<{ avatarUrl: string }> {
  const formData = new FormData();
  formData.append("avatar", avatar);
  const { data } = await api.patch<{ avatarUrl: string }>(
    `${BASE}/${teamId}/member/avatar`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function updatePlayerProfile(
  teamId: number,
  body: {
    playerName?: string;
    jerseyNumber?: number;
    avatar?: File;
  }
): Promise<{ playerName: string | null; jerseyNumber: number | null; avatarUrl: string | null }> {
  const formData = new FormData();
  if (body.playerName != null) formData.append("playerName", body.playerName);
  if (body.jerseyNumber != null) formData.append("jerseyNumber", String(body.jerseyNumber));
  if (body.avatar) formData.append("avatar", body.avatar);
  const { data } = await api.patch<{ playerName: string | null; jerseyNumber: number | null; avatarUrl: string | null }>(
    `${BASE}/${teamId}/member/profile`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export function avatarUrl(path: string | null | undefined): string {
  return resolveMediaUrl(path);
}

