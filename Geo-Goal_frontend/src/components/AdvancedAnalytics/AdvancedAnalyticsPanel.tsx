/**
 * AdvancedAnalyticsPanel — Fase 2
 * Sección "📊 Análisis avanzado" en MatchDetail.
 *
 * Contenido:
 *  - Posesión (barras)
 *  - Formación observada
 *  - Línea defensiva + área convex hull
 *  - Heatmap por jugador (canvas KDE 2D)
 *  - Stats de velocidad/sprints/distancia por jugador
 *  - Red de pases (SVG con nodos y aristas)
 */

import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdvancedAnalytics, type TrackingAnalytics } from "@/api/publicAPI";
import { PlayerHeatmap } from "@/components/Heatmap/PlayerHeatmap";
import api from "@/lib/axios";

// Tipos locales Fase 5
interface XGShot { playerId: number | null; teamId: number | null; eventType: string; x: number; y: number; xg: number; outcome: string; minute: number }
interface XGResponse { shots: XGShot[]; perPlayer: Record<number, number>; teamTotals: Record<number, number> }
interface XTTopPass { playerId: number; teamId: number | null; xtDelta: number }
interface XTResponse { perPlayer: Record<number, number>; perTeam: Record<number, number>; topPasses: XTTopPass[] }

const ShotMap = lazy(() => import("./ShotMap"));
const XTRankingTable = lazy(() => import("./XTRankingTable").then((m) => ({ default: m.XTRankingTable })));

interface Props {
  matchId: number;
  homeName: string;
  awayName: string;
  /** Mapa playerId → nombre  (para mostrar nombres en lugar de IDs) */
  playerNames?: Record<number, string>;
}

