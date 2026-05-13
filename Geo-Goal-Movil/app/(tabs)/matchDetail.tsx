import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicMatchAnalytics, getPublicMatchDetail } from '@/Api/publicAPI';
import { getPlayersTeam, updateCoachLineup } from '@/Api/teamAPI';
import type { MatchAnalyticsResponse, MatchDetailLineupEntry } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';

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
  const { data: user } = useAuth();
  const isCoach = user?.role === 'coach';
  const queryClient = useQueryClient();
  const [selectedStarters, setSelectedStarters] = React.useState<number[]>([]);
  const [selectedBench, setSelectedBench] = React.useState<number[]>([]);
  const [selectedUnavailable, setSelectedUnavailable] = React.useState<number[]>([]);
  const [lineupMode, setLineupMode] = React.useState<7 | 11>(11);
  const [lineupError, setLineupError] = React.useState<string | null>(null);
  const [positionFilter, setPositionFilter] = React.useState<string>('all');
  const lineupInitializedRef = React.useRef(false);
  const MAX_BENCH = 20;
  const MAX_UNAVAILABLE = 30;

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

  const coachSide = isCoach && user?.id && data?.match
    ? data.match.homeTeam?.trainerId === user.id
      ? 'home'
      : data.match.awayTeam?.trainerId === user.id
        ? 'away'
        : null
    : null;

  const coachTeamId = coachSide === 'home'
    ? data?.match?.homeTeam?.id
    : coachSide === 'away'
      ? data?.match?.awayTeam?.id
      : null;

  const { data: coachRoster } = useQuery({
    queryKey: ['mobile-coach-roster', coachTeamId],
    queryFn: () => getPlayersTeam(coachTeamId as number),
    enabled: Number.isInteger(coachTeamId) && (coachTeamId as number) > 0,
  });

  const lineupMutation = useMutation({
    mutationFn: (payload: {
      startingXI: Array<Record<string, unknown>>;
      bench?: Array<Record<string, unknown>>;
      unavailable?: Array<Record<string, unknown>>;
    }) => updateCoachLineup(matchId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-public-match-detail', matchId] });
      queryClient.invalidateQueries({ queryKey: ['coachDashboard', user?.id] });
      setLineupError(null);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error ?? error?.message ?? 'No se pudo guardar la alineación';
      setLineupError(message);
    },
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

  React.useEffect(() => {
    if (!coachSide || lineupInitializedRef.current) return;
    const starters = coachSide === 'home'
      ? data?.detail?.homeStartingXI
      : data?.detail?.awayStartingXI;
    const bench = coachSide === 'home'
      ? data?.detail?.homeBench
      : data?.detail?.awayBench;
    const ids = (Array.isArray(starters) ? starters : [])
      .map((p) => (typeof p.userId === 'number' ? p.userId : null))
      .filter((id): id is number => typeof id === 'number');

    if (ids.length) {
      setSelectedStarters(ids);
      if (ids.length === 7 || ids.length === 11) {
        setLineupMode(ids.length as 7 | 11);
      }
    }

    const benchIds = (Array.isArray(bench) ? bench : [])
      .map((p) => (typeof p.userId === 'number' ? p.userId : null))
      .filter((id): id is number => typeof id === 'number');
    if (benchIds.length) setSelectedBench(benchIds);

    lineupInitializedRef.current = true;
  }, [coachSide, data?.detail?.homeStartingXI, data?.detail?.awayStartingXI, data?.detail?.homeBench, data?.detail?.awayBench]);

  const toggleStarter = (playerId: number) => {
    setSelectedStarters((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
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
      setLineupError('La liga debe definir si el formato es 7 u 11');
      return;
    }
    if (!coachRoster || !coachRoster.length) {
      setLineupError('No hay jugadores en el equipo');
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
      };
    });

    const bench = selectedBench.map((playerId) => {
      const player = rosterMap.get(playerId);
      return {
        userId: playerId,
        playerId,
        name: player?.playerName ?? player?.name ?? `Jugador ${playerId}`,
        number: player?.jerseyNumber ?? null,
      };
    });

    const unavailable = selectedUnavailable.map((playerId) => {
      const player = rosterMap.get(playerId);
      return {
        userId: playerId,
        playerId,
        name: player?.playerName ?? player?.name ?? `Jugador ${playerId}`,
        number: player?.jerseyNumber ?? null,
      };
    });

    lineupMutation.mutate({ startingXI, bench, unavailable });
  };

  const rosterPositions = React.useMemo(() => {
    const set = new Set<string>();
    (coachRoster ?? []).forEach((p) => {
      if (p.preferredPosition) set.add(p.preferredPosition);
    });
    return Array.from(set).sort();
  }, [coachRoster]);

  const filteredRoster = React.useMemo(() => {
    if (!coachRoster) return [];
    if (positionFilter === 'all') return coachRoster;
    return coachRoster.filter((p) => p.preferredPosition === positionFilter);
  }, [coachRoster, positionFilter]);

  const enforcedLineupMode = [7, 11].includes(Number(data?.match?.league?.lineupMode))
    ? (Number(data?.match?.league?.lineupMode) as 7 | 11)
    : null;

  const effectiveLineupMode = enforcedLineupMode ?? lineupMode;

  React.useEffect(() => {
    if (!data?.match) return;
    if (enforcedLineupMode) {
      setLineupMode(enforcedLineupMode);
      setSelectedStarters((prev) => prev.slice(0, enforcedLineupMode));
      setLineupError(null);
    } else {
      setLineupError('La liga debe definir si el formato es 7 u 11');
    }
  }, [enforcedLineupMode, data?.match]);

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
    <ScrollView className="flex-1 bg-geo-black px-4 py-5">
      <View className="flex-row items-center mb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-800/80 border border-geo-green/20">
          <Ionicons name="arrow-back" size={20} color="#39FF14" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-extrabold text-lg" numberOfLines={1}>{match.homeTeam?.name || 'Local'} vs {match.awayTeam?.name || 'Visitante'}</Text>
          <Text className="text-gray-400 text-xs">{match.roundName}</Text>
        </View>
      </View>

      <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4 mb-4">
        <Text className="text-geo-green font-bold text-base">Marcador</Text>
        <Text className="text-white font-black text-3xl mt-1">{match.played ? `${match.homeScore} - ${match.awayScore}` : 'Pendiente'}</Text>
        <Text className="text-gray-400 text-xs mt-2">
          {detail.kickoffTime ? `Inicio: ${new Date(detail.kickoffTime).toLocaleString()}` : 'Inicio no programado'}
          {detail.matchDay ? ` · Jornada ${detail.matchDay}` : ''}
        </Text>
      </View>

      <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4 mb-4">
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
        <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4 mb-4">
          <Text className="text-geo-green font-bold mb-3">Resumen analítico</Text>
          <View className="flex-row flex-wrap gap-2">
            <MetaPill label="Jugadores" value={String(analytics.summary.totalPlayersWithStats)} />
            <MetaPill label="Pases" value={String(analytics.summary.totalPassEdges)} />
            <MetaPill label="Eventos espaciales" value={String(analytics.summary.totalSpatialEvents)} />
            <MetaPill label="Frames" value={String(analytics.trackingFrames.length)} />
          </View>
        </View>
      ) : null}

      {coachSide ? (
        <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-geo-green font-bold">Tu alineación inicial</Text>
              <Text className="text-gray-400 text-xs">Selecciona {effectiveLineupMode} titulares</Text>
            </View>
            <View className="flex-row items-center">
              {enforcedLineupMode ? (
                <View className="rounded-lg border border-geo-green/40 bg-geo-green/20 px-3 py-1">
                  <Text className="text-geo-green text-xs font-bold">Formato {enforcedLineupMode} vs {enforcedLineupMode}</Text>
                </View>
              ) : (
                <View className="flex-row rounded-lg border border-gray-700 overflow-hidden mr-2">
                  {[7, 11].map((mode) => (
                    <TouchableOpacity
                      key={`mode-${mode}`}
                      onPress={() => {
                        setLineupMode(mode as 7 | 11);
                        setSelectedStarters((prev) => prev.slice(0, mode));
                        setLineupError(null);
                      }}
                      className={`px-3 py-1 ${lineupMode === mode ? 'bg-geo-green' : 'bg-transparent'}`}
                    >
                      <Text className={`${lineupMode === mode ? 'text-black' : 'text-gray-300'} text-xs font-bold`}>{mode}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {rosterPositions.length ? (
            <View className="flex-row flex-wrap gap-2 mb-3">
              <TouchableOpacity
                onPress={() => setPositionFilter('all')}
                className={`rounded-full px-3 py-1 border ${positionFilter === 'all' ? 'border-geo-green bg-geo-green/20' : 'border-gray-700'}`}
              >
                <Text className={`text-xs ${positionFilter === 'all' ? 'text-geo-green' : 'text-gray-300'}`}>Todas</Text>
              </TouchableOpacity>
              {rosterPositions.map((pos) => (
                <TouchableOpacity
                  key={`pos-${pos}`}
                  onPress={() => setPositionFilter(pos)}
                  className={`rounded-full px-3 py-1 border ${positionFilter === pos ? 'border-geo-green bg-geo-green/20' : 'border-gray-700'}`}
                >
                  <Text className={`text-xs ${positionFilter === pos ? 'text-geo-green' : 'text-gray-300'}`}>{pos}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {lineupError ? (
            <Text className="text-red-400 text-xs mb-2">{lineupError}</Text>
          ) : null}

          <View className="mb-3">
            <Text className="text-white text-xs font-semibold mb-2">Titulares ({selectedStarters.length}/{effectiveLineupMode})</Text>
            <View className="flex-row flex-wrap gap-2">
              {filteredRoster.map((player) => {
                const isSelected = selectedStarters.includes(player.id);
                const isLocked = !isSelected && selectedStarters.length >= lineupMode;
                const label = player.playerName || player.name;
                return (
                  <TouchableOpacity
                    key={`coach-starter-${player.id}`}
                    onPress={() => toggleStarter(player.id)}
                    disabled={isLocked}
                    className={`rounded-lg border px-3 py-2 ${
                      isSelected
                        ? 'border-geo-green bg-geo-green/20'
                        : 'border-gray-700 bg-gray-800'
                    } ${isLocked ? 'opacity-50' : ''}`}
                  >
                    <Text className="text-white text-xs font-semibold">{label}</Text>
                    <Text className="text-gray-400 text-[10px]">#{player.jerseyNumber ?? '—'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="mb-3">
            <Text className="text-white text-xs font-semibold mb-2">Banca ({selectedBench.length}/{MAX_BENCH})</Text>
            <View className="flex-row flex-wrap gap-2">
              {filteredRoster.map((player) => {
                const isSelected = selectedBench.includes(player.id);
                const label = player.playerName || player.name;
                return (
                  <TouchableOpacity
                    key={`coach-bench-${player.id}`}
                    onPress={() => toggleBench(player.id)}
                    className={`rounded-lg border px-3 py-2 ${
                      isSelected
                        ? 'border-blue-400 bg-blue-400/20'
                        : 'border-gray-700 bg-gray-800'
                    }`}
                  >
                    <Text className="text-white text-xs font-semibold">{label}</Text>
                    <Text className="text-gray-400 text-[10px]">#{player.jerseyNumber ?? '—'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View>
            <Text className="text-white text-xs font-semibold mb-2">No disponibles ({selectedUnavailable.length}/{MAX_UNAVAILABLE})</Text>
            <View className="flex-row flex-wrap gap-2">
              {filteredRoster.map((player) => {
                const isSelected = selectedUnavailable.includes(player.id);
                const label = player.playerName || player.name;
                return (
                  <TouchableOpacity
                    key={`coach-unavailable-${player.id}`}
                    onPress={() => toggleUnavailable(player.id)}
                    className={`rounded-lg border px-3 py-2 ${
                      isSelected
                        ? 'border-red-400 bg-red-400/20'
                        : 'border-gray-700 bg-gray-800'
                    }`}
                  >
                    <Text className="text-white text-xs font-semibold">{label}</Text>
                    <Text className="text-gray-400 text-[10px]">#{player.jerseyNumber ?? '—'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {!coachRoster?.length ? (
            <Text className="text-gray-400 text-xs">No hay jugadores registrados.</Text>
          ) : null}

          <View className="flex-row items-center justify-between mt-3">
            <Text className="text-gray-400 text-xs">
              Titulares: {selectedStarters.length}/{effectiveLineupMode} · Banca: {selectedBench.length} · No disponibles: {selectedUnavailable.length}
            </Text>
            <TouchableOpacity
              onPress={handleSaveLineup}
              disabled={lineupMutation.isPending}
              className="rounded-lg bg-geo-green px-4 py-2"
            >
              <Text className="text-black text-xs font-bold">
                {lineupMutation.isPending ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4 mb-4">
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

      <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4 mb-6">
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
