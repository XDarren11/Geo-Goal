import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlayerDashboard } from '@/Api/publicAPI';
import {
  addFavorite,
  removeFavoriteByEntity,
  getFavoriteIds,
} from '@/Api/favoritesAPI';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';
import Loader from '@/components/Loader';

function ratingColor(r: number): string {
  if (r >= 8) return '#10b981';
  if (r >= 7) return '#34d399';
  if (r >= 6) return '#fbbf24';
  if (r >= 4) return '#f97316';
  return '#ef4444';
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-3 items-center">
      <Text className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">{label}</Text>
      <Text className="text-white text-xl font-black">{value}</Text>
      {sub ? <Text className="text-gray-500 text-[10px] mt-0.5">{sub}</Text> : null}
    </View>
  );
}

function ResultBadge({ r }: { r: 'W' | 'D' | 'L' | '—' }) {
  const colors: Record<string, string> = {
    W: 'bg-emerald-500/20',
    D: 'bg-gray-500/20',
    L: 'bg-red-500/20',
    '—': 'bg-gray-700/20',
  };
  const textColors: Record<string, string> = {
    W: 'text-emerald-300',
    D: 'text-gray-300',
    L: 'text-red-300',
    '—': 'text-gray-500',
  };
  return (
    <View className={`w-7 h-7 rounded-md items-center justify-center ${colors[r] ?? 'bg-gray-700/20'}`}>
      <Text className={`text-xs font-black ${textColors[r] ?? 'text-gray-500'}`}>{r}</Text>
    </View>
  );
}

