import api from "@/lib/axios";
import type {
  FixtureByRound,
  Match,
  PublicLeagueDetail,
  PublicLeagueSummary,
  PublicMatchDetailResponse,
  PublicStanding,
} from "@/types";

const BASE = "/public";

export async function getPublicLeagues(): Promise<PublicLeagueSummary[]> {
  const { data } = await api.get<PublicLeagueSummary[]>(`${BASE}/leagues`);
  return Array.isArray(data) ? data : [];
}

export async function getPublicLeagueDetail(leagueId: number): Promise<PublicLeagueDetail> {
  const { data } = await api.get<PublicLeagueDetail>(`${BASE}/leagues/${leagueId}`);
  return {
    league: (data as any)?.league ?? { id: leagueId, name: "Liga", description: "" },
    currentSeason: (data as any)?.currentSeason ?? null,
    standings: Array.isArray((data as any)?.standings) ? (data as any).standings : [],
    fixture:
      (data as any)?.fixture && typeof (data as any).fixture === "object" && !Array.isArray((data as any).fixture)
        ? (data as any).fixture
        : {},
    fixtureWithLocations: Array.isArray((data as any)?.fixtureWithLocations)
      ? (data as any).fixtureWithLocations
      : [],
    teams: Array.isArray((data as any)?.teams) ? (data as any).teams : [],
    fields: Array.isArray((data as any)?.fields) ? (data as any).fields : [],
    recentMatches: Array.isArray((data as any)?.recentMatches) ? (data as any).recentMatches : [],
    seasons: Array.isArray((data as any)?.seasons) ? (data as any).seasons : [],
    news: Array.isArray((data as any)?.news) ? (data as any).news : [],
  } as PublicLeagueDetail;
}

export async function getPublicStandings(leagueId: number): Promise<PublicStanding[]> {
  const { data } = await api.get<PublicStanding[]>(`${BASE}/leagues/${leagueId}/standings`);
  return Array.isArray(data) ? data : [];
}

export async function getPublicFixture(leagueId: number): Promise<FixtureByRound> {
  const { data } = await api.get<FixtureByRound>(`${BASE}/leagues/${leagueId}/fixture`);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

export async function getPublicFixtureWithLocations(leagueId: number): Promise<Array<Match & { location?: { lat: number; lng: number; fieldAddress?: string } | null }>> {
  const { data } = await api.get<Array<Match & { location?: { lat: number; lng: number; fieldAddress?: string } | null }>>(
    `${BASE}/leagues/${leagueId}/fixture/locations`
  );
  return Array.isArray(data) ? data : [];
}

export async function getPublicMatchDetail(matchId: number): Promise<PublicMatchDetailResponse> {
  const { data } = await api.get<PublicMatchDetailResponse>(`${BASE}/matches/${matchId}/detail`);

  return {
    match: (data as any)?.match,
    detail: ((data as any)?.detail && typeof (data as any).detail === "object")
      ? (data as any).detail
      : {},
  } as PublicMatchDetailResponse;
}