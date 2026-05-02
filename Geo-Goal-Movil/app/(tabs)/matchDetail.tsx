import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getPublicMatchAnalytics, getPublicMatchDetail } from '@/Api/publicAPI';
import type { MatchAnalyticsResponse, MatchDetailLineupEntry } from '@/types';
import { Ionicons } from '@expo/vector-icons';

type Incident = { yellow: number; red: number; subOut: number; subIn: number };

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

function normalizeLineup(starters?: MatchDetailLineupEntry[]) {
  const rows = Array.isArray(starters) ? starters : [];
  return rows.slice(0, 11).map((p, idx) => ({
    idx,
    userId: typeof p.userId === 'number' ? p.userId : undefined,
    name: typeof p.name === 'string' && p.name.trim().length > 0 ? p.name : `Jugador ${idx + 1}`,
    number: typeof p.number === 'number' ? p.number : undefined,
  }));
}

function buildIncidentMap(analytics?: MatchAnalyticsResponse) {
  const map = new Map<number, Incident>();
  const events = analytics?.timelineEvents ?? [];

  const getOrInit = (playerId: number) => {
    if (!map.has(playerId)) map.set(playerId, { yellow: 0, red: 0, subOut: 0, subIn: 0 });
    return map.get(playerId)!;
  };

  for (const ev of events) {
    if (typeof ev.playerId === 'number') {
      const item = getOrInit(ev.playerId);
      if (ev.eventType === 'yellow_card') item.yellow += 1;
      if (ev.eventType === 'red_card') item.red += 1;
      if (ev.eventType === 'substitution') item.subOut += 1;
    }
    if (ev.eventType === 'substitution' && typeof ev.relatedPlayerId === 'number') {
      getOrInit(ev.relatedPlayerId).subIn += 1;
    }
  }

  return map;
}

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function MatchDetailMobileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const matchId = typeof id === 'string' ? Number(id) : typeof id === 'number' ? id : 0;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mobile-public-match-detail', matchId],
    queryFn: () => getPublicMatchDetail(matchId),
    enabled: Number.isInteger(matchId) && matchId > 0,
  });

  const { data: analytics } = useQuery({
    queryKey: ['mobile-public-match-analytics', matchId],
    queryFn: () => getPublicMatchAnalytics(matchId),
    enabled: Number.isInteger(matchId) && matchId > 0,
  });

  const [frameIndex, setFrameIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const frames = analytics?.trackingFrames ?? [];

  React.useEffect(() => {
    setFrameIndex(frames.length ? frames.length - 1 : 0);
    setIsPlaying(false);
  }, [frames.length]);

  React.useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;
    const timer = setInterval(() => {
      setFrameIndex((prev) => (prev >= frames.length - 1 ? 0 : prev + 1));
    }, 700);
    return () => clearInterval(timer);
  }, [isPlaying, frames.length]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-geo-black items-center justify-center">
        <ActivityIndicator color="#39FF14" />
        <Text className="text-gray-400 mt-3">Cargando detalle...</Text>
      </View>
    );
  }

  if (isError || !data?.match) {
    return (
      <View className="flex-1 bg-geo-black items-center justify-center px-6">
        <Text className="text-red-400 font-semibold text-center">No se pudo cargar el partido.</Text>
      </View>
    );
  }

  const { match, detail } = data;
  const home = normalizeLineup(detail.homeStartingXI);
  const away = normalizeLineup(detail.awayStartingXI);
  const homeBench = normalizeLineup(detail.homeBench);
  const awayBench = normalizeLineup(detail.awayBench);
  const incidents = buildIncidentMap(analytics);
  const currentFrame = frames.length ? frames[Math.min(frameIndex, frames.length - 1)] : null;

  const trackedByPlayer = new Map<number, { x: number; y: number }>();
  if (currentFrame?.players?.length) {
    for (const raw of currentFrame.players) {
      const row = raw as Record<string, unknown>;
      const userId = toNum(row.userId ?? row.playerId);
      const x = toNum(row.x);
      const y = toNum(row.y);
      if (userId != null && x != null && y != null && !trackedByPlayer.has(userId)) {
        trackedByPlayer.set(userId, {
          x: Math.max(0, Math.min(100, x)),
          y: Math.max(0, Math.min(100, y)),
        });
      }
    }
  }

  const toSpot = (idx: number, side: 'home' | 'away') => {
    const base = BASE_SPOTS[Math.min(idx, BASE_SPOTS.length - 1)] ?? BASE_SPOTS[0];
    if (side === 'home') return base;
    return { x: 100 - base.x, y: base.y };
  };

  return (
    <ScrollView className="flex-1 bg-geo-black px-4 py-4">
      <View className="flex-row items-center mb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#39FF14" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-bold text-lg">{match.homeTeam?.name || 'Local'} vs {match.awayTeam?.name || 'Visitante'}</Text>
          <Text className="text-gray-400 text-xs">{match.roundName}</Text>
        </View>
      </View>

      <View className="rounded-xl border border-geo-green/30 bg-gray-900 p-4 mb-4">
        <Text className="text-geo-green font-bold text-base">Marcador</Text>
        <Text className="text-white font-black text-3xl mt-1">{match.played ? `${match.homeScore} - ${match.awayScore}` : 'Pendiente'}</Text>
        <Text className="text-gray-400 text-xs mt-2">
          {detail.kickoffTime ? `Inicio: ${new Date(detail.kickoffTime).toLocaleString()}` : 'Inicio no programado'}
          {detail.matchDay ? ` · Jornada ${detail.matchDay}` : ''}
        </Text>
      </View>

      <View className="rounded-xl border border-geo-green/30 bg-gray-900 p-4 mb-4">
        <Text className="text-geo-green font-bold mb-3">Datos del partido</Text>
        <View className="flex-row flex-wrap gap-2">
          <MetaPill label="Árbitro" value={detail.referee || '—'} />
          <MetaPill label="Clima" value={detail.weather || '—'} />
          <MetaPill label="Asistencia" value={typeof detail.attendance === 'number' ? detail.attendance.toLocaleString() : '—'} />
          <MetaPill label="Duración" value={typeof detail.durationMinutes === 'number' ? `${detail.durationMinutes} min` : '—'} />
        </View>
        {detail.notes ? <Text className="text-gray-400 text-xs mt-3">{detail.notes}</Text> : null}
      </View>

      {analytics ? (
        <View className="rounded-xl border border-geo-green/30 bg-gray-900 p-4 mb-4">
          <Text className="text-geo-green font-bold mb-3">Resumen analítico</Text>
          <View className="flex-row flex-wrap gap-2">
            <MetaPill label="Jugadores" value={String(analytics.summary.totalPlayersWithStats)} />
            <MetaPill label="Pases" value={String(analytics.summary.totalPassEdges)} />
            <MetaPill label="Eventos espaciales" value={String(analytics.summary.totalSpatialEvents)} />
            <MetaPill label="Frames" value={String(analytics.trackingFrames.length)} />
          </View>
        </View>
      ) : null}

      <View className="rounded-xl border border-geo-green/30 bg-gray-900 p-4 mb-4">
        <Text className="text-geo-green font-bold mb-3">Alineaciones</Text>
        <View className="mb-3">
          <Text className="text-white font-semibold mb-2">Local</Text>
          <View className="flex-row flex-wrap gap-2">
            {home.map((p) => (
              <LineupChip key={`home-${p.userId ?? p.name}-${p.idx}`} number={p.number} name={p.name} incident={p.userId ? incidents.get(p.userId) : undefined} />
            ))}
          </View>
        </View>
        <View className="mb-3">
          <Text className="text-white font-semibold mb-2">Visitante</Text>
          <View className="flex-row flex-wrap gap-2">
            {away.map((p) => (
              <LineupChip key={`away-${p.userId ?? p.name}-${p.idx}`} number={p.number} name={p.name} incident={p.userId ? incidents.get(p.userId) : undefined} away />
            ))}
          </View>
        </View>
        <View>
          <Text className="text-white font-semibold mb-2">Banquillo</Text>
          <View className="flex-row flex-wrap gap-2">
            {homeBench.slice(0, 7).map((p) => (
              <MiniTag key={`hb-${p.userId ?? p.name}-${p.idx}`} label={`${p.number ?? '-'} ${p.name}`} />
            ))}
            {awayBench.slice(0, 7).map((p) => (
              <MiniTag key={`ab-${p.userId ?? p.name}-${p.idx}`} label={`${p.number ?? '-'} ${p.name}`} />
            ))}
          </View>
        </View>
      </View>

      <View className="rounded-xl border border-geo-green/30 bg-gray-900 p-4 mb-6">
        <Text className="text-geo-green font-bold mb-2">Replay táctico</Text>

        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            disabled={frames.length <= 1}
            onPress={() => setFrameIndex((v) => Math.max(0, v - 1))}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
          >
            <Text className="text-white text-xs font-bold">- Frame</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={frames.length <= 1}
            onPress={() => setIsPlaying((p) => !p)}
            className="rounded-lg border border-geo-green bg-geo-green/20 px-3 py-2"
          >
            <Text className="text-geo-green text-xs font-bold">{isPlaying ? 'Pausar' : 'Play'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={frames.length <= 1}
            onPress={() => setFrameIndex((v) => Math.min(frames.length - 1, v + 1))}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
          >
            <Text className="text-white text-xs font-bold">+ Frame</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-xs text-gray-400 mb-2">
          {currentFrame ? `Frame ${Math.min(frameIndex, frames.length - 1) + 1}/${frames.length} · ${currentFrame.period || '—'} · t=${Math.round(currentFrame.timestampMs / 1000)}s` : 'Sin tracking'}
        </Text>

        <View className="h-[480px] w-full overflow-hidden rounded-xl border border-emerald-300/40 bg-emerald-900">
          <View className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-[0.5px] bg-white/40" />
          <View className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-10 -translate-y-10 rounded-full border border-white/40" />
          <View className="absolute left-0 top-1/2 h-32 w-12 -translate-y-16 border border-white/40 border-l-0" />
          <View className="absolute right-0 top-1/2 h-32 w-12 -translate-y-16 border border-white/40 border-r-0" />

          {home.map((p) => {
            const tracked = typeof p.userId === 'number' ? trackedByPlayer.get(p.userId) : undefined;
            const pos = tracked ?? toSpot(p.idx, 'home');
            const incident = p.userId ? incidents.get(p.userId) : undefined;
            return (
              <View key={`h-${p.idx}-${p.userId ?? p.name}`} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: [{ translateX: -18 }, { translateY: -18 }] }}>
                <View className="h-9 w-9 items-center justify-center rounded-full border border-white bg-emerald-300">
                  <Text className="text-[10px] font-black text-emerald-950">{p.number ?? p.idx + 1}</Text>
                </View>
                {incident?.yellow ? <View className="absolute -right-2 -top-2 rounded bg-yellow-400 px-1"><Text className="text-[9px] font-black text-black">Y</Text></View> : null}
                {incident?.red ? <View className="absolute -right-2 -bottom-2 rounded bg-red-500 px-1"><Text className="text-[9px] font-black text-white">R</Text></View> : null}
              </View>
            );
          })}

          {away.map((p) => {
            const tracked = typeof p.userId === 'number' ? trackedByPlayer.get(p.userId) : undefined;
            const pos = tracked ?? toSpot(p.idx, 'away');
            const incident = p.userId ? incidents.get(p.userId) : undefined;
            return (
              <View key={`a-${p.idx}-${p.userId ?? p.name}`} className="absolute" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: [{ translateX: -18 }, { translateY: -18 }] }}>
                <View className="h-9 w-9 items-center justify-center rounded-full border border-white bg-sky-300">
                  <Text className="text-[10px] font-black text-sky-950">{p.number ?? p.idx + 1}</Text>
                </View>
                {incident?.yellow ? <View className="absolute -right-2 -top-2 rounded bg-yellow-400 px-1"><Text className="text-[9px] font-black text-black">Y</Text></View> : null}
                {incident?.red ? <View className="absolute -right-2 -bottom-2 rounded bg-red-500 px-1"><Text className="text-[9px] font-black text-white">R</Text></View> : null}
              </View>
            );
          })}

          {currentFrame?.ballX != null && currentFrame?.ballY != null ? (
            <View className="absolute" style={{ left: `${currentFrame.ballX}%`, top: `${currentFrame.ballY}%`, transform: [{ translateX: -8 }, { translateY: -8 }] }}>
              <View className="h-4 w-4 rounded-full border border-black bg-white" />
            </View>
          ) : null}
        </View>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className="rounded bg-yellow-400 px-2 py-1"><Text className="text-[10px] font-black text-black">Y: Amarilla</Text></View>
          <View className="rounded bg-red-500 px-2 py-1"><Text className="text-[10px] font-black text-white">R: Roja</Text></View>
        </View>
      </View>

      <View className="rounded-xl border border-geo-green/30 bg-gray-900 p-4 mb-8">
        <Text className="text-geo-green font-bold mb-2">Eventos recientes</Text>
        {(analytics?.timelineEvents ?? []).slice(-10).reverse().map((ev) => (
          <View key={`ev-${ev.id}`} className="rounded-lg bg-gray-800 p-3 mb-2">
            <Text className="text-white font-semibold">{ev.minute}&#39; · {ev.eventType}{ev.outcome ? ` (${ev.outcome})` : ''}</Text>
            <Text className="text-gray-400 text-xs">source: {ev.source || '—'} · conf: {typeof ev.confidence === 'number' ? ev.confidence.toFixed(2) : '—'}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[46%] flex-1 rounded-xl border border-geo-green/20 bg-gray-800 px-3 py-2">
      <Text className="text-[10px] uppercase tracking-wide text-gray-400">{label}</Text>
      <Text className="text-sm font-bold text-white mt-1" numberOfLines={1}>{value}</Text>
    </View>
  );
}

function LineupChip({ number, name, incident, away = false }: { number?: number; name: string; incident?: { yellow: number; red: number; subOut: number; subIn: number }; away?: boolean }) {
  const hasRed = Boolean(incident?.red);
  const hasYellow = Boolean(incident?.yellow);

  return (
    <View className={`rounded-full border px-3 py-2 ${away ? 'border-sky-300/40 bg-sky-300/10' : 'border-emerald-300/40 bg-emerald-300/10'}`}>
      <Text className={`text-xs font-semibold ${away ? 'text-sky-100' : 'text-emerald-100'}`} numberOfLines={1}>
        {number != null ? `${number}. ` : ''}{name}
        {hasYellow ? ' 🟨' : ''}
        {hasRed ? ' 🟥' : ''}
      </Text>
    </View>
  );
}

function MiniTag({ label }: { label: string }) {
  return (
    <View className="rounded-full border border-gray-700 bg-gray-800 px-3 py-2">
      <Text className="text-[10px] text-gray-300" numberOfLines={1}>{label}</Text>
    </View>
  );
}
