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
import {
  DashSection,
  WinLoseBar,
  StatBar,
  FormationBarList,
  KpiCard,
  MiniBarChart,
  ratingColor,
} from '@/components/Charts';

// ─── Form badge ───────────────────────────────────────────────────────────────
function FormBadge({ r }: { r: 'W' | 'D' | 'L' }) {
  const bg = r === 'W' ? '#10b98122' : r === 'D' ? '#6b728022' : '#ef444422';
  const tc = r === 'W' ? '#34d399' : r === 'D' ? '#9ca3af' : '#f87171';
  return (
    <View
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: tc, fontSize: 10, fontWeight: '900' }}>{r}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
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
      return addFavorite({
        entityType: 'team',
        entityId: id,
        label: data?.team?.name ?? teamNameParam ?? undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', 'favorites', 'ids'] });
      queryClient.invalidateQueries({ queryKey: ['account', 'favorites'] });
    },
    onError: () => Alert.alert('Error', 'No se pudo actualizar favoritos'),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ position: 'absolute', top: 52, left: 16, zIndex: 10 }}>
          <BackButton />
        </View>
        <Loader fullScreen label="Cargando estadísticas..." />
      </View>
    );
  }
  if (isError || !data) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 16 }}>
          No se pudieron cargar las estadísticas.
        </Text>
        <BackButton />
      </View>
    );
  }

  // ── derived ──
  const rawStreak = (data as any).formStreak as unknown;
  const streak: Array<'W' | 'D' | 'L'> = Array.isArray(rawStreak)
    ? rawStreak
    : typeof rawStreak === 'string'
      ? (rawStreak.split('') as Array<'W' | 'D' | 'L'>)
      : [];

  const maxFormation = data.formations?.length
    ? data.formations.reduce((a, b) => (a.count > b.count ? a : b))
    : null;

  // Elo history bars if available
  const eloHistory = (data.eloHistory ?? []).map((h) => h.elo);

  const totalGoals = Math.max(data.goalsFor, data.goalsAgainst, 1);

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

        <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 12 }}>Dashboard del equipo</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 }}>
          {data.team.name}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          {data.matchesPlayed} PJ · {data.points} pts · {data.pointsPerMatch.toFixed(2)} PPP
        </Text>

        {/* Form streak */}
        {streak.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
            {streak.slice(0, 10).map((r, i) => (
              <FormBadge key={i} r={r} />
            ))}
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 20 }}>

        {/* ── Rendimiento global ── */}
        <DashSection title="Rendimiento global">
          <View
            style={{
              backgroundColor: '#0f172a',
              borderWidth: 1,
              borderColor: '#39FF1420',
              borderRadius: 20,
              padding: 16,
            }}
          >
            <WinLoseBar wins={data.wins} draws={data.draws} losses={data.losses} />
          </View>
        </DashSection>

        {/* ── KPI row ── */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <KpiCard label="V" value={data.wins} accent="#10b981" />
            <KpiCard label="E" value={data.draws} accent="#9ca3af" />
            <KpiCard label="D" value={data.losses} accent="#ef4444" />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <KpiCard label="GF" value={data.goalsFor} accent="#38bdf8" />
            <KpiCard label="GC" value={data.goalsAgainst} accent="#f97316" />
            <KpiCard label="DG" value={data.goalsFor - data.goalsAgainst} accent={data.goalsFor >= data.goalsAgainst ? '#10b981' : '#ef4444'} />
          </View>
        </View>

        {/* ── Goles bars ── */}
        <DashSection title="Goles">
          <View
            style={{
              backgroundColor: '#0f172a',
              borderWidth: 1,
              borderColor: '#39FF1420',
              borderRadius: 20,
              padding: 16,
            }}
          >
            <StatBar label="Goles a favor" value={data.goalsFor} max={totalGoals} color="#38bdf8" />
            <StatBar label="Goles en contra" value={data.goalsAgainst} max={totalGoals} color="#f97316" />
            {data.matchesPlayed > 0 && (
              <StatBar
                label="Goles/partido"
                value={parseFloat((data.goalsFor / data.matchesPlayed).toFixed(2))}
                max={5}
                color="#10b981"
              />
            )}
          </View>
        </DashSection>

        {/* ── Elo history ── */}
        {eloHistory.length >= 2 && (
          <DashSection title="Historial Elo">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: '#6b7280', fontSize: 11 }}>
                  Evolución ({eloHistory.length} partidos)
                </Text>
                <Text style={{ color: '#39FF14', fontSize: 13, fontWeight: '800' }}>
                  {eloHistory[eloHistory.length - 1]} Elo
                </Text>
              </View>
              <MiniBarChart
                data={eloHistory}
                maxVal={Math.max(...eloHistory) * 1.05}
                barColor="#39FF14"
                height={56}
                barWidth={Math.max(4, Math.floor(280 / eloHistory.length) - 3)}
              />
            </View>
          </DashSection>
        )}

        {/* ── Formaciones ── */}
        {data.formations?.length > 0 && (
          <DashSection title="Formaciones utilizadas">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                padding: 16,
              }}
            >
              {maxFormation && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#1f2937',
                  }}
                >
                  <Text style={{ color: '#9ca3af', fontSize: 12 }}>Más usada</Text>
                  <View
                    style={{
                      backgroundColor: '#39FF1415',
                      borderWidth: 1,
                      borderColor: '#39FF1440',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: '#39FF14', fontWeight: '900', fontSize: 16 }}>
                      {maxFormation.formation}
                    </Text>
                  </View>
                </View>
              )}
              <FormationBarList formations={data.formations} />
            </View>
          </DashSection>
        )}

        {/* ── Top goleadores ── */}
        {data.topScorers?.length > 0 && (
          <DashSection title="Top goleadores">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              {data.topScorers.slice(0, 5).map((p, i) => (
                <TouchableOpacity
                  key={p.playerId}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/playerCareerDashboard',
                      params: { playerId: String(p.playerId), name: p.name },
                    } as any)
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderBottomWidth: i < Math.min(data.topScorers.length, 5) - 1 ? 1 : 0,
                    borderBottomColor: '#1f2937',
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#10b98120',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '900' }}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={{ color: '#39FF14', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '800' }}>{p.goals}G</Text>
                    <Text style={{ color: ratingColor(p.avgRating ?? 0), fontSize: 11 }}>
                      {typeof p.avgRating === 'number' ? p.avgRating.toFixed(1) : '—'}★
                    </Text>
                    <Ionicons name="chevron-forward" size={13} color="#39FF14" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </DashSection>
        )}

        {/* ── Top asistidores ── */}
        {data.topAssistants?.length > 0 && (
          <DashSection title="Top asistidores">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              {data.topAssistants.slice(0, 5).map((p, i) => (
                <TouchableOpacity
                  key={p.playerId}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/playerCareerDashboard',
                      params: { playerId: String(p.playerId), name: p.name },
                    } as any)
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderBottomWidth: i < Math.min(data.topAssistants.length, 5) - 1 ? 1 : 0,
                    borderBottomColor: '#1f2937',
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: '#38bdf820',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '900' }}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={{ color: '#39FF14', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: '800' }}>{p.assists}A</Text>
                    <Ionicons name="chevron-forward" size={13} color="#39FF14" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </DashSection>
        )}
      </View>
    </ScrollView>
  );
}
