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
import {
  DashSection,
  WinLoseBar,
  StatBar,
  FormationBarList,
  KpiCard,
  ratingColor,
} from '@/components/Charts';

// ─── Result badge ─────────────────────────────────────────────────────────────
function ResultBadge({ r }: { r: 'W' | 'D' | 'L' }) {
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
      return addFavorite({
        entityType: 'coach',
        entityId: id,
        label: data?.coach?.name ?? coachNameParam ?? undefined,
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
      <View style={{ flex: 1, backgroundColor: '#0d1117', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: '#f87171', textAlign: 'center', marginBottom: 16 }}>
          No se pudieron cargar las estadísticas.
        </Text>
        <BackButton />
      </View>
    );
  }

  // ── derived ──
  const recentStreak = data.recentResults?.slice(0, 10) ?? [];
  const winRate = data.winRate ?? 0;

  const formationDist = data.formationDistribution
    ? Object.entries(data.formationDistribution).map(([formation, count]) => ({
        formation,
        count: count as number,
      }))
    : [];

  const maxGoals = Math.max(data.avgGoalsFor, data.avgGoalsAgainst, 0.01);

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

        <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 12 }}>Dashboard del entrenador</Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 }}>
          {data.coach.name}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          {data.totalMatches} partidos dirigidos
        </Text>

        {/* Recent streak */}
        {recentStreak.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
            {recentStreak.map((r, i) => (
              <ResultBadge key={i} r={r.result} />
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

        {/* ── Win rate big number + KPIs ── */}
        <View style={{ gap: 8 }}>
          <View
            style={{
              backgroundColor: '#0f172a',
              borderWidth: 1,
              borderColor: '#39FF1430',
              borderRadius: 20,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>
                % Victorias
              </Text>
              <Text
                style={{
                  color: winRate >= 0.5 ? '#10b981' : winRate >= 0.35 ? '#fbbf24' : '#ef4444',
                  fontSize: 42,
                  fontWeight: '900',
                  lineHeight: 48,
                }}
              >
                {(winRate * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 15 }}>{data.wins}V</Text>
                <Text style={{ color: '#9ca3af', fontWeight: '800', fontSize: 15 }}>{data.draws}E</Text>
                <Text style={{ color: '#ef4444', fontWeight: '800', fontSize: 15 }}>{data.losses}D</Text>
              </View>
              <Text style={{ color: '#6b7280', fontSize: 11 }}>{data.totalMatches} partidos</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <KpiCard
              label="GF/PJ"
              value={typeof data.avgGoalsFor === 'number' ? data.avgGoalsFor.toFixed(2) : '—'}
              accent="#38bdf8"
              sub="por partido"
            />
            <KpiCard
              label="GC/PJ"
              value={typeof data.avgGoalsAgainst === 'number' ? data.avgGoalsAgainst.toFixed(2) : '—'}
              accent="#f97316"
              sub="por partido"
            />
          </View>
        </View>

        {/* ── Goals avg bars ── */}
        <DashSection title="Promedios de goles">
          <View
            style={{
              backgroundColor: '#0f172a',
              borderWidth: 1,
              borderColor: '#39FF1420',
              borderRadius: 20,
              padding: 16,
            }}
          >
            <StatBar
              label="Goles a favor / partido"
              value={data.avgGoalsFor}
              max={Math.max(maxGoals * 1.2, 3)}
              color="#38bdf8"
            />
            <StatBar
              label="Goles en contra / partido"
              value={data.avgGoalsAgainst}
              max={Math.max(maxGoals * 1.2, 3)}
              color="#f97316"
            />
          </View>
        </DashSection>

        {/* ── Formation distribution ── */}
        {formationDist.length > 0 && (
          <DashSection title="Distribución de formaciones">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                padding: 16,
              }}
            >
              <FormationBarList formations={formationDist} />
            </View>
          </DashSection>
        )}

        {/* ── Equipos dirigidos ── */}
        {data.teamsManaged?.length > 0 && (
          <DashSection title="Equipos dirigidos">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              {data.teamsManaged.map((t, i) => {
                const teamWinRate = t.matches > 0 ? t.wins / t.matches : 0;
                return (
                  <TouchableOpacity
                    key={`${t.teamId ?? 'team'}-${i}`}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/teamCareerDashboard',
                        params: { teamId: String(t.teamId), name: t.teamName },
                      } as any)
                    }
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: '#111827',
                      borderBottomWidth: i < data.teamsManaged.length - 1 ? 1 : 0,
                      borderBottomColor: '#1f2937',
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            backgroundColor: '#39FF1415',
                            borderWidth: 1,
                            borderColor: '#39FF1430',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Ionicons name="shield-outline" size={13} color="#39FF14" />
                        </View>
                        <Text style={{ color: '#f8fafc', fontSize: 14, fontWeight: '800', flex: 1 }} numberOfLines={1}>
                          {t.teamName ?? 'Equipo'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <Text style={{ color: '#9ca3af', fontSize: 11 }}>
                          {t.matches}PJ · {t.wins}V
                        </Text>
                        <Ionicons name="chevron-forward" size={13} color="#39FF14" />
                      </View>
                    </View>
                    {/* Mini win rate bar per team */}
                    <View
                      style={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: '#1f2937',
                        overflow: 'hidden',
                      }}
                    >
                      <View
                        style={{
                          height: 4,
                          width: `${Math.round(teamWinRate * 100)}%`,
                          borderRadius: 2,
                          backgroundColor: teamWinRate >= 0.5 ? '#10b981' : '#fbbf24',
                        }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </DashSection>
        )}

        {/* ── Top jugadores ── */}
        {data.topFormedPlayers?.length > 0 && (
          <DashSection title="Jugadores destacados">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              {data.topFormedPlayers.slice(0, 5).map((p, i) => (
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
                    borderBottomWidth: i < Math.min(data.topFormedPlayers.length, 5) - 1 ? 1 : 0,
                    borderBottomColor: '#1f2937',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#39FF14', fontSize: 13, fontWeight: '700', flex: 1 }} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>{p.goals}G</Text>
                    <View
                      style={{
                        backgroundColor: ratingColor(p.avgRating) + '22',
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: ratingColor(p.avgRating), fontSize: 11, fontWeight: '900' }}>
                        {typeof p.avgRating === 'number' ? p.avgRating.toFixed(1) : '—'}★
                      </Text>
                    </View>
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
