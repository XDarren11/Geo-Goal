import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicMatchAnalytics, getPublicMatchDetail, uploadMatchVideo, getAnalysisStatus, submitAnalysisKeypoints, postAnalysisPreview, getPublicMatchFramesExport, type AnalysisStatusResponse, type PreviewResponse, getAIServiceHealth, type AIServiceHealth, type PlayerTag } from "@/api/publicAPI";
import { PitchPreview2D } from "@/components/Pitch/PitchPreview2D";
import type { MatchDetailLineupEntry, MatchSquadPlayerView} from "@/types";
import { ArrowLeftIcon, ClockIcon, CalendarDaysIcon, MapPinIcon, UserGroupIcon, VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { LiveRouteMap } from "@/views/Maps/LiveRouteMap";
import { useAuth } from "@/hooks/useAuth";
import { getPlayersTeam, updateCoachLineup } from "@/api/teamAPI";

type Side = "home" | "away";
type MatchViewMode = "normal" | "pro";

type Incident = {
  yellow: number;
  red: number;
  subOut: number;
  subIn: number;
};

const BASE_SPOTS = [
  { x: 8, y: 50 },
  { x: 20, y: 20 },
  { x: 20, y: 40 },
  { x: 20, y: 60 },
  { x: 20, y: 80 },
  { x: 36, y: 18 },
  { x: 36, y: 38 },
  { x: 36, y: 62 },
  { x: 36, y: 82 },
  { x: 48, y: 35 },
  { x: 48, y: 65 },
];

const FORMATIONS_11_FRONTEND = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '5-4-1', '3-4-3', '4-5-1', '4-3-2-1'];
const FORMATIONS_7_FRONTEND = ['2-3-1', '3-2-1', '2-1-3', '2-2-2', '3-1-2', '1-3-2'];

type FormationDef = {
  name: string;
  spots: Array<{ x: number; y: number }>;
};

const FORMATIONS_11: FormationDef[] = [
  { name: '4-4-2', spots: [
    { x: 6, y: 50 },
    { x: 22, y: 20 }, { x: 22, y: 40 }, { x: 22, y: 60 }, { x: 22, y: 80 },
    { x: 45, y: 22 }, { x: 45, y: 40 }, { x: 45, y: 60 }, { x: 45, y: 78 },
    { x: 70, y: 35 }, { x: 70, y: 65 },
  ]},
  { name: '4-3-3', spots: [
    { x: 6, y: 50 },
    { x: 22, y: 20 }, { x: 22, y: 40 }, { x: 22, y: 60 }, { x: 22, y: 80 },
    { x: 45, y: 30 }, { x: 45, y: 50 }, { x: 45, y: 70 },
    { x: 72, y: 22 }, { x: 72, y: 50 }, { x: 72, y: 78 },
  ]},
  { name: '4-2-3-1', spots: [
    { x: 6, y: 50 },
    { x: 22, y: 20 }, { x: 22, y: 40 }, { x: 22, y: 60 }, { x: 22, y: 80 },
    { x: 42, y: 35 }, { x: 42, y: 65 },
    { x: 58, y: 24 }, { x: 58, y: 50 }, { x: 58, y: 76 },
    { x: 78, y: 50 },
  ]},
  { name: '3-5-2', spots: [
    { x: 6, y: 50 },
    { x: 22, y: 30 }, { x: 22, y: 50 }, { x: 22, y: 70 },
    { x: 42, y: 15 }, { x: 42, y: 32 }, { x: 42, y: 50 }, { x: 42, y: 68 }, { x: 42, y: 85 },
    { x: 72, y: 35 }, { x: 72, y: 65 },
  ]},
  { name: '5-4-1', spots: [
    { x: 6, y: 50 },
    { x: 18, y: 15 }, { x: 18, y: 32 }, { x: 18, y: 50 }, { x: 18, y: 68 }, { x: 18, y: 85 },
    { x: 42, y: 22 }, { x: 42, y: 40 }, { x: 42, y: 60 }, { x: 42, y: 78 },
    { x: 75, y: 50 },
  ]},
  { name: '3-4-3', spots: [
    { x: 6, y: 50 },
    { x: 22, y: 30 }, { x: 22, y: 50 }, { x: 22, y: 70 },
    { x: 45, y: 20 }, { x: 45, y: 40 }, { x: 45, y: 60 }, { x: 45, y: 80 },
    { x: 72, y: 24 }, { x: 72, y: 50 }, { x: 72, y: 76 },
  ]},
  { name: '4-5-1', spots: [
    { x: 6, y: 50 },
    { x: 22, y: 20 }, { x: 22, y: 40 }, { x: 22, y: 60 }, { x: 22, y: 80 },
    { x: 42, y: 15 }, { x: 42, y: 32 }, { x: 42, y: 50 }, { x: 42, y: 68 }, { x: 42, y: 85 },
    { x: 75, y: 50 },
  ]},
  { name: '4-3-2-1', spots: [
    { x: 6, y: 50 },
    { x: 20, y: 20 }, { x: 20, y: 40 }, { x: 20, y: 60 }, { x: 20, y: 80 },
    { x: 38, y: 30 }, { x: 38, y: 50 }, { x: 38, y: 70 },
    { x: 56, y: 35 }, { x: 56, y: 65 },
    { x: 78, y: 50 },
  ]},
];

const FORMATIONS_7: FormationDef[] = [
  { name: '2-3-1', spots: [
    { x: 8, y: 50 },
    { x: 26, y: 33 }, { x: 26, y: 67 },
    { x: 52, y: 20 }, { x: 52, y: 50 }, { x: 52, y: 80 },
    { x: 78, y: 50 },
  ]},
  { name: '3-2-1', spots: [
    { x: 8, y: 50 },
    { x: 26, y: 22 }, { x: 26, y: 50 }, { x: 26, y: 78 },
    { x: 52, y: 35 }, { x: 52, y: 65 },
    { x: 78, y: 50 },
  ]},
  { name: '2-1-3', spots: [
    { x: 8, y: 50 },
    { x: 26, y: 33 }, { x: 26, y: 67 },
    { x: 50, y: 50 },
    { x: 74, y: 24 }, { x: 74, y: 50 }, { x: 74, y: 76 },
  ]},
  { name: '2-2-2', spots: [
    { x: 8, y: 50 },
    { x: 26, y: 33 }, { x: 26, y: 67 },
    { x: 48, y: 33 }, { x: 48, y: 67 },
    { x: 74, y: 35 }, { x: 74, y: 65 },
  ]},
  { name: '3-1-2', spots: [
    { x: 8, y: 50 },
    { x: 26, y: 22 }, { x: 26, y: 50 }, { x: 26, y: 78 },
    { x: 50, y: 50 },
    { x: 74, y: 35 }, { x: 74, y: 65 },
  ]},
  { name: '1-3-2', spots: [
    { x: 8, y: 50 },
    { x: 26, y: 50 },
    { x: 48, y: 20 }, { x: 48, y: 50 }, { x: 48, y: 80 },
    { x: 74, y: 35 }, { x: 74, y: 65 },
  ]},
];

function getFormationSpots(formation: string | null | undefined, lineupMode: 7 | 11): Array<{ x: number; y: number }> {
  const list = lineupMode === 7 ? FORMATIONS_7 : FORMATIONS_11;
  const found = list.find((f) => f.name === formation);
  return found?.spots ?? BASE_SPOTS;
}

/**
 * Auto-asignación heurística: mapea cada detección al jugador de la formación
 * más cercano del mismo equipo.
 *
 * Corrección vs plan original: el radio de búsqueda es dinámico (15% del largo
 * de la cancha) en lugar de 25m fijos, para que funcione en canchas pequeñas
 * (ej. fútbol 7 en cancha de 50m → radio ~7.5m) y estándar (105m → ~15.75m).
 */
import type { PreviewResponse as _PR } from "@/api/publicAPI";
function autoAssignByFormation(
  preview: _PR,
  homeStarters: any[],
  awayStarters: any[],
  homeFormation: string | null | undefined,
  awayFormation: string | null | undefined,
  lineupMode: 7 | 11,
): Record<number, number> {
  const result: Record<number, number> = {};

  // Radio dinámico: 15% del largo de cancha (cuadrado para comparar con dist²)
  const radiusM = preview.pitch.length_m * 0.15;
  const radiusSq = radiusM * radiusM;

  const buildExpected = (starters: any[], formation: string | null | undefined, side: "home" | "away") => {
    const spots = getFormationSpots(formation, lineupMode);
    return starters.slice(0, spots.length).map((p, idx) => {
      const base = spots[idx];
      // Misma lógica de flip que MatchPitchPanel: visitante refleja en X
      const xPct = side === "home" ? base.x : 100 - base.x;
      return {
        userId: p.userId as number | undefined,
        x_m: (xPct / 100) * preview.pitch.length_m,
        y_m: (base.y / 100) * preview.pitch.width_m,
        side,
      };
    });
  };

  const expected = [
    ...buildExpected(homeStarters, homeFormation, "home"),
    ...buildExpected(awayStarters, awayFormation, "away"),
  ];

  const usedDetections = new Set<number>();
  const usedUsers = new Set<number>();

  for (const exp of expected) {
    if (!exp.userId || usedUsers.has(exp.userId)) continue;
    let bestId = -1;
    let bestDist = Infinity;
    for (const d of preview.players) {
      if (usedDetections.has(d.tracker_id)) continue;
      if (d.team !== exp.side) continue;
      const dx = d.x_m - exp.x_m;
      const dy = d.y_m - exp.y_m;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestId = d.tracker_id;
      }
    }
    // Solo asignar si la detección más cercana está dentro del radio dinámico
    if (bestId >= 0 && bestDist < radiusSq) {
      result[bestId] = exp.userId;
      usedDetections.add(bestId);
      usedUsers.add(exp.userId);
    }
  }

  return result;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function resolveLiveState(input: {
  played?: boolean;
  kickoff?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
}) {
  if (input.played) return "finished" as const;

  const now = Date.now();
  const kickoffRaw = input.kickoff ? new Date(input.kickoff).getTime() : Number.NaN;
  const endRaw = input.endTime ? new Date(input.endTime).getTime() : Number.NaN;
  const hasKickoff = Number.isFinite(kickoffRaw);
  const hasEnd = Number.isFinite(endRaw);
  const durationMs = Math.max(60, input.durationMinutes ?? 90) * 60_000;

  if (hasEnd && now >= endRaw) return "finished" as const;
  if (hasKickoff && now >= kickoffRaw && now <= kickoffRaw + durationMs + 20 * 60_000) return "live" as const;
  if (hasKickoff && now < kickoffRaw) return "upcoming" as const;
  return "unknown" as const;
}

