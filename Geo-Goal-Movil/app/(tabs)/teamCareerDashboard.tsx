import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTeamDashboard } from '@/Api/publicAPI';
import { addFavorite, removeFavoriteByEntity, getFavoriteIds } from '@/Api/favoritesAPI';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';
import Loader from '@/components/Loader';

function ratingColor(r: number): string {
  if (r >= 8) return '#10b981';
  if (r >= 7) return '#34d399';
  if (r >= 6) return '#fbbf24';
  return '#f97316';
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-3 items-center">
      <Text className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">{label}</Text>
      <Text style={accent ? { color: accent } : undefined} className={`text-xl font-black ${!accent ? 'text-white' : ''}`}>
        {value}
      </Text>
      {sub ? <Text className="text-gray-500 text-[10px] mt-0.5">{sub}</Text> : null}
    </View>
  );
}

function FormBadge({ r }: { r: 'W' | 'D' | 'L' }) {
  const bg = r === 'W' ? 'bg-emerald-500/20' : r === 'D' ? 'bg-gray-500/20' : 'bg-red-500/20';
  const tc = r === 'W' ? 'text-emerald-300' : r === 'D' ? 'text-gray-300' : 'text-red-300';
  return (
    <View className={`w-6 h-6 rounded items-center justify-center ${bg}`}>
      <Text className={`text-[10px] font-black ${tc}`}>{r}</Text>
    </View>
  );
}

export default function TeamCareerDashboardScreen() {
  const router = useRouter();
  const { teamId, name: teamNameParam } = useLocalSearchParams<{ teamId: string; name?: string }>();
  const { data: user } = useAuth();
  const queryClient = useQueryClient();

  const id = Number(teamId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['teamCareerDashboard', id],
    queryFn: () => getTeamDashboard(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });

  const { data: favIds = [] } = useQuery({
    queryKey: ['account', 'favorites', 'ids'],
    queryFn: getFavoriteIds,
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFav = favIds.some((f) => f.entityType === 'team' && f.entityId === id);

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFav) return removeFavoriteByEntity({ entityType: 'team', entityId: id });
      return addFavorite({ entityType: 'team', entityId: id, label: data?.team?.name ?? teamNameParam ?? undefined });
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

  const maxFormation = data.formations?.length
    ? data.formations.reduce((a, b) => (a.count > b.count ? a : b))
    : null;

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
              className={`p-2 rounded-full border-2 ${isFav ? 'border-yellow-400 bg-yellow-400/10' : 'border-geo-green/30'}`}
            >
              <Ionicons name={isFav ? 'star' : 'star-outline'} size={20} color={isFav ? '#facc15' : '#39FF14'} />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text className="text-gray-400 text-xs mt-3">Dashboard del equipo</Text>
        <Text className="text-white text-2xl font-extrabold">{data.team.name}</Text>
        <Text className="text-gray-500 text-xs mt-1">
          {data.matchesPlayed} PJ · {data.points} pts · {data.pointsPerMatch.toFixed(2)} PPP
        </Text>

        {/* Racha reciente */}
        {data.formStreak?.length > 0 && (
          <View className="flex-row gap-1 mt-3">
            {data.formStreak.slice(0, 10).map((r, i) => (
              <FormBadge key={i} r={r} />
            ))}
          </View>
        )}
      </View>

      <View className="px-4 pt-5 space-y-4">
        {/* KPIs W/D/L */}
        <View className="flex-row gap-2">
          <KpiCard label="V" value={data.wins} accent="#10b981" />
          <KpiCard label="E" value={data.draws} accent="#9ca3af" />
          <KpiCard label="D" value={data.losses} accent="#ef4444" />
        </View>
        <View className="flex-row gap-2">
          <KpiCard label="GF" value={data.goalsFor} />
          <KpiCard label="GC" value={data.goalsAgainst} />
          <KpiCard label="DG" value={data.goalsFor - data.goalsAgainst} />
        </View>

        {maxFormation && (
          <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4 flex-row items-center justify-between">
            <Text className="text-gray-400 text-sm">Formación más usada</Text>
            <Text className="text-geo-green font-black text-lg">{maxFormation.formation}</Text>
          </View>
        )}

        {/* Top goleadores */}
        {data.topScorers?.length > 0 && (
          <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
            <Text className="text-white font-bold text-base mb-3">Top goleadores</Text>
            {data.topScorers.slice(0, 5).map((p, i) => (
              <TouchableOpacity
                key={p.playerId}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/playerCareerDashboard',
                    params: { playerId: String(p.playerId), name: p.name },
                  } as any)
                }
                className={`flex-row items-center justify-between py-2 ${i < Math.min(data.topScorers.length, 5) - 1 ? 'border-b border-gray-700/40' : ''}`}
              >
                <Text className="text-geo-green text-sm font-semibold flex-1" numberOfLines={1}>{p.name}</Text>
                <Text className="text-gray-400 text-xs">{p.goals} G · {p.avgRating.toFixed(1)} ⭐</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Top asistidores */}
        {data.topAssistants?.length > 0 && (
          <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
            <Text className="text-white font-bold text-base mb-3">Top asistidores</Text>
            {data.topAssistants.slice(0, 5).map((p, i) => (
              <TouchableOpacity
                key={p.playerId}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/playerCareerDashboard',
                    params: { playerId: String(p.playerId), name: p.name },
                  } as any)
                }
                className={`flex-row items-center justify-between py-2 ${i < Math.min(data.topAssistants.length, 5) - 1 ? 'border-b border-gray-700/40' : ''}`}
              >
                <Text className="text-geo-green text-sm font-semibold flex-1" numberOfLines={1}>{p.name}</Text>
                <Text className="text-gray-400 text-xs">{p.assists} A</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
