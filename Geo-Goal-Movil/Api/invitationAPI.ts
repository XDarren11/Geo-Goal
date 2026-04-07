import api from "@/lib/axios";

export async function generateLeagueInvitation(leagueId: number, expiresIn?: number) {
  const { data } = await api.post(`/league/${leagueId}/invitation`, { expiresIn });
  return data as { code: string; expiresAt: string | null };
}

export async function joinLeagueByCode(code: string, teamId?: number) {
  const { data } = await api.post(`/league/join-by-code`, {
    code,
    ...(teamId != null ? { teamId } : {}),
  });
  return data as string;
}

export async function generateTeamInvitation(teamId: number, expiresIn?: number) {
  const { data } = await api.post(`/teams/${teamId}/invitation`, { expiresIn });
  return data as { code: string; expiresAt: string | null };
}

export async function joinTeamByCode(code: string) {
  const { data } = await api.post(`/teams/join-by-code`, { code });
  return data as string;
}
