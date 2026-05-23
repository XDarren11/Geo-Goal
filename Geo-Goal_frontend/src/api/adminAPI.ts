import api from "@/lib/axios";
import type {
  AdminDashboardSummary,
  AdminField,
  AdminUser,
  AuditLog,
  LeagueAdminAssignment,
  Match,
  Season,
  SeasonStatus,
  Team,
} from "@/types";

const BASE = "/admin";

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const { data } = await api.get<AdminDashboardSummary>(`${BASE}/dashboard`);
  return data;
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<{ data: AdminUser[] }>(`${BASE}/users`);
  return data.data ?? [];
}

export async function listUsersByLeague(leagueId: number): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>(`${BASE}/leagues/${leagueId}/users`);
  return data;
}

export async function createUser(body: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "coach" | "player" | "referee";
  confirmed?: boolean;
}): Promise<string> {
  const { data } = await api.post<string>(`${BASE}/users`, body);
  return data;
}

export async function updateUser(
  userId: number,
  body: {
    name?: string;
    email?: string;
    password?: string;
    role?: "admin" | "coach" | "player" | "referee";
    confirmed?: boolean;
  }
): Promise<string> {
  const { data } = await api.put<string>(`${BASE}/users/${userId}`, body);
  return data;
}

export async function deleteUser(userId: number): Promise<string> {
  const { data } = await api.delete<string>(`${BASE}/users/${userId}`);
  return data;
}

export async function listLeagueAdmins(leagueId: number): Promise<LeagueAdminAssignment[]> {
  const { data } = await api.get<LeagueAdminAssignment[]>(`${BASE}/leagues/${leagueId}/admins`);
  return data;
}

export async function assignLeagueAdmin(
  leagueId: number,
  body: { userId: number; leagueRole: "principal" | "assistant" }
): Promise<string> {
  const { data } = await api.post<string>(`${BASE}/leagues/${leagueId}/admins`, body);
  return data;
}

export async function updateLeagueAdminRole(
  leagueId: number,
  userId: number,
  body: { leagueRole: "principal" | "assistant" }
): Promise<string> {
  const { data } = await api.put<string>(`${BASE}/leagues/${leagueId}/admins/${userId}`, body);
  return data;
}

export async function removeLeagueAdmin(leagueId: number, userId: number): Promise<string> {
  const { data } = await api.delete<string>(`${BASE}/leagues/${leagueId}/admins/${userId}`);
  return data;
}

export async function listFields(): Promise<AdminField[]> {
  const { data } = await api.get<{ data: AdminField[] }>(`${BASE}/fields`);
  return data.data ?? [];
}

export async function getFieldById(fieldId: number): Promise<AdminField> {
  const { data } = await api.get<AdminField>(`${BASE}/fields/${fieldId}`);
  return data;
}

export async function createField(body: {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  capacity?: number;
  isActive?: boolean;
  notes?: string;
  leagueId?: number;
  teamId?: number;
}): Promise<string> {
  const { data } = await api.post<string>(`${BASE}/fields`, body);
  return data;
}

export async function updateField(
  fieldId: number,
  body: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    city?: string;
    state?: string;
    country?: string;
    capacity?: number;
    isActive?: boolean;
    notes?: string;
    leagueId?: number | null;
    teamId?: number | null;
  }
): Promise<string> {
  const { data } = await api.put<string>(`${BASE}/fields/${fieldId}`, body);
  return data;
}

export async function deleteField(fieldId: number): Promise<string> {
  const { data } = await api.delete<string>(`${BASE}/fields/${fieldId}`);
  return data;
}

export async function listSeasonsByLeague(leagueId: number): Promise<Season[]> {
  const { data } = await api.get<Season[]>(`${BASE}/leagues/${leagueId}/seasons`);
  return data;
}

export async function createSeason(
  leagueId: number,
  body: {
    name: string;
    year: number;
    startDate: string;
    endDate: string;
    status?: SeasonStatus;
    isCurrent?: boolean;
    reason?: string;
  }
): Promise<Season> {
  const { data } = await api.post<Season>(`${BASE}/leagues/${leagueId}/seasons`, body);
  return data;
}

export async function getSeasonById(seasonId: number): Promise<Season> {
  const { data } = await api.get<Season>(`${BASE}/seasons/${seasonId}`);
  return data;
}

export async function updateSeason(
  seasonId: number,
  body: {
    name?: string;
    year?: number;
    startDate?: string;
    endDate?: string;
    status?: SeasonStatus;
    isCurrent?: boolean;
    reason?: string;
  }
): Promise<Season> {
  const { data } = await api.put<Season>(`${BASE}/seasons/${seasonId}`, body);
  return data;
}

export async function changeSeasonStatus(
  seasonId: number,
  body: { status: SeasonStatus; reason?: string }
): Promise<Season> {
  const { data } = await api.patch<Season>(`${BASE}/seasons/${seasonId}/status`, body);
  return data;
}

export async function deleteSeason(seasonId: number, reason?: string): Promise<string> {
  const { data } = await api.delete<string>(`${BASE}/seasons/${seasonId}`, {
    data: reason ? { reason } : undefined,
  });
  return data;
}

export async function listAuditLogs(filters?: {
  leagueId?: number;
  seasonId?: number;
  actorUserId?: number;
  entityType?: string;
  action?: "create" | "update" | "delete" | "status_change" | "manual_fix";
  from?: string;
  to?: string;
}): Promise<AuditLog[]> {
  const { data } = await api.get<AuditLog[]>(`${BASE}/audit-logs`, {
    params: filters,
  });
  return data;
}

export async function getAuditLogById(logId: number): Promise<AuditLog> {
  const { data } = await api.get<AuditLog>(`${BASE}/audit-logs/${logId}`);
  return data;
}

// --- Friendly Matches ---

export interface FriendlyMatchListItem extends Match {
  type: "friendly";
  homeTeam?: Pick<Team, "id" | "name" | "logoUrl" | "leagueId">;
  awayTeam?: Pick<Team, "id" | "name" | "logoUrl" | "leagueId">;
  createdAt?: string;
}

export type FriendlyMatchesPaginated = {
  data: FriendlyMatchListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listFriendlyMatches(
  page = 1,
  pageSize = 50
): Promise<FriendlyMatchesPaginated> {
  const { data } = await api.get<FriendlyMatchesPaginated>(
    `${BASE}/friendly-matches`,
    { params: { page, pageSize } }
  );
  return data;
}

export async function createFriendlyMatch(body: {
  homeTeamId: number;
  awayTeamId: number;
  roundName?: string;
  date?: string;
  reason?: string;
}): Promise<{ message: string; match: Match }> {
  const { data } = await api.post<{ message: string; match: Match }>(
    `${BASE}/friendly-matches`,
    body
  );
  return data;
}

export async function deleteFriendlyMatch(
  matchId: number,
  reason?: string
): Promise<string> {
  const { data } = await api.delete<string>(
    `${BASE}/friendly-matches/${matchId}`,
    { data: reason ? { reason } : undefined }
  );
  return data;
}
