import api, { rawApi } from "@/lib/axios";
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
  const { data } = await rawApi.get<PublicLeagueSummary[] | { data: PublicLeagueSummary[] }>(
    `${BASE}/leagues`
  );
  if (Array.isArray(data)) return data;
  return Array.isArray((data as any)?.data) ? (data as any).data : [];
}

export async function getPublicLeagueDetail(leagueId: number): Promise<PublicLeagueDetail> {
  const { data } = await rawApi.get<PublicLeagueDetail>(`${BASE}/leagues/${leagueId}`);
  return data;
}

export async function getPublicStandings(leagueId: number): Promise<PublicStanding[]> {
  const { data } = await rawApi.get<PublicStanding[]>(`${BASE}/leagues/${leagueId}/standings`);
  return Array.isArray(data) ? data : [];
}

export async function getPublicFixture(leagueId: number): Promise<FixtureByRound> {
  const { data } = await rawApi.get<FixtureByRound>(`${BASE}/leagues/${leagueId}/fixture`);
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

export async function getPublicFixtureWithLocations(
  leagueId: number
): Promise<Array<Match & { location?: { lat: number; lng: number; fieldAddress?: string } | null }>> {
  const { data } = await rawApi.get<
    Array<Match & { location?: { lat: number; lng: number; fieldAddress?: string } | null }>
  >(`${BASE}/leagues/${leagueId}/fixture/locations`);
  return Array.isArray(data) ? data : [];
}

export async function getPublicMatchDetail(matchId: number): Promise<PublicMatchDetailResponse> {
  const { data } = await rawApi.get<PublicMatchDetailResponse>(`${BASE}/matches/${matchId}/detail`);
  return data;
}

export async function getPublicMatchAnalytics(matchId: number): Promise<MatchAnalyticsResponse> {
  const { data } = await rawApi.get<MatchAnalyticsResponse>(`${BASE}/matches/${matchId}/analytics`);
  return data;
}

export interface ExportFramesResult {
  frames: unknown[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getPublicMatchFramesExport(
  matchId: number,
  page = 1,
  pageSize = 1000
): Promise<ExportFramesResult> {
  const { data } = await rawApi.get<ExportFramesResult>(
    `${BASE}/matches/${matchId}/frames/export`,
    { params: { page, pageSize } }
  );
  return data;
}

// ── Video Analysis ──

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

export interface AnalysisFrameResponse {
  frame: string;
  width: number;
  height: number;
}

export async function uploadMatchVideo(
  matchId: number,
  videoUri: string,
  onProgress?: (pct: number) => void
): Promise<{ message: string; jobId: number; filename: string; matchId: number }> {
  const formData = new FormData();
  const filename = videoUri.split("/").pop() || "video.mp4";
  const mimeType = "video/mp4";
  formData.append("video", {
    uri: videoUri,
    name: filename,
    type: mimeType,
  } as any);
  const { data } = await api.post<{ message: string; jobId: number; filename: string; matchId: number }>(
    `${BASE}/matches/${matchId}/upload-video`,
    formData,
    {
      timeout: 600_000,
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total && onProgress) {
          onProgress(Math.round((event.loaded * 100) / event.total));
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

export async function submitAnalysisKeypoints(
  matchId: number,
  srcPts: Array<{ x: number; y: number }>
): Promise<{ message: string; jobId: number; status: string }> {
  const { data } = await api.put<{ message: string; jobId: number; status: string }>(
    `${BASE}/matches/${matchId}/analysis/keypoints`,
    { srcPts }
  );
  return data;
}

export async function getAnalysisFrame(matchId: number): Promise<AnalysisFrameResponse> {
  const { data } = await api.get<AnalysisFrameResponse>(
    `${BASE}/matches/${matchId}/analysis/frame`
  );
  return data;
}

// AI Service health
const AI_SERVICE_URL = process.env.EXPO_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

export interface AIServiceHealth {
  status: "ok" | "error";
  worker_running: boolean;
  current_job: number | null;
  poll_interval: number;
  device: string;
}

export async function getAIServiceHealth(): Promise<AIServiceHealth> {
  const res = await fetch(`${AI_SERVICE_URL}/health`);
  return res.json();
}
