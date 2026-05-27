/**
 * Pantalla de búsqueda universal — Jugadores · Equipos · Entrenadores · Ligas
 * Accesible desde la pestaña Explorar mediante el botón "Buscar"
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  getPublicPlayersList,
  getPublicTeamsList,
  getPublicCoachesList,
  getPublicLeagues,
  type PublicPlayerListItem,
  type PublicTeamListItem,
  type PublicCoachListItem,
} from '@/Api/publicAPI';
import type { PublicLeagueSummary } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';

// ─── Colores por tab ──────────────────────────────────────────────────────────
const TAB_CONFIG = [
  { key: 'players',  label: 'Jugadores',    icon: 'person-outline',    color: '#a78bfa' },
  { key: 'teams',    label: 'Equipos',       icon: 'shield-outline',    color: '#38bdf8' },
  { key: 'coaches',  label: 'Entrenadores',  icon: 'clipboard-outline', color: '#fb923c' },
  { key: 'leagues',  label: 'Ligas',         icon: 'trophy-outline',    color: '#39FF14' },
] as const;

type TabKey = typeof TAB_CONFIG[number]['key'];

// ─── Rating helper ────────────────────────────────────────────────────────────
function ratingColor(r: number): string {
  if (r >= 8) return '#10b981';
  if (r >= 7) return '#34d399';
  if (r >= 6) return '#fbbf24';
  if (r >= 4) return '#f97316';
  if (r > 0) return '#ef4444';
  return '#6b7280';
}

// ─── Row components ───────────────────────────────────────────────────────────

function PlayerRow({ player, onPress }: { player: PublicPlayerListItem; onPress: () => void }) {
  const initial = player.name?.[0]?.toUpperCase() ?? '?';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#a78bfa20',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 2,
          borderColor: '#a78bfa50',
          backgroundColor: '#a78bfa10',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#a78bfa', fontSize: 18, fontWeight: '900' }}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#f3f4f6', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {player.name}
        </Text>
        {player.username ? (
          <Text style={{ color: '#a78bfa', fontSize: 11 }}>@{player.username}</Text>
        ) : null}
        {player.team ? (
          <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
            ⚽ {player.team.name}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ color: ratingColor(player.avgRating), fontSize: 17, fontWeight: '900' }}>
          {player.avgRating > 0 ? player.avgRating.toFixed(1) : '—'}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 10 }}>
          {player.totalGoals}G · {player.totalAssists}A
        </Text>
        <Text style={{ color: '#4b5563', fontSize: 10 }}>{player.matchCount} PJ</Text>
      </View>
    </TouchableOpacity>
  );
}

function TeamRow({ item, onPress }: { item: PublicTeamListItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#38bdf820',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: '#38bdf850',
          backgroundColor: '#38bdf810',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="shield-outline" size={20} color="#38bdf8" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#f3f4f6', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </Text>
        {item.league ? (
          <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
            🏆 {item.league.name}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#38bdf8" />
    </TouchableOpacity>
  );
}

function CoachRow({ item, onPress }: { item: PublicCoachListItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#fb923c20',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: '#fb923c50',
          backgroundColor: '#fb923c10',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="clipboard-outline" size={20} color="#fb923c" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#f3f4f6', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </Text>
        {item.username ? (
          <Text style={{ color: '#fb923c', fontSize: 11 }}>@{item.username}</Text>
        ) : null}
        {item.teams?.length > 0 ? (
          <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
            🛡️ {item.teams.map((t) => t.name).join(', ')}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#fb923c" />
    </TouchableOpacity>
  );
}

function LeagueRow({ item, onPress }: { item: PublicLeagueSummary; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#39FF1420',
        borderRadius: 16,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: '#39FF1450',
          backgroundColor: '#39FF1410',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="trophy-outline" size={20} color="#39FF14" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#f3f4f6', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </Text>
        {item.description ? (
          <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#39FF14" />
    </TouchableOpacity>
  );
}

// ─── Sort pills for players tab ───────────────────────────────────────────────
type SortBy = 'rating' | 'goals' | 'assists' | 'matches';
const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'rating',   label: '⭐ Rating' },
  { key: 'goals',    label: '⚽ Goles'  },
  { key: 'assists',  label: '🅰️ Asist.' },
  { key: 'matches',  label: '📋 PJ'     },
];
const PAGE_SIZE = 20;

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();

  const initialTab = (TAB_CONFIG.find((t) => t.key === params.tab)?.key ?? 'players') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [page, setPage] = useState(1);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTab = TAB_CONFIG.find((t) => t.key === activeTab)!;

  // Debounce
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 350);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [search]);

  // Reset page on tab change
  useEffect(() => { setPage(1); }, [activeTab]);

  // ── Queries ──
  const { data: playersData, isLoading: loadingPlayers, isFetching: fetchingPlayers, refetch: refetchPlayers } = useQuery({
    queryKey: ['search', 'players', searchDebounced, sortBy, page],
    queryFn: () => getPublicPlayersList({ page, pageSize: PAGE_SIZE, sortBy, search: searchDebounced || undefined }),
    enabled: activeTab === 'players',
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const { data: teamsData, isLoading: loadingTeams, isFetching: fetchingTeams, refetch: refetchTeams } = useQuery({
    queryKey: ['search', 'teams', searchDebounced, page],
    queryFn: () => getPublicTeamsList({ search: searchDebounced || undefined, page, pageSize: PAGE_SIZE }),
    enabled: activeTab === 'teams',
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const { data: coachesData, isLoading: loadingCoaches, isFetching: fetchingCoaches, refetch: refetchCoaches } = useQuery({
    queryKey: ['search', 'coaches', searchDebounced, page],
    queryFn: () => getPublicCoachesList({ search: searchDebounced || undefined, page, pageSize: PAGE_SIZE }),
    enabled: activeTab === 'coaches',
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const { data: leaguesRaw = [], isLoading: loadingLeagues, refetch: refetchLeagues } = useQuery({
    queryKey: ['public-leagues'],
    queryFn: getPublicLeagues,
    enabled: activeTab === 'leagues',
    staleTime: 60_000,
  });

  // Leagues are filtered client-side (small list)
  const filteredLeagues = searchDebounced
    ? leaguesRaw.filter((l) => l.name.toLowerCase().includes(searchDebounced.toLowerCase()))
    : leaguesRaw;

  // Per-tab derived state
  const players    = playersData?.players ?? [];
  const teams      = teamsData?.items    ?? [];
  const coaches    = coachesData?.items  ?? [];

  const playersTotal  = playersData?.total ?? 0;
  const teamsTotal    = teamsData?.total   ?? 0;
  const coachesTotal  = coachesData?.total ?? 0;

  const playersPages  = Math.max(1, Math.ceil(playersTotal  / PAGE_SIZE));
  const teamsPages    = Math.max(1, Math.ceil(teamsTotal    / PAGE_SIZE));
  const coachesPages  = Math.max(1, Math.ceil(coachesTotal  / PAGE_SIZE));

  const isLoading  = activeTab === 'players' ? loadingPlayers  : activeTab === 'teams' ? loadingTeams  : activeTab === 'coaches' ? loadingCoaches  : loadingLeagues;
  const isFetching = activeTab === 'players' ? fetchingPlayers : activeTab === 'teams' ? fetchingTeams : activeTab === 'coaches' ? fetchingCoaches : false;

  const totalPages =
    activeTab === 'players' ? playersPages :
    activeTab === 'teams'   ? teamsPages   :
    activeTab === 'coaches' ? coachesPages : 1;

  function refetchActive() {
    if (activeTab === 'players')  return refetchPlayers();
    if (activeTab === 'teams')    return refetchTeams();
    if (activeTab === 'coaches')  return refetchCoaches();
    return refetchLeagues();
  }

  // ── Render list data ──
  const listData: any[] =
    activeTab === 'players' ? players   :
    activeTab === 'teams'   ? teams     :
    activeTab === 'coaches' ? coaches   : filteredLeagues;

  const empty = !isLoading && listData.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#0d1117' }}>

      {/* ── Header ── */}
      <View
        style={{
          backgroundColor: '#0f172a',
          borderBottomWidth: 1,
          borderBottomColor: currentTab.color + '30',
          paddingHorizontal: 16,
          paddingTop: 52,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#9ca3af', fontSize: 11 }}>Búsqueda</Text>
            <Text style={{ color: currentTab.color, fontSize: 20, fontWeight: '800' }}>
              {currentTab.label}
            </Text>
          </View>
          {isFetching && !isLoading ? (
            <ActivityIndicator size="small" color={currentTab.color} />
          ) : null}
        </View>

        {/* Search bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
            backgroundColor: '#1f2937',
            borderWidth: 1,
            borderColor: currentTab.color + '30',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="search" size={16} color={currentTab.color} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={`Buscar ${currentTab.label.toLowerCase()}…`}
            placeholderTextColor="#4b5563"
            style={{ flex: 1, color: '#fff', fontSize: 14 }}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#6b7280" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tab pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10 }}
          contentContainerStyle={{ gap: 6, paddingRight: 4 }}
        >
          {TAB_CONFIG.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: active ? tab.color : tab.color + '30',
                  backgroundColor: active ? tab.color + '20' : 'transparent',
                }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={12}
                  color={active ? tab.color : '#6b7280'}
                />
                <Text
                  style={{
                    color: active ? tab.color : '#6b7280',
                    fontSize: 12,
                    fontWeight: active ? '800' : '500',
                  }}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sort pills — players only */}
        {activeTab === 'players' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
            contentContainerStyle={{ gap: 6, paddingRight: 4 }}
          >
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => { setSortBy(opt.key); setPage(1); }}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: sortBy === opt.key ? '#a78bfa' : '#a78bfa30',
                  backgroundColor: sortBy === opt.key ? '#a78bfa20' : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: sortBy === opt.key ? '#a78bfa' : '#6b7280',
                    fontSize: 11,
                    fontWeight: '700',
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={currentTab.color} />
          <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 13 }}>
            Cargando {currentTab.label.toLowerCase()}…
          </Text>
        </View>
      ) : empty ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Ionicons name={currentTab.icon as any} size={48} color="#374151" />
          <Text style={{ color: '#6b7280', marginTop: 12, textAlign: 'center', fontSize: 14 }}>
            {search
              ? `No se encontraron ${currentTab.label.toLowerCase()} con "${search}"`
              : `No hay ${currentTab.label.toLowerCase()} disponibles`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) =>
            activeTab === 'players'  ? String(item.playerId)  :
            activeTab === 'teams'    ? String(item.teamId)    :
            activeTab === 'coaches'  ? String(item.coachId)   : String(item.id)
          }
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => { setPage(1); refetchActive(); }}
              tintColor={currentTab.color}
            />
          }
          renderItem={({ item }) => {
            if (activeTab === 'players') {
              return (
                <PlayerRow
                  player={item}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/playerCareerDashboard',
                      params: { playerId: String(item.playerId), name: item.name },
                    } as any)
                  }
                />
              );
            }
            if (activeTab === 'teams') {
              return (
                <TeamRow
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/teamCareerDashboard' as any,
                      params: { teamId: String(item.teamId), name: item.name },
                    })
                  }
                />
              );
            }
            if (activeTab === 'coaches') {
              return (
                <CoachRow
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/coachCareerDashboard' as any,
                      params: { coachId: String(item.coachId), name: item.name },
                    })
                  }
                />
              );
            }
            // leagues
            return (
              <LeagueRow
                item={item}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/leagueDetail',
                    params: { id: String(item.id), name: item.name },
                  })
                }
              />
            );
          }}
          ListFooterComponent={
            totalPages > 1 && activeTab !== 'leagues' ? (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 16,
                  paddingTop: 8,
                }}
              >
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: currentTab.color + '40',
                    opacity: page <= 1 ? 0.4 : 1,
                  }}
                >
                  <Text style={{ color: currentTab.color, fontSize: 13, fontWeight: '700' }}>
                    ← Anterior
                  </Text>
                </TouchableOpacity>
                <Text style={{ color: '#9ca3af', fontSize: 13 }}>
                  {page} / {totalPages}
                </Text>
                <TouchableOpacity
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: currentTab.color + '40',
                    opacity: page >= totalPages ? 0.4 : 1,
                  }}
                >
                  <Text style={{ color: currentTab.color, fontSize: 13, fontWeight: '700' }}>
                    Siguiente →
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
