import api from "@/lib/axios";
import type { Team, Player } from "@/types";

const BASE = "/teams";

function resolveMediaUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const base = process.env.EXPO_PUBLIC_API_URL || "";
  return `${base.replace(/\/$/, "")}/uploads/${value}`;
}

export async function createTeam(body: {
  name: string;
  fieldAddress?: string;
  lat?: number;
  lng?: number;
}): Promise<string> {
  const { data } = await api.post<string>(BASE, body);
  return data;
}

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

export async function findPlayer(teamId: number, emailOrUsername: string): Promise<Player> {
  const { data } = await api.post<Player>(`${BASE}/${teamId}/player/find`, { email: emailOrUsername });
  return data;
}

export async function addPlayerToTeam(teamId: number, playerId: number): Promise<string> {
  const { data } = await api.post<string>(`${BASE}/${teamId}/player`, { playerId });
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

export function avatarUrl(path: string | null | undefined): string {
  return resolveMediaUrl(path);
}

export async function updatePlayerProfile(
  teamId: number,
  body: {
    playerName?: string;
    jerseyNumber?: number;
    avatar?: { uri: string; name?: string; type?: string };
  }
): Promise<{ playerName: string | null; jerseyNumber: number | null; avatarUrl: string | null }> {
  const formData = new FormData();
  if (body.playerName != null) formData.append("playerName", body.playerName);
  if (body.jerseyNumber != null) formData.append("jerseyNumber", String(body.jerseyNumber));
  if (body.avatar) {
    formData.append("avatar", {
      uri: body.avatar.uri,
      name: body.avatar.name || "avatar.jpg",
      type: body.avatar.type || "image/jpeg",
    } as any);
  }
  const { data } = await api.patch<{ playerName: string | null; jerseyNumber: number | null; avatarUrl: string | null }>(
    `${BASE}/${teamId}/member/profile`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function updateTeam(
  teamId: number,
  body: {
    name?: string;
    lat?: number;
    lng?: number;
    fieldAddress?: string;
    logo?: { uri: string; name?: string; type?: string } | null;
  }
): Promise<string> {
  const formData = new FormData();
  if (body.name != null) formData.append('name', body.name);
  if (body.lat != null) formData.append('lat', String(body.lat));
  if (body.lng != null) formData.append('lng', String(body.lng));
  if (body.fieldAddress != null) formData.append('fieldAddress', body.fieldAddress);
  if (body.logo) {
    formData.append('logoFile', {
      uri: body.logo.uri,
      name: body.logo.name || 'logo.jpg',
      type: body.logo.type || 'image/jpeg',
    } as any);
  }

  const { data } = await api.patch<string>(`${BASE}/${teamId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
