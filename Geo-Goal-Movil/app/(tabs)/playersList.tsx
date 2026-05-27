import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getPublicPlayersList, getPublicLeagues, type PublicPlayerListItem } from '@/Api/publicAPI';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';

type SortBy = 'rating' | 'goals' | 'assists' | 'matches';

function ratingColor(r: number): string {
  if (r >= 8) return '#10b981';
  if (r >= 7) return '#34d399';
  if (r >= 6) return '#fbbf24';
  if (r >= 4) return '#f97316';
  if (r > 0) return '#ef4444';
  return '#6b7280';
}

function PlayerRow({ player, onPress }: { player: PublicPlayerListItem; onPress: () => void }) {
  const initial = player.name?.[0]?.toUpperCase() ?? '?';
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center gap-3 bg-gray-900/80 border border-geo-green/20 rounded-2xl p-3 mb-2"
    >
      {/* Avatar */}
      <View className="w-12 h-12 rounded-full border-2 border-geo-green/40 bg-geo-green/10 items-center justify-center">
        <Text className="text-geo-green text-lg font-black">{initial}</Text>
      </View>
      {/* Info */}
      <View className="flex-1 min-w-0">
        <Text className="text-white font-bold text-sm" numberOfLines={1}>{player.name}</Text>
        {player.username ? (
          <Text className="text-gray-500 text-xs">@{player.username}</Text>
        ) : null}
        {player.team ? (
          <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>⚽ {player.team.name}</Text>
        ) : null}
      </View>
      {/* Stats */}
      <View className="items-end gap-0.5">
        <Text style={{ color: ratingColor(player.avgRating) }} className="text-base font-black">
          {player.avgRating > 0 ? player.avgRating.toFixed(1) : '—'}
        </Text>
        <Text className="text-gray-500 text-[10px]">
          {player.totalGoals}G · {player.totalAssists}A
        </Text>
        <Text className="text-gray-600 text-[10px]">{player.matchCount} PJ</Text>
      </View>
    </TouchableOpacity>
  );
}

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'rating', label: '⭐ Rating' },
  { key: 'goals', label: '⚽ Goles' },
  { key: 'assists', label: '🅰️ Asist.' },
  { key: 'matches', label: '📋 PJ' },
];

const PAGE_SIZE = 20;

export default function PlayersListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [page, setPage] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['public', 'playersList', searchDebounced, sortBy, page],
    queryFn: () =>
      getPublicPlayersList({
        page,
        pageSize: PAGE_SIZE,
        sortBy,
        search: searchDebounced || undefined,
      }),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const players = data?.players ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <View className="flex-1 bg-geo-black">
      {/* Header */}
      <View className="bg-gray-900/90 border-b border-geo-green/30 px-4 pt-6 pb-4">
        <View className="flex-row items-center gap-3">
          <BackButton />
          <View className="flex-1">
            <Text className="text-gray-400 text-xs">Descubre</Text>
            <Text className="text-geo-green text-xl font-extrabold">Jugadores</Text>
          </View>
          {isFetching && !isLoading ? (
            <ActivityIndicator size="small" color="#39FF14" />
          ) : null}
        </View>

        {/* Buscador */}
        <View className="mt-3 flex-row items-center rounded-xl border border-gray-700/60 bg-gray-800/60 px-3 gap-2">
          <Ionicons name="search" size={16} color="#6b7280" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre…"
            placeholderTextColor="#4b5563"
            className="flex-1 text-white py-2.5 text-sm"
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Ordenar */}
        <View className="flex-row gap-2 mt-3">
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => { setSortBy(opt.key); setPage(1); }}
              className={`flex-1 py-1.5 rounded-lg items-center border ${
                sortBy === opt.key
                  ? 'bg-geo-green border-geo-green'
                  : 'border-geo-green/30 bg-transparent'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${sortBy === opt.key ? 'text-geo-black' : 'text-gray-400'}`}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Lista */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#39FF14" />
          <Text className="text-gray-400 mt-3">Cargando jugadores…</Text>
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-400 text-center">No se pudieron cargar los jugadores.</Text>
        </View>
      ) : players.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="search" size={48} color="#374151" />
          <Text className="text-gray-500 mt-3 text-center">No hay jugadores que coincidan con tu búsqueda.</Text>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => String(item.playerId)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={() => { setPage(1); refetch(); }} tintColor="#39FF14" />
          }
          renderItem={({ item }) => (
            <PlayerRow
              player={item}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/playerCareerDashboard',
                  params: { playerId: String(item.playerId), name: item.name },
                } as any)
              }
            />
          )}
          ListFooterComponent={
            totalPages > 1 ? (
              <View className="flex-row justify-center items-center gap-4 pt-2 pb-4">
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={`px-4 py-2 rounded-xl border border-geo-green/40 ${page <= 1 ? 'opacity-40' : ''}`}
                >
                  <Text className="text-geo-green text-sm font-bold">← Anterior</Text>
                </TouchableOpacity>
                <Text className="text-gray-400 text-sm">{page}/{totalPages}</Text>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={`px-4 py-2 rounded-xl border border-geo-green/40 ${page >= totalPages ? 'opacity-40' : ''}`}
                >
                  <Text className="text-geo-green text-sm font-bold">Siguiente →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