export default function PlayerCareerDashboardScreen() {
  const router = useRouter();
  const { playerId, name: playerName } = useLocalSearchParams<{ playerId: string; name?: string }>();
  const { data: user } = useAuth();
  const queryClient = useQueryClient();

  const id = Number(playerId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['playerCareerDashboard', id],
    queryFn: () => getPlayerDashboard(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });

  const { data: favIds = [] } = useQuery({
    queryKey: ['account', 'favorites', 'ids'],
    queryFn: getFavoriteIds,
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFav = favIds.some((f) => f.entityType === 'player' && f.entityId === id);

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFav) return removeFavoriteByEntity({ entityType: 'player', entityId: id });
      return addFavorite({ entityType: 'player', entityId: id, label: data?.player?.name ?? playerName ?? undefined });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'favorites', 'ids'] });
      queryClient.invalidateQueries({ queryKey: ['account', 'favorites'] });
    },
    onError: () => Alert.alert('Error', 'No se pudo actualizar favoritos'),
  });

  if (isLoading) return <Loader fullScreen label="Cargando estadísticas..." />;
  if (isError || !data) {
    return (
      <View className="flex-1 bg-geo-black items-center justify-center px-6">
        <Text className="text-red-400 text-center mb-4">No se pudieron cargar las estadísticas.</Text>
        <BackButton />
      </View>
    );
  }

  const goalsPerMatch = data.matchesPlayed > 0 ? (data.goals / data.matchesPlayed).toFixed(2) : '0.00';

  return (
    <ScrollView className="flex-1 bg-geo-black" contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View className="bg-gray-900/90 border-b border-geo-green/30 px-4 pt-6 pb-4">
        <View className="flex-row items-center justify-between">
          <BackButton />
          {user ? (
            <TouchableOpacity
              onPress={() => toggleFav.mutate()}
              disabled={toggleFav.isPending}
              className={`p-2 rounded-full border-2 ${isFav ? 'border-yellow-400 bg-yellow-400/10' : 'border-geo-green/30 bg-transparent'}`}
            >
              <Ionicons name={isFav ? 'star' : 'star-outline'} size={20} color={isFav ? '#facc15' : '#39FF14'} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text className="text-gray-400 text-xs mt-3">Estadísticas de carrera</Text>
        <Text className="text-white text-2xl font-extrabold">{data.player.name}</Text>
        {data.player.username ? (
          <Text className="text-geo-green text-xs mt-0.5">@{data.player.username}</Text>
        ) : null}
        <Text className="text-gray-500 text-xs mt-1">
          {data.matchesPlayed} partidos · {data.minutesPlayed} min jugados
        </Text>
      </View>

      <View className="px-4 pt-5 space-y-4">
        {/* Rating y MVP */}
        {(data.avgRating > 0 || data.mvpCount > 0) && (
          <View className="flex-row gap-3">
            {data.avgRating > 0 && (
              <View className="flex-1 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4 items-center">
                <Text className="text-gray-400 text-[10px] uppercase tracking-widest">Rating prom.</Text>
                <Text style={{ color: ratingColor(data.avgRating) }} className="text-3xl font-black mt-1">
                  {data.avgRating.toFixed(1)}
                </Text>
              </View>
            )}
            {data.mvpCount > 0 && (
              <View className="flex-1 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 items-center">
                <Text className="text-yellow-300 text-[10px] uppercase tracking-widest">🏆 MVPs</Text>
                <Text className="text-yellow-300 text-3xl font-black mt-1">{data.mvpCount}</Text>
              </View>
            )}
          </View>
        )}

        {/* KPI Grid */}
        <View className="flex-row gap-2 flex-wrap">
          <View className="flex-row gap-2 w-full">
            <KpiCard label="Goles" value={data.goals} sub={`${goalsPerMatch}/PJ`} />
            <KpiCard label="Asistencias" value={data.assists} sub={`${data.keyPasses} pases clave`} />
          </View>
          <View className="flex-row gap-2 w-full">
            <KpiCard label="Minutos" value={data.minutesPlayed} />
            <KpiCard label="xG" value={data.xG?.toFixed(2) ?? '0.00'} />
          </View>
          {(data.yellowCards > 0 || data.redCards > 0) && (
            <View className="flex-row gap-2 w-full">
              <KpiCard label="Amarillas" value={data.yellowCards} />
              <KpiCard label="Rojas" value={data.redCards} />
            </View>
          )}
        </View>

        {/* Últimos partidos */}
        {data.recentMatches?.length > 0 && (
          <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
            <Text className="text-white font-bold text-base mb-3">Últimos partidos</Text>
            {data.recentMatches.slice(0, 8).map((m, i) => (
              <View
                key={m.matchId}
                className={`flex-row items-center justify-between py-2 ${i < data.recentMatches.slice(0, 8).length - 1 ? 'border-b border-gray-700/40' : ''}`}
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <ResultBadge r={m.result} />
                  <View className="flex-1">
                    <Text className="text-white text-xs font-semibold" numberOfLines={1}>{m.opponent}</Text>
                    <Text className="text-gray-500 text-[10px]">{new Date(m.date).toLocaleDateString()}</Text>
                  </View>
                </View>
                <View className="flex-row gap-3 items-center">
                  <Text className="text-emerald-400 text-xs font-bold">{m.goals}G</Text>
                  <Text className="text-sky-400 text-xs font-bold">{m.assists}A</Text>
                  {m.rating != null ? (
                    <Text style={{ color: ratingColor(m.rating) }} className="text-xs font-black w-8 text-right">
                      {m.rating.toFixed(1)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Equipos */}
        {data.topTeams?.length > 0 && (
          <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
            <Text className="text-white font-bold text-base mb-3">Equipos</Text>
            {data.topTeams.map((t, i) => (
              <TouchableOpacity
                key={t.teamId}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/teamCareerDashboard', params: { teamId: String(t.teamId), name: t.teamName } } as any)
                }
                className={`flex-row items-center justify-between py-2 ${i < data.topTeams.length - 1 ? 'border-b border-gray-700/40' : ''}`}
              >
                <Text className="text-geo-green text-sm font-semibold flex-1" numberOfLines={1}>{t.teamName}</Text>
                <Text className="text-gray-400 text-xs">{t.matches} PJ · {t.goals} G</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
