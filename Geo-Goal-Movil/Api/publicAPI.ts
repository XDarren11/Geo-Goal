import api from "@/lib/axios";
import type { MatchAnalyticsResponse, PublicMatchDetailResponse } from "@/types";

const BASE = "/public";

export async function getPublicMatchDetail(matchId: number): Promise<PublicMatchDetailResponse> {
  const { data } = await api.get<PublicMatchDetailResponse>(`${BASE}/matches/${matchId}/detail`);
  return data;
}

export async function getPublicMatchAnalytics(matchId: number): Promise<MatchAnalyticsResponse> {
  const { data } = await api.get<MatchAnalyticsResponse>(`${BASE}/matches/${matchId}/analytics`);
  return data;
}
