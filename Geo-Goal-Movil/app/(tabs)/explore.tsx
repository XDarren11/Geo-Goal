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
  getPublicLeagueDetail,
  type PublicPlayerListItem,
} from '@/Api/publicAPI';
import { getMyPlayerTeams, getMyTeams, getPlayersTeam } from '@/Api/teamAPI';
import { getAdminDashboardSummary } from '@/Api/adminAPI';
import { getLeagueById } from '@/Api/leagueAPI';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';

// ─── Small helpers ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, color = '#39FF14' }: { icon: any; label: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: color }} />
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

// ─── Row components ───────────────────────────────────────────────────────────

function LeagueRow({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#39FF1420', borderRadius: 14, padding: 12, marginBottom: 8 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#39FF1410', borderWidth: 1, borderColor: '#39FF1430', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="trophy-outline" size={16} color="#39FF14" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{item.name}</Text>
        {item.description ? <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }} numberOfLines={1}>{item.description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

function TeamRow({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#38bdf820', borderRadius: 14, padding: 12, marginBottom: 8 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#38bdf810', borderWidth: 1, borderColor: '#38bdf830', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="shield-outline" size={16} color="#38bdf8" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{item.name}</Text>
        {item.league?.name ? <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }} numberOfLines={1}>{item.league.name}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

function PlayerRow({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#a78bfa20', borderRadius: 14, padding: 12, marginBottom: 8 }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#a78bfa15', borderWidth: 1, borderColor: '#a78bfa30', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#a78bfa', fontWeight: '900', fontSize: 14 }}>{item.name?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{item.name}</Text>
        {item.username ? <Text style={{ color: '#a78bfa', fontSize: 11, marginTop: 1 }}>@{item.username}</Text> : null}
        {item.team?.name ? <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }} numberOfLines={1}>⚽ {item.team.name}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

function CoachRow({ item, onPress }: { item: any; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#fb923c20', borderRadius: 14, padding: 12, marginBottom: 8 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#fb923c10', borderWidth: 1, borderColor: '#fb923c30', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="clipboard-outline" size={16} color="#fb923c" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{item.name}</Text>
        {item.teams?.length > 0 ? <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }} numberOfLines={1}>{item.teams.map((t: any) => t.name).join(', ')}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#4b5563" />
    </TouchableOpacity>
  );
}

// ─── Filter config ────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { tab: 'players',  label: 'Jugadores', icon: 'person-outline',    color: '#a78bfa' },
  { tab: 'teams',    label: 'Equipos',   icon: 'shield-outline',    color: '#38bdf8' },
  { tab: 'coaches',  label: 'Coaches',   icon: 'clipboard-outline', color: '#fb923c' },
  { tab: 'leagues',  label: 'Ligas',     icon: 'trophy-outline',    color: '#39FF14' },
] as const;

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const router = useRouter();
  const { data: user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const trimmed = query.trim();
  const isSearching = !activeFilter && trimmed.length >= 2;
  const q = trimmed.toLowerCase();

  const toggleFilter = React.useCallback((tab: string) => {
    setActiveFilter((prev) => (prev === tab ? null : tab));
    setQuery('');
  }, []);

  // ── Base data ──────────────────────────────────────────────────────────────
  const { data: leagues = [], isLoading: leaguesLoading, refetch, isFetching } = useQuery({
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

  const { data: adminDashboard } = useQuery({
    queryKey: ['admin-dashboard-explore'],
    queryFn: getAdminDashboardSummary,
    enabled: user?.role === 'admin',
    staleTime: 5 * 60_000,
  });

  // ── Context derivados ──────────────────────────────────────────────────────
  const myRoleTeams: any[] = user?.role === 'player' ? playerTeams :
                              user?.role === 'coach'  ? coachTeams  : [];
  const myTeamIds = React.useMemo(() => myRoleTeams.map((t: any) => t.id as number), [myRoleTeams]);

  const adminLeagueIds = React.useMemo(
    () => (adminDashboard?.leagues ?? []).map((l: any) => (l.id ?? l.leagueId) as number).filter(Boolean),
    [adminDashboard]
  );

  const { data: adminLeagueDetails = [] } = useQuery({
    queryKey: ['admin-league-details-explore', adminLeagueIds],
    queryFn: () => Promise.all(adminLeagueIds.map((id: number) => getLeagueById(id))),
    enabled: user?.role === 'admin' && adminLeagueIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const adminTeamIds = React.useMemo(() => {
    const ids = new Set<number>();
    adminLeagueDetails.forEach((l: any) => (l.teams ?? []).forEach((t: any) => { if (t.id) ids.add(t.id); }));
    return ids;
  }, [adminLeagueDetails]);

  const adminTeamIdsArray = React.useMemo(() => [...adminTeamIds], [adminTeamIds]);

  // ── JUGADORES: getPlayersTeam por equipo ───────────────────────────────────
  const { data: teamPlayersRaw = [], isLoading: loadingTeamPlayers } = useQuery({
    queryKey: ['filter-team-players', myTeamIds],
    queryFn: async () => {
      const results = await Promise.all(myTeamIds.map((id) => getPlayersTeam(id)));
      const all: any[] = [];
      const seen = new Set<number>();
      myTeamIds.forEach((teamId, i) => {
        const team = myRoleTeams[i];
        (results[i] ?? []).forEach((p: any) => {
          const uid: number = p.id ?? p.userId ?? p.playerId;
          if (!uid || seen.has(uid)) return;
          seen.add(uid);
          all.push({ playerId: uid, name: p.name ?? 'Jugador', username: p.username ?? null, team: { id: teamId, name: team?.name ?? '' } });
        });
      });
      return all;
    },
    enabled: (user?.role === 'player' || user?.role === 'coach') && myTeamIds.length > 0 && activeFilter === 'players',
    staleTime: 5 * 60_000,
  });

  const { data: adminTeamPlayers = [], isLoading: loadingAdminPlayers } = useQuery({
    queryKey: ['filter-admin-players', adminTeamIdsArray],
    queryFn: async () => {
      const results = await Promise.all(adminTeamIdsArray.map((id) => getPlayersTeam(id)));
      const all: any[] = [];
      const seen = new Set<number>();
      adminTeamIdsArray.forEach((teamId, i) => {
        let teamName = '';
        adminLeagueDetails.forEach((league: any) => {
          const found = (league.teams ?? []).find((t: any) => t.id === teamId);
          if (found) teamName = found.name;
        });
        (results[i] ?? []).forEach((p: any) => {
          const uid: number = p.id ?? p.userId ?? p.playerId;
          if (!uid || seen.has(uid)) return;
          seen.add(uid);
          all.push({ playerId: uid, name: p.name ?? 'Jugador', username: p.username ?? null, team: { id: teamId, name: teamName } });
        });
      });
      return all;
    },
    enabled: user?.role === 'admin' && adminTeamIdsArray.length > 0 && activeFilter === 'players',
    staleTime: 5 * 60_000,
  });

  // ── COACHES ────────────────────────────────────────────────────────────────
  const coachLeagueIds = React.useMemo(() => {
    if (user?.role !== 'coach') return [];
    const seen = new Set<number>();
    coachTeams.forEach((t: any) => { const id = t.league?.id ?? t.leagueId; if (id) seen.add(id); });
    return [...seen];
  }, [user?.role, coachTeams]);

  const { data: coachLeagueDetails = [] } = useQuery({
    queryKey: ['filter-coach-leagues', coachLeagueIds],
    queryFn: () => Promise.all(coachLeagueIds.map((id) => getPublicLeagueDetail(id))),
    enabled: user?.role === 'coach' && coachLeagueIds.length > 0 && activeFilter === 'coaches',
    staleTime: 5 * 60_000,
  });

  const coachLeagueTeamIds = React.useMemo(() => {
    const ids = new Set<number>();
    coachLeagueDetails.forEach((d: any) => {
      (d.standings ?? []).forEach((s: any) => { if (s.teamId) ids.add(s.teamId); });
      (d.teams ?? []).forEach((t: any) => { if (t.id) ids.add(t.id); });
    });
    return ids;
  }, [coachLeagueDetails]);

  const { data: allCoachesData, isLoading: loadingCoaches } = useQuery({
    queryKey: ['filter-coaches-all'],
    queryFn: () => getPublicCoachesList({ pageSize: 500 }),
    enabled: !!user && activeFilter === 'coaches',
    staleTime: 10 * 60_000,
  });

  // ── Datos derivados por filtro ─────────────────────────────────────────────
  const rawPlayers = user?.role === 'admin' ? adminTeamPlayers : teamPlayersRaw;

  const rawTeams: any[] = React.useMemo(() => {
    if (user?.role === 'admin') {
      const seen = new Set<number>();
      const items: any[] = [];
      adminLeagueDetails.forEach((l: any) => {
        (l.teams ?? []).forEach((t: any) => {
          if (!t.id || seen.has(t.id)) return;
          seen.add(t.id);
          items.push({ id: t.id, teamId: t.id, name: t.name, league: { id: l.id, name: l.name } });
        });
      });
      return items;
    }
    return myRoleTeams.map((t: any) => ({
      id: t.id, teamId: t.id, name: t.name,
      league: t.league ?? (t.leagueId ? { id: t.leagueId, name: '' } : null),
    }));
  }, [user?.role, myRoleTeams, adminLeagueDetails]);

  const rawCoaches: any[] = React.useMemo(() => {
    if (!allCoachesData?.items) return [];
    if (user?.role === 'coach') {
      const ids = coachLeagueTeamIds.size > 0 ? coachLeagueTeamIds : new Set(myTeamIds);
      return allCoachesData.items.filter((c: any) => (c.teams ?? []).some((t: any) => ids.has(t.id)));
    }
    const ids = user?.role === 'admin' ? adminTeamIds : new Set(myTeamIds);
    return allCoachesData.items.filter((c: any) => (c.teams ?? []).some((t: any) => ids.has(t.id)));
  }, [allCoachesData, user?.role, coachLeagueTeamIds, myTeamIds, adminTeamIds]);

  const rawLeaguesFilter: any[] = React.useMemo(() => {
    if (user?.role === 'admin') {
      return (adminDashboard?.leagues ?? []).map((l: any) => ({ id: l.id ?? l.leagueId, name: l.name, description: l.description }));
    }
    if (user?.role === 'coach') {
      return coachLeagueIds.map((id) => {
        const detail: any = coachLeagueDetails.find((d: any) => (d.league?.id ?? d.id) === id);
        return { id, name: detail?.league?.name ?? detail?.name ?? String(id) };
      }).filter((l) => l.name !== String(l.id));
    }
    // player: ligas de sus equipos
    const seen = new Set<number>();
    return myRoleTeams
      .filter((t: any) => t.league?.id)
      .filter((t: any) => { if (seen.has(t.league.id)) return false; seen.add(t.league.id); return true; })
      .map((t: any) => ({ id: t.league.id, name: t.league.name }));
  }, [user?.role, myRoleTeams, adminDashboard, coachLeagueIds, coachLeagueDetails]);

  // Filtrado local por búsqueda dentro del filtro activo
  const filterPlayers = q ? rawPlayers.filter((p: any) => p.name.toLowerCase().includes(q)) : rawPlayers;
  const filterTeams   = q ? rawTeams.filter((t: any) => t.name.toLowerCase().includes(q))   : rawTeams;
  const filterCoaches = q ? rawCoaches.filter((c: any) => c.name.toLowerCase().includes(q)) : rawCoaches;
  const filterLeagues = q ? rawLeaguesFilter.filter((l: any) => l.name.toLowerCase().includes(q)) : rawLeaguesFilter;

  const filterLoading =
    activeFilter === 'players' ? (user?.role === 'admin' ? loadingAdminPlayers : loadingTeamPlayers) :
    activeFilter === 'coaches' ? loadingCoaches : false;

  const activeTab = FILTER_TABS.find((f) => f.tab === activeFilter);

  // ── Search queries (lazy, sin filtro activo) ───────────────────────────────
  const { data: searchLeagues, isFetching: loadingSearchLeagues } = useQuery({
    queryKey: ['search-leagues', trimmed],
    queryFn: async () => leagues.filter((l) => l.name.toLowerCase().includes(trimmed.toLowerCase())),
    enabled: isSearching && leagues.length > 0,
    staleTime: 30_000,
  });

  const { data: searchTeamsData, isFetching: loadingSearchTeams } = useQuery({
    queryKey: ['search-teams', trimmed],
    queryFn: () => getPublicTeamsList({ search: trimmed, pageSize: 10 }),
    enabled: isSearching,
    staleTime: 30_000,
  });

  const { data: searchPlayersData, isFetching: loadingSearchPlayers } = useQuery({
    queryKey: ['search-players', trimmed],
    queryFn: () => getPublicPlayersList({ search: trimmed, pageSize: 10 }),
    enabled: isSearching,
    staleTime: 30_000,
  });

  const { data: searchCoachesData, isFetching: loadingSearchCoaches } = useQuery({
    queryKey: ['search-coaches', trimmed],
    queryFn: () => getPublicCoachesList({ search: trimmed, pageSize: 10 }),
    enabled: isSearching,
    staleTime: 30_000,
  });

  const searchBusy = loadingSearchLeagues || loadingSearchTeams || loadingSearchPlayers || loadingSearchCoaches;
  const filteredLeagues = isSearching ? (searchLeagues ?? []) : leagues;
  const searchTeams     = searchTeamsData?.items   ?? [];
  const searchPlayers   = searchPlayersData?.players ?? [];
  const searchCoaches   = searchCoachesData?.items  ?? [];

  const singlePlayerTeam  = user?.role === 'player' && playerTeams.length === 1 ? playerTeams[0] : null;
  const multiPlayerTeams  = user?.role === 'player' && playerTeams.length > 1   ? playerTeams   : [];

  // ─── Header compartido ────────────────────────────────────────────────────
  const Header = (
    <View style={{ backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: activeTab ? activeTab.color + '30' : '#39FF1430', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#9ca3af', fontSize: 11 }}>Descubre</Text>
          <Text style={{ color: activeTab ? activeTab.color : '#39FF14', fontSize: 24, fontWeight: '800' }}>
            {activeTab ? activeTab.label : 'Explorar'}
          </Text>
        </View>
        {activeFilter ? (
          <TouchableOpacity
            onPress={() => { setActiveFilter(null); setQuery(''); }}
            style={{ padding: 8, borderRadius: 10, backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151' }}
          >
            <Ionicons name="close" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : isFetching && !leaguesLoading ? (
          <ActivityIndicator size="small" color="#39FF14" />
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: '#1f2937', borderWidth: 1, borderColor: activeTab ? activeTab.color + '30' : '#374151', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
        <Ionicons name="search" size={16} color={activeTab ? activeTab.color : '#6b7280'} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={activeFilter ? `Buscar ${activeTab?.label.toLowerCase()}…` : 'Buscar ligas, equipos, jugadores, coaches…'}
          placeholderTextColor="#6b7280"
          style={{ flex: 1, color: '#fff', fontSize: 14 }}
          autoFocus={isSearching}
        />
        {(query.length > 0 || searchBusy) ? (
          searchBusy ? <ActivityIndicator size="small" color="#39FF14" /> :
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color="#6b7280" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {FILTER_TABS.map((btn) => {
          const isActive = activeFilter === btn.tab;
          return (
            <TouchableOpacity
              key={btn.tab}
              onPress={() => toggleFilter(btn.tab)}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
                paddingVertical: 6, borderRadius: 10, borderWidth: isActive ? 1.5 : 1,
                borderColor: isActive ? btn.color : btn.color + '30',
                backgroundColor: isActive ? btn.color + '25' : btn.color + '10',
              }}
            >
              <Ionicons name={btn.icon as any} size={11} color={isActive ? btn.color : btn.color + '80'} />
              <Text style={{ color: isActive ? btn.color : btn.color + '80', fontSize: 10, fontWeight: isActive ? '800' : '600' }}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ─── VISTA FILTRO ACTIVO ──────────────────────────────────────────────────
  if (activeFilter) {
    const listData: any[] =
      activeFilter === 'players' ? filterPlayers  :
      activeFilter === 'teams'   ? filterTeams    :
      activeFilter === 'coaches' ? filterCoaches  : filterLeagues;

    const empty = !filterLoading && listData.length === 0;

    return (
      <View style={{ flex: 1, backgroundColor: '#0d1117' }}>
        {Header}
        {filterLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={activeTab?.color ?? '#39FF14'} />
            <Text style={{ color: '#6b7280', marginTop: 12, fontSize: 13 }}>Cargando {activeTab?.label.toLowerCase()}…</Text>
          </View>
        ) : empty ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
            <Ionicons name={activeTab?.icon as any ?? 'search'} size={48} color="#374151" />
            <Text style={{ color: '#6b7280', marginTop: 12, textAlign: 'center', fontSize: 14 }}>
              {q ? `No se encontraron ${activeTab?.label.toLowerCase()} con "${q}"` : `No hay ${activeTab?.label.toLowerCase()} disponibles`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item, i) =>
              activeFilter === 'players' ? String(item.playerId ?? i) :
              activeFilter === 'teams'   ? String(item.teamId ?? item.id ?? i) :
              activeFilter === 'coaches' ? String(item.coachId ?? i) : String(item.id ?? i)
            }
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            renderItem={({ item }) => {
              if (activeFilter === 'players') return (
                <PlayerRow item={item} onPress={() => router.push({ pathname: '/playerCareerDashboard' as any, params: { playerId: String(item.playerId), name: item.name } })} />
              );
              if (activeFilter === 'teams') return (
                <TeamRow item={item} onPress={() => router.push({ pathname: '/teamCareerDashboard' as any, params: { teamId: String(item.teamId ?? item.id), name: item.name } })} />
              );
              if (activeFilter === 'coaches') return (
                <CoachRow item={item} onPress={() => router.push({ pathname: '/coachCareerDashboard' as any, params: { coachId: String(item.coachId), name: item.name } })} />
              );
              return (
                <LeagueRow item={item} onPress={() => router.push({ pathname: '/leagueDetail', params: { id: String(item.id), name: item.name } })} />
              );
            }}
          />
        )}
      </View>
    );
  }

  // ─── VISTA BÚSQUEDA GLOBAL ────────────────────────────────────────────────
  if (isSearching) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d1117' }}>
        {Header}
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={{ marginBottom: 20 }}>
            <SectionHeader icon="trophy-outline" label="Ligas" color="#39FF14" />
            {filteredLeagues.length === 0 ? <EmptySection label="ligas" /> :
              filteredLeagues.slice(0, 5).map((item) => (
                <LeagueRow key={item.id} item={item} onPress={() => router.push({ pathname: '/leagueDetail', params: { id: String(item.id), name: item.name } })} />
              ))}
          </View>
          <View style={{ marginBottom: 20 }}>
            <SectionHeader icon="shield-outline" label="Equipos" color="#38bdf8" />
            {loadingSearchTeams && searchTeams.length === 0 ? <ActivityIndicator size="small" color="#38bdf8" style={{ marginBottom: 8 }} /> :
              searchTeams.length === 0 ? <EmptySection label="equipos" /> :
              searchTeams.map((item: any) => (
                <TeamRow key={item.teamId} item={item} onPress={() => router.push({ pathname: '/teamCareerDashboard' as any, params: { teamId: String(item.teamId), name: item.name } })} />
              ))}
          </View>
          <View style={{ marginBottom: 20 }}>
            <SectionHeader icon="person-outline" label="Jugadores" color="#a78bfa" />
            {loadingSearchPlayers && searchPlayers.length === 0 ? <ActivityIndicator size="small" color="#a78bfa" style={{ marginBottom: 8 }} /> :
              searchPlayers.length === 0 ? <EmptySection label="jugadores" /> :
              searchPlayers.map((item: any) => (
                <PlayerRow key={item.playerId} item={item} onPress={() => router.push({ pathname: '/playerCareerDashboard' as any, params: { playerId: String(item.playerId), name: item.name } })} />
              ))}
          </View>
          <View style={{ marginBottom: 20 }}>
            <SectionHeader icon="clipboard-outline" label="Entrenadores" color="#fb923c" />
            {loadingSearchCoaches && searchCoaches.length === 0 ? <ActivityIndicator size="small" color="#fb923c" style={{ marginBottom: 8 }} /> :
              searchCoaches.length === 0 ? <EmptySection label="entrenadores" /> :
              searchCoaches.map((item: any) => (
                <CoachRow key={item.coachId} item={item} onPress={() => router.push({ pathname: '/coachCareerDashboard' as any, params: { coachId: String(item.coachId), name: item.name } })} />
              ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── VISTA DEFAULT ────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0d1117' }}>
      {Header}
      <FlatList
        data={leagues}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor="#39FF14" />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            {!user ? (
              <View style={{ backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#39FF1420', borderRadius: 16, padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Ionicons name="football" size={16} color="#39FF14" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Únete a Geo-Goal</Text>
                </View>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>Registrate para guardar favoritos, seguir tu equipo y recibir notificaciones en tiempo real.</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity onPress={() => router.push('/(Auth)/RegisterView' as any)} style={{ flex: 1, backgroundColor: '#39FF14', borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
                    <Text style={{ color: '#0d1117', fontWeight: '800', fontSize: 13 }}>Crear cuenta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/(Auth)/login' as any)} style={{ flex: 1, borderWidth: 1, borderColor: '#39FF1440', borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
                    <Text style={{ color: '#39FF14', fontWeight: '700', fontSize: 13 }}>Iniciar sesión</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {user?.role === 'coach' && (coachTeams as any[]).length > 0 ? (
              <View style={{ marginBottom: 16 }}>
                <SectionHeader icon="football" label="Mis equipos" />
                {(coachTeams as any[]).map((team) => (
                  <View key={team.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#39FF1420', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#39FF1410', borderWidth: 1, borderColor: '#39FF1430', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="shield-outline" size={16} color="#39FF14" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{team.name}</Text>
                      <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }}>{team.league?.name || 'Sin liga'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity onPress={() => router.push({ pathname: '/teamCareerDashboard' as any, params: { teamId: String(team.id), name: team.name } })} style={{ borderWidth: 1, borderColor: '#374151', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: '#d1d5db', fontSize: 11, fontWeight: '700' }}>Stats</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => router.push({ pathname: '/teamDetail', params: { id: String(team.id) } })} style={{ backgroundColor: '#39FF1415', borderWidth: 1, borderColor: '#39FF1440', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: '#39FF14', fontSize: 11, fontWeight: '700' }}>Gestionar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {singlePlayerTeam ? (
              <View style={{ marginBottom: 16 }}>
                <SectionHeader icon="football" label="Mi equipo" />
                <View style={{ backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#39FF1420', borderRadius: 16, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: '#39FF1410', borderWidth: 1, borderColor: '#39FF1430', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="shield-outline" size={14} color="#39FF14" />
                    </View>
                    <Text style={{ color: '#fff', fontWeight: '700', flex: 1 }} numberOfLines={1}>{(singlePlayerTeam as any).name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/teamCareerDashboard' as any, params: { teamId: String((singlePlayerTeam as any).id), name: (singlePlayerTeam as any).name } })} style={{ flex: 1, backgroundColor: '#39FF1415', borderWidth: 1, borderColor: '#39FF1430', borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
                      <Text style={{ color: '#39FF14', fontSize: 12, fontWeight: '700' }}>📊 Estadísticas</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push({ pathname: '/teamDetail', params: { id: String((singlePlayerTeam as any).id) } })} style={{ flex: 1, borderWidth: 1, borderColor: '#374151', borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
                      <Text style={{ color: '#d1d5db', fontSize: 12, fontWeight: '700' }}>👥 Plantilla</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}

            {multiPlayerTeams.length > 0 ? (
              <View style={{ marginBottom: 16 }}>
                <SectionHeader icon="football" label="Mis equipos" />
                {(multiPlayerTeams as any[]).map((team) => (
                  <View key={team.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#39FF1420', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#39FF1410', borderWidth: 1, borderColor: '#39FF1430', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="shield-outline" size={16} color="#39FF14" />
                    </View>
                    <Text style={{ color: '#fff', fontWeight: '700', flex: 1, fontSize: 14 }} numberOfLines={1}>{team.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity onPress={() => router.push({ pathname: '/teamCareerDashboard' as any, params: { teamId: String(team.id), name: team.name } })} style={{ borderWidth: 1, borderColor: '#374151', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: '#d1d5db', fontSize: 11, fontWeight: '700' }}>Stats</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => router.push({ pathname: '/teamDetail', params: { id: String(team.id) } })} style={{ borderWidth: 1, borderColor: '#39FF1430', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: '#39FF14', fontSize: 11, fontWeight: '700' }}>Plantilla</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <SectionHeader icon="trophy-outline" label="Ligas disponibles" />
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/leagueDetail', params: { id: String(item.id), name: item.name } })}
            activeOpacity={0.7}
            style={{ marginHorizontal: 16, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#39FF1420', borderRadius: 16, padding: 14, marginBottom: 10 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#39FF1410', borderWidth: 1, borderColor: '#39FF1430', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="trophy-outline" size={18} color="#39FF14" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{item.name}</Text>
                {item.description ? <Text style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }} numberOfLines={1}>{item.description}</Text> : null}
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
              <Text style={{ color: '#6b7280', marginTop: 12, textAlign: 'center' }}>No hay ligas disponibles</Text>
            </View>
          )
        }
      />
    </View>
  );
}