function eventVisual(eventType: string) {
  const type = eventType.toLowerCase();
  if (type === "goal" || type === "own_goal" || type === "penalty_scored") {
    return { icon: "GOAL", color: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300" };
  }
  if (type === "yellow_card") {
    return { icon: "YC", color: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300" };
  }
  if (type === "red_card") {
    return { icon: "RC", color: "border-red-500/40 bg-red-500/15 text-red-300" };
  }
  if (type === "substitution") {
    return { icon: "SUB", color: "border-blue-500/40 bg-blue-500/15 text-blue-300" };
  }
  return { icon: "EV", color: "border-white/20 bg-white/[0.06] text-[var(--geo-text)]" };
}

function eventLabel(eventType: string) {
  const map: Record<string, string> = {
    goal: "Gol",
    own_goal: "Autogol",
    penalty_scored: "Penal anotado",
    penalty_missed: "Penal fallado",
    yellow_card: "Tarjeta amarilla",
    red_card: "Tarjeta roja",
    substitution: "Cambio",
    foul: "Falta",
    offside: "Fuera de juego",
    var_review: "Revision VAR",
    pass: "Pase",
    key_pass: "Pase clave",
    shot: "Disparo",
  };
  return map[eventType] ?? eventType;
}

function listLabel(player: MatchDetailLineupEntry, index: number) {
  const name = typeof player.name === "string" && player.name.trim().length > 0
    ? player.name
    : `Jugador ${index + 1}`;
  const number = typeof player.number === "number" ? `#${player.number}` : "";
  const position = typeof player.position === "string" && player.position.trim().length > 0
    ? `(${player.position})`
    : "";
  return [number, name, position].filter(Boolean).join(" ").trim();
}

function listLabelStructured(player: MatchSquadPlayerView, index: number) {
  const name = typeof player.name === "string" && player.name.trim().length > 0
    ? player.name
    : `Jugador ${index + 1}`;
  const number = typeof player.jerseyNumber === "number" ? `#${player.jerseyNumber}` : "";
  const position = typeof player.position === "string" && player.position.trim().length > 0
    ? `(${player.position})`
    : "";
  return [number, name, position].filter(Boolean).join(" ").trim();
}

function normalizeLineup(starters?: MatchDetailLineupEntry[]) {
  const rows = Array.isArray(starters) ? starters : [];
  return rows.slice(0, 11).map((p, idx) => ({
    idx,
    userId: typeof p.userId === "number" ? p.userId : undefined,
    name:
      typeof p.name === "string" && p.name.trim().length > 0
        ? p.name
        : `Jugador ${idx + 1}`,
    number: typeof p.number === "number" ? p.number : undefined,
    position: typeof p.position === "string" ? p.position : undefined,
  }));
}

function buildIncidentMap(
  analytics: Awaited<ReturnType<typeof getPublicMatchAnalytics>> | undefined
) {
  const map = new Map<number, Incident>();
  const events = analytics?.timelineEvents ?? [];

  const getOrInit = (playerId: number) => {
    if (!map.has(playerId)) {
      map.set(playerId, { yellow: 0, red: 0, subOut: 0, subIn: 0 });
    }
    return map.get(playerId)!;
  };

  for (const ev of events) {
    if (typeof ev.playerId === "number") {
      const item = getOrInit(ev.playerId);
      if (ev.eventType === "yellow_card") item.yellow += 1;
      if (ev.eventType === "red_card") item.red += 1;
      if (ev.eventType === "substitution") item.subOut += 1;
    }
    if (ev.eventType === "substitution" && typeof ev.relatedPlayerId === "number") {
      const inItem = getOrInit(ev.relatedPlayerId);
      inItem.subIn += 1;
    }
  }

  return map;
}

function TacticalPitch({
  matchId,
  homeStarters,
  awayStarters,
  homeName,
  awayName,
  analytics,
  homeFormation,
  awayFormation,
}: {
  matchId: number;
  homeStarters?: MatchDetailLineupEntry[];
  awayStarters?: MatchDetailLineupEntry[];
  homeName: string;
  awayName: string;
  analytics: Awaited<ReturnType<typeof getPublicMatchAnalytics>> | undefined;
  homeFormation?: string | null;
  awayFormation?: string | null;
}) {
  const PAGE_SIZE = 500;
  const totalFrames = analytics?.summary?.totalFrames ?? 0;
  const legacyFrames = analytics?.trackingFrames ?? [];
  const useLegacyMode = totalFrames > 0 && totalFrames <= legacyFrames.length;

  const home = normalizeLineup(homeStarters);
  const away = normalizeLineup(awayStarters);
  const lineupMode: 7 | 11 = home.length === 7 || away.length === 7 ? 7 : 11;
  const incidents = buildIncidentMap(analytics);

  const maxIndex = Math.max(0, totalFrames - 1);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [density, setDensity] = useState(1);

  useEffect(() => {
    setFrameIndex(maxIndex);
    setIsPlaying(false);
  }, [totalFrames]);

  // ---- Paginated frame loading (sliding window) ----
  const currentPage = useMemo(
    () => Math.floor(frameIndex / PAGE_SIZE) + 1,
    [frameIndex],
  );
  const maxPage = Math.max(1, Math.ceil(totalFrames / PAGE_SIZE));

  const { data: pageData, isFetching: pageLoading } = useQuery({
    queryKey: ["frames-tactical", matchId, currentPage],
    queryFn: () => getPublicMatchFramesExport(matchId, currentPage, PAGE_SIZE),
    enabled: !useLegacyMode && totalFrames > 0,
    staleTime: 120_000,
  });

  // Prefetch next page for smooth forward scrubbing
  useQuery({
    queryKey: ["frames-tactical", matchId, currentPage + 1],
    queryFn: () => getPublicMatchFramesExport(matchId, currentPage + 1, PAGE_SIZE),
    enabled: !useLegacyMode && totalFrames > 0 && currentPage < maxPage,
    staleTime: 120_000,
  });

  // Prefetch previous page for smooth backward scrubbing
  useQuery({
    queryKey: ["frames-tactical", matchId, currentPage - 1],
    queryFn: () => getPublicMatchFramesExport(matchId, currentPage - 1, PAGE_SIZE),
    enabled: !useLegacyMode && totalFrames > 0 && currentPage > 1,
    staleTime: 120_000,
  });

  const currentFrame = useMemo(() => {
    if (useLegacyMode) {
      return legacyFrames.length > 0
        ? legacyFrames[Math.min(frameIndex, legacyFrames.length - 1)]
        : null;
    }
    if (!pageData?.frames?.length) return null;
    const localIndex = frameIndex - (currentPage - 1) * PAGE_SIZE;
    return (pageData.frames[localIndex] ?? null) as typeof legacyFrames[0] | null;
  }, [useLegacyMode, legacyFrames, frameIndex, pageData, currentPage]);

  // ---- Playback ----
  useEffect(() => {
    if (!isPlaying || maxIndex <= 0) return;
    const timer = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + density;
        return next > maxIndex ? 0 : next;
      });
    }, 650);
    return () => clearInterval(timer);
  }, [isPlaying, maxIndex, density]);

  // ---- Time helpers ----
  const ESTIMATED_FPS = 10;
  const currentTimeMs = currentFrame?.timestampMs ?? frameIndex * (1000 / ESTIMATED_FPS);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const jumpByTime = (seconds: number) => {
    setFrameIndex((prev) =>
      Math.max(0, Math.min(maxIndex, prev + Math.round(seconds * ESTIMATED_FPS))),
    );
  };

  // ---- Player position calculations ----
  const homeIds = useMemo(() => new Set(home.map((p) => p.userId).filter((id): id is number => typeof id === "number")), [home]);
  const awayIds = useMemo(() => new Set(away.map((p) => p.userId).filter((id): id is number => typeof id === "number")), [away]);

  const trackedPlayers = useMemo(() => {
    if (!currentFrame || !Array.isArray(currentFrame.players)) return [] as Array<{ userId: number | null; x: number; y: number; side: Side | "neutral" }>;

    const toNumber = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    return (currentFrame.players as Array<Record<string, unknown>>)
      .map((row) => {
        const userId = toNumber(row.userId ?? row.playerId);
        const x = toNumber(row.x);
        const y = toNumber(row.y);
        if (x == null || y == null) return null;

        let side: Side | "neutral" = "neutral";
        if (userId != null && homeIds.has(userId)) side = "home";
        else if (userId != null && awayIds.has(userId)) side = "away";

        return {
          userId,
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
          side,
        };
      })
      .filter((v): v is { userId: number | null; x: number; y: number; side: Side | "neutral" } => v != null);
  }, [currentFrame, homeIds, awayIds]);

  const trackedPositionByPlayerId = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    trackedPlayers.forEach((tp) => {
      if (typeof tp.userId === "number" && !map.has(tp.userId)) {
        map.set(tp.userId, { x: tp.x, y: tp.y });
      }
    });
    return map;
  }, [trackedPlayers]);

  const toSpot = (idx: number, side: Side) => {
    const formation = side === "home" ? homeFormation : awayFormation;
    const spots = getFormationSpots(formation, lineupMode);
    const base = spots[Math.min(idx, spots.length - 1)] ?? spots[0];
    if (side === "home") return base;
    return { x: 100 - base.x, y: base.y };
  };

  const densityOptions = [1, 5, 10, 30];

  return (
    <div className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-black text-[var(--geo-text)]">Vista táctica del partido</h2>
        <div className="text-xs text-[var(--geo-text-muted)]">
          {totalFrames > 0
            ? `${totalFrames.toLocaleString()} frames`
            : "Sin datos de tracking"}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-emerald-400/40 bg-gradient-to-b from-emerald-800/70 to-emerald-900/80 p-3">
        {/* Controls */}
        <div className="mb-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-center">
            <input
              type="range"
              min={0}
              max={Math.max(0, maxIndex)}
              value={Math.min(frameIndex, maxIndex)}
              onChange={(e) => setFrameIndex(Number(e.target.value))}
              disabled={maxIndex <= 0}
              className="w-full accent-emerald-400"
            />
            <p className="text-right text-xs tabular-nums text-emerald-100/90 min-w-[160px]">
              {currentFrame
                ? `Frame ${frameIndex + 1}/${totalFrames} · ${formatTime(currentTimeMs)} · ${currentFrame.period ?? "—"}`
                : pageLoading
                  ? "Cargando…"
                  : maxIndex > 0
                    ? "Moviendo…"
                    : "Sin tracking"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => jumpByTime(-30)}
                disabled={maxIndex <= 0}
                className="rounded bg-black/30 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-30 hover:bg-black/50"
                title="Retroceder 30s"
              >
                -30s
              </button>
              <button
                type="button"
                onClick={() => jumpByTime(-10)}
                disabled={maxIndex <= 0}
                className="rounded bg-black/30 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-30 hover:bg-black/50"
                title="Retroceder 10s"
              >
                -10s
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                disabled={maxIndex <= 0}
                className="rounded bg-black/30 px-3 py-1 text-xs font-bold text-white disabled:opacity-50 hover:bg-black/50"
              >
                {isPlaying ? "Pausar" : "Reproducir"}
              </button>
              <button
                type="button"
                onClick={() => jumpByTime(10)}
                disabled={maxIndex <= 0}
                className="rounded bg-black/30 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-30 hover:bg-black/50"
                title="Avanzar 10s"
              >
                +10s
              </button>
              <button
                type="button"
                onClick={() => jumpByTime(30)}
                disabled={maxIndex <= 0}
                className="rounded bg-black/30 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-30 hover:bg-black/50"
                title="Avanzar 30s"
              >
                +30s
              </button>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[var(--geo-text-muted)]">Saltar:</span>
              {densityOptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  disabled={maxIndex <= 0}
                  className={`rounded px-2 py-1 text-[10px] font-bold transition ${
                    density === d
                      ? "bg-geo-green text-black"
                      : "bg-black/30 text-white hover:bg-black/50"
                  } disabled:opacity-30`}
                >
                  {d}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pitch */}
        <div className="relative h-[560px] w-full rounded-lg border border-white/30">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/40" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
          <div className="absolute left-0 top-1/2 h-40 w-16 -translate-y-1/2 border border-white/40 border-l-0" />
          <div className="absolute right-0 top-1/2 h-40 w-16 -translate-y-1/2 border border-white/40 border-r-0" />

          {/* Loading overlay while fetching page */}
          {pageLoading && !currentFrame && maxIndex > 0 ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
              <div className="flex items-center gap-2 rounded-lg bg-black/60 px-4 py-2 text-sm text-white">
                <div className="h-4 w-4 border-2 border-geo-green border-t-transparent rounded-full animate-spin" />
                Cargando frames…
              </div>
            </div>
          ) : null}

          <div className="absolute left-3 top-2 flex items-center gap-2">
            <span className="rounded bg-black/30 px-2 py-1 text-xs font-bold text-emerald-200">
              {homeName}
            </span>
            {homeFormation ? (
              <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/30">
                {homeFormation}
              </span>
            ) : (
              <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400/60 border border-emerald-400/20">
                {lineupMode === 7 ? "2-3-1" : "4-4-2"}
              </span>
            )}
          </div>
          <div className="absolute right-3 top-2 flex items-center gap-2">
            {awayFormation ? (
              <span className="rounded bg-sky-400/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300 border border-sky-400/30">
                {awayFormation}
              </span>
            ) : (
              <span className="rounded bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-400/60 border border-sky-400/20">
                {lineupMode === 7 ? "2-3-1" : "4-4-2"}
              </span>
            )}
            <span className="rounded bg-black/30 px-2 py-1 text-xs font-bold text-sky-200">
              {awayName}
            </span>
          </div>

          {home.map((p) => {
            const trackedPos = typeof p.userId === "number" ? trackedPositionByPlayerId.get(p.userId) : undefined;
            const pos = trackedPos ?? toSpot(p.idx, "home");
            const incident = p.userId ? incidents.get(p.userId) : undefined;
            return (
              <div
                key={`h-${p.idx}-${p.userId ?? p.name}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-emerald-400 text-xs font-black text-emerald-950 shadow-lg shadow-black/40">
                  {p.number ?? p.idx + 1}
                  {incident?.yellow ? <span className="absolute -right-2 -top-2 rounded bg-yellow-400 px-1 text-[10px] font-black text-black">Y</span> : null}
                  {incident?.red ? <span className="absolute -right-2 -bottom-2 rounded bg-red-500 px-1 text-[10px] font-black text-white">R</span> : null}
                  {incident?.subOut ? <span className="absolute -left-2 -top-2 rounded bg-zinc-800 px-1 text-[10px] font-black text-white">⇣</span> : null}
                  {incident?.subIn ? <span className="absolute -left-2 -bottom-2 rounded bg-zinc-800 px-1 text-[10px] font-black text-white">⇡</span> : null}
                </div>
                <p className="mt-1 max-w-[88px] truncate text-center text-[10px] font-semibold text-white drop-shadow">
                  {p.name}
                </p>
              </div>
            );
          })}

          {away.map((p) => {
            const trackedPos = typeof p.userId === "number" ? trackedPositionByPlayerId.get(p.userId) : undefined;
            const pos = trackedPos ?? toSpot(p.idx, "away");
            const incident = p.userId ? incidents.get(p.userId) : undefined;
            return (
              <div
                key={`a-${p.idx}-${p.userId ?? p.name}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-sky-400 text-xs font-black text-sky-950 shadow-lg shadow-black/40">
                  {p.number ?? p.idx + 1}
                  {incident?.yellow ? <span className="absolute -right-2 -top-2 rounded bg-yellow-400 px-1 text-[10px] font-black text-black">Y</span> : null}
                  {incident?.red ? <span className="absolute -right-2 -bottom-2 rounded bg-red-500 px-1 text-[10px] font-black text-white">R</span> : null}
                  {incident?.subOut ? <span className="absolute -left-2 -top-2 rounded bg-zinc-800 px-1 text-[10px] font-black text-white">⇣</span> : null}
                  {incident?.subIn ? <span className="absolute -left-2 -bottom-2 rounded bg-zinc-800 px-1 text-[10px] font-black text-white">⇡</span> : null}
                </div>
                <p className="mt-1 max-w-[88px] truncate text-center text-[10px] font-semibold text-white drop-shadow">
                  {p.name}
                </p>
              </div>
            );
          })}

          {currentFrame && currentFrame.ballX != null && currentFrame.ballY != null ? (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${currentFrame.ballX}%`, top: `${currentFrame.ballY}%` }}
            >
              <div className="h-4 w-4 rounded-full border border-zinc-900 bg-white shadow-lg shadow-black/50" />
              <p className="-ml-6 mt-1 w-16 text-center text-[10px] font-semibold text-white">Balón</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-yellow-400 px-2 py-1 font-bold text-black">Y: Amarilla</span>
        <span className="rounded bg-red-500 px-2 py-1 font-bold text-white">R: Roja</span>
        <span className="rounded bg-zinc-700 px-2 py-1 font-bold text-white">⇣ Sustituido</span>
        <span className="rounded bg-zinc-700 px-2 py-1 font-bold text-white">⇡ Entró</span>
      </div>
    </div>
  );
}

function TeamLineupCard({
  title,
  starters,
  bench,
  roster,
  unavailable,
  formation,
}: {
  title: string;
  starters?: MatchDetailLineupEntry[];
  bench?: MatchDetailLineupEntry[];
  roster?: MatchSquadPlayerView[];
  unavailable?: MatchSquadPlayerView[];
  formation?: string | null;
}) {
  const safeStarters = Array.isArray(starters) ? starters : [];
  const safeBench = Array.isArray(bench) ? bench : [];

  return (
    <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
      <h3 className="font-black text-[var(--geo-text)]">
        {title}
        {formation ? (
          <span className="ml-2 inline-flex items-center rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-xs font-bold text-emerald-200">
            {formation}
          </span>
        ) : null}
      </h3>

      <div className="mt-4">
        <p className="text-sm font-bold text-geo-green">11 en cancha</p>
        {safeStarters.length ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {safeStarters.map((p, idx) => (
              <li key={`s-${idx}`} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]">
                {listLabel(p, idx)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--geo-text-muted)]">Sin titulares registrados.</p>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-bold text-geo-green">Banca</p>
        {safeBench.length ? (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {safeBench.map((p, idx) => (
              <li key={`b-${idx}`} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]">
                {listLabel(p, idx)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--geo-text-muted)]">Sin banca registrada.</p>
        )}
      </div>

      {Array.isArray(roster) && roster.length ? (
        <div className="mt-4">
          <p className="text-sm font-bold text-geo-green">Plantilla disponible</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {roster.map((p, idx) => (
              <li key={`r-${idx}`} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]">
                {listLabelStructured(p, idx)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {Array.isArray(unavailable) && unavailable.length ? (
        <div className="mt-4">
          <p className="text-sm font-bold text-red-400">No disponibles</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {unavailable.map((p, idx) => (
              <li key={`u-${idx}`} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]">
                {listLabelStructured(p, idx)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function PublicMatchDetailView() {
  const { matchId } = useParams<{ matchId: string }>();
  const id = Number(matchId);
  const [tick, setTick] = useState(() => Date.now());
  const [viewMode, setViewMode] = useState<MatchViewMode>("normal");

  // ---- upload-video state (admin only) ----
  const { data: user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isCoach = user?.role === "coach";
  const queryClient = useQueryClient();
  const [selectedStarters, setSelectedStarters] = useState<number[]>([]);
  const [selectedBench, setSelectedBench] = useState<number[]>([]);
  const [selectedUnavailable, setSelectedUnavailable] = useState<number[]>([]);
  const [lineupMode, setLineupMode] = useState<7 | 11>(11);
  const [selectedFormation, setSelectedFormation] = useState<string | null>(null);
  const [lineupError, setLineupError] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const lineupInitializedRef = useRef(false);
  const MAX_BENCH = 20;
  const MAX_UNAVAILABLE = 30;
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [submittingKeypoints, setSubmittingKeypoints] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- annotation state ----
  const [uploadStep, setUploadStep] = useState<"select" | "annotate" | "preview" | "progress">("select");
  const [srcPts, setSrcPts] = useState<Array<{ x: number; y: number }>>([]);
  const [frameExtracting, setFrameExtracting] = useState(false);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatusResponse | null>(null);
  const [aiHealth, setAiHealth] = useState<AIServiceHealth | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Preview state (Fase 1 + 2)
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  // Fase 2: asignación de identidad tracker_id → userId
  const [identityMap, setIdentityMap] = useState<Record<number, number>>({});
  const [selectedTrackerId, setSelectedTrackerId] = useState<number | null>(null);
  // Player tagging
  const [annotationMode, setAnnotationMode] = useState<"keypoints" | "players">("keypoints");
  const [playerTags, setPlayerTags] = useState<Array<PlayerTag>>([]);
  const [pendingPlayerLabel, setPendingPlayerLabel] = useState<{ x: number; y: number } | null>(null);

  // ---- Background analysis state (survives modal close) ----
  type BgAnalysisState =
    | { status: "idle" }
    | { status: "uploading"; fileName: string; progress: number }
    | { status: "uploaded" }
    | { status: "processing"; progress: number; currentStep: string; framesProcessed?: number; totalFrames?: number }
    | { status: "completed" }
    | { status: "failed"; error: string };

  const [bgAnalysis, setBgAnalysis] = useState<BgAnalysisState>({ status: "idle" });
  const [bgBarDismissed, setBgBarDismissed] = useState(false);
  const manualSubmitRef = useRef(false);
  const srcPtsRef = useRef(srcPts);
  srcPtsRef.current = srcPts;
  const uploadStepRef = useRef(uploadStep);
  uploadStepRef.current = uploadStep;
  const playerTagsRef = useRef(playerTags);
  playerTagsRef.current = playerTags;
  const identityMapRef = useRef(identityMap);
  identityMapRef.current = identityMap;

  // Extract frame from local file (browser-side, instant)
  const extractFrameLocal = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;

      const url = URL.createObjectURL(file);
      let handled = false;

      const drawAndResolve = () => {
        if (handled) return;
        handled = true;
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("2D context unavailable"));
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      };

      video.onloadeddata = () => {
        // Corrección: seek al 5% de la duración (mínimo 1s) para evitar
        // frame 0 negro o con logo del canal de transmisión.
        const seekTo = Math.max(1, (video.duration || 0) * 0.05);
        video.currentTime = isFinite(seekTo) ? seekTo : 1;
        setTimeout(() => { if (!handled) drawAndResolve(); }, 600);
      };

      video.onseeked = () => drawAndResolve();

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Formato de video no soportado en este navegador"));
      };

      video.src = url;
      video.load();
    });
  };

  // When user selects a file → extract frame locally (instant) + upload in background
  const handleFileSelected = async (file: File | null) => {
    if (!file) return;
    setUploadFile(file);
    setUploadError(null);
    setSrcPts([]);
    setFrameError(null);
    setFrameDataUrl(null);
    setUploadProgress(0);

    // 1. Extract frame from local file immediately in browser
    setUploadStep("annotate");
    setFrameExtracting(true);
    extractFrameLocal(file).then((dataUrl) => {
      setFrameDataUrl(dataUrl);
      setFrameExtracting(false);
    }).catch((err) => {
      setFrameError(err.message ?? "No se pudo extraer el fotograma.");
      setFrameExtracting(false);
    });

    // 2. Upload in background — track in persistent state
    setBgAnalysis({ status: "uploading", fileName: file.name, progress: 0 });
    setBgBarDismissed(false);
    setUploadingVideo(true);
    try {
      await uploadMatchVideo(id, file, (pct) => {
        setUploadProgress(pct);
        setBgAnalysis((prev) => prev.status === "uploading" ? { ...prev, progress: pct } : prev);
      });
      // Upload succeeded — schedule auto-submit if user doesn't annotate within 5s
      setTimeout(() => {
        const hasAnnotation = srcPtsRef.current.length > 0 || playerTagsRef.current.length > 0;
        if (!manualSubmitRef.current && !hasAnnotation && uploadStepRef.current !== "progress" && uploadStepRef.current !== "preview") {
          autoSubmitAnalysis();
        }
      }, 5000);
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? "Error al subir el video";
      setUploadError(msg);
      setUploadStep("select");
      setBgAnalysis({ status: "failed", error: msg });
    } finally {
      setUploadingVideo(false);
    }
  };

  // Draw local frame onto canvas once it arrives
  useEffect(() => {
    if (uploadStep !== "annotate" || !frameDataUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
    };
    img.src = frameDataUrl;
  }, [uploadStep, frameDataUrl]);

  // Submit keypoints (video already uploaded) — manual path
  const handleSubmitKeypoints = async () => {
    if (srcPts.length !== 4) return;
    manualSubmitRef.current = true;
    await doSubmitAnalysis(srcPts, playerTags, identityMap);
  };

  // Auto-submit: upload completed but user didn't annotate → submit with whatever we have
  const autoSubmitAnalysis = async () => {
    if (manualSubmitRef.current) return;
    manualSubmitRef.current = true;
    await doSubmitAnalysis(srcPtsRef.current, playerTagsRef.current, identityMapRef.current);
  };

  const doSubmitAnalysis = async (
    pts: Array<{ x: number; y: number }>,
    tags: Array<PlayerTag>,
    idMap: Record<number, number>,
  ) => {
    setSubmittingKeypoints(true);
    setUploadError(null);
    setBgAnalysis({ status: "processing", progress: 0, currentStep: "starting" });
    try {
      await submitAnalysisKeypoints(id, {
        srcPts: pts.length === 4 ? pts : [],
        playerTags: tags.length > 0 ? tags : undefined,
        identityMap: Object.keys(idMap).length > 0 ? idMap : undefined,
      });
      setUploadStep("progress");
      setAnalysisStatus({ status: "processing", progress: 0, currentStep: "starting" });
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? "Error al iniciar el análisis";
      setUploadError(msg);
      setBgAnalysis({ status: "failed", error: msg });
    } finally {
      setSubmittingKeypoints(false);
    }
  };

  // Step 3: Poll progress — runs based on uploadStep (modal open) OR bgAnalysis (background)
  useEffect(() => {
    const isProcessing = uploadStep === "progress" || bgAnalysis.status === "processing";
    if (!isProcessing) return;

    let cancelled = false;
    let healthTick = 0;

    const statusInterval = setInterval(async () => {
      if (cancelled) return;
      try {
        const status = await getAnalysisStatus(id);
        if (cancelled) return;
        setAnalysisStatus(status);

        // Update background state
        if (status.status === "processing") {
          setBgAnalysis((prev) =>
            prev.status === "processing"
              ? { ...prev, progress: status.progress ?? prev.progress, currentStep: status.currentStep ?? prev.currentStep, framesProcessed: status.framesProcessed, totalFrames: status.totalFrames }
              : prev,
          );
        } else if (status.status === "completed") {
          setBgAnalysis({ status: "completed" });
          setBgBarDismissed(false);
          queryClient.invalidateQueries({ queryKey: ["public-match-analytics", id] });
          queryClient.invalidateQueries({ queryKey: ["frames-export", id] });
          queryClient.invalidateQueries({ queryKey: ["frames-tactical", id] });
          setUploadResult(
            `Análisis completado. ${status.videoSupabaseUrl ? "Video disponible en Supabase. " : ""}Refresca la página para ver los resultados.`,
          );
        } else if (status.status === "failed") {
          setBgAnalysis({ status: "failed", error: status.error ?? "Falló el análisis" });
          setBgBarDismissed(false);
          setUploadResult(`Error: ${status.error ?? "Falló el análisis"}`);
        }
      } catch {
        // ignore polling errors
      }

      healthTick += 1;
      if (healthTick % 6 === 0) {
        try {
          const health = await getAIServiceHealth();
          if (!cancelled) setAiHealth(health);
        } catch {
          if (!cancelled) setAiHealth(null);
        }
      }
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(statusInterval);
    };
  }, [uploadStep, bgAnalysis.status, id, queryClient]);

  // Close modal — preserve bgAnalysis so status bar remains visible
  const closeUploadModal = () => {
    setUploadOpen(false);
    setUploadFile(null);
    setUploadResult(null);
    setUploadError(null);
    setSrcPts([]);
    setPlayerTags([]);
    setPendingPlayerLabel(null);
    setAnnotationMode("keypoints");
    setUploadStep("select");
    setFrameError(null);
    setFrameDataUrl(null);
    setAnalysisStatus(null);
    setUploadProgress(0);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(false);
    setIdentityMap({});
    setSelectedTrackerId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Full reset including background state (used by "Entendido" / final dismiss)
  const resetUpload = () => {
    closeUploadModal();
    setBgAnalysis({ status: "idle" });
    setBgBarDismissed(false);
    manualSubmitRef.current = false;
  };

  // ---- canvas annotation ----

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    if (annotationMode === "keypoints") {
      if (srcPts.length >= 4) return;
      setSrcPts((prev) => [...prev, { x, y }]);
    } else {
      // Player tagging mode: click first, then pick label
      setPendingPlayerLabel({ x, y });
    }
  };

  const handleUndoPoint = () => {
    setSrcPts((prev) => prev.slice(0, -1));
  };

  const handleResetPoints = () => {
    setSrcPts([]);
  };

  // Llama al endpoint preview del AI service para validar la homografía visualmente
  const runPreview = async () => {
    if (srcPts.length !== 4 || !frameDataUrl) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await postAnalysisPreview(id, {
        frameBase64: frameDataUrl,
        srcPts,
      });
      if (!result.homography_ok) {
        setPreviewError(result.error ?? "Homografía inválida — revisa las esquinas");
        return;
      }
      if (result.players.length === 0) {
        setPreviewError("No se detectaron jugadores en este frame. El AI service está buscando — intenta de nuevo o salta el preview.");
        return;
      }
      setPreviewData(result);

      // Auto-asignación heurística: pre-pobla identityMap por proximidad a
      // la formación esperada. El admin solo corrige los erróneos.
      const auto = autoAssignByFormation(
        result,
        data?.detail?.homeStartingXI ?? [],
        data?.detail?.awayStartingXI ?? [],
        data?.detail?.homeFormation,
        data?.detail?.awayFormation,
        effectiveLineupMode,
      );
      setIdentityMap(auto);

      setUploadStep("preview");
    } catch (e: any) {
      setPreviewError(e?.response?.data?.error ?? e?.message ?? "Error al previsualizar — verifica que el AI service esté corriendo");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Fase 3: auto-disparar preview cuando se completan las 4 esquinas.
  // Si el admin vuelve a "annotate" (ajustar esquinas), previewData se limpia
  // y el effect vuelve a disparar cuando hay 4 puntos de nuevo.
  useEffect(() => {
    if (
      uploadStep === "annotate" &&
      srcPts.length === 4 &&
      !previewData &&
      !previewLoading &&
      !previewError &&
      frameDataUrl        // frame ya disponible (extraído localmente)
    ) {
      runPreview();
    }
    // runPreview es estable entre renders → no hace falta incluirla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcPts.length, uploadStep, previewData, previewLoading, previewError, frameDataUrl]);

  // Fase 2: asignar userId real a una detección seleccionada
  const handleAssignIdentity = (userId: number) => {
    if (selectedTrackerId == null) return;
    setIdentityMap((prev) => {
      const next: Record<number, number> = {};
      // Limpiar asignaciones previas del mismo userId (no duplicar)
      for (const [tid, uid] of Object.entries(prev)) {
        if (uid !== userId) next[Number(tid)] = uid;
      }
      next[selectedTrackerId] = userId;
      return next;
    });
    setSelectedTrackerId(null);
  };

  const handleUnassign = (trackerId: number) => {
    setIdentityMap((prev) => {
      const next = { ...prev };
      delete next[trackerId];
      return next;
    });
  };

  // Redraw canvas markers when srcPts or playerTags changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || uploadStep !== "annotate" || !frameDataUrl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      drawMarkers(ctx);
    };
    img.src = frameDataUrl;
  }, [srcPts, playerTags, uploadStep, frameDataUrl]);

  const drawMarkers = (ctx: CanvasRenderingContext2D) => {
    // Draw connecting polygon for keypoints
    if (srcPts.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(57, 255, 20, 0.8)";
      ctx.lineWidth = 2;
      ctx.moveTo(srcPts[0].x, srcPts[0].y);
      for (let i = 1; i < srcPts.length; i++) {
        ctx.lineTo(srcPts[i].x, srcPts[i].y);
      }
      if (srcPts.length === 4) {
        ctx.lineTo(srcPts[0].x, srcPts[0].y);
      }
      ctx.stroke();
    }

    // Draw keypoint markers
    srcPts.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 10, 0, 2 * Math.PI);
      ctx.fillStyle = i < 2 ? "#39FF14" : "#facc15";
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#000";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), pt.x, pt.y);
    });

    // Draw player tags
    const tagColors: Record<string, string> = { home: "#ef4444", away: "#3b82f6", ball: "#ffffff" };
    const tagLabels: Record<string, string> = { home: "L", away: "V", ball: "⚽" };
    playerTags.forEach((pt) => {
      const color = tagColors[pt.label] ?? "#888";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = pt.label === "ball" ? "#000" : "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tagLabels[pt.label] ?? "?", pt.x, pt.y);
    });
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-match-detail", id],
    queryFn: () => getPublicMatchDetail(id),
    enabled: Number.isInteger(id) && id > 0,
    refetchInterval: (query) => {
      const payload = query.state.data;
      if (!payload?.match) return false;
      const liveState = resolveLiveState({
        played: payload.match.played,
        kickoff: payload.detail?.kickoffTime ?? payload.match.date,
        endTime: payload.detail?.endTime,
        durationMinutes: payload.detail?.durationMinutes,
      });
      return liveState === "live" ? 8000 : false;
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ["public-match-analytics", id],
    queryFn: () => getPublicMatchAnalytics(id),
    enabled: Number.isInteger(id) && id > 0,
    refetchInterval: (query) => {
      const payload = data;
      if (!payload?.match) return false;
      const liveState = resolveLiveState({
        played: payload.match.played,
        kickoff: payload.detail?.kickoffTime ?? payload.match.date,
        endTime: payload.detail?.endTime,
        durationMinutes: payload.detail?.durationMinutes,
      });
      if (liveState !== "live") return false;
      // Mientras esté en vivo, si aún no hay eventos seguimos refrescando para captar los primeros.
      return (query.state.data?.timelineEvents?.length ?? 0) >= 0 ? 8000 : 8000;
    },
  });

  // On mount: fetch existing analysis job status from DB so state survives refresh
  const { data: dbAnalysisStatus } = useQuery({
    queryKey: ["analysis-status", id],
    queryFn: () => getAnalysisStatus(id),
    enabled: isAdmin && Number.isInteger(id) && id > 0,
    staleTime: 10_000,
  });

  // Sync DB status → bgAnalysis on first load (only if nothing is already in progress)
  useEffect(() => {
    if (!dbAnalysisStatus || dbAnalysisStatus.status === "none") return;
    setBgAnalysis((prev) => {
      if (prev.status !== "idle") return prev; // don't override active upload/analysis
      const s = dbAnalysisStatus;
      if (s.status === "completed") return { status: "completed" };
      if (s.status === "failed") return { status: "failed", error: s.error ?? "Error desconocido" };
      if (s.status === "processing" || s.status === "queued") {
        return {
          status: "processing",
          progress: s.progress ?? 0,
          currentStep: s.currentStep ?? "procesando",
          framesProcessed: s.framesProcessed,
          totalFrames: s.totalFrames,
        };
      }
      if (s.status === "uploaded" || s.status === "annotating") {
        return { status: "uploaded" };
      }
      return prev;
    });
  }, [dbAnalysisStatus]);

  const coachSide = isCoach && user?.id && data?.match
    ? data.match.homeTeam?.trainerId === user.id
      ? "home"
      : data.match.awayTeam?.trainerId === user.id
        ? "away"
        : null
    : null;

  const coachTeamId = coachSide === "home"
    ? data?.match?.homeTeam?.id
    : coachSide === "away"
      ? data?.match?.awayTeam?.id
      : null;

  const { data: coachRoster } = useQuery({
    queryKey: ["coach-match-roster", coachTeamId],
    queryFn: () => getPlayersTeam(coachTeamId as number),
    enabled: Number.isInteger(coachTeamId) && (coachTeamId as number) > 0,
  });

  const lineupMutation = useMutation({
    mutationFn: (payload: {
      startingXI: Array<Record<string, unknown>>;
      bench?: Array<Record<string, unknown>>;
      unavailable?: Array<Record<string, unknown>>;
      formation?: string;
    }) => updateCoachLineup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["public-match-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["coachDashboard", user?.id] });
      setLineupError(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error ?? error?.message ?? "No se pudo guardar la alineación";
      setLineupError(message);
    },
  });

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const match = data?.match;
  const detail = data?.detail;

  const homeStarters = detail?.squads?.home?.starters?.length
    ? detail.squads.home.starters.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail?.homeStartingXI;

  const homeBench = detail?.squads?.home?.bench?.length
    ? detail.squads.home.bench.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail?.homeBench;

  const awayStarters = detail?.squads?.away?.starters?.length
    ? detail.squads.away.starters.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail?.awayStartingXI;

  const awayBench = detail?.squads?.away?.bench?.length
    ? detail.squads.away.bench.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail?.awayBench;

  useEffect(() => {
    if (!coachSide || lineupInitializedRef.current) return;
    const starters = coachSide === "home" ? homeStarters : awayStarters;
    const bench = coachSide === "home" ? detail?.squads?.home?.bench : detail?.squads?.away?.bench;
    const unavailable = coachSide === "home" ? detail?.squads?.home?.unavailable : detail?.squads?.away?.unavailable;
    const ids = (Array.isArray(starters) ? starters : [])
      .map((p) => (typeof p.userId === "number" ? p.userId : null))
      .filter((id): id is number => typeof id === "number");

    if (ids.length) {
      setSelectedStarters(ids);
      if (ids.length === 7 || ids.length === 11) {
        setLineupMode(ids.length as 7 | 11);
      }
    }

    const benchIds = (Array.isArray(bench) ? bench : [])
      .map((p) => p.id)
      .filter((id): id is number => typeof id === "number");
    if (benchIds.length) setSelectedBench(benchIds);

    const unavailableIds = (Array.isArray(unavailable) ? unavailable : [])
      .map((p) => p.id)
      .filter((id): id is number => typeof id === "number");
    if (unavailableIds.length) setSelectedUnavailable(unavailableIds);

    lineupInitializedRef.current = true;
  }, [coachSide, homeStarters, awayStarters, detail?.squads?.home?.bench, detail?.squads?.away?.bench, detail?.squads?.home?.unavailable, detail?.squads?.away?.unavailable]);

  const toggleStarter = (playerId: number) => {
    setSelectedStarters((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= lineupMode) return prev;
      return [...prev, playerId];
    });
    setSelectedBench((prev) => prev.filter((id) => id !== playerId));
    setSelectedUnavailable((prev) => prev.filter((id) => id !== playerId));
  };

  const toggleBench = (playerId: number) => {
    setSelectedBench((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= MAX_BENCH) {
        setLineupError(`La banca admite máximo ${MAX_BENCH} jugadores`);
        return prev;
      }
      return [...prev, playerId];
    });
    setSelectedStarters((prev) => prev.filter((id) => id !== playerId));
    setSelectedUnavailable((prev) => prev.filter((id) => id !== playerId));
  };

  const toggleUnavailable = (playerId: number) => {
    setSelectedUnavailable((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= MAX_UNAVAILABLE) {
        setLineupError(`No disponibles admite máximo ${MAX_UNAVAILABLE} jugadores`);
        return prev;
      }
      return [...prev, playerId];
    });
    setSelectedStarters((prev) => prev.filter((id) => id !== playerId));
    setSelectedBench((prev) => prev.filter((id) => id !== playerId));
  };

  const handleSaveLineup = () => {
    if (!enforcedLineupMode) {
      setLineupError("La liga debe definir si el formato es 7 u 11");
      return;
    }
    if (!coachRoster || !coachRoster.length) {
      setLineupError("No hay jugadores en el equipo");
      return;
    }
    if (selectedStarters.length !== enforcedLineupMode) {
      setLineupError(`Selecciona exactamente ${enforcedLineupMode} titulares`);
      return;
    }

    const rosterMap = new Map(coachRoster.map((p) => [p.id, p]));
    const startingXI = selectedStarters.map((playerId) => {
      const player = rosterMap.get(playerId);
      return {
        userId: playerId,
        playerId,
        name: player?.playerName ?? player?.name ?? `Jugador ${playerId}`,
        number: player?.jerseyNumber ?? null,
        position: player?.preferredPosition ?? null,
      };
    });

    const bench = selectedBench.map((playerId) => {
      const player = rosterMap.get(playerId);
      return {
        userId: playerId,
        playerId,
        name: player?.playerName ?? player?.name ?? `Jugador ${playerId}`,
        number: player?.jerseyNumber ?? null,
        position: player?.preferredPosition ?? null,
      };
    });

    const unavailable = selectedUnavailable.map((playerId) => {
      const player = rosterMap.get(playerId);
      return {
        userId: playerId,
        playerId,
        name: player?.playerName ?? player?.name ?? `Jugador ${playerId}`,
        number: player?.jerseyNumber ?? null,
        position: player?.preferredPosition ?? null,
      };
    });

    lineupMutation.mutate({ startingXI, bench, unavailable, formation: selectedFormation ?? undefined });
  };

  const rosterPositions = useMemo(() => {
    const set = new Set<string>();
    (coachRoster ?? []).forEach((p) => {
      if (p.preferredPosition) set.add(p.preferredPosition);
    });
    return Array.from(set).sort();
  }, [coachRoster]);

  const filteredRoster = useMemo(() => {
    if (!coachRoster) return [];
    if (positionFilter === "all") return coachRoster;
    return coachRoster.filter((p) => p.preferredPosition === positionFilter);
  }, [coachRoster, positionFilter]);

  // Fase 2: mapa userId → datos del jugador (para el panel de asignación)
  const rosterById = useMemo(() => {
    const map = new Map<number, { name: string; number: number | null; side: "home" | "away" }>();
    (data?.detail?.homeStartingXI ?? []).forEach((p: any) => {
      if (p.userId) map.set(p.userId, { name: p.name ?? "—", number: p.number ?? null, side: "home" });
    });
    (data?.detail?.awayStartingXI ?? []).forEach((p: any) => {
      if (p.userId) map.set(p.userId, { name: p.name ?? "—", number: p.number ?? null, side: "away" });
    });
    return map;
  }, [data?.detail?.homeStartingXI, data?.detail?.awayStartingXI]);

  const enforcedLineupMode = [7, 11].includes(Number(data?.match?.league?.lineupMode))
    ? (Number(data?.match?.league?.lineupMode) as 7 | 11)
    : null;

  const effectiveLineupMode = enforcedLineupMode ?? lineupMode;

  useEffect(() => {
    if (!data?.match) return;
    if (enforcedLineupMode) {
      setLineupMode(enforcedLineupMode);
      setSelectedStarters((prev) => prev.slice(0, enforcedLineupMode));
      setLineupError(null);
    } else {
      setLineupError("La liga debe definir si el formato es 7 u 11");
    }
  }, [enforcedLineupMode, data?.match]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes flex items-center justify-center">
        <p className="text-[var(--geo-text-muted)]">Cargando detalle del partido…</p>
      </div>
    );
  }

  if (isError || !data?.match) {
    return (
      <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-500">
          No se pudo cargar el detalle del partido.
          <div className="mt-4">
            <Link to="/results" className="text-geo-green hover:underline">
              Volver a resultados
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!match || !detail) {
    return (
      <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-500">
          No se pudo cargar el detalle del partido.
        </div>
      </div>
    );
  }

  const liveState = resolveLiveState({
    played: match.played,
    kickoff: detail.kickoffTime ?? match.date,
    endTime: detail.endTime,
    durationMinutes: detail.durationMinutes,
  });
  const isLive = liveState === "live";
  const liveEvents = (analytics?.timelineEvents ?? []).slice(-12).reverse();
  const renderedEvents = viewMode === "pro" ? liveEvents : liveEvents.slice(0, 6);

    const finalLat = data?.detail?.field?.lat;
    const finalLng = data?.detail?.field?.lng;
    const finalAddress = data?.detail?.field?.address 
      ? `${data.detail.field.name} - ${data.detail.field.address}` 
      : "Dirección del campo pendiente";

    const handleStartNavigation = () => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${finalLat},${finalLng}&travelmode=driving&dir_action=navigate`;
      window.open(url, "_blank");
    };

  return (
    <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes text-[var(--geo-text)]">
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <Link to="/results" className="inline-flex items-center gap-2 text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a resultados
        </Link>

        <section className="mt-4 rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-geo text-3xl lg:text-4xl">Detalle de partido</h1>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => { setUploadOpen(true); setBgBarDismissed(true); }}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    bgAnalysis.status === "processing"
                      ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                      : bgAnalysis.status === "completed"
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                        : bgAnalysis.status === "failed"
                          ? "bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
                          : bgAnalysis.status === "uploaded"
                            ? "bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30"
                            : "bg-geo-green text-black hover:bg-geo-green/80"
                  }`}
                >
                  {bgAnalysis.status === "uploading" ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Subiendo…
                    </>
                  ) : bgAnalysis.status === "uploaded" ? (
                    <>
                      <VideoCameraIcon className="h-5 w-5" />
                      Video subido — anotar
                    </>
                  ) : bgAnalysis.status === "processing" ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Analizando… {bgAnalysis.progress}%
                    </>
                  ) : bgAnalysis.status === "completed" ? (
                    <>
                      <VideoCameraIcon className="h-5 w-5" />
                      Análisis completado
                    </>
                  ) : bgAnalysis.status === "failed" ? (
                    <>
                      <VideoCameraIcon className="h-5 w-5" />
                      Error en análisis
                    </>
                  ) : (
                    <>
                      <VideoCameraIcon className="h-5 w-5" />
                      Analizar video
                    </>
                  )}
                </button>
              )}
              <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                liveState === "live"
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                  : liveState === "finished"
                    ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300"
              }`}
            >
              {liveState === "live" ? "En curso" : liveState === "finished" ? "Finalizado" : "Programado"}
            </span>
          </div>
          </div>
          <p className="mt-2 text-lg text-[var(--geo-text)]">
            {match.homeTeam?.name ?? "Local"} vs {match.awayTeam?.name ?? "Visitante"}
          </p>
          <p className="mt-1 text-sm text-[var(--geo-text-muted)]">{match.roundName}</p>
          <div className="mt-3 inline-flex rounded-lg border border-white/15 bg-white/[0.03] p-1 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("normal")}
              className={`rounded-md px-3 py-1 font-semibold transition ${
                viewMode === "normal"
                  ? "bg-geo-green text-geo-black"
                  : "text-[var(--geo-text-muted)] hover:text-[var(--geo-text)]"
              }`}
            >
              Modo normal
            </button>
            <button
              type="button"
              onClick={() => setViewMode("pro")}
              className={`rounded-md px-3 py-1 font-semibold transition ${
                viewMode === "pro"
                  ? "bg-geo-green text-geo-black"
                  : "text-[var(--geo-text-muted)] hover:text-[var(--geo-text)]"
              }`}
            >
              Modo pro
            </button>
          </div>
          {isLive ? (
            <p className="mt-2 text-xs text-emerald-300">
              Actualizando eventos y tracking automaticamente cada 8s.
            </p>
          ) : null}

          <div className="bg-[var(--geo-bg-card)] rounded-2xl overflow-hidden border border-[var(--geo-border)]">
            <div className="p-4 border-b border-[var(--geo-border)]">
              <h3 className="font-bold text-[var(--geo-text)]">Ruta al Encuentro</h3>
              <p className="text-xs text-[var(--geo-text-muted)]">{finalAddress}</p>
            </div>

            <div className="p-2 space-y-4">
              {finalLat && finalLng ? (
                <>
                  <LiveRouteMap 
                    destinationLat={finalLat} 
                    destinationLng={finalLng} 
                  />
                  
                  <button
                    onClick={handleStartNavigation}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-transform active:scale-95"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Iniciar Viaje en Google Maps
                  </button>
                </>
              ) : (
                <div className="p-6 text-center text-[var(--geo-text-muted)] bg-[var(--geo-bg)] rounded-xl">
                  <p>Aún no se ha asignado una ubicación para este partido.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-[var(--geo-bg)] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Marcador</p>
              <p className="mt-1 text-2xl font-black text-geo-green">
                {match.played ? `${match.homeScore} - ${match.awayScore}` : "Pendiente"}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--geo-bg)] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Entrenador local</p>
              <p className="mt-1 font-semibold">{detail.homeCoach?.name || "—"}</p>
            </div>
            <div className="rounded-xl bg-[var(--geo-bg)] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Entrenador visitante</p>
              <p className="mt-1 font-semibold">{detail.awayCoach?.name || "—"}</p>
            </div>
            <div className="rounded-xl bg-[var(--geo-bg)] p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Asistencia</p>
              <p className="mt-1 font-semibold">{detail.attendance ?? "—"}</p>
            </div>
          </div>
        </section>

        {(isLive || liveEvents.length > 0) && (
          <section className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black text-[var(--geo-text)]">Eventos del partido</h2>
              <span className="text-xs text-[var(--geo-text-muted)]">
                {isLive ? "En vivo" : "Últimos registros"} · {new Date(tick).toLocaleTimeString()}
              </span>
            </div>
            {renderedEvents.length ? (
              <div className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {renderedEvents.map((ev, index) => {
                    const visual = eventVisual(ev.eventType);
                    return (
                      <div
                        key={ev.id}
                        className={`rounded-lg border px-3 py-2 text-sm transition-all duration-500 ${visual.color} ${
                          isLive && index === 0 ? "animate-pulse" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{ev.minute}'</span>
                          <span className="rounded bg-black/25 px-2 py-0.5 text-[10px] font-bold">{visual.icon}</span>
                        </div>
                        <p className="mt-1 font-semibold">{eventLabel(ev.eventType)}</p>
                        {viewMode === "pro" && (
                          <p className="mt-1 text-xs text-[var(--geo-text-muted)]">
                            {ev.outcome ? `Resultado: ${ev.outcome}` : "Sin outcome"} ·
                            {ev.teamId ? ` Team ${ev.teamId}` : " Sin team"}
                            {ev.playerId ? ` · Jugador ${ev.playerId}` : ""}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {viewMode === "pro" && (
                  <div className="rounded-lg border border-white/10 bg-[var(--geo-bg)] p-3">
                    <p className="mb-2 text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">
                      Timeline visual (ultimo tramo)
                    </p>
                    <div className="relative h-12">
                      <div className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 bg-white/15" />
                      {renderedEvents.map((ev, idx) => {
                        const minute = Math.max(0, Math.min(120, ev.minute + (ev.extraMinute ?? 0)));
                        const left = (minute / 120) * 100;
                        const visual = eventVisual(ev.eventType);
                        return (
                          <div
                            key={`dot-${ev.id}`}
                            className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border ${visual.color}`}
                            style={{ left: `${left}%`, animationDelay: `${idx * 80}ms` }}
                            title={`${ev.minute}' ${eventLabel(ev.eventType)}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--geo-text-muted)]">
                Partido en curso, esperando primeros eventos registrados por arbitraje.
              </p>
            )}
          </section>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 font-black text-[var(--geo-text)]">
              <ClockIcon className="h-5 w-5 text-geo-green" />
              Tiempo y programación
            </h2>
            <ul className="space-y-2 text-sm">
              <li><span className="text-[var(--geo-text-muted)]">Hora de inicio:</span> {formatDateTime(detail.kickoffTime ?? match.date)}</li>
              <li><span className="text-[var(--geo-text-muted)]">Duración:</span> {detail.durationMinutes ?? 90} min</li>
              <li><span className="text-[var(--geo-text-muted)]">Hora de término:</span> {formatDateTime(detail.endTime)}</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
            <h2 className="mb-3 flex items-center gap-2 font-black text-[var(--geo-text)]">
              <CalendarDaysIcon className="h-5 w-5 text-geo-green" />
              Día y campo
            </h2>
            <ul className="space-y-2 text-sm">
              <li><span className="text-[var(--geo-text-muted)]">Día:</span> {formatDateOnly(detail.matchDay)}</li>
              <li>
                <span className="text-[var(--geo-text-muted)]">Campo:</span> {detail.field?.name || "—"}
              </li>
              <li>
                <span className="text-[var(--geo-text-muted)]">Ubicación:</span>{" "}
                {detail.field?.address || match.homeTeam?.fieldAddress || "—"}
              </li>
            </ul>
          </div>
        </section>

        {coachSide && (
          <section className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-[var(--geo-text)]">Tu alineación inicial</h2>
                <p className="text-xs text-[var(--geo-text-muted)]">
                  Selecciona exactamente {effectiveLineupMode} titulares antes de iniciar el partido.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {enforcedLineupMode ? (
                  <span className="inline-flex items-center rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Formato {enforcedLineupMode} vs {enforcedLineupMode}
                  </span>
                ) : (
                  <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-1 text-xs">
                    {[7, 11].map((mode) => (
                      <button
                        key={`mode-${mode}`}
                        type="button"
                        onClick={() => {
                          setLineupMode(mode as 7 | 11);
                          setSelectedStarters((prev) => prev.slice(0, mode));
                          setLineupError(null);
                        }}
                        className={`rounded-md px-3 py-1 font-semibold transition ${
                          lineupMode === mode
                            ? "bg-geo-green text-geo-black"
                            : "text-[var(--geo-text-muted)] hover:text-[var(--geo-text)]"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                )}

                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[var(--geo-bg)] px-2 py-1 text-xs text-[var(--geo-text)]"
                >
                  <option value="all">Todas las posiciones</option>
                  {rosterPositions.map((pos) => (
                    <option key={`pos-${pos}`} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-[var(--geo-text-muted)] mb-2">
                Formación
              </label>
              <div className="flex flex-wrap gap-2">
                {(effectiveLineupMode === 7 ? FORMATIONS_7_FRONTEND : FORMATIONS_11_FRONTEND).map((f) => (
                  <button
                    key={`f-${f}`}
                    type="button"
                    onClick={() => setSelectedFormation(selectedFormation === f ? null : f)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedFormation === f
                        ? "border-geo-green bg-geo-green/10 text-geo-green"
                        : "border-white/10 bg-white/[0.04] text-[var(--geo-text-muted)] hover:border-white/30"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {lineupError ? (
              <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {lineupError}
              </p>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-sm font-bold text-geo-green">Titulares</p>
                <p className="text-xs text-[var(--geo-text-muted)]">{selectedStarters.length}/{effectiveLineupMode}</p>
                <div className="mt-2 grid gap-2">
                  {filteredRoster.map((player) => {
                    const isSelected = selectedStarters.includes(player.id);
                    const isLocked = !isSelected && selectedStarters.length >= lineupMode;
                    const label = player.playerName || player.name;
                    return (
                      <button
                        key={`coach-starter-${player.id}`}
                        type="button"
                        onClick={() => toggleStarter(player.id)}
                        disabled={isLocked}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "border-emerald-400/70 bg-emerald-400/10 text-emerald-100"
                            : "border-white/10 bg-[var(--geo-bg)] text-[var(--geo-text)] hover:border-emerald-400/40"
                        } ${isLocked ? "opacity-50" : ""}`}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-xs text-[var(--geo-text-muted)]">
                          #{player.jerseyNumber ?? "—"}
                        </span>
                      </button>
                    );
                  })}
                  {!coachRoster?.length && (
                    <p className="text-sm text-[var(--geo-text-muted)]">
                      No hay jugadores registrados para este equipo.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-geo-green">Banca</p>
                <p className="text-xs text-[var(--geo-text-muted)]">{selectedBench.length}/{MAX_BENCH}</p>
                <div className="mt-2 grid gap-2">
                  {filteredRoster.map((player) => {
                    const isSelected = selectedBench.includes(player.id);
                    const label = player.playerName || player.name;
                    return (
                      <button
                        key={`coach-bench-${player.id}`}
                        type="button"
                        onClick={() => toggleBench(player.id)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "border-blue-400/70 bg-blue-400/10 text-blue-100"
                            : "border-white/10 bg-[var(--geo-bg)] text-[var(--geo-text)] hover:border-blue-400/40"
                        }`}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-xs text-[var(--geo-text-muted)]">
                          #{player.jerseyNumber ?? "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-geo-green">No disponibles</p>
                <p className="text-xs text-[var(--geo-text-muted)]">{selectedUnavailable.length}/{MAX_UNAVAILABLE}</p>
                <div className="mt-2 grid gap-2">
                  {filteredRoster.map((player) => {
                    const isSelected = selectedUnavailable.includes(player.id);
                    const label = player.playerName || player.name;
                    return (
                      <button
                        key={`coach-unavailable-${player.id}`}
                        type="button"
                        onClick={() => toggleUnavailable(player.id)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "border-red-400/70 bg-red-400/10 text-red-100"
                            : "border-white/10 bg-[var(--geo-bg)] text-[var(--geo-text)] hover:border-red-400/40"
                        }`}
                      >
                        <span className="font-semibold">{label}</span>
                        <span className="text-xs text-[var(--geo-text-muted)]">
                          #{player.jerseyNumber ?? "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[var(--geo-text-muted)]">
                Titulares: {selectedStarters.length}/{effectiveLineupMode} · Banca: {selectedBench.length} · No disponibles: {selectedUnavailable.length}
              </p>
              <button
                type="button"
                onClick={handleSaveLineup}
                disabled={lineupMutation.isPending}
                className="rounded-lg bg-geo-green px-4 py-2 text-sm font-semibold text-black transition hover:bg-geo-green/80 disabled:opacity-50"
              >
                {lineupMutation.isPending ? "Guardando..." : "Guardar alineación"}
              </button>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <TeamLineupCard
            title={`Alineación ${match.homeTeam?.name ?? "Local"}`}
            starters={homeStarters}
            bench={homeBench}
            roster={detail.squads?.home?.roster}
            unavailable={detail.squads?.home?.unavailable}
            formation={detail.homeFormation}
          />
          <TeamLineupCard
            title={`Alineación ${match.awayTeam?.name ?? "Visitante"}`}
            starters={awayStarters}
            bench={awayBench}
            roster={detail.squads?.away?.roster}
            unavailable={detail.squads?.away?.unavailable}
            formation={detail.awayFormation}
          />
        </section>

        <TacticalPitch
          matchId={id}
          homeStarters={homeStarters}
          awayStarters={awayStarters}
          homeName={match.homeTeam?.name ?? "Local"}
          awayName={match.awayTeam?.name ?? "Visitante"}
          analytics={analytics}
          homeFormation={detail.homeFormation}
          awayFormation={detail.awayFormation}
        />

        <section className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
          <h2 className="mb-3 flex items-center gap-2 font-black text-[var(--geo-text)]">
            <UserGroupIcon className="h-5 w-5 text-geo-green" />
            Información adicional
          </h2>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-lg bg-[var(--geo-bg)] px-3 py-2"><span className="text-[var(--geo-text-muted)]">Árbitro:</span> {detail.referee || "—"}</div>
            <div className="rounded-lg bg-[var(--geo-bg)] px-3 py-2"><span className="text-[var(--geo-text-muted)]">Clima:</span> {detail.weather || "—"}</div>
            <div className="rounded-lg bg-[var(--geo-bg)] px-3 py-2"><span className="text-[var(--geo-text-muted)]">Cancha:</span> {detail.field?.name || "—"}</div>
          </div>
          {detail.notes ? (
            <p className="mt-4 rounded-lg bg-[var(--geo-bg)] p-3 text-sm text-[var(--geo-text)]">
              <span className="font-semibold text-[var(--geo-text-muted)]">Notas: </span>
              {detail.notes}
            </p>
          ) : null}

          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--geo-text-muted)]">
            <MapPinIcon className="h-4 w-4" />
            Visible para todos. Edición exclusiva para administradores.
          </div>
        </section>

        <section className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
          <h2 className="mb-3 font-black text-[var(--geo-text)]">Simulación arbitral y tracking</h2>
          {analytics ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-[var(--geo-bg)] p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-[var(--geo-text-muted)]">Eventos</p>
                  <p className="mt-1 text-2xl font-black text-geo-green">{analytics.timelineEvents?.length ?? 0}</p>
                </div>
                <div className="rounded-lg bg-[var(--geo-bg)] p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-[var(--geo-text-muted)]">Frames tracking</p>
                  <p className="mt-1 text-2xl font-black text-geo-green">
                    {analytics.trackingFrames?.length ?? 0}
                    {(analytics.summary?.totalFrames ?? 0) > (analytics.trackingFrames?.length ?? 0) ? (
                      <span className="text-xs text-[var(--geo-text-muted)]"> / {analytics.summary.totalFrames}</span>
                    ) : null}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--geo-bg)] p-3 text-center">
                  <p className="text-xs uppercase tracking-[0.15em] text-[var(--geo-text-muted)]">Red de pases</p>
                  <p className="mt-1 text-2xl font-black text-geo-green">{analytics.passNetwork?.length ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-bold text-geo-green">Últimos eventos registrados</p>
                  <ul className="space-y-2">
                    {(analytics.timelineEvents ?? []).slice(-8).reverse().map((ev) => (
                      <li key={ev.id} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm">
                        <span className="font-semibold">{ev.minute}'</span> · {ev.eventType}
                        {ev.outcome ? ` (${ev.outcome})` : ""}
                        {ev.xStart != null && ev.yStart != null ? ` · [${ev.xStart.toFixed(1)}, ${ev.yStart.toFixed(1)}]` : ""}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="mb-2 text-sm font-bold text-geo-green">Tracking de balón (muestra)</p>
                  <ul className="space-y-2">
                    {(analytics.trackingFrames ?? []).slice(-8).reverse().map((frame) => (
                      <li key={frame.id} className="rounded-lg bg-[var(--geo-bg)] px-3 py-2 text-sm">
                        t={Math.round(frame.timestampMs / 1000)}s · periodo {frame.period || "—"} · balón ({(frame.ballX ?? 0).toFixed(1)}, {(frame.ballY ?? 0).toFixed(1)}) · jugadores {Array.isArray(frame.players) ? frame.players.length : 0}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {(analytics.summary?.totalFrames ?? 0) > 0 ? (
                <div className="mt-4 rounded-lg border border-white/10 bg-zinc-900/30 p-3">
                  <FramesExportViewer matchId={id} totalFrames={analytics.summary.totalFrames} />
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--geo-text-muted)]">Sin analytics disponibles para este partido.</p>
          )}
        </section>

        {/* ---- Upload Video Modal (admin only) ---- */}
        {uploadOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Subir video para análisis</h2>
                <button onClick={closeUploadModal} className="text-[var(--geo-text-muted)] hover:text-white">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {uploadResult && analysisStatus?.status !== "processing" ? (
                <div className="space-y-4">
                  <div className={`rounded-lg border p-4 text-sm ${
                    analysisStatus?.status === "failed"
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  }`}>
                    {uploadResult}
                  </div>
                  <button onClick={resetUpload} className="w-full rounded-lg bg-geo-green px-4 py-2 text-sm font-semibold text-black hover:bg-geo-green/80">
                    Entendido
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Step 1: Select file → uploads immediately */}
                  {uploadStep === "select" && (
                    <>
                      <p className="text-sm text-[var(--geo-text-muted)]">
                        Selecciona un video de cámara táctica (MP4, MOV). Se subirá automáticamente y luego podrás marcar las esquinas del campo.
                      </p>

                      {uploadingVideo ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-[var(--geo-text-muted)]">
                            <div className="h-4 w-4 border-2 border-geo-green border-t-transparent rounded-full animate-spin" />
                            Subiendo {uploadFile?.name}…
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-[var(--geo-text-muted)]">
                              <span>Progreso de subida</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-3 rounded-full bg-[var(--geo-bg)] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-geo-green transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[var(--geo-border)] p-6 cursor-pointer hover:border-geo-green/50 transition-colors">
                          <VideoCameraIcon className="h-10 w-10 text-[var(--geo-text-muted)]" />
                          <span className="text-sm font-medium">
                            {uploadFile ? uploadFile.name : "Haz clic para seleccionar un video"}
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                            className="hidden"
                            onChange={(e) => handleFileSelected(e.target.files?.[0] ?? null)}
                          />
                        </label>
                      )}

                      {uploadError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                          {uploadError}
                        </div>
                      )}
                    </>
                  )}

                  {/* Step 2: Annotate keypoints */}
                  {uploadStep === "annotate" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-geo-green font-semibold">Paso 1 de 2</span>
                        <button
                          onClick={() => { setUploadStep("select"); setSrcPts([]); }}
                          className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green transition-colors"
                        >
                          &larr; Cambiar video
                        </button>
                      </div>

                      <div className="rounded-lg border border-geo-green/30 bg-geo-green/10 p-3 text-xs text-[var(--geo-text-muted)]">
                        Haz clic sobre <strong className="text-white">4 esquinas del campo</strong> en orden:
                        <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                          <li><span className="inline-block w-3 h-3 rounded-full bg-[#39FF14] mr-1" />Esquina superior izquierda</li>
                          <li><span className="inline-block w-3 h-3 rounded-full bg-[#39FF14] mr-1" />Esquina superior derecha</li>
                          <li><span className="inline-block w-3 h-3 rounded-full bg-[#facc15] mr-1" />Esquina inferior derecha</li>
                          <li><span className="inline-block w-3 h-3 rounded-full bg-[#facc15] mr-1" />Esquina inferior izquierda</li>
                        </ol>
                      </div>

                      {frameExtracting ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-[var(--geo-text-muted)]">
                          <div className="h-8 w-8 border-2 border-geo-green border-t-transparent rounded-full animate-spin" />
                          Extrayendo fotograma...
                        </div>
                      ) : frameError ? (
                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
                          {frameError}
                          <p className="mt-2 text-xs text-[var(--geo-text-muted)]">
                            Puedes continuar sin anotación. Se usarán los puntos predeterminados.
                          </p>
                        </div>
                      ) : (
                        <canvas
                          ref={canvasRef}
                          onClick={handleCanvasClick}
                          className={`w-full rounded-lg border ${pendingPlayerLabel ? "border-geo-green" : "border-[var(--geo-border)]"} cursor-crosshair`}
                          style={{ maxHeight: "360px", objectFit: "contain" }}
                        />
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--geo-text-muted)]">
                          {annotationMode === "keypoints" ? `Puntos: ${srcPts.length} / 4` : `Jugadores: ${playerTags.length}`}
                        </span>
                        <div className="flex gap-2">
                          {annotationMode === "keypoints" ? (
                            <>
                              <button onClick={handleUndoPoint} disabled={srcPts.length === 0}
                                className="text-xs text-[var(--geo-text-muted)] hover:text-white disabled:opacity-30 transition-colors">
                                Deshacer
                              </button>
                              <button onClick={handleResetPoints} disabled={srcPts.length === 0}
                                className="text-xs text-[var(--geo-text-muted)] hover:text-white disabled:opacity-30 transition-colors">
                                Reiniciar
                              </button>
                            </>
                          ) : (
                            <button onClick={() => setPlayerTags((prev) => prev.slice(0, -1))} disabled={playerTags.length === 0}
                              className="text-xs text-[var(--geo-text-muted)] hover:text-white disabled:opacity-30 transition-colors">
                              Deshacer jugador
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mode toggle + player tagging */}
                      {srcPts.length === 4 && (
                        <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--geo-text-muted)]">Modo:</span>
                            <button
                              onClick={() => setAnnotationMode("keypoints")}
                              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                annotationMode === "keypoints"
                                  ? "bg-geo-green text-black"
                                  : "text-[var(--geo-text-muted)] hover:text-white"
                              }`}
                            >
                              Esquinas
                            </button>
                            <button
                              onClick={() => setAnnotationMode("players")}
                              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                                annotationMode === "players"
                                  ? "bg-geo-green text-black"
                                  : "text-[var(--geo-text-muted)] hover:text-white"
                              }`}
                            >
                              Jugadores
                            </button>
                          </div>

                          {annotationMode === "players" && (
                            <>
                              <p className="text-xs text-[var(--geo-text-muted)]">
                                Haz clic en <strong className="text-white">jugadores</strong> o el <strong className="text-white">balón</strong> y selecciona su equipo:
                              </p>
                              <div className="flex gap-2 text-xs">
                                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block" /> Local</span>
                                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block" /> Visitante</span>
                                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-white border border-gray-500 inline-block" /> Balón</span>
                              </div>

                              {/* Pending player label picker */}
                              {pendingPlayerLabel && (
                                <div className="flex items-center gap-2 rounded-lg border border-geo-green/50 bg-black/40 p-2">
                                  <span className="text-xs text-white">Etiquetar jugador en ({pendingPlayerLabel.x}, {pendingPlayerLabel.y}):</span>
                                  <button
                                    onClick={() => {
                                      setPlayerTags((prev) => [...prev, { ...pendingPlayerLabel, label: "home" }]);
                                      setPendingPlayerLabel(null);
                                    }}
                                    className="rounded bg-[#ef4444] px-2 py-1 text-xs font-bold text-white hover:opacity-80"
                                  >
                                    Local
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPlayerTags((prev) => [...prev, { ...pendingPlayerLabel, label: "away" }]);
                                      setPendingPlayerLabel(null);
                                    }}
                                    className="rounded bg-[#3b82f6] px-2 py-1 text-xs font-bold text-white hover:opacity-80"
                                  >
                                    Visitante
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPlayerTags((prev) => [...prev, { ...pendingPlayerLabel, label: "ball" }]);
                                      setPendingPlayerLabel(null);
                                    }}
                                    className="rounded bg-white px-2 py-1 text-xs font-bold text-black border hover:opacity-80"
                                  >
                                    Balón
                                  </button>
                                  <button
                                    onClick={() => setPendingPlayerLabel(null)}
                                    className="rounded px-2 py-1 text-xs text-[var(--geo-text-muted)] hover:text-white"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              )}

                              {playerTags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {playerTags.map((pt, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-1 rounded bg-[var(--geo-bg)] px-2 py-0.5 text-[10px] text-[var(--geo-text)]">
                                      <span className={`w-2 h-2 rounded-full ${pt.label === "home" ? "bg-[#ef4444]" : pt.label === "away" ? "bg-[#3b82f6]" : "bg-white border border-gray-500"}`} />
                                      #{idx + 1} {pt.label === "home" ? "Local" : pt.label === "away" ? "Visit." : "Balón"}
                                      <button onClick={() => setPlayerTags((prev) => prev.filter((_, i) => i !== idx))} className="ml-1 text-[var(--geo-text-muted)] hover:text-red-400">&times;</button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {uploadingVideo && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-[var(--geo-text-muted)]">
                            <span>Subiendo video…</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--geo-bg)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-geo-green transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {uploadError && (
                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                          {uploadError}
                        </div>
                      )}

                      {/* Botones: Previsualizar (Fase 1) o Saltar directo */}
                      {srcPts.length === 4 && (
                        <div className="flex flex-col gap-2 pt-1">
                          {previewError && (
                            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-300">
                              {previewError}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={runPreview}
                              disabled={previewLoading || uploadingVideo}
                              className="flex-1 rounded-lg bg-geo-green px-4 py-2.5 text-sm font-bold text-black disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                            >
                              {previewLoading ? "Analizando frame…" : "Previsualizar detección"}
                            </button>
                            <button
                              type="button"
                              onClick={handleSubmitKeypoints}
                              disabled={uploadingVideo || submittingKeypoints}
                              className="rounded-lg border border-[var(--geo-border)] px-4 py-2.5 text-sm text-[var(--geo-text)] hover:bg-[var(--geo-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                              title="Enviar keypoints directamente sin previsualizar"
                            >
                              {submittingKeypoints ? "Enviando…" : "Saltar y procesar"}
                            </button>
                          </div>
                        </div>
                      )}

                      {srcPts.length < 4 && (
                        <button
                          disabled={uploadingVideo || submittingKeypoints || srcPts.length !== 4}
                          onClick={handleSubmitKeypoints}
                          className="w-full rounded-lg bg-geo-green px-4 py-2.5 text-sm font-semibold text-black hover:bg-geo-green/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          Iniciar análisis
                        </button>
                      )}

                      <p className="text-xs text-[var(--geo-text-muted)] text-center">
                        {uploadingVideo
                          ? "Subiendo video en segundo plano…"
                          : srcPts.length < 4
                            ? "Marca los 4 puntos de esquina para previsualizar."
                            : playerTags.length === 0
                              ? "Opcional: previsualiza para validar la homografía antes de procesar."
                              : `${playerTags.length} jugador(es) etiquetado(s). Previsualiza o procesa directamente.`}
                      </p>
                    </>
                  )}

                  {/* Step preview: cancha 2D + asignación de identidad (Fase 2) */}
                  {uploadStep === "preview" && previewData && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-geo-green">
                          Paso 2 de 2 — Asignar jugadores
                        </span>
                        <button
                          type="button"
                          onClick={() => { setUploadStep("annotate"); setPreviewData(null); setPreviewError(null); setIdentityMap({}); setSelectedTrackerId(null); }}
                          className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green transition-colors"
                        >
                          ← Ajustar esquinas
                        </button>
                      </div>

                      <div className="rounded-lg border border-geo-green/30 bg-geo-green/10 p-3 text-xs text-[var(--geo-text-muted)]">
                        <strong className="text-white">1.</strong> Clica un círculo en la cancha para seleccionarlo (se hará más grande).<br />
                        <strong className="text-white">2.</strong> Clica el jugador de la lista que corresponde para asignarle identidad.<br />
                        <strong className="text-white">3.</strong> Asigna al menos los más visibles — el resto usará números genéricos.
                      </div>

                      <div className="grid gap-3 md:grid-cols-[1fr_240px]">
                        <PitchPreview2D
                          pitch={previewData.pitch}
                          detections={previewData.players}
                          ball={previewData.ball}
                          identityMap={identityMap}
                          rosterById={rosterById}
                          onSelectDetection={(tid) => setSelectedTrackerId((prev) => prev === tid ? null : tid)}
                          selectedTrackerId={selectedTrackerId}
                        />

                        {/* Panel lateral de alineación */}
                        <div className="max-h-[420px] overflow-y-auto rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] p-2 space-y-1">
                          {selectedTrackerId == null && (
                            <p className="px-1 py-2 text-[10px] text-[var(--geo-text-muted)] italic">
                              Selecciona un círculo en la cancha primero
                            </p>
                          )}

                          <p className="px-1 text-xs font-bold text-emerald-400">LOCAL</p>
                          {(data?.detail?.homeStartingXI ?? []).map((p: any) => {
                            const assigned = Object.values(identityMap).includes(p.userId);
                            return (
                              <button
                                key={p.userId}
                                type="button"
                                onClick={() => handleAssignIdentity(p.userId)}
                                disabled={selectedTrackerId == null || assigned}
                                className={`w-full text-left rounded px-2 py-1.5 text-xs transition ${
                                  assigned
                                    ? "bg-emerald-500/20 text-emerald-300 line-through opacity-60"
                                    : selectedTrackerId != null
                                      ? "bg-emerald-500/10 hover:bg-emerald-500/30 text-white cursor-pointer"
                                      : "text-[var(--geo-text-muted)] cursor-not-allowed"
                                }`}
                              >
                                #{p.number ?? "?"} {p.name}
                              </button>
                            );
                          })}

                          <p className="mt-2 px-1 text-xs font-bold text-sky-400">VISITANTE</p>
                          {(data?.detail?.awayStartingXI ?? []).map((p: any) => {
                            const assigned = Object.values(identityMap).includes(p.userId);
                            return (
                              <button
                                key={p.userId}
                                type="button"
                                onClick={() => handleAssignIdentity(p.userId)}
                                disabled={selectedTrackerId == null || assigned}
                                className={`w-full text-left rounded px-2 py-1.5 text-xs transition ${
                                  assigned
                                    ? "bg-sky-500/20 text-sky-300 line-through opacity-60"
                                    : selectedTrackerId != null
                                      ? "bg-sky-500/10 hover:bg-sky-500/30 text-white cursor-pointer"
                                      : "text-[var(--geo-text-muted)] cursor-not-allowed"
                                }`}
                              >
                                #{p.number ?? "?"} {p.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Barra de estado de asignación */}
                      <div className="flex items-center justify-between text-xs text-[var(--geo-text-muted)]">
                        <span>
                          Asignados: <strong className="text-white">{Object.keys(identityMap).length}</strong> / {previewData.players.length} detecciones
                        </span>
                        {selectedTrackerId != null && (
                          <button
                            type="button"
                            onClick={() => { handleUnassign(selectedTrackerId); setSelectedTrackerId(null); }}
                            className="text-amber-400 hover:underline"
                          >
                            Quitar asignación #{selectedTrackerId}
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSubmitKeypoints}
                        disabled={submittingKeypoints}
                        className="w-full rounded-lg bg-geo-green px-4 py-3 text-sm font-bold text-black disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                      >
                        {submittingKeypoints ? "Enviando…" : "Procesar video completo"}
                      </button>
                    </div>
                  )}

                  {/* Step 3: Processing progress */}
                  {uploadStep === "progress" && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-geo-green font-semibold">Paso 2 de 2</span>
                        <div className="flex items-center gap-2">
                          {aiHealth && (
                            <span className={`inline-flex items-center gap-1 text-[10px] ${aiHealth.worker_running ? "text-emerald-400" : "text-red-400"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${aiHealth.worker_running ? "bg-emerald-400" : "bg-red-400"}`} />
                              AI {aiHealth.worker_running ? "online" : "offline"}
                            </span>
                          )}
                          <span className="text-xs text-[var(--geo-text-muted)] capitalize">
                            {analysisStatus?.status === "completed" ? "Completado" :
                             analysisStatus?.status === "failed" ? "Falló" : "Procesando..."}
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-[var(--geo-text-muted)]">
                          <span>{analysisStatus?.currentStep ?? "iniciando"}</span>
                          <span>{analysisStatus?.progress ?? 0}%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-[var(--geo-bg)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              analysisStatus?.status === "failed" ? "bg-red-500" : "bg-geo-green"
                            }`}
                            style={{ width: `${analysisStatus?.progress ?? 0}%` }}
                          />
                        </div>
                      </div>

                      {analysisStatus?.framesProcessed != null && analysisStatus?.totalFrames != null && (
                        <p className="text-xs text-[var(--geo-text-muted)] text-center">
                          {analysisStatus.framesProcessed.toLocaleString()} / {analysisStatus.totalFrames.toLocaleString()} frames
                        </p>
                      )}

                      {analysisStatus?.status === "completed" && (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                            Análisis completado con éxito.
                          </div>
                          <button
                            onClick={resetUpload}
                            className="w-full rounded-lg bg-geo-green px-4 py-2.5 text-sm font-semibold text-black hover:bg-geo-green/80"
                          >
                            Cerrar y refrescar datos
                          </button>
                        </div>
                      )}

                      {analysisStatus?.status === "failed" && (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
                            {analysisStatus?.error ?? "Error desconocido durante el análisis."}
                          </div>
                          <button
                            onClick={resetUpload}
                            className="w-full rounded-lg bg-geo-green px-4 py-2.5 text-sm font-semibold text-black hover:bg-geo-green/80"
                          >
                            Cerrar
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ---- Floating background analysis status bar ---- */}
      {bgAnalysis.status !== "idle" && !bgBarDismissed && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-right">
          <div
            className={`rounded-xl border shadow-2xl p-4 max-w-sm ${
              bgAnalysis.status === "uploading"
                ? "border-blue-500/40 bg-blue-950/90 text-blue-100"
                : bgAnalysis.status === "uploaded"
                  ? "border-blue-400/40 bg-blue-950/90 text-blue-100"
                  : bgAnalysis.status === "processing"
                    ? "border-amber-500/40 bg-amber-950/90 text-amber-100"
                    : bgAnalysis.status === "completed"
                      ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-100"
                      : "border-red-500/40 bg-red-950/90 text-red-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {bgAnalysis.status === "uploading" || bgAnalysis.status === "processing" ? (
                  <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                ) : bgAnalysis.status === "completed" ? (
                  <span className="text-lg shrink-0">✓</span>
                ) : bgAnalysis.status === "uploaded" ? (
                  <span className="text-lg shrink-0">↑</span>
                ) : (
                  <span className="text-lg shrink-0">✗</span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">
                    {bgAnalysis.status === "uploading"
                      ? `Subiendo ${bgAnalysis.fileName}`
                      : bgAnalysis.status === "uploaded"
                        ? "Video subido — anota o procesa"
                        : bgAnalysis.status === "processing"
                          ? "Analizando video"
                          : bgAnalysis.status === "completed"
                            ? "Análisis completado"
                            : "Error en el análisis"}
                  </p>
                  {bgAnalysis.status === "uploading" && (
                    <>
                      <div className="mt-1 flex justify-between text-xs opacity-70">
                        <span>Progreso</span>
                        <span>{bgAnalysis.progress}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-400 transition-all duration-300"
                          style={{ width: `${bgAnalysis.progress}%` }}
                        />
                      </div>
                    </>
                  )}
                  {bgAnalysis.status === "uploaded" && (
                    <p className="text-xs opacity-70 mt-0.5">
                      Abre el panel para anotar esquinas o inicia el análisis directamente.
                    </p>
                  )}
                  {bgAnalysis.status === "processing" && (
                    <>
                      <p className="text-xs opacity-70 mt-0.5">
                        {bgAnalysis.currentStep} · {bgAnalysis.progress}%
                        {bgAnalysis.framesProcessed != null && bgAnalysis.totalFrames != null
                          ? ` · ${bgAnalysis.framesProcessed.toLocaleString()}/${bgAnalysis.totalFrames.toLocaleString()} frames`
                          : ""}
                      </p>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-700"
                          style={{ width: `${bgAnalysis.progress}%` }}
                        />
                      </div>
                    </>
                  )}
                  {bgAnalysis.status === "failed" && (
                    <p className="text-xs opacity-70 mt-0.5 truncate">{bgAnalysis.error}</p>
                  )}
                  {bgAnalysis.status === "completed" && (
                    <p className="text-xs opacity-70 mt-0.5">Refresca la página para ver los resultados.</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setBgBarDismissed(true)}
                className="text-current opacity-50 hover:opacity-100 shrink-0"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Open modal button */}
            {(bgAnalysis.status === "uploading" || bgAnalysis.status === "uploaded" || bgAnalysis.status === "processing") && (
              <button
                onClick={() => { setUploadOpen(true); setBgBarDismissed(true); }}
                className="mt-2 w-full rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                {bgAnalysis.status === "uploaded" ? "Abrir panel para anotar" : "Abrir panel de análisis"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FramesExportViewer({ matchId, totalFrames }: { matchId: number; totalFrames: number }) {
  const [page, setPage] = useState(1);
  const pageSize = 500;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["frames-export", matchId, page],
    queryFn: () => getPublicMatchFramesExport(matchId, page, pageSize),
    enabled: !!matchId,
    staleTime: 30_000,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : Math.ceil(totalFrames / pageSize);
  const frames = data?.frames ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          Todos los frames ({totalFrames.toLocaleString()} en DB)
        </p>
        {totalPages > 1 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="rounded bg-white/10 px-2 py-1 text-xs text-[var(--geo-text)] disabled:opacity-30 hover:bg-white/20"
            >
              ←
            </button>
            <span className="text-xs text-[var(--geo-text-muted)]">
              Pág {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="rounded bg-white/10 px-2 py-1 text-xs text-[var(--geo-text)] disabled:opacity-30 hover:bg-white/20"
            >
              →
            </button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-xs text-[var(--geo-text-muted)]">Cargando frames...</p>
      ) : isError ? (
        <p className="text-xs text-red-400">Error al cargar frames.</p>
      ) : frames.length > 0 ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-white/5">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-zinc-800">
              <tr className="text-zinc-400">
                <th className="px-2 py-1">t (s)</th>
                <th className="px-2 py-1">Periodo</th>
                <th className="px-2 py-1">Balón X/Y/Z</th>
                <th className="px-2 py-1">Jugadores</th>
              </tr>
            </thead>
            <tbody>
              {frames.map((frame: any) => (
                <tr key={frame.id} className="border-t border-white/5 text-zinc-300">
                  <td className="px-2 py-1 font-mono">{(frame.timestampMs / 1000).toFixed(1)}</td>
                  <td className="px-2 py-1">{frame.period || "—"}</td>
                  <td className="px-2 py-1 font-mono">
                    {(frame.ballX ?? 0).toFixed(1)}, {(frame.ballY ?? 0).toFixed(1)}, {(frame.ballZ ?? 0).toFixed(1)}
                  </td>
                  <td className="px-2 py-1">{Array.isArray(frame.players) ? frame.players.length : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-[var(--geo-text-muted)]">Sin frames en esta página.</p>
      )}
    </div>
  );
}
