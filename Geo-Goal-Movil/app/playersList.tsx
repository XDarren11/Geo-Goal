/**
 * Pantalla de búsqueda universal — Jugadores · Equipos · Entrenadores · Ligas
 * Accesible desde la pestaña Explorar mediante el botón "Buscar"
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';
import {
  getPublicCoachesList,
  type PublicPlayerListItem,
  type PublicTeamListItem,
  type PublicCoachListItem,
  type PublicCoachesListResponse,
} from '@/Api/publicAPI';
import { getMyPlayerTeams, getMyTeams, getPlayersTeam } from '@/Api/teamAPI';
import { getAdminDashboardSummary } from '@/Api/adminAPI';
import { getLeagueById } from '@/Api/leagueAPI';
import { getPublicLeagueDetail } from '@/Api/publicAPI';
import type { PublicLeagueSummary } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';
import { useAuth } from '@/hooks/useAuth';

// ─── Colores por tab ──────────────────────────────────────────────────────────
const TAB_CONFIG = [
  { key: 'players',  label: 'Jugadores',    icon: 'person-outline',    color: '#a78bfa' },
  { key: 'teams',    label: 'Equipos',       icon: 'shield-outline',    color: '#38bdf8' },
  { key: 'coaches',  label: 'Entrenadores',  icon: 'clipboard-outline', color: '#fb923c' },
  { key: 'leagues',  label: 'Ligas',         icon: 'trophy-outline',    color: '#39FF14' },
] as const;

type TabKey = typeof TAB_CONFIG[number]['key'];

const TEAM_PAGE_SIZE = 5;
const LEAGUE_PAGE_SIZE = 4;
const COACH_PAGE_SIZE = 50;

// ─── Rating helper ────────────────────────────────────────────────────────────
function ratingColor(r: number): string {
  if (r >= 8) return '#10b981';
  if (r >= 7) return '#34d399';
  if (r >= 6) return '#fbbf24';
  if (r >= 4) return '#f97316';
  if (r > 0) return '#ef4444';
  return '#6b7280';
}

// ─── Tipo de relación ─────────────────────────────────────────────────────────
/** null = sin contexto (invitado). mine = true → relacionado, false → externo */
type Relation = { mine: boolean } | null;

/** Opacidad de la tarjeta: externo → 0.35, relacionado/sin-contexto → 1 */
function cardOp(rel: Relation | undefined) {
  return rel !== null && rel !== undefined && !rel.mine ? 0.35 : 1;
}

// ─── Row components ───────────────────────────────────────────────────────────

