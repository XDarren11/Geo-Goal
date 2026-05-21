import api from "@/lib/axios";
import type {
  FixtureByRound,
  Match,
  PublicLeagueDetail,
  PublicLeagueSummary,
  PublicMatchDetailResponse,
  PublicNewsItem,
  PublicStanding,
  MatchAnalyticsResponse,
} from "@/types";

const BASE = "/public";

interface PaginatedLeaguesResponse {
  data: PublicLeagueSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getPublicLeagues(): Promise<PublicLeagueSummary[]> {
  const { data } = await api.get<PublicLeagueSummary[] | PaginatedLeaguesResponse>(`${BASE}/leagues`);
  if (Array.isArray(data)) return data;
  return Array.isArray((data as PaginatedLeaguesResponse)?.data) ? (data as PaginatedLeaguesResponse).data : [];
}

export async function getPublicNews(limit = 12): Promise<PublicNewsItem[]> {
  const { data } = await api.get<PublicNewsItem[]>(`${BASE}/news`, { params: { limit } });
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
  // Axios ya hace el trabajo duro de convertir el JSON en un objeto de JS
  const { data } = await api.get<PublicMatchDetailResponse>(`${BASE}/matches/${matchId}/detail`);
  
  // Confiamos ciegamente en lo que manda el backend (igualito que en Postman)
  return data;
}

export async function getPublicMatchAnalytics(matchId: number): Promise<MatchAnalyticsResponse> {
  const { data } = await api.get<MatchAnalyticsResponse>(`${BASE}/matches/${matchId}/analytics`);
  return data;
}

export interface AnalysisStatusResponse {
  status: "none" | "uploaded" | "annotating" | "queued" | "processing" | "completed" | "failed";
  jobId?: number;
  progress?: number;
  currentStep?: string;
  framesProcessed?: number;
  totalFrames?: number;
  error?: string;
  videoSupabaseUrl?: string | null;
  pid?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

// AI Service health check
const AI_SERVICE_URL = (import.meta.env.VITE_AI_SERVICE_URL as string | undefined)?.trim() || "http://localhost:8000";

export interface AIServiceHealth {
  status: "ok" | "error";
  worker_running: boolean;
  current_job: number | null;
  poll_interval: number;
  device: string;
}

export async function getAIServiceHealth(): Promise<AIServiceHealth> {
  const { data } = await fetch(`${AI_SERVICE_URL}/health`).then(r => r.json());
  return data;
}

export async function uploadMatchVideo(
  matchId: number,
  videoFile: File,
  onProgress?: (pct: number) => void
): Promise<{ message: string; jobId: number; filename: string }> {
  const formData = new FormData();
  formData.append("video", videoFile);
  const { data } = await api.post<{ message: string; jobId: number; filename: string }>(
    `${BASE}/matches/${matchId}/upload-video`,
    formData,
    {
      timeout: 300_000,
      onUploadProgress: (event) => {
        const total = event.total ?? videoFile.size;
        if (total && onProgress) {
          onProgress(Math.round((event.loaded * 100) / total));
        }
      },
    }
  );
  return data;
}

export async function getAnalysisStatus(matchId: number): Promise<AnalysisStatusResponse> {
  const { data } = await api.get<AnalysisStatusResponse>(
    `${BASE}/matches/${matchId}/analysis/status`
  );
  return data;
}

export interface PlayerTag {
  x: number;
  y: number;
  label: "home" | "away" | "ball";
}

export async function submitAnalysisKeypoints(
  matchId: number,
  srcPts: Array<{ x: number; y: number }>,
  playerTags?: PlayerTag[]
): Promise<{ message: string; jobId: number; status: string }> {
  const { data } = await api.put<{ message: string; jobId: number; status: string }>(
    `${BASE}/matches/${matchId}/analysis/keypoints`,
    { srcPts, playerTags }
  );
  return data;
}

export interface AnalysisFrameResponse {
  frame: string;
  width: number;
  height: number;
}

export async function getAnalysisFrame(matchId: number): Promise<AnalysisFrameResponse> {
  const { data } = await api.get<AnalysisFrameResponse>(
    `${BASE}/matches/${matchId}/analysis/frame`
  );
  return data;
}