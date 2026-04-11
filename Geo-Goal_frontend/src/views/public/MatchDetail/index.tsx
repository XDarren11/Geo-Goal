import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicMatchAnalytics, getPublicMatchDetail } from "@/api/publicAPI";
import type { MatchDetailLineupEntry, MatchSquadPlayerView } from "@/types";
import { ArrowLeftIcon, ClockIcon, CalendarDaysIcon, MapPinIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";

type Side = "home" | "away";

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
  homeStarters,
  awayStarters,
  homeName,
  awayName,
  analytics,
}: {
  homeStarters?: MatchDetailLineupEntry[];
  awayStarters?: MatchDetailLineupEntry[];
  homeName: string;
  awayName: string;
  analytics: Awaited<ReturnType<typeof getPublicMatchAnalytics>> | undefined;
}) {
  const home = normalizeLineup(homeStarters);
  const away = normalizeLineup(awayStarters);
  const incidents = buildIncidentMap(analytics);
  const frames = analytics?.trackingFrames ?? [];
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setFrameIndex(frames.length ? frames.length - 1 : 0);
    setIsPlaying(false);
  }, [frames.length]);

  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;
    const timer = setInterval(() => {
      setFrameIndex((prev) => {
        if (prev >= frames.length - 1) {
          return 0;
        }
        return prev + 1;
      });
    }, 650);

    return () => clearInterval(timer);
  }, [isPlaying, frames.length]);

  const currentFrame = frames.length ? frames[Math.min(frameIndex, frames.length - 1)] : null;

  const homeIds = useMemo(() => new Set(home.map((p) => p.userId).filter((id): id is number => typeof id === "number")), [home]);
  const awayIds = useMemo(() => new Set(away.map((p) => p.userId).filter((id): id is number => typeof id === "number")), [away]);

  const trackedPlayers = useMemo(() => {
    if (!currentFrame || !Array.isArray(currentFrame.players)) return [] as Array<{ userId: number | null; x: number; y: number; side: Side | "neutral" }>;

    const toNumber = (value: unknown) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    return currentFrame.players
      .map((entry) => {
        const row = entry as Record<string, unknown>;
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
    const base = BASE_SPOTS[Math.min(idx, BASE_SPOTS.length - 1)] ?? BASE_SPOTS[0];
    if (side === "home") return base;
    return { x: 100 - base.x, y: base.y };
  };

  return (
    <div className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-black text-[var(--geo-text)]">Vista táctica del partido</h2>
        <div className="text-xs text-[var(--geo-text-muted)]">Datos arbitrales simulados</div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-emerald-400/40 bg-gradient-to-b from-emerald-800/70 to-emerald-900/80 p-3">
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <input
            type="range"
            min={0}
            max={Math.max(0, frames.length - 1)}
            value={Math.min(frameIndex, Math.max(0, frames.length - 1))}
            onChange={(e) => setFrameIndex(Number(e.target.value))}
            disabled={!frames.length}
            className="w-full accent-emerald-400"
          />
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            disabled={frames.length <= 1}
            className="rounded bg-black/30 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
          >
            {isPlaying ? "Pausar" : "Reproducir"}
          </button>
          <p className="text-right text-xs text-emerald-100/90">
            {currentFrame ? `Frame ${Math.min(frameIndex, frames.length - 1) + 1}/${frames.length} · ${currentFrame.period ?? "—"}` : "Sin tracking"}
          </p>
        </div>

        <div className="relative h-[560px] w-full rounded-lg border border-white/30">
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/40" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
          <div className="absolute left-0 top-1/2 h-40 w-16 -translate-y-1/2 border border-white/40 border-l-0" />
          <div className="absolute right-0 top-1/2 h-40 w-16 -translate-y-1/2 border border-white/40 border-r-0" />

          <div className="absolute left-3 top-2 rounded bg-black/30 px-2 py-1 text-xs font-bold text-emerald-200">
            {homeName}
          </div>
          <div className="absolute right-3 top-2 rounded bg-black/30 px-2 py-1 text-xs font-bold text-sky-200">
            {awayName}
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
}: {
  title: string;
  starters?: MatchDetailLineupEntry[];
  bench?: MatchDetailLineupEntry[];
  roster?: MatchSquadPlayerView[];
  unavailable?: MatchSquadPlayerView[];
}) {
  const safeStarters = Array.isArray(starters) ? starters : [];
  const safeBench = Array.isArray(bench) ? bench : [];

  return (
    <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
      <h3 className="font-black text-[var(--geo-text)]">{title}</h3>

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-match-detail", id],
    queryFn: () => getPublicMatchDetail(id),
    enabled: Number.isInteger(id) && id > 0,
  });

  const { data: analytics } = useQuery({
    queryKey: ["public-match-analytics", id],
    queryFn: () => getPublicMatchAnalytics(id),
    enabled: Number.isInteger(id) && id > 0,
  });

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

  const { match, detail } = data;
  const homeStarters = detail.squads?.home?.starters?.length
    ? detail.squads.home.starters.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail.homeStartingXI;

  const homeBench = detail.squads?.home?.bench?.length
    ? detail.squads.home.bench.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail.homeBench;

  const awayStarters = detail.squads?.away?.starters?.length
    ? detail.squads.away.starters.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail.awayStartingXI;

  const awayBench = detail.squads?.away?.bench?.length
    ? detail.squads.away.bench.map((p) => ({
        userId: p.id,
        name: p.name ?? undefined,
        number: p.jerseyNumber ?? undefined,
        position: p.position ?? undefined,
      }))
    : detail.awayBench;

  return (
    <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes text-[var(--geo-text)]">
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <Link to="/results" className="inline-flex items-center gap-2 text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
          <ArrowLeftIcon className="h-4 w-4" />
          Volver a resultados
        </Link>

        <section className="mt-4 rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
          <h1 className="font-geo text-3xl lg:text-4xl">Detalle de partido</h1>
          <p className="mt-2 text-lg text-[var(--geo-text)]">
            {match.homeTeam?.name ?? "Local"} vs {match.awayTeam?.name ?? "Visitante"}
          </p>
          <p className="mt-1 text-sm text-[var(--geo-text-muted)]">{match.roundName}</p>

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

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <TeamLineupCard
            title={`Alineación ${match.homeTeam?.name ?? "Local"}`}
            starters={homeStarters}
            bench={homeBench}
            roster={detail.squads?.home?.roster}
            unavailable={detail.squads?.home?.unavailable}
          />
          <TeamLineupCard
            title={`Alineación ${match.awayTeam?.name ?? "Visitante"}`}
            starters={awayStarters}
            bench={awayBench}
            roster={detail.squads?.away?.roster}
            unavailable={detail.squads?.away?.unavailable}
          />
        </section>

        <TacticalPitch
          homeStarters={homeStarters}
          awayStarters={awayStarters}
          homeName={match.homeTeam?.name ?? "Local"}
          awayName={match.awayTeam?.name ?? "Visitante"}
          analytics={analytics}
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
                  <p className="mt-1 text-2xl font-black text-geo-green">{analytics.trackingFrames?.length ?? 0}</p>
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
            </>
          ) : (
            <p className="text-sm text-[var(--geo-text-muted)]">Sin analytics disponibles para este partido.</p>
          )}
        </section>
      </main>
    </div>
  );
}
