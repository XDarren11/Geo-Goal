import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPublicMatchAnalytics, getPublicMatchDetail, uploadMatchVideo, getAnalysisStatus, submitAnalysisKeypoints, getAIServiceHealth, type AnalysisStatusResponse, type AIServiceHealth } from '@/Api/publicAPI';
import { getPlayersTeam, updateCoachLineup } from '@/Api/teamAPI';
import type { MatchAnalyticsResponse, MatchDetailLineupEntry, TrackingFramePlayer } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';

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
  const isAdmin = user?.role === 'admin';

  // ── Video analysis state (admin) ──
  const [analysisOpen, setAnalysisOpen] = React.useState(false);
  const [videoUri, setVideoUri] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadStep, setUploadStep] = React.useState<'select' | 'annotate' | 'progress'>('select');
  const [srcPts, setSrcPts] = React.useState<Array<{ x: number; y: number }>>([]);
  const [analysisStatus, setAnalysisStatus] = React.useState<AnalysisStatusResponse | null>(null);
  const [aiHealth, setAiHealth] = React.useState<AIServiceHealth | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [uploadResult, setUploadResult] = React.useState<string | null>(null);

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

  // ── Video upload mutation ──
  const uploadMutation = useMutation({
    mutationFn: ({ uri }: { uri: string }) => uploadMatchVideo(matchId, uri, (pct) => setUploadProgress(pct)),
    onSuccess: () => {
      setUploadStep('annotate');
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error ?? error?.message ?? 'Error al subir el video';
      setUploadError(msg);
      setUploadStep('select');
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const keypointsMutation = useMutation({
    mutationFn: (pts: Array<{ x: number; y: number }>) => submitAnalysisKeypoints(matchId, pts),
    onSuccess: () => {
      setUploadStep('progress');
      setAnalysisStatus({ status: 'processing', progress: 0, currentStep: 'starting' });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.error ?? error?.message ?? 'Error al iniciar el análisis';
      setUploadError(msg);
    },
  });

  // ── Poll analysis status ──
  React.useEffect(() => {
    if (uploadStep !== 'progress') return;
    const interval = setInterval(async () => {
      try {
        const status = await getAnalysisStatus(matchId);
        setAnalysisStatus(status);
        if (status.status === 'completed' || status.status === 'failed') {
          setUploadResult(
            status.status === 'completed'
              ? 'Análisis completado. Refresca la página para ver los resultados.'
              : `Error: ${status.error ?? 'Falló el análisis'}`
          );
        }
      } catch {
        // ignore polling errors
      }
      try {
        const health = await getAIServiceHealth();
        setAiHealth(health);
      } catch {
        setAiHealth(null);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [uploadStep, matchId]);

  const resetUpload = () => {
    setAnalysisOpen(false);
    setVideoUri(null);
    setUploadResult(null);
    setUploadError(null);
    setSrcPts([]);
    setUploadStep('select');
    setAnalysisStatus(null);
    setUploadProgress(0);
  };

  const handlePickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar un video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setVideoUri(asset.uri);
    setUploadError(null);
    setSrcPts([]);
    setUploadProgress(0);
    setUploading(true);
    uploadMutation.mutate({ uri: asset.uri });
  };

  const handleSubmitKeypoints = () => {
    if (srcPts.length !== 4) return;
    setUploadError(null);
    keypointsMutation.mutate(srcPts);
  };

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

  const homeTeamId = analytics?.match?.homeTeamId ?? data?.match?.homeTeamId;
  const awayTeamId = analytics?.match?.awayTeamId ?? data?.match?.awayTeamId;

  const trackedPlayers: TrackingFramePlayer[] = currentFrame?.players?.length
    ? (currentFrame.players as unknown as TrackingFramePlayer[])
    : [];

  const homeTracked = trackedPlayers.filter((p) => typeof p.teamId === 'number' && p.teamId === homeTeamId);
  const awayTracked = trackedPlayers.filter((p) => typeof p.teamId === 'number' && p.teamId === awayTeamId);
  const hasTracking = homeTracked.length > 0 || awayTracked.length > 0;

  const toSpot = (idx: number, side: 'home' | 'away') => {
    const base = BASE_SPOTS[Math.min(idx, BASE_SPOTS.length - 1)] ?? BASE_SPOTS[0];
    if (side === 'home') return base;
    return { x: 100 - base.x, y: base.y };
  };

  return (
    <>
    <ScrollView className="flex-1 bg-geo-black px-4 py-5">
      <View className="flex-row items-center mb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gray-800/80 border border-geo-green/20">
          <Ionicons name="arrow-back" size={20} color="#39FF14" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-extrabold text-lg" numberOfLines={1}>{match.homeTeam?.name || 'Local'} vs {match.awayTeam?.name || 'Visitante'}</Text>
          <Text className="text-gray-400 text-xs">{match.roundName}</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => setAnalysisOpen(true)}
            className="rounded-lg bg-geo-green px-4 py-2 flex-row items-center"
          >
            <Ionicons name="videocam" size={16} color="#000" />
            <Text className="text-black text-xs font-bold ml-1">Analizar</Text>
          </TouchableOpacity>
        )}
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

          {hasTracking ? (
            <>
              {homeTracked.map((p, i) => (
                <View key={`ht-${i}`} className="absolute" style={{ left: `${p.x ?? 50}%`, top: `${p.y ?? 50}%`, transform: [{ translateX: -10 }, { translateY: -10 }] }}>
                  <View className="h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-400 shadow-lg">
                    <Text className="text-[8px] font-black text-emerald-950">{p.playerId ?? i + 1}</Text>
                  </View>
                </View>
              ))}
              {awayTracked.map((p, i) => (
                <View key={`at-${i}`} className="absolute" style={{ left: `${p.x ?? 50}%`, top: `${p.y ?? 50}%`, transform: [{ translateX: -10 }, { translateY: -10 }] }}>
                  <View className="h-5 w-5 items-center justify-center rounded-full border border-white bg-sky-400 shadow-lg">
                    <Text className="text-[8px] font-black text-sky-950">{p.playerId ?? i + 1}</Text>
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              {home.map((p) => {
                const pos = toSpot(p.idx, 'home');
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
                const pos = toSpot(p.idx, 'away');
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
            </>
          )}

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

    {/* ── Video Analysis Modal (admin) ── */}
    <Modal visible={analysisOpen} animationType="fade" transparent>
      <View className="flex-1 bg-black/70 justify-center items-center px-4">
        <View className="w-full max-w-md rounded-2xl border border-geo-green/20 bg-gray-900 p-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white font-bold text-lg">Subir video para análisis</Text>
            <TouchableOpacity onPress={resetUpload}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {uploadResult && analysisStatus?.status !== 'processing' ? (
            <View className="space-y-4">
              <View className={`rounded-lg border p-4 ${analysisStatus?.status === 'failed' ? 'border-red-500/40 bg-red-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}>
                <Text className={`text-sm ${analysisStatus?.status === 'failed' ? 'text-red-400' : 'text-emerald-300'}`}>
                  {uploadResult}
                </Text>
              </View>
              <TouchableOpacity onPress={resetUpload} className="rounded-lg bg-geo-green px-4 py-3 items-center">
                <Text className="text-black text-sm font-bold">Entendido</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-4">
              {/* Step 1: Select video */}
              {uploadStep === 'select' && (
                <>
                  <Text className="text-gray-400 text-sm">
                    Selecciona un video de cámara táctica (MP4, MOV). Se subirá automáticamente y luego podrás ingresar las esquinas del campo.
                  </Text>

                  {uploading ? (
                    <View className="space-y-3">
                      <View className="flex-row items-center gap-2">
                        <ActivityIndicator color="#39FF14" />
                        <Text className="text-gray-400 text-sm">Subiendo video…</Text>
                      </View>
                      <View className="space-y-2">
                        <View className="flex-row justify-between">
                          <Text className="text-gray-400 text-xs">Progreso de subida</Text>
                          <Text className="text-gray-400 text-xs">{uploadProgress}%</Text>
                        </View>
                        <View className="w-full h-3 rounded-full bg-gray-800 overflow-hidden">
                          <View className="h-full rounded-full bg-geo-green" style={{ width: `${uploadProgress}%` }} />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handlePickVideo}
                      className="rounded-xl border-2 border-dashed border-gray-700 p-6 items-center"
                    >
                      <Ionicons name="videocam" size={40} color="#9ca3af" />
                      <Text className="text-gray-300 text-sm mt-2 font-medium">
                        {videoUri ? 'Video seleccionado' : 'Toca para seleccionar un video'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {uploadError && (
                    <View className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                      <Text className="text-red-400 text-sm">{uploadError}</Text>
                    </View>
                  )}
                </>
              )}

              {/* Step 2: Annotate keypoints */}
              {uploadStep === 'annotate' && (
                <>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-geo-green text-xs font-semibold">Paso 1 de 2</Text>
                    <TouchableOpacity onPress={() => { setUploadStep('select'); setSrcPts([]); }}>
                      <Text className="text-gray-400 text-sm">← Cambiar video</Text>
                    </TouchableOpacity>
                  </View>

                  <View className="rounded-lg border border-geo-green/30 bg-geo-green/10 p-3">
                    <Text className="text-white text-xs">
                      Ingresa las coordenadas (x, y) de 4 esquinas del campo en píxeles:
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      1. Superior izquierda  2. Superior derecha  3. Inferior derecha  4. Inferior izquierda
                    </Text>
                  </View>

                  {[0, 1, 2, 3].map((i) => (
                    <View key={`pt-${i}`} className="flex-row items-center gap-2">
                      <View className={`w-4 h-4 rounded-full ${i < 2 ? 'bg-geo-green' : 'bg-yellow-400'}`} />
                      <Text className="text-white text-xs w-24">Punto {i + 1}:</Text>
                      <TextInput
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white text-xs"
                        placeholder={`x${i + 1}`}
                        placeholderTextColor="#6b7280"
                        keyboardType="numeric"
                        value={srcPts[i]?.x?.toString() ?? ''}
                        onChangeText={(text) => {
                          const v = parseInt(text, 10);
                          setSrcPts((prev) => {
                            const next = [...prev];
                            if (!Number.isNaN(v)) {
                              next[i] = { x: v, y: next[i]?.y ?? 0 };
                            } else {
                              delete next[i];
                            }
                            return next.filter(Boolean);
                          });
                        }}
                      />
                      <TextInput
                        className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white text-xs"
                        placeholder={`y${i + 1}`}
                        placeholderTextColor="#6b7280"
                        keyboardType="numeric"
                        value={srcPts[i]?.y?.toString() ?? ''}
                        onChangeText={(text) => {
                          const v = parseInt(text, 10);
                          setSrcPts((prev) => {
                            const next = [...prev];
                            if (!Number.isNaN(v)) {
                              next[i] = { x: next[i]?.x ?? 0, y: v };
                            } else {
                              delete next[i];
                            }
                            return next.filter(Boolean);
                          });
                        }}
                      />
                    </View>
                  ))}

                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-400 text-sm">Puntos: {srcPts.length} / 4</Text>
                    <TouchableOpacity onPress={() => setSrcPts([])} disabled={srcPts.length === 0}>
                      <Text className={`text-xs ${srcPts.length === 0 ? 'text-gray-600' : 'text-gray-400'}`}>Reiniciar</Text>
                    </TouchableOpacity>
                  </View>

                  {uploadError && (
                    <View className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                      <Text className="text-red-400 text-sm">{uploadError}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    disabled={keypointsMutation.isPending || srcPts.length !== 4}
                    onPress={handleSubmitKeypoints}
                    className="w-full rounded-lg bg-geo-green px-4 py-3 items-center disabled:opacity-40"
                  >
                    <Text className="text-black text-sm font-bold">
                      {keypointsMutation.isPending ? 'Enviando…' : 'Iniciar análisis'}
                    </Text>
                  </TouchableOpacity>

                  <Text className="text-gray-500 text-xs text-center">
                    Ingresa los 4 puntos para habilitar el botón de análisis.
                  </Text>
                </>
              )}

              {/* Step 3: Processing progress */}
              {uploadStep === 'progress' && (
                <>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-geo-green text-xs font-semibold">Paso 2 de 2</Text>
                    <View className="flex-row items-center gap-2">
                      {aiHealth && (
                        <View className="flex-row items-center gap-1">
                          <View className={`w-2 h-2 rounded-full ${aiHealth.worker_running ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <Text className={`text-[10px] ${aiHealth.worker_running ? 'text-emerald-400' : 'text-red-400'}`}>
                            AI {aiHealth.worker_running ? 'online' : 'offline'}
                          </Text>
                        </View>
                      )}
                      <Text className="text-gray-400 text-xs capitalize">
                        {analysisStatus?.status === 'completed' ? 'Completado' :
                         analysisStatus?.status === 'failed' ? 'Falló' : 'Procesando…'}
                      </Text>
                    </View>
                  </View>

                  <View className="space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-400 text-xs">
                        {analysisStatus?.currentStep ?? 'Procesando…'}
                      </Text>
                      <Text className="text-gray-400 text-xs">{analysisStatus?.progress ?? 0}%</Text>
                    </View>
                    <View className="w-full h-3 rounded-full bg-gray-800 overflow-hidden">
                      <View
                        className={`h-full rounded-full ${analysisStatus?.status === 'failed' ? 'bg-red-500' : 'bg-geo-green'}`}
                        style={{ width: `${analysisStatus?.progress ?? 0}%` }}
                      />
                    </View>
                  </View>

                  {analysisStatus?.framesProcessed != null && analysisStatus?.totalFrames != null && (
                    <Text className="text-gray-500 text-xs text-center">
                      Frames: {analysisStatus.framesProcessed} / {analysisStatus.totalFrames}
                    </Text>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
    </>
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
