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
  const { data } = await api.get<ExportFramesResult>(
    `${BASE}/matches/${matchId}/frames/export`,
    { params: { page, pageSize } }
  );
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

/**
 * Sube un video en 3 pasos (subida directa a Supabase):
 *   1. Pide al backend una URL firmada PUT.
 *   2. Sube el video DIRECTO a Supabase con esa URL (no pasa por el backend).
 *   3. Notifica al backend → backend crea el MatchAnalysisJob.
 *
 * En producción: el video viaja una sola vez por el wifi del admin (a Supabase),
 * en lugar de dos (admin→backend→Supabase). Backend queda libre.
 *
 * Si la primera petición falla (config Supabase incompleta), cae al upload
 * clásico multipart contra el backend (compatibilidad hacia atrás).
 */
export async function uploadMatchVideo(
  matchId: number,
  videoFile: File,
  onProgress?: (pct: number) => void
): Promise<{ message: string; jobId: number; filename: string }> {
  // --- Paso 1: pedir URL firmada ---
  let signed: { uploadUrl: string; publicUrl: string; mimetype: string } | null = null;
  try {
    const { data } = await api.post<{
      uploadUrl: string;
      publicUrl: string;
      key: string;
      mimetype: string;
      expiresIn: number;
    }>(`${BASE}/matches/${matchId}/upload-video/signed-url`, {
      filename: videoFile.name,
      mimetype: videoFile.type || "video/mp4",
      sizeBytes: videoFile.size,
    });
    signed = data;
  } catch (err) {
    console.warn("[upload] signed-url no disponible, usando fallback al backend:", err);
  }

  if (signed) {
    // --- Paso 2: PUT directo a Supabase (no pasa por el backend) ---
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed!.uploadUrl, true);
      xhr.setRequestHeader("Content-Type", signed!.mimetype);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Supabase respondió ${xhr.status}: ${xhr.responseText?.slice(0, 200) ?? ""}`));
      };
      xhr.onerror = () => reject(new Error("Error de red al subir a Supabase"));
      xhr.send(videoFile);
    });

    // --- Paso 3: confirmar al backend ---
    const { data } = await api.post<{ message: string; jobId: number; videoSupabaseUrl: string }>(
      `${BASE}/matches/${matchId}/upload-video/complete`,
      { publicUrl: signed.publicUrl, filename: videoFile.name }
    );
    return { message: data.message, jobId: data.jobId, filename: videoFile.name };
  }

  // --- Fallback: subida clásica multipart contra el backend ---
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
  payload: {
    srcPts: Array<{ x: number; y: number }>;
    playerTags?: PlayerTag[];
    identityMap?: Record<number, number>;
  }
): Promise<{ message: string; jobId: number; status: string }> {
  const { data } = await api.put<{ message: string; jobId: number; status: string }>(
    `${BASE}/matches/${matchId}/analysis/keypoints`,
    payload
  );
  return data;
}

export interface PreviewDetection {
  tracker_id: number;
  x_m: number;
  y_m: number;
  px: number;
  py: number;
  team: "home" | "away" | "referee" | "unknown";
  bbox: number[];
}

export interface PreviewBall {
  x_m: number;
  y_m: number;
  px: number;
  py: number;
}

export interface PreviewResponse {
  homography_ok: boolean;
  src_pts: Array<{ x: number; y: number }>;
  players: PreviewDetection[];
  ball: PreviewBall | null;
  pitch: { length_m: number; width_m: number };
  frame_dims: { width: number; height: number };
  error?: string | null;
}

export async function postAnalysisPreview(
  matchId: number,
  payload: {
    frameBase64: string;
    srcPts: Array<{ x: number; y: number }>;
    detectPitch?: boolean;
  }
): Promise<PreviewResponse> {
  const { data } = await api.post<PreviewResponse>(
    `${BASE}/matches/${matchId}/analysis/preview`,
    payload
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


export const getTopScorers = async (leagueId: number) => {
  const { data } = await api.get(`${BASE}/${leagueId}/top-scorers`);
  return data;
};

// ── Análisis avanzado de tracking (Fase 2) ────────────────────────────────

export interface SpeedMetrics {
  avgSpeed: number;
  maxSpeed: number;
  sprintCount: number;
  accelerationCount: number;
  distanceM: number;
}

export interface ZoneMetrics { def: number; mid: number; att: number }

export interface PassNetworkNode {
  playerId: number;
  teamId: number;
  degree: number;
  pageRank: number;
  avgX: number;
  avgY: number;
}

export interface PassNetworkEdge { from: number; to: number; count: number }

export interface TrackingAnalytics {
  speeds: Record<string, SpeedMetrics>;
  zones: Record<string, ZoneMetrics>;
  heatmaps: Record<string, number[][]>;
  passNetwork: { nodes: PassNetworkNode[]; edges: PassNetworkEdge[] };
  possession: { home: number; away: number; homeTeamId: number; awayTeamId: number };
  convexHull: { home: number; away: number };
  defensiveLine: { home: number; away: number };
  observedFormation: { home: string; away: string };
  meta: { framesProcessed: number; homeTeamId: number; awayTeamId: number; computedAt: string };
}

export async function getAdvancedAnalytics(matchId: number): Promise<TrackingAnalytics> {
  const { data } = await api.get<TrackingAnalytics>(
    `${BASE}/matches/${matchId}/analytics/advanced`
  );
  return data;
}
