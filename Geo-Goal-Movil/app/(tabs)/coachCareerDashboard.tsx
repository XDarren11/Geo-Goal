import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCoachDashboard } from '@/Api/publicAPI';
import { addFavorite, removeFavoriteByEntity, getFavoriteIds } from '@/Api/favoritesAPI';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';
import Loader from '@/components/Loader';

function ResultBadge({ r }: { r: 'W' | 'D' | 'L' }) {
  const bg = r === 'W' ? 'bg-emerald-500/20' : r === 'D' ? 'bg-gray-500/20' : 'bg-red-500/20';
  const tc = r === 'W' ? 'text-emerald-300' : r === 'D' ? 'text-gray-300' : 'text-red-300';
  return (
    <View className={`w-6 h-6 rounded items-center justify-center ${bg}`}>
      <Text className={`text-[10px] font-black ${tc}`}>{r}</Text>
    </View>
  );
}

export default function CoachCareerDashboardScreen() {
  const router = useRouter();
  const { coachId, name: coachNameParam } = useLocalSearchParams<{ coachId: string; name?: string }>();
  const { data: user } = useAuth();
  const queryClient = useQueryClient();

  const id = Number(coachId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['coachCareerDashboard', id],
    queryFn: () => getCoachDashboard(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });

  const { data: favIds = [] } = useQuery({
    queryKey: ['account', 'favorites', 'ids'],
    queryFn: getFavoriteIds,
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFav = favIds.some((f) => f.entityType === 'coach' && f.entityId === id);

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFav) return removeFavoriteByEntity({ entityType: 'coach', entityId: id });
      return addFavorite({ entityType: 'coach', entityId: id, label: data?.coach?.name ?? coachNameParam ?? undefined });
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

  const recentStreak = data.recentResults?.slice(0, 10) ?? [];

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
        <Text className="text-gray-400 text-xs mt-3">Dashboard del coach</Text>
        <Text className="text-white text-2xl font-extrabold">{data.coach.name}</Text>
        <Text className="text-gray-500 text-xs mt-1">{data.totalMatches} partidos dirigidos</Text>

        {recentStreak.length > 0 && (
          <View className="flex-row gap-1 mt-3">
            {recentStreak.map((r, i) => (
              <ResultBadge key={i} r={r.result} />
            ))}
          </View>
        )}
      </View>

      <View className="px-4 pt-5 space-y-4">
        {/* Win rate */}
        <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
          <Text className="text-gray-400 text-xs uppercase tracking-wider mb-2">Rendimiento global</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-emerald-400 font-bold">{data.wins}V</Text>
            <Text className="text-gray-400 font-bold">{data.draws}E</Text>
            <Text className="text-red-400 font-bold">{data.losses}D</Text>
            <Text className="text-geo-green font-bold">{(data.winRate * 100).toFixed(0)}% victorias</Text>
          </View>
          {/* Barra nativa de win rate */}
          <View className="h-2.5 rounded-full bg-gray-700/50 overflow-hidden flex-row">
            <View style={{ flex: data.wins }} className="bg-emerald-500" />
            <View style={{ flex: data.draws }} className="bg-gray-500" />
            <View style={{ flex: data.losses }} className="bg-red-500" />
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="flex-1 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-3 items-center">
            <Text className="text-gray-400 text-[10px] uppercase">GF/PJ</Text>
            <Text className="text-white text-xl font-black">{data.avgGoalsFor.toFixed(2)}</Text>
          </View>
          <View className="flex-1 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-3 items-center">
            <Text className="text-gray-400 text-[10px] uppercase">GC/PJ</Text>
            <Text className="text-white text-xl font-black">{data.avgGoalsAgainst.toFixed(2)}</Text>
          </View>
        </View>

        {/* Equipos dirigidos */}
        {data.teamsManaged?.length > 0 && (
          <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
            <Text className="text-white font-bold text-base mb-3">Equipos dirigidos</Text>
            {data.teamsManaged.map((t, i) => (
              <TouchableOpacity
                key={t.teamId}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/teamCareerDashboard', params: { teamId: String(t.teamId), name: t.teamName } } as any)
                }
                className={`flex-row items-center justify-between py-2 ${i < data.teamsManaged.length - 1 ? 'border-b border-gray-700/40' : ''}`}
              >
                <Text className="text-geo-green text-sm font-semibold flex-1" numberOfLines={1}>{t.teamName}</Text>
                <Text className="text-gray-400 text-xs">{t.matches} PJ · {t.wins}V</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Top jugadores formados */}
        {data.topFormedPlayers?.length > 0 && (
          <View className="rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
            <Text className="text-white font-bold text-base mb-3">Jugadores destacados</Text>
            {data.topFormedPlayers.slice(0, 5).map((p, i) => (
              <TouchableOpacity
                key={p.playerId}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/playerCareerDashboard', params: { playerId: String(p.playerId), name: p.name } } as any)
                }
                className={`flex-row items-center justify-between py-2 ${i < Math.min(data.topFormedPlayers.length, 5) - 1 ? 'border-b border-gray-700/40' : ''}`}
              >
                <Text className="text-geo-green text-sm font-semibold flex-1" numberOfLines={1}>{p.name}</Text>
                <Text className="text-gray-400 text-xs">{p.goals}G · {p.avgRating.toFixed(1)}★</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
