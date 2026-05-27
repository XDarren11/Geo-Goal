import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  getPublicLeagues,
  getPublicPlayersList,
  getPublicTeamsList,
  getPublicCoachesList,
} from '@/Api/publicAPI';
import { getMyPlayerTeams, getMyTeams } from '@/Api/teamAPI';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, color = '#39FF14' }: { icon: any; label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <View
        style={{
          width: 3,
          height: 14,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <Ionicons name={icon} size={13} color={color} />
      <Text style={{ color, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <Text style={{ color: '#4b5563', fontSize: 12, paddingLeft: 4, marginBottom: 4 }}>
      No se encontraron {label}
    </Text>
  );
}

// ─── Search result rows ───────────────────────────────────────────────────────

function LeagueRow({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#39FF1420',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: '#39FF1410',
          borderWidth: 1,
          borderColor: '#39FF1430',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="trophy-outline" size={16} color="#39FF14" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </Text>
        {item.description ? (
          <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

function TeamRow({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#38bdf820',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: '#38bdf810',
          borderWidth: 1,
          borderColor: '#38bdf830',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="shield-outline" size={16} color="#38bdf8" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </Text>
        {item.league ? (
          <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
            {item.league.name}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

function PlayerRow({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#a78bfa20',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: '#a78bfa15',
          borderWidth: 1,
          borderColor: '#a78bfa30',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="person-outline" size={16} color="#a78bfa" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </Text>
        {item.username ? (
          <Text style={{ color: '#a78bfa', fontSize: 11, marginTop: 1 }}>
            @{item.username}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

function CoachRow({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#0f172a',
        borderWidth: 1,
        borderColor: '#fb923c20',
        borderRadius: 14,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: '#fb923c10',
          borderWidth: 1,
          borderColor: '#fb923c30',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="clipboard-outline" size={16} color="#fb923c" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
          {item.name}
        </Text>
        {item.teams?.length > 0 ? (
          <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }} numberOfLines={1}>
            {item.teams.map((t: any) => t.name).join(', ')}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const router = useRouter();
  const { data: user } = useAuth();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const isSearching = trimmed.length >= 2;

  // ── Default data ──
  const {
    data: leagues = [],
    isLoading: leaguesLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['public-leagues'],
    queryFn: getPublicLeagues,
    staleTime: 60_000,
  });

  const { data: playerTeams = [] } = useQuery({
    queryKey: ['my-player-teams-explore'],
    queryFn: getMyPlayerTeams,
    enabled: user?.role === 'player',
    staleTime: 5 * 60_000,
  });

  const { data: coachTeams = [] } = useQuery({
    queryKey: ['my-coach-teams-explore'],
    queryFn: getMyTeams,
    enabled: user?.role === 'coach',
    staleTime: 5 * 60_000,
  });

  // ── Search queries (lazy) ──
  const { data: searchLeagues, isFetching: loadingLeagues } = useQuery({
    queryKey: ['search-leagues', trimmed],
    queryFn: async () => {
      // Filter already-loaded leagues client-side (no extra endpoint needed)
      return leagues.filter((l) =>
        l.name.toLowerCase().includes(trimmed.toLowerCase())
      );
    },
    enabled: isSearching && leagues.length > 0,
    staleTime: 30_000,
  });

  const { data: searchTeamsData, isFetching: loadingTeams } = useQuery({
    queryKey: ['search-teams', trimmed],
    queryFn: () => getPublicTeamsList({ search: trimmed, pageSize: 10 }),
    enabled: isSearching,
    staleTime: 30_000,
  });

  const { data: searchPlayersData, isFetching: loadingPlayers } = useQuery({
    queryKey: ['search-players', trimmed],
    queryFn: () => getPublicPlayersList({ search: trimmed, pageSize: 10 }),
    enabled: isSearching,
    staleTime: 30_000,
  });

  const { data: searchCoachesData, isFetching: loadingCoaches } = useQuery({
    queryKey: ['search-coaches', trimmed],
    queryFn: () => getPublicCoachesList({ search: trimmed, pageSize: 10 }),
    enabled: isSearching,
    staleTime: 30_000,
  });

  const searchBusy = loadingLeagues || loadingTeams || loadingPlayers || loadingCoaches;

  const filteredLeagues = isSearching ? (searchLeagues ?? []) : leagues;
  const searchTeams = searchTeamsData?.items ?? [];
  const searchPlayers = searchPlayersData?.players ?? [];
  const searchCoaches = searchCoachesData?.items ?? [];

  const singlePlayerTeam =
    user?.role === 'player' && playerTeams.length === 1 ? playerTeams[0] : null;
  const multiPlayerTeams =
    user?.role === 'player' && playerTeams.length > 1 ? playerTeams : [];

  // ─── SEARCH RESULTS VIEW ───────────────────────────────────────────────────
  if (isSearching) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d1117' }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: '#0f172a',
            borderBottomWidth: 1,
            borderBottomColor: '#39FF1430',
            paddingHorizontal: 16,
            paddingTop: 52,
            paddingBottom: 12,
          }}
        >
          <Text style={{ color: '#9ca3af', fontSize: 11 }}>Descubre</Text>
          <Text style={{ color: '#39FF14', fontSize: 24, fontWeight: '800' }}>Explorar</Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              marginTop: 10,
              backgroundColor: '#1f2937',
              borderWidth: 1,
              borderColor: '#374151',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Ionicons name="search" size={16} color="#39FF14" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar ligas, equipos, jugadores, coaches…"
              placeholderTextColor="#6b7280"
              autoFocus
              style={{ flex: 1, color: '#fff', fontSize: 14 }}
            />
            {searchBusy ? (
              <ActivityIndicator size="small" color="#39FF14" />
            ) : (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

          {/* ── Ligas ── */}
          <View style={{ marginBottom: 20 }}>
            <SectionHeader icon="trophy-outline" label="Ligas" color="#39FF14" />
            {filteredLeagues.length === 0
              ? <EmptySection label="ligas" />
              : filteredLeagues.slice(0, 5).map((item) => (
                <LeagueRow
                  key={item.id}
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/leagueDetail',
                      params: { id: String(item.id), name: item.name },
                    })
                  }
                />
              ))}
          </View>

          {/* ── Equipos ── */}
          <View style={{ marginBottom: 20 }}>
            <SectionHeader icon="shield-outline" label="Equipos" color="#38bdf8" />
            {loadingTeams && searchTeams.length === 0
              ? <ActivityIndicator size="small" color="#38bdf8" style={{ marginBottom: 8 }} />
              : searchTeams.length === 0
                ? <EmptySection label="equipos" />
                : searchTeams.map((item) => (
                  <TeamRow
                    key={item.teamId}
                    item={item}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/teamCareerDashboard' as any,
                        params: { teamId: String(item.teamId), name: item.name },
                      })
                    }
                  />
                ))}
          </View>

          {/* ── Jugadores ── */}
          <View style={{ marginBottom: 20 }}>
            <SectionHeader icon="person-outline" label="Jugadores" color="#a78bfa" />
            {loadingPlayers && searchPlayers.length === 0
              ? <ActivityIndicator size="small" color="#a78bfa" style={{ marginBottom: 8 }} />
              : searchPlayers.length === 0
                ? <EmptySection label="jugadores" />
                : searchPlayers.map((item) => (
                  <PlayerRow
                    key={item.playerId}
                    item={item}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/playerCareerDashboard' as any,
                        params: { playerId: String(item.playerId), name: item.name },
                      })
                    }
                  />
                ))}
          </View>

          {/* ── Entrenadores ── */}
          <View style={{ marginBottom: 20 }}>
            <SectionHeader icon="clipboard-outline" label="Entrenadores" color="#fb923c" />
            {loadingCoaches && searchCoaches.length === 0
              ? <ActivityIndicator size="small" color="#fb923c" style={{ marginBottom: 8 }} />
              : searchCoaches.length === 0
                ? <EmptySection label="entrenadores" />
                : searchCoaches.map((item) => (
                  <CoachRow
                    key={item.coachId}
                    item={item}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/coachCareerDashboard' as any,
                        params: { coachId: String(item.coachId), name: item.name },
                      })
                    }
                  />
                ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── DEFAULT VIEW (no search) ─────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0d1117' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#0f172a',
          borderBottomWidth: 1,
          borderBottomColor: '#39FF1430',
          paddingHorizontal: 16,
          paddingTop: 52,
          paddingBottom: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: '#9ca3af', fontSize: 11 }}>Descubre</Text>
            <Text style={{ color: '#39FF14', fontSize: 24, fontWeight: '800' }}>Explorar</Text>
          </View>
          {isFetching && !leaguesLoading ? (
            <ActivityIndicator size="small" color="#39FF14" />
          ) : null}
        </View>

        {/* Search bar */}
        <TouchableOpacity
          onPress={() => {/* just focus the input */}}
          activeOpacity={1}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
            backgroundColor: '#1f2937',
            borderWidth: 1,
            borderColor: '#374151',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Ionicons name="search" size={16} color="#6b7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar ligas, equipos, jugadores, coaches…"
            placeholderTextColor="#6b7280"
            style={{ flex: 1, color: '#fff', fontSize: 14 }}
          />
        </TouchableOpacity>

        {/* Quick access buttons */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
          {[
            { label: 'Jugadores', icon: 'person-outline',   color: '#a78bfa', tab: 'players'  },
            { label: 'Equipos',   icon: 'shield-outline',   color: '#38bdf8', tab: 'teams'    },
            { label: 'Coaches',   icon: 'clipboard-outline',color: '#fb923c', tab: 'coaches'  },
            { label: 'Ligas',     icon: 'trophy-outline',   color: '#39FF14', tab: 'leagues'  },
          ].map((btn) => (
            <TouchableOpacity
              key={btn.tab}
              onPress={() => router.push({ pathname: '/(tabs)/playersList' as any, params: { tab: btn.tab } })}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                paddingVertical: 6,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: btn.color + '30',
                backgroundColor: btn.color + '10',
              }}
            >
              <Ionicons name={btn.icon as any} size={11} color={btn.color} />
              <Text style={{ color: btn.color, fontSize: 10, fontWeight: '700' }}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredLeagues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} tintColor="#39FF14" />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>

            {/* ── GUEST: banner ── */}
            {!user ? (
              <View
                style={{
                  backgroundColor: '#0f172a',
                  borderWidth: 1,
                  borderColor: '#39FF1420',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Ionicons name="football" size={16} color="#39FF14" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Únete a Geo-Goal</Text>
                </View>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                  Registrate para guardar favoritos, seguir tu equipo y recibir notificaciones en tiempo real.
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    onPress={() => router.push('/(Auth)/RegisterView' as any)}
                    style={{ flex: 1, backgroundColor: '#39FF14', borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#0d1117', fontWeight: '800', fontSize: 13 }}>Crear cuenta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push('/(Auth)/login' as any)}
                    style={{ flex: 1, borderWidth: 1, borderColor: '#39FF1440', borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#39FF14', fontWeight: '700', fontSize: 13 }}>Iniciar sesión</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* ── COACH: mis equipos ── */}
            {user?.role === 'coach' && coachTeams.length > 0 ? (
              <View style={{ marginBottom: 16 }}>
                <SectionHeader icon="football" label="Mis equipos" />
                {(coachTeams as any[]).map((team) => (
                  <View
                    key={team.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: '#0f172a',
                      borderWidth: 1,
                      borderColor: '#39FF1420',
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: '#39FF1410',
                        borderWidth: 1,
                        borderColor: '#39FF1430',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="shield-outline" size={16} color="#39FF14" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                        {team.name}
                      </Text>
                      <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }}>
                        {team.league?.name || 'Sin liga'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/(tabs)/teamCareerDashboard' as any,
                            params: { teamId: String(team.id), name: team.name },
                          })
                        }
                        style={{
                          borderWidth: 1,
                          borderColor: '#374151',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: '#d1d5db', fontSize: 11, fontWeight: '700' }}>Stats</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/(tabs)/teamDetail',
                            params: { id: String(team.id) },
                          })
                        }
                        style={{
                          backgroundColor: '#39FF1415',
                          borderWidth: 1,
                          borderColor: '#39FF1440',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: '#39FF14', fontSize: 11, fontWeight: '700' }}>Gestionar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* ── PLAYER (1 equipo) ── */}
            {singlePlayerTeam ? (
              <View style={{ marginBottom: 16 }}>
                <SectionHeader icon="football" label="Mi equipo" />
                <View
                  style={{
                    backgroundColor: '#0f172a',
                    borderWidth: 1,
                    borderColor: '#39FF1420',
                    borderRadius: 16,
                    padding: 14,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        backgroundColor: '#39FF1410',
                        borderWidth: 1,
                        borderColor: '#39FF1430',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="shield-outline" size={14} color="#39FF14" />
                    </View>
                    <Text style={{ color: '#fff', fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {singlePlayerTeam.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/teamCareerDashboard' as any,
                          params: { teamId: String(singlePlayerTeam.id), name: singlePlayerTeam.name },
                        })
                      }
                      style={{
                        flex: 1,
                        backgroundColor: '#39FF1415',
                        borderWidth: 1,
                        borderColor: '#39FF1430',
                        borderRadius: 10,
                        paddingVertical: 9,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#39FF14', fontSize: 12, fontWeight: '700' }}>📊 Estadísticas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(tabs)/teamDetail',
                          params: { id: String(singlePlayerTeam.id) },
                        })
                      }
                      style={{
                        flex: 1,
                        borderWidth: 1,
                        borderColor: '#374151',
                        borderRadius: 10,
                        paddingVertical: 9,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#d1d5db', fontSize: 12, fontWeight: '700' }}>👥 Plantilla</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}

            {/* ── PLAYER (varios equipos) ── */}
            {multiPlayerTeams.length > 0 ? (
              <View style={{ marginBottom: 16 }}>
                <SectionHeader icon="football" label="Mis equipos" />
                {(multiPlayerTeams as any[]).map((team) => (
                  <View
                    key={team.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: '#0f172a',
                      borderWidth: 1,
                      borderColor: '#39FF1420',
                      borderRadius: 14,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: '#39FF1410',
                        borderWidth: 1,
                        borderColor: '#39FF1430',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="shield-outline" size={16} color="#39FF14" />
                    </View>
                    <Text style={{ color: '#fff', fontWeight: '700', flex: 1, fontSize: 14 }} numberOfLines={1}>
                      {team.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/(tabs)/teamCareerDashboard' as any,
                            params: { teamId: String(team.id), name: team.name },
                          })
                        }
                        style={{
                          borderWidth: 1,
                          borderColor: '#374151',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: '#d1d5db', fontSize: 11, fontWeight: '700' }}>Stats</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/(tabs)/teamDetail',
                            params: { id: String(team.id) },
                          })
                        }
                        style={{
                          borderWidth: 1,
                          borderColor: '#39FF1430',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                        }}
                      >
                        <Text style={{ color: '#39FF14', fontSize: 11, fontWeight: '700' }}>Plantilla</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Leagues header */}
            <SectionHeader icon="trophy-outline" label="Ligas disponibles" />
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(tabs)/leagueDetail',
                params: { id: String(item.id), name: item.name },
              })
            }
            activeOpacity={0.7}
            style={{
              marginHorizontal: 16,
              backgroundColor: '#0f172a',
              borderWidth: 1,
              borderColor: '#39FF1420',
              borderRadius: 16,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: '#39FF1410',
                  borderWidth: 1,
                  borderColor: '#39FF1430',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="trophy-outline" size={18} color="#39FF14" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.description ? (
                  <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#4b5563" />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          leaguesLoading ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#39FF14" />
              <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 13 }}>Cargando ligas…</Text>
            </View>
          ) : (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <Ionicons name="trophy-outline" size={48} color="#374151" />
              <Text style={{ color: '#6b7280', marginTop: 12, textAlign: 'center' }}>
                No hay ligas disponibles
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
