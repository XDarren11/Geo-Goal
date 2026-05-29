import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminDashboard, type AdminLeagueItem } from '@/Api/publicAPI';
import { addFavorite, removeFavoriteByEntity, getFavoriteIds } from '@/Api/favoritesAPI';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';
import Loader from '@/components/Loader';
import { DashSection, KpiCard } from '@/components/Charts';

// ─── League row ────────────────────────────────────────────────────────────────
function LeagueRow({
  item,
  onPress,
}: {
  item: AdminLeagueItem;
  onPress: () => void;
}) {
  const pct = item.matchesTotal > 0 ? item.matchesPlayed / item.matchesTotal : 0;
  const barColor = pct >= 1 ? '#10b981' : pct > 0.5 ? '#38bdf8' : '#6b7280';
  const dateStr = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString('es', { year: 'numeric', month: 'short' })
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: '#1f2937',
      }}
    >
      {/* Row 1: name + chevron */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              backgroundColor: '#39FF1415',
              borderWidth: 1,
              borderColor: '#39FF1430',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="trophy-outline" size={14} color="#39FF14" />
          </View>
          <Text style={{ color: '#f3f4f6', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={13} color="#39FF14" />
      </View>

      {/* Row 2: meta chips */}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="shield-outline" size={11} color="#9ca3af" />
          <Text style={{ color: '#9ca3af', fontSize: 11 }}>
            {item.teamsCount} equipos
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ionicons name="football-outline" size={11} color="#9ca3af" />
          <Text style={{ color: '#9ca3af', fontSize: 11 }}>
            {item.matchesPlayed}/{item.matchesTotal} partidos
          </Text>
        </View>
        {dateStr ? (
          <Text style={{ color: '#4b5563', fontSize: 10 }}>{dateStr}</Text>
        ) : null}
      </View>

      {/* Progress bar: matches played */}
      <View style={{ height: 3, borderRadius: 2, backgroundColor: '#1f2937', overflow: 'hidden' }}>
        <View
          style={{
            height: 3,
            width: `${Math.round(pct * 100)}%`,
            borderRadius: 2,
            backgroundColor: barColor,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AdminCareerDashboardScreen() {
  const router = useRouter();
  const { adminId, name: adminNameParam } = useLocalSearchParams<{ adminId: string; name?: string }>();
  const { data: user } = useAuth();
  const queryClient = useQueryClient();

  const id = Number(adminId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminCareerDashboard', id],
    queryFn: () => getAdminDashboard(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });

  const { data: favIds = [] } = useQuery({
    queryKey: ['account', 'favorites', 'ids'],
    queryFn: getFavoriteIds,
    enabled: !!user,
    staleTime: 60_000,
  });

  const isFav = favIds.some((f) => f.entityType === 'admin' && f.entityId === id);

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFav) return removeFavoriteByEntity({ entityType: 'admin', entityId: id });
      return addFavorite({
        entityType: 'admin',
        entityId: id,
        label: data?.admin?.name ?? adminNameParam ?? undefined,
      });
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
      <View
        style={{
          flex: 1,
          backgroundColor: '#0d1117',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 16 }}>
          No se pudieron cargar las estadísticas.
        </Text>
        <BackButton />
      </View>
    );
  }

  const totalCompleted = data.leagues.reduce((s, l) => s + (l.matchesPlayed >= l.matchesTotal && l.matchesTotal > 0 ? 1 : 0), 0);
  const totalActive    = data.leagues.reduce((s, l) => s + (l.matchesPlayed < l.matchesTotal && l.matchesPlayed > 0 ? 1 : 0), 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0d1117' }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Header ── */}
      <View
        style={{
          backgroundColor: '#0f172a',
          borderBottomWidth: 1,
          borderBottomColor: '#39FF1430',
          paddingHorizontal: 16,
          paddingTop: 52,
          paddingBottom: 16,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackButton />
          {user ? (
            <TouchableOpacity
              onPress={() => toggleFav.mutate()}
              disabled={toggleFav.isPending}
              style={{
                padding: 8,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: isFav ? '#facc15' : '#39FF1430',
                backgroundColor: isFav ? '#facc1510' : 'transparent',
              }}
            >
              <Ionicons
                name={isFav ? 'star' : 'star-outline'}
                size={20}
                color={isFav ? '#facc15' : '#39FF14'}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 12 }}>Perfil del administrador</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 }}>
          {data.admin.name}
        </Text>
        {data.admin.username ? (
          <Text style={{ color: '#39FF14', fontSize: 12, marginTop: 2 }}>
            @{data.admin.username}
          </Text>
        ) : null}

        {/* Quick chips */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { icon: 'trophy-outline' as const,  label: `${data.totalLeagues} ligas`,   color: '#39FF14' },
            { icon: 'shield-outline' as const,   label: `${data.totalTeams} equipos`,  color: '#38bdf8' },
            { icon: 'football-outline' as const, label: `${data.totalMatches} partidos`, color: '#a78bfa' },
          ].map((chip) => (
            <View
              key={chip.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: chip.color + '15',
                borderWidth: 1,
                borderColor: chip.color + '40',
                borderRadius: 20,
                paddingHorizontal: 10,
                paddingVertical: 4,
              }}
            >
              <Ionicons name={chip.icon} size={11} color={chip.color} />
              <Text style={{ color: chip.color, fontSize: 11, fontWeight: '700' }}>{chip.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 20 }}>

        {/* ── KPI row ── */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <KpiCard label="Ligas creadas"    value={data.totalLeagues}  accent="#39FF14" />
          <KpiCard label="Equipos totales"  value={data.totalTeams}    accent="#38bdf8" />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <KpiCard
            label="Partidos totales"
            value={data.totalMatches}
            accent="#a78bfa"
          />
          <KpiCard
            label="Ligas activas"
            value={totalActive}
            sub={`${totalCompleted} finalizadas`}
            accent="#fb923c"
          />
        </View>

        {/* ── Ligas creadas ── */}
        {data.leagues.length > 0 && (
          <DashSection title="Historial de ligas">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              {data.leagues.map((league, i) => (
                <View
                  key={league.leagueId}
                  style={i === data.leagues.length - 1 ? { borderBottomWidth: 0 } : undefined}
                >
                  <LeagueRow
                    item={league}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/leagueDetail',
                        params: { leagueId: String(league.leagueId) },
                      } as any)
                    }
                  />
                </View>
              ))}
            </View>
          </DashSection>
        )}

        {data.leagues.length === 0 && (
          <View
            style={{
              backgroundColor: '#0f172a',
              borderWidth: 1,
              borderColor: '#39FF1420',
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="trophy-outline" size={32} color="#374151" />
            <Text style={{ color: '#6b7280', fontSize: 13, textAlign: 'center' }}>
              Este administrador aún no ha creado ligas.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
