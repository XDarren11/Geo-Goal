import api from "@/lib/axios";

const BASE = "/teams";
const ACCOUNT = "/account";

export async function followTeam(teamId: number): Promise<{ following: boolean; teamId: number }> {
  const { data } = await api.post(`${BASE}/${teamId}/follow`);
  return data;
}

export async function unfollowTeam(teamId: number): Promise<{ following: boolean; removed: number }> {
  const { data } = await api.delete(`${BASE}/${teamId}/follow`);
  return data;
}

export async function getFollowedTeamIds(): Promise<number[]> {
  const { data } = await api.get<number[]>(`${ACCOUNT}/followed-team-ids`);
  return Array.isArray(data) ? data : [];
}

export async function getFollowedTeams(): Promise<
  { teamId: number; team: { id: number; name: string; logoUrl?: string }; since: string }[]
> {
  const { data } = await api.get(`${ACCOUNT}/followed-teams`);
  return Array.isArray(data) ? data : [];
}

export async function registerDeviceToken(
  token: string,
  platform: "ios" | "android" | "web"
): Promise<void> {
  await api.post(`${ACCOUNT}/device-tokens`, { token, platform });
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  await api.delete(`${ACCOUNT}/device-tokens/${encodeURIComponent(token)}`);
}