export function AdvancedAnalyticsPanel({ matchId, homeName, awayName, playerNames = {} }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["advanced-analytics", matchId],
    queryFn: () => getAdvancedAnalytics(matchId),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-geo-green border-t-transparent" />
        <span className="ml-3 text-sm text-[var(--geo-text-muted)]">Calculando estadísticas...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
        No hay datos de tracking disponibles para este partido. Sube y procesa un video primero.
      </div>
    );
  }

  // Solo mostrar jugadores que pertenecen a la convocatoria del partido.
  // Los IDs de tracking sin nombre son trackers no identificados (ByteTrack IDs)
  // que no corresponden a ningún jugador del partido.
  const playerIds = Object.keys(data.speeds)
    .map(Number)
    .filter((pid) => pid in playerNames);
  const currentPlayer = selectedPlayer !== null && playerIds.includes(selectedPlayer)
    ? selectedPlayer
    : playerIds[0] ?? null;
  const heatGrid = currentPlayer != null ? data.heatmaps[currentPlayer] : null;
  const speedStats = currentPlayer != null ? data.speeds[currentPlayer] : null;
  const zoneStats = currentPlayer != null ? data.zones[currentPlayer] : null;

  const pHome = Math.round(data.possession.home * 100);
  const pAway = Math.round(data.possession.away * 100);
  const meta = data.meta ?? null;
  const resolvedHomeTeamId = meta?.homeTeamId ?? data.possession?.homeTeamId ?? null;

  return (
    <div className="space-y-5">

      {/* ── Posesión + Formación ──────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">

        {/* Posesión */}
        <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--geo-text-muted)]">Posesión</p>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="w-24 truncate text-right text-blue-400">{homeName}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="absolute inset-y-0 left-0 rounded-full bg-blue-500" style={{ width: `${pHome}%` }} />
            </div>
            <span className="w-24 truncate text-left text-orange-400">{awayName}</span>
          </div>
          <div className="mt-1 flex justify-between px-24 text-xs text-[var(--geo-text-muted)]">
            <span className="font-bold text-blue-400">{pHome}%</span>
            <span className="font-bold text-orange-400">{pAway}%</span>
          </div>
        </div>

        {/* Formación observada */}
        <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--geo-text-muted)]">Formación observada</p>
          <div className="flex justify-around">
            <div className="text-center">
              <p className="text-2xl font-black text-blue-400">{data.observedFormation.home}</p>
              <p className="text-xs text-[var(--geo-text-muted)]">{homeName}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-black text-orange-400">{data.observedFormation.away}</p>
              <p className="text-xs text-[var(--geo-text-muted)]">{awayName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Línea defensiva + Convex Hull ──────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Línea defensiva promedio"
          home={`${data.defensiveLine.home} m`}
          away={`${data.defensiveLine.away} m`}
          homeName={homeName}
          awayName={awayName}
          note="Metros desde su portería propia. >40m = bloque alto"
        />
        <StatCard
          title="Área convex hull (compacidad)"
          home={`${data.convexHull.home} m²`}
          away={`${data.convexHull.away} m²`}
          homeName={homeName}
          awayName={awayName}
          note="Área media del polígono que abarca al equipo. Menor = más compacto"
        />
      </div>

      {/* ── Heatmap + Stats jugador ──────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--geo-text-muted)]">
            Mapa de calor
          </p>
          <select
            value={currentPlayer ?? ""}
            onChange={(e) => setSelectedPlayer(Number(e.target.value))}
            className="ml-auto rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-2 py-1 text-xs text-[var(--geo-text)]"
          >
            {playerIds.map((pid) => (
              <option key={pid} value={pid}>
                {playerNames[pid] ?? `Jugador #${pid}`}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            {heatGrid ? (
              <PlayerHeatmap grid={heatGrid} />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg bg-white/5 text-xs text-[var(--geo-text-muted)]">
                Sin datos de posición
              </div>
            )}
          </div>

          {/* Stats del jugador seleccionado */}
          <div className="space-y-2">
            {speedStats && (
              <>
                <StatRow label="Velocidad media" value={`${speedStats.avgSpeed} m/s`} />
                <StatRow label="Velocidad máxima" value={`${speedStats.maxSpeed} m/s`} />
                <StatRow label="Sprints (>7 m/s)" value={String(speedStats.sprintCount)} />
                <StatRow label="Aceleraciones" value={String(speedStats.accelerationCount)} />
                <StatRow label="Distancia total" value={`${(speedStats.distanceM / 1000).toFixed(2)} km`} />
              </>
            )}
            {zoneStats && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--geo-text-muted)]">Distancia por zona</p>
                <ZoneBar def={zoneStats.def} mid={zoneStats.mid} att={zoneStats.att} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Red de pases ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--geo-text-muted)]">
          Red de pases
        </p>
        {data.passNetwork.nodes.length > 0 && resolvedHomeTeamId != null ? (
          <PassNetworkSvg
            nodes={data.passNetwork.nodes}
            edges={data.passNetwork.edges}
            playerNames={playerNames}
            homeTeamId={resolvedHomeTeamId}
          />
        ) : (
          <p className="py-6 text-center text-xs text-[var(--geo-text-muted)]">
            No hay datos de pases registrados para este partido.
          </p>
        )}
      </div>

      <p className="text-right text-[10px] text-[var(--geo-text-muted)]">
        {(meta?.framesProcessed ?? 0).toLocaleString()} frames procesados ·
        calculado {new Date(meta?.computedAt ?? Date.now()).toLocaleString("es-MX")}
      </p>

      {/* ── Fase 5: xG Shot Map ───────────────────────────────────────────── */}
      {resolvedHomeTeamId != null && (
        <XGSection
          matchId={matchId}
          homeName={homeName}
          awayName={awayName}
          homeTeamId={resolvedHomeTeamId}
        />
      )}

      {/* ── Fase 5: xT Ranking ────────────────────────────────────────────── */}
      {resolvedHomeTeamId != null && (
        <XTSection
          matchId={matchId}
          homeName={homeName}
          awayName={awayName}
          homeTeamId={resolvedHomeTeamId}
          playerNames={playerNames}
        />
      )}
    </div>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function StatCard({
  title, home, away, homeName, awayName, note,
}: {
  title: string; home: string; away: string;
  homeName: string; awayName: string; note?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--geo-text-muted)]">{title}</p>
      <div className="flex justify-around">
        <div className="text-center">
          <p className="text-xl font-black text-blue-400">{home}</p>
          <p className="text-xs text-[var(--geo-text-muted)]">{homeName}</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-orange-400">{away}</p>
          <p className="text-xs text-[var(--geo-text-muted)]">{awayName}</p>
        </div>
      </div>
      {note && <p className="mt-2 text-[10px] text-center text-[var(--geo-text-muted)]">{note}</p>}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5">
      <span className="text-xs text-[var(--geo-text-muted)]">{label}</span>
      <span className="text-xs font-bold text-[var(--geo-text)]">{value}</span>
    </div>
  );
}

function ZoneBar({ def, mid, att }: { def: number; mid: number; att: number }) {
  const total = def + mid + att || 1;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full">
        <div className="bg-blue-500/70" style={{ width: `${(def / total) * 100}%` }} title={`Def: ${(def / 1000).toFixed(2)} km`} />
        <div className="bg-geo-green/70" style={{ width: `${(mid / total) * 100}%` }} title={`Mid: ${(mid / 1000).toFixed(2)} km`} />
        <div className="bg-orange-500/70" style={{ width: `${(att / total) * 100}%` }} title={`Att: ${(att / 1000).toFixed(2)} km`} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--geo-text-muted)]">
        <span>Def {(def / 1000).toFixed(2)} km</span>
        <span>Mid {(mid / 1000).toFixed(2)} km</span>
        <span>Att {(att / 1000).toFixed(2)} km</span>
      </div>
    </div>
  );
}

