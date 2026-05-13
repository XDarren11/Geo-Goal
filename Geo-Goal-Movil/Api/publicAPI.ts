import api from "@/lib/axios";
import type {
  FixtureByRound,
  Match,
  MatchAnalyticsResponse,
  PublicLeagueDetail,
  PublicLeagueSummary,
  PublicMatchDetailResponse,
  PublicStanding,
} from "@/types";

const BASE = "/public";

export async function getPublicLeagues(): Promise<PublicLeagueSummary[]> {
  const { data } = await api.get<PublicLeagueSummary[] | { data: PublicLeagueSummary[] }>(
    `${BASE}/leagues`
  );
  if (Array.isArray(data)) return data;
  return Array.isArray((data as any)?.data) ? (data as any).data : [];
}

export async function getPublicLeagueDetail(leagueId: number): Promise<PublicLeagueDetail> {
  const { data } = await api.get<PublicLeagueDetail>(`${BASE}/leagues/${leagueId}`);
  return data;
}

export async function getPublicStandings(leagueId: number): Promise<PublicStanding[]> {
  const { data } = await api.get<PublicStanding[]>(`${BASE}/leagues/${leagueId}/standings`);
  return Array.isArray(data) ? data : [];
}

export async function getPublicFixture(leagueId: number): Promise<FixtureByRound> {
  const { data } = await api.get<FixtureByRound>(`${BASE}/leagues/${leagueId}/fixture`);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

export async function getPublicFixtureWithLocations(
  leagueId: number
): Promise<Array<Match & { location?: { lat: number; lng: number; fieldAddress?: string } | null }>> {
  const { data } = await api.get<
    Array<Match & { location?: { lat: number; lng: number; fieldAddress?: string } | null }>
  >(`${BASE}/leagues/${leagueId}/fixture/locations`);
  return Array.isArray(data) ? data : [];
}

export async function getPublicMatchDetail(matchId: number): Promise<PublicMatchDetailResponse> {
  const { data } = await api.get<PublicMatchDetailResponse>(`${BASE}/matches/${matchId}/detail`);
  return data;
}

export async function getPublicMatchAnalytics(matchId: number): Promise<MatchAnalyticsResponse> {
  const { data } = await api.get<MatchAnalyticsResponse>(`${BASE}/matches/${matchId}/analytics`);
  return data;
}