function PlayerRow({ player, onPress, relation }: {
  player: PublicPlayerListItem;
  onPress: () => void;
  relation?: Relation;
}) {
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
        opacity: cardOp(relation),
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

function TeamRow({ item, onPress, relation }: {
  item: PublicTeamListItem;
  onPress: () => void;
  relation?: Relation;
}) {
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
        opacity: cardOp(relation),
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

function CoachRow({ item, onPress, relation }: {
  item: PublicCoachListItem;
  onPress: () => void;
  relation?: Relation;
}) {
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
        opacity: cardOp(relation),
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

function LeagueRow({ item, onPress, relation }: {
  item: PublicLeagueSummary;
  onPress: () => void;
  relation?: Relation;
}) {
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
        opacity: cardOp(relation),
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


// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { data: user } = useAuth();

  const initialTab = (TAB_CONFIG.find((t) => t.key === params.tab)?.key ?? 'players') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [search, setSearch] = useState('');

  const currentTab = TAB_CONFIG.find((t) => t.key === activeTab)!;

  // ── 1. Contexto base (sin condición de tab, se carga al entrar a la pantalla) ──

  const { data: myPlayerTeams = [], isLoading: loadingPlayerTeams } = useQuery({
    queryKey: ['my-player-teams'],
    queryFn: getMyPlayerTeams,
    enabled: user?.role === 'player',
    staleTime: 5 * 60_000,
  });

  const { data: myCoachTeams = [], isLoading: loadingCoachTeams } = useQuery({
    queryKey: ['my-coach-teams'],
    queryFn: getMyTeams,
    enabled: user?.role === 'coach',
    staleTime: 5 * 60_000,
  });

  const { data: adminDashboard, isLoading: loadingAdmin } = useQuery({
    queryKey: ['admin-dashboard-context'],
    queryFn: getAdminDashboardSummary,
    enabled: user?.role === 'admin',
    staleTime: 5 * 60_000,
  });

  const myRoleTeams: any[] = user?.role === 'player' ? myPlayerTeams :
                              user?.role === 'coach'  ? myCoachTeams  : [];
  const myTeamIds = React.useMemo(
    () => myRoleTeams.map((t: any) => t.id as number),
    [myRoleTeams]
  );

  const adminLeagues: any[] = React.useMemo(
    () => adminDashboard?.leagues ?? [],
    [adminDashboard]
  );
  const adminLeagueIds = React.useMemo(
    () => adminLeagues.map((l: any) => (l.id ?? l.leagueId) as number).filter(Boolean),
    [adminLeagues]
  );

  // Admin: detalle de cada liga (incluye equipos) con paginación
  const adminLeagueDetailsQuery = useInfiniteQuery<
    { ids: number[]; results: any[] },
    Error,
    InfiniteData<{ ids: number[]; results: any[] }>,
    (string | number[])[],
    number
  >({
    queryKey: ['admin-league-details', adminLeagueIds],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = adminLeagueIds.slice(pageParam, pageParam + LEAGUE_PAGE_SIZE);
      const results = await Promise.all(ids.map((id) => getLeagueById(id)));
      return { ids, results };
    },
    enabled:
      user?.role === 'admin' &&
      adminLeagueIds.length > 0 &&
      (activeTab === 'players' || activeTab === 'teams' || activeTab === 'coaches' || activeTab === 'leagues'),
    getNextPageParam: (_lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.ids.length, 0);
      return loaded < adminLeagueIds.length ? loaded : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60_000,
  });

  const adminLeagueDetails = React.useMemo(
    () => adminLeagueDetailsQuery.data?.pages.flatMap((p) => p.results) ?? [],
    [adminLeagueDetailsQuery.data]
  );
  const loadingLeagueDetails = adminLeagueDetailsQuery.isLoading;

  // IDs de todos los equipos en las ligas del admin (para filtrar coaches)
  const adminTeamIds = React.useMemo(() => {
    const ids = new Set<number>();
    adminLeagueDetails.forEach((league: any) => {
      (league.teams ?? []).forEach((t: any) => { if (t.id) ids.add(t.id); });
    });
    return ids;
  }, [adminLeagueDetails]);

  // IDs únicos de ligas de los equipos del coach (usando leagueId o league.id)
  const coachLeagueIds = React.useMemo(() => {
    if (user?.role !== 'coach') return [];
    const seen = new Set<number>();
    myCoachTeams.forEach((t: any) => {
      const id = t.league?.id ?? t.leagueId;
      if (id) seen.add(id);
    });
    return [...seen];
  }, [user?.role, myCoachTeams]);

  // Fetch de detalles de esas ligas (nombre, descripción) con paginación
  const coachLeagueDetailsQuery = useInfiniteQuery<
    { ids: number[]; results: any[] },
    Error,
    InfiniteData<{ ids: number[]; results: any[] }>,
    (string | number[])[],
    number
  >({
    queryKey: ['coach-league-details', coachLeagueIds],
    queryFn: async ({ pageParam = 0 }) => {
      const ids = coachLeagueIds.slice(pageParam, pageParam + LEAGUE_PAGE_SIZE);
      const results = await Promise.all(ids.map((id) => getPublicLeagueDetail(id)));
      return { ids, results };
    },
    enabled:
      user?.role === 'coach' &&
      coachLeagueIds.length > 0 &&
      (activeTab === 'coaches' || activeTab === 'leagues'),
    getNextPageParam: (_lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.ids.length, 0);
      return loaded < coachLeagueIds.length ? loaded : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60_000,
  });

  const coachLeagueDetails = React.useMemo(
    () => coachLeagueDetailsQuery.data?.pages.flatMap((p) => p.results) ?? [],
    [coachLeagueDetailsQuery.data]
  );

  // ── 2. Todos los coaches (filtrado local) con paginación ─────────────────────
  const coachesQuery = useInfiniteQuery<
    PublicCoachesListResponse,
    Error,
    InfiniteData<PublicCoachesListResponse>,
    (string | number)[],
    number
  >({
    queryKey: ['all-coaches-context'],
    queryFn: ({ pageParam = 1 }) => getPublicCoachesList({ page: pageParam, pageSize: COACH_PAGE_SIZE }),
    enabled: !!user && activeTab === 'coaches',
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 10 * 60_000,
  });

  const allCoachesItems = React.useMemo(
    () => coachesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [coachesQuery.data]
  );
  const loadingAllCoaches = coachesQuery.isLoading;

  // ── 3. Jugadores usando getPlayersTeam (datos reales de miembros del equipo) ──
  const teamPlayersQuery = useInfiniteQuery<
    { teamIds: number[]; results: any[] },
    Error,
    InfiniteData<{ teamIds: number[]; results: any[] }>,
    (string | number[])[],
    number
  >({
    queryKey: ['context-team-players', myTeamIds],
    queryFn: async ({ pageParam = 0 }) => {
      const teamIds = myTeamIds.slice(pageParam, pageParam + TEAM_PAGE_SIZE);
      const results = await Promise.all(teamIds.map((id) => getPlayersTeam(id)));
      return { teamIds, results };
    },
    enabled: (user?.role === 'player' || user?.role === 'coach') && myTeamIds.length > 0 && activeTab === 'players',
    getNextPageParam: (_lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.teamIds.length, 0);
      return loaded < myTeamIds.length ? loaded : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60_000,
  });

  const teamPlayersRaw = React.useMemo(() => {
    const pages = teamPlayersQuery.data?.pages ?? [];
    const teamMap = new Map<number, any>(myRoleTeams.map((t: any) => [t.id, t]));
    const all: PublicPlayerListItem[] = [];
    const seen = new Set<number>();
    pages.forEach((page) => {
      page.teamIds.forEach((teamId, i) => {
        const team = teamMap.get(teamId);
        (page.results[i] ?? []).forEach((p: any) => {
          const uid: number = p.id ?? p.userId ?? p.playerId;
          if (!uid || seen.has(uid)) return;
          seen.add(uid);
          all.push({
            playerId: uid,
            name: p.name ?? p.playerName ?? 'Jugador',
            username: p.username ?? null,
            team: { id: teamId, name: team?.name ?? '' },
            avgRating: p.avgRating ?? 0,
            totalGoals: p.totalGoals ?? 0,
            totalAssists: p.totalAssists ?? 0,
            totalMinutes: p.totalMinutes ?? 0,
            matchCount: p.matchCount ?? 0,
          });
        });
      });
    });
    return all;
  }, [teamPlayersQuery.data, myRoleTeams]);

  const loadingTeamPlayers = teamPlayersQuery.isLoading;

  // Admin: jugadores — usa getPlayersTeam por cada equipo de sus ligas
  // (el endpoint público solo devuelve jugadores con estadísticas, getPlayersTeam devuelve todos los miembros)
  const adminTeamIdsArray = React.useMemo(() => [...adminTeamIds], [adminTeamIds]);

  const adminLeaguePlayersQuery = useInfiniteQuery<
    { teamIds: number[]; results: any[] },
    Error,
    InfiniteData<{ teamIds: number[]; results: any[] }>,
    (string | number[])[],
    number
  >({
    queryKey: ['context-admin-team-players', adminTeamIdsArray],
    queryFn: async ({ pageParam = 0 }) => {
      const teamIds = adminTeamIdsArray.slice(pageParam, pageParam + TEAM_PAGE_SIZE);
      const results = await Promise.all(teamIds.map((id) => getPlayersTeam(id)));
      return { teamIds, results };
    },
    enabled: user?.role === 'admin' && adminTeamIdsArray.length > 0 && activeTab === 'players',
    getNextPageParam: (_lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.teamIds.length, 0);
      return loaded < adminTeamIdsArray.length ? loaded : undefined;
    },
    initialPageParam: 0,
    staleTime: 5 * 60_000,
  });

  const adminTeamNameMap = React.useMemo(() => {
    const map = new Map<number, string>();
    adminLeagueDetails.forEach((league: any) => {
      (league.teams ?? []).forEach((t: any) => {
        if (t.id && !map.has(t.id)) map.set(t.id, t.name ?? '');
      });
    });
    return map;
  }, [adminLeagueDetails]);

  const adminLeaguePlayers = React.useMemo(() => {
    const pages = adminLeaguePlayersQuery.data?.pages ?? [];
    const all: PublicPlayerListItem[] = [];
    const seen = new Set<number>();
    pages.forEach((page) => {
      page.teamIds.forEach((teamId, i) => {
        const teamName = adminTeamNameMap.get(teamId) ?? '';
        (page.results[i] ?? []).forEach((p: any) => {
          const uid: number = p.id ?? p.userId ?? p.playerId;
          if (!uid || seen.has(uid)) return;
          seen.add(uid);
          all.push({
            playerId: uid,
            name: p.name ?? p.playerName ?? 'Jugador',
            username: p.username ?? null,
            team: { id: teamId, name: teamName },
            avgRating: p.avgRating ?? 0,
            totalGoals: p.totalGoals ?? 0,
            totalAssists: p.totalAssists ?? 0,
            totalMinutes: p.totalMinutes ?? 0,
            matchCount: p.matchCount ?? 0,
          });
        });
      });
    });
    return all;
  }, [adminLeaguePlayersQuery.data, adminTeamNameMap]);

  const loadingAdminPlayers = adminLeaguePlayersQuery.isLoading;

  // ── 4. Datos derivados por tab ────────────────────────────────────────────────

  const rawPlayers: PublicPlayerListItem[] =
    user?.role === 'admin' ? adminLeaguePlayers : teamPlayersRaw;

  const rawTeams: PublicTeamListItem[] = React.useMemo(() => {
    if (user?.role === 'admin') {
      const seen = new Set<number>();
      const items: PublicTeamListItem[] = [];
      adminLeagueDetails.forEach((league: any) => {
        (league.teams ?? []).forEach((t: any) => {
          if (!t.id || seen.has(t.id)) return;
          seen.add(t.id);
          items.push({ teamId: t.id, name: t.name, logoUrl: t.logoUrl ?? null, league: { id: league.id, name: league.name } });
        });
      });
      return items;
    }
    return myRoleTeams.map((t: any) => ({
      teamId: t.id,
      name: t.name,
      logoUrl: t.logoUrl ?? null,
      league: t.league ?? (t.leagueId ? { id: t.leagueId, name: '' } : null),
    }));
  }, [user?.role, myRoleTeams, adminLeagueDetails]);

  // IDs de equipos en las ligas del coach (para filtrar coaches rivales/pares)
  const coachLeagueTeamIds = React.useMemo(() => {
    const ids = new Set<number>();
    coachLeagueDetails.forEach((detail: any) => {
      (detail.standings ?? []).forEach((s: any) => { if (s.teamId) ids.add(s.teamId); });
      (detail.teams ?? []).forEach((t: any) => { if (t.id) ids.add(t.id); });
    });
    return ids;
  }, [coachLeagueDetails]);

  const rawCoaches: PublicCoachListItem[] = React.useMemo(() => {
    if (allCoachesItems.length === 0) return [];
    if (user?.role === 'coach') {
      // Mostrar coaches de equipos en las mismas ligas (incluye al propio coach)
      // Si aún no hay league details cargados, caer en los equipos propios
      const ids = coachLeagueTeamIds.size > 0 ? coachLeagueTeamIds : new Set(myTeamIds);
      return allCoachesItems.filter((c: PublicCoachListItem) =>
        (c.teams ?? []).some((t: any) => ids.has(t.id))
      );
    }
    const contextIds = user?.role === 'admin' ? adminTeamIds : new Set(myTeamIds);
    return allCoachesItems.filter((c: PublicCoachListItem) =>
      (c.teams ?? []).some((t: any) => contextIds.has(t.id))
    );
  }, [allCoachesItems, adminTeamIds, myTeamIds, user?.role, coachLeagueTeamIds]);

  const rawLeagues: PublicLeagueSummary[] = React.useMemo(() => {
    if (user?.role === 'admin') {
      return adminLeagues.map((l: any) => ({
        id: l.id ?? l.leagueId,
        name: l.name,
        description: l.description,
      }));
    }
    if (user?.role === 'coach') {
      // getPublicLeagueDetail devuelve { league: { id, name, ... }, standings, ... }
      return coachLeagueDetails.map((detail: any) => ({
        id: detail.league?.id ?? detail.id,
        name: detail.league?.name ?? detail.name ?? '',
        description: detail.league?.description ?? detail.description,
      })).filter((l: any) => l.id);
    }
    // player: derivar de los equipos (que sí traen league completo)
    const seen = new Set<number>();
    return myRoleTeams
      .filter((t: any) => t.league?.id)
      .filter((t: any) => { if (seen.has(t.league.id)) return false; seen.add(t.league.id); return true; })
      .map((t: any) => ({ id: t.league.id, name: t.league.name }));
  }, [user?.role, myRoleTeams, adminLeagues, coachLeagueDetails]);

  // ── 5. Búsqueda LOCAL dentro del contexto del usuario ────────────────────────
  const q = search.toLowerCase().trim();
  const players  = q ? rawPlayers.filter((p) => p.name.toLowerCase().includes(q) || (p.username ?? '').toLowerCase().includes(q)) : rawPlayers;
  const teams    = q ? rawTeams.filter((t) => t.name.toLowerCase().includes(q))   : rawTeams;
  const coaches  = q ? rawCoaches.filter((c) => c.name.toLowerCase().includes(q)) : rawCoaches;
  const leagues  = q ? rawLeagues.filter((l) => l.name.toLowerCase().includes(q)) : rawLeagues;

  // ── 6. Loading / isFetching / paginación ─────────────────────────────────────
  const contextLoading = loadingPlayerTeams || loadingCoachTeams || loadingAdmin || loadingLeagueDetails;
  const isLoading =
    activeTab === 'players'
      ? (user?.role === 'admin' ? loadingAdminPlayers : loadingTeamPlayers)
      : activeTab === 'teams'
        ? (user?.role === 'admin' ? loadingLeagueDetails : contextLoading)
        : activeTab === 'coaches'
          ? (loadingAllCoaches || (user?.role === 'coach' ? coachLeagueDetailsQuery.isLoading : false))
          : activeTab === 'leagues'
            ? (user?.role === 'admin'
              ? loadingLeagueDetails
              : user?.role === 'coach'
                ? coachLeagueDetailsQuery.isLoading
                : contextLoading)
            : contextLoading;

  const isFetching = false;
  const totalPages = 1;

  function refetchActive() { /* datos locales — no hay fetch extra */ }

  const listData: any[] =
    activeTab === 'players' ? players  :
    activeTab === 'teams'   ? teams    :
    activeTab === 'coaches' ? coaches  : leagues;

  const empty = !isLoading && listData.length === 0;

  const isLoadingMore =
    activeTab === 'players'
      ? (user?.role === 'admin' ? adminLeaguePlayersQuery.isFetchingNextPage : teamPlayersQuery.isFetchingNextPage)
      : activeTab === 'teams'
        ? (user?.role === 'admin' ? adminLeagueDetailsQuery.isFetchingNextPage : false)
        : activeTab === 'coaches'
          ? (coachesQuery.isFetchingNextPage || (user?.role === 'coach' ? coachLeagueDetailsQuery.isFetchingNextPage : false))
          : activeTab === 'leagues'
            ? (user?.role === 'admin'
              ? adminLeagueDetailsQuery.isFetchingNextPage
              : user?.role === 'coach'
                ? coachLeagueDetailsQuery.isFetchingNextPage
                : false)
            : false;

  function handleLoadMore() {
    if (activeTab === 'players') {
      if (user?.role === 'admin') {
        if (adminLeagueDetailsQuery.hasNextPage) adminLeagueDetailsQuery.fetchNextPage();
        if (adminLeaguePlayersQuery.hasNextPage) adminLeaguePlayersQuery.fetchNextPage();
      } else if (teamPlayersQuery.hasNextPage) {
        teamPlayersQuery.fetchNextPage();
      }
      return;
    }
    if (activeTab === 'teams') {
      if (user?.role === 'admin' && adminLeagueDetailsQuery.hasNextPage) {
        adminLeagueDetailsQuery.fetchNextPage();
      }
      return;
    }
    if (activeTab === 'coaches') {
      if (coachesQuery.hasNextPage) coachesQuery.fetchNextPage();
      if (user?.role === 'admin' && adminLeagueDetailsQuery.hasNextPage) {
        adminLeagueDetailsQuery.fetchNextPage();
      }
      if (user?.role === 'coach' && coachLeagueDetailsQuery.hasNextPage) {
        coachLeagueDetailsQuery.fetchNextPage();
      }
      return;
    }
    if (activeTab === 'leagues') {
      if (user?.role === 'admin' && adminLeagueDetailsQuery.hasNextPage) {
        adminLeagueDetailsQuery.fetchNextPage();
      }
      if (user?.role === 'coach' && coachLeagueDetailsQuery.hasNextPage) {
        coachLeagueDetailsQuery.fetchNextPage();
      }
    }
  }

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
          keyExtractor={(item, index) => {
            const rawId =
              activeTab === 'players'  ? item.playerId :
              activeTab === 'teams'    ? item.teamId   :
              activeTab === 'coaches'  ? item.coachId  : item.id;
            return `${activeTab}-${rawId ?? 'unknown'}-${index}`;
          }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refetchActive}
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
                      pathname: '/playerCareerDashboard',
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
                      pathname: '/teamCareerDashboard' as any,
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
                      pathname: '/coachCareerDashboard' as any,
                      params: { coachId: String(item.coachId), name: item.name },
                    })
                  }
                />
              );
            }
            return (
              <LeagueRow
                item={item}
                onPress={() =>
                  router.push({
                    pathname: '/leagueDetail',
                    params: { id: String(item.id), name: item.name },
                  })
                }
              />
            );
          }}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color={currentTab.color} />
              </View>
            ) : null
          }
        ></FlatList>
      )}
    </View>
  );
}