function PassNetworkSvg({
  nodes, edges, playerNames, homeTeamId,
}: {
  nodes: TrackingAnalytics["passNetwork"]["nodes"];
  edges: TrackingAnalytics["passNetwork"]["edges"];
  playerNames: Record<number, string>;
  homeTeamId: number;
}) {
  const W = 560;
  const H = 180;
  // Mapear avgX (0-100 norm) → SVG x, avgY → SVG y
  const toSvg = (nx: number, ny: number) => ({
    svgX: (nx / 100) * W,
    svgY: (ny / 100) * H,
  });

  const maxEdge = Math.max(...edges.map((e) => e.count), 1);
  const maxPR = Math.max(...nodes.map((n) => n.pageRank), 0.001);
  const nodeMap = new Map(nodes.map((n) => [n.playerId, n]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-[#0d3b1e]" style={{ minHeight: 140 }}>
      {/* Aristas */}
      {edges.map((e, i) => {
        const from = nodeMap.get(e.from);
        const to = nodeMap.get(e.to);
        if (!from || !to) return null;
        const { svgX: x1, svgY: y1 } = toSvg(from.avgX, from.avgY);
        const { svgX: x2, svgY: y2 } = toSvg(to.avgX, to.avgY);
        const strokeW = Math.max(0.5, (e.count / maxEdge) * 4);
        const color = from.teamId === homeTeamId ? "#60a5fa" : "#fb923c";
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth={strokeW} strokeOpacity={0.5} />
        );
      })}
      {/* Nodos */}
      {nodes.map((n) => {
        const { svgX, svgY } = toSvg(n.avgX, n.avgY);
        const r = Math.max(4, (n.pageRank / maxPR) * 10);
        const color = n.teamId === homeTeamId ? "#3b82f6" : "#f97316";
        const shortName = (playerNames[n.playerId] ?? `#${n.playerId}`).split(" ").pop() ?? "";
        return (
          <g key={n.playerId}>
            <circle cx={svgX} cy={svgY} r={r} fill={color} fillOpacity={0.9} />
            <text x={svgX} y={svgY - r - 2} textAnchor="middle"
              fontSize={8} fill="white" fontWeight="bold">
              {shortName.slice(0, 8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Sección xG (Fase 5) ──────────────────────────────────────────────────────

function XGSection({
  matchId, homeName, awayName, homeTeamId,
}: {
  matchId: number; homeName: string; awayName: string; homeTeamId: number;
}) {
  const { data, isLoading, isError } = useQuery<XGResponse>({
    queryKey: ["match-xg", matchId],
    queryFn: async () => {
      const { data } = await api.get<XGResponse>(`/public/matches/${matchId}/xg`);
      return data;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return (
    <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--geo-text-muted)]">
        ⚽ Expected Goals (xG) — Mapa de tiros
      </p>
      {isLoading && <p className="text-xs text-[var(--geo-text-muted)]">Calculando xG...</p>}
      {isError && <p className="text-xs text-red-400">No hay tiros registrados con coordenadas aún.</p>}
      {data && (
        <Suspense fallback={null}>
          <ShotMap
            shots={data.shots}
            homeName={homeName}
            awayName={awayName}
            homeTeamId={homeTeamId}
          />
        </Suspense>
      )}
    </div>
  );
}

// ── Sección xT (Fase 5) ──────────────────────────────────────────────────────

function XTSection({
  matchId, homeName, awayName, homeTeamId, playerNames,
}: {
  matchId: number; homeName: string; awayName: string;
  homeTeamId: number; playerNames: Record<number, string>;
}) {
  const { data, isLoading, isError } = useQuery<XTResponse>({
    queryKey: ["match-xt", matchId],
    queryFn: async () => {
      const { data } = await api.get<XTResponse>(`/public/matches/${matchId}/xt`);
      return data;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return (
    <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--geo-text-muted)]">
        📈 Expected Threat (xT) — Creadores de peligro
      </p>
      {isLoading && <p className="text-xs text-[var(--geo-text-muted)]">Calculando xT...</p>}
      {isError && <p className="text-xs text-red-400">No hay pases con coordenadas registrados aún.</p>}
      {data && (
        <Suspense fallback={null}>
          <XTRankingTable
            xt={data}
            playerNames={playerNames}
            homeName={homeName}
            awayName={awayName}
            homeTeamId={homeTeamId}
          />
        </Suspense>
      )}
    </div>
  );
}
