import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPlayerDashboard, getPublicPlayerHeatmap } from '@/Api/publicAPI';
import { addFavorite, removeFavoriteByEntity, getFavoriteIds } from '@/Api/favoritesAPI';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import BackButton from '@/components/BackButton';
import Loader from '@/components/Loader';
import {
  DashSection,
  HexPerformanceGrid,
  MiniBarChart,
  StatBar,
  KpiCard,
  ratingColor,
} from '@/components/Charts';

// ─── Result badge ─────────────────────────────────────────────────────────────

function ResultBadge({ r }: { r: 'W' | 'D' | 'L' | '—' }) {
  const bg =
    r === 'W'
      ? '#10b98122'
      : r === 'D'
        ? '#6b728022'
        : r === 'L'
          ? '#ef444422'
          : '#37415122';
  const tc =
    r === 'W'
      ? '#34d399'
      : r === 'D'
        ? '#9ca3af'
        : r === 'L'
          ? '#f87171'
          : '#6b7280';
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: tc, fontSize: 11, fontWeight: '900' }}>{r}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlayerCareerDashboardScreen() {
  const router = useRouter();
  const { playerId, name: playerName } = useLocalSearchParams<{ playerId: string; name?: string }>();
  const { data: user } = useAuth();
  const queryClient = useQueryClient();

  const id = Number(playerId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['playerCareerDashboard', id],
    queryFn: () => getPlayerDashboard(id),
    enabled: !!id,
    staleTime: 2 * 60_000,
  });

  const { data: favIds = [] } = useQuery({
    queryKey: ['account', 'favorites', 'ids'],
    queryFn: getFavoriteIds,
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: heatmapRes, isLoading: heatmapLoading } = useQuery({
    queryKey: ['playerHeatmap', id],
    queryFn: () => getPublicPlayerHeatmap(id),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const { width: screenWidth } = useWindowDimensions();

  const isFav = favIds.some((f) => f.entityType === 'player' && f.entityId === id);

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFav) return removeFavoriteByEntity({ entityType: 'player', entityId: id });
      return addFavorite({
        entityType: 'player',
        entityId: id,
        label: data?.player?.name ?? playerName ?? undefined,
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

  // 16px outer padding * 2 + 12px card inner padding * 2 = 56px
  const heatCellW = Math.floor((screenWidth - 56) / 21);

  // ── derived ──
  const avg = data.avgRating ?? 0;
  const goalsPerMatch = data.matchesPlayed > 0 ? data.goals / data.matchesPlayed : 0;
  const ratingHistory = (data.ratingHistory ?? []).map((h) => h.rating);

  // Normalised pct values for StatBadges (0–1)
  const maxGoals = Math.max(data.goals, 1);
  const maxAssists = Math.max(data.assists, 1);
  const maxKeyPasses = Math.max(data.keyPasses, 1);
  const maxXG = Math.max(data.xG ?? 0, 1);
  const maxMinutes = Math.max(data.minutesPlayed, 1);
  const maxTackles = Math.max(data.tackles, 1);

  const hexStats = [
    { label: 'Goles', value: data.goals, pct: Math.min(1, data.goals / Math.max(maxGoals, 10)), color: '#10b981' },
    { label: 'Asist.', value: data.assists, pct: Math.min(1, data.assists / Math.max(maxAssists, 8)), color: '#38bdf8' },
    { label: 'Pases', value: data.keyPasses, pct: Math.min(1, data.keyPasses / Math.max(maxKeyPasses, 20)), color: '#a78bfa' },
    { label: 'xG', value: (data.xG ?? 0).toFixed(1), pct: Math.min(1, (data.xG ?? 0) / Math.max(maxXG, 5)), color: '#fb923c' },
    { label: 'Tackles', value: data.tackles, pct: Math.min(1, data.tackles / Math.max(maxTackles, 15)), color: '#f472b6' },
    { label: 'Min', value: data.minutesPlayed, pct: Math.min(1, data.minutesPlayed / Math.max(maxMinutes, 900)), color: '#fbbf24' },
  ] as const;

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

        <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 12 }}>
          Estadísticas de carrera
        </Text>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 2 }}>
          {data.player.name}
        </Text>
        {data.player.username ? (
          <Text style={{ color: '#39FF14', fontSize: 12, marginTop: 2 }}>
            @{data.player.username}
          </Text>
        ) : null}
        <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
          {data.matchesPlayed} partidos · {data.minutesPlayed} min jugados
        </Text>

        {/* MVP chip */}
        {data.mvpCount > 0 && (
          <View
            style={{
              marginTop: 8,
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: '#d97706' + '22',
              borderWidth: 1,
              borderColor: '#d9770650',
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 4,
            }}
          >
            <Ionicons name="trophy" size={12} color="#fbbf24" />
            <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>
              {data.mvpCount} MVP{data.mvpCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 20 }}>

        {/* ── Hex Performance Grid ── */}
        {avg > 0 && (
          <DashSection title="Rendimiento">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                paddingVertical: 16,
                paddingHorizontal: 8,
              }}
            >
              <HexPerformanceGrid rating={avg} stats={hexStats as any} />
            </View>
          </DashSection>
        )}

        {/* ── Rating history mini chart ── */}
        {ratingHistory.length >= 2 && (
          <DashSection title="Evolución de rating">
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
                  Últimos {ratingHistory.length} partidos
                </Text>
                <Text style={{ color: ratingColor(avg), fontSize: 13, fontWeight: '800' }}>
                  prom. {avg.toFixed(1)}
                </Text>
              </View>
              <MiniBarChart
                data={ratingHistory}
                maxVal={10}
                height={56}
                barWidth={Math.max(4, Math.floor(280 / ratingHistory.length) - 3)}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ color: '#6b7280', fontSize: 9 }}>+antiguo</Text>
                <Text style={{ color: '#6b7280', fontSize: 9 }}>más reciente →</Text>
              </View>
            </View>
          </DashSection>
        )}

        {/* ── Mapa de calor posicional ── */}
        <DashSection title="Mapa de calor posicional">
          <View
            style={{
              backgroundColor: '#0f172a',
              borderWidth: 1,
              borderColor: '#39FF1420',
              borderRadius: 20,
              overflow: 'hidden',
              padding: 12,
            }}
          >
            {heatmapLoading ? (
              <View style={{ height: 110, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Ionicons name="map-outline" size={26} color="#374151" />
                <Text style={{ color: '#6b7280', fontSize: 12 }}>Cargando mapa de calor...</Text>
              </View>
            ) : heatmapRes && heatmapRes.matchesWithData > 0 ? (
              <>
                {/* Field wrapper */}
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: '#39FF1440',
                    borderRadius: 4,
                    overflow: 'hidden',
                    backgroundColor: '#061410',
                    alignSelf: 'center',
                  }}
                >
                  {heatmapRes.heatmap.map((row, rIdx) => (
                    <View key={rIdx} style={{ flexDirection: 'row' }}>
                      {row.map((val, cIdx) => {
                        const op = val < 0.02 ? 0 : Math.min(0.92, val);
                        return (
                          <View
                            key={cIdx}
                            style={{
                              width: heatCellW,
                              height: heatCellW,
                              backgroundColor:
                                op === 0
                                  ? 'transparent'
                                  : `rgba(57, 255, 20, ${op.toFixed(2)})`,
                            }}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
                {/* Legend row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {[0.08, 0.25, 0.55, 0.85].map((op, i) => (
                      <View
                        key={i}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          backgroundColor: `rgba(57, 255, 20, ${op})`,
                        }}
                      />
                    ))}
                    <Text style={{ color: '#6b7280', fontSize: 9, marginLeft: 2 }}>baja → alta actividad</Text>
                  </View>
                  <Text style={{ color: '#4b5563', fontSize: 9 }}>
                    {heatmapRes.matchesWithData}/{heatmapRes.totalMatches} partidos
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ height: 80, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Ionicons name="map-outline" size={24} color="#374151" />
                <Text style={{ color: '#4b5563', fontSize: 12, textAlign: 'center' }}>
                  Sin datos de posicionamiento disponibles
                </Text>
              </View>
            )}
          </View>
        </DashSection>

        {/* ── KPI cards ── */}
        <DashSection title="Estadísticas globales">
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <KpiCard
                label="Goles"
                value={data.goals}
                sub={`${goalsPerMatch.toFixed(2)}/PJ`}
                accent="#10b981"
              />
              <KpiCard
                label="Asistencias"
                value={data.assists}
                sub={`${data.keyPasses} pases clave`}
                accent="#38bdf8"
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <KpiCard label="Minutos" value={data.minutesPlayed} accent="#fbbf24" />
              <KpiCard
                label="xG"
                value={(data.xG ?? 0).toFixed(2)}
                sub="goles esperados"
                accent="#fb923c"
              />
            </View>
            {(data.yellowCards > 0 || data.redCards > 0) && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <KpiCard label="Amarillas" value={data.yellowCards} accent="#fbbf24" />
                <KpiCard label="Rojas" value={data.redCards} accent="#ef4444" />
              </View>
            )}
          </View>
        </DashSection>

        {/* ── Stat bars ── */}
        {(data.goals > 0 || data.assists > 0 || data.tackles > 0) && (
          <DashSection title="Desglose">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                padding: 16,
              }}
            >
              {data.goals > 0 && (
                <StatBar label="Goles" value={data.goals} max={Math.max(data.goals, 20)} color="#10b981" />
              )}
              {data.assists > 0 && (
                <StatBar label="Asistencias" value={data.assists} max={Math.max(data.assists, 15)} color="#38bdf8" />
              )}
              {data.keyPasses > 0 && (
                <StatBar label="Pases clave" value={data.keyPasses} max={Math.max(data.keyPasses, 30)} color="#a78bfa" />
              )}
              {data.tackles > 0 && (
                <StatBar label="Recuperaciones" value={data.tackles} max={Math.max(data.tackles, 30)} color="#f472b6" />
              )}
              {data.fouls > 0 && (
                <StatBar label="Faltas" value={data.fouls} max={Math.max(data.fouls, 20)} color="#f97316" />
              )}
            </View>
          </DashSection>
        )}

        {/* ── Últimos partidos ── */}
        {data.recentMatches?.length > 0 && (
          <DashSection title="Últimos partidos">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              {data.recentMatches.slice(0, 8).map((m, i) => (
                <View
                  key={m.matchId}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderBottomWidth: i < Math.min(data.recentMatches.length, 8) - 1 ? 1 : 0,
                    borderBottomColor: '#1f2937',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <ResultBadge r={m.result} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#f3f4f6', fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                        {m.opponent}
                      </Text>
                      <Text style={{ color: '#6b7280', fontSize: 10 }}>
                        {new Date(m.date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '800' }}>{m.goals}G</Text>
                    <Text style={{ color: '#38bdf8', fontSize: 11, fontWeight: '800' }}>{m.assists}A</Text>
                    {m.rating != null && (
                      <View
                        style={{
                          backgroundColor: ratingColor(m.rating) + '22',
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
                        <Text
                          style={{ color: ratingColor(m.rating), fontSize: 11, fontWeight: '900' }}
                        >
                          {m.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </DashSection>
        )}

        {/* ── Equipos ── */}
        {data.topTeams?.length > 0 && (
          <DashSection title="Equipos">
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#39FF1420',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              {data.topTeams.map((t, i) => (
                <TouchableOpacity
                  key={t.teamId}
                  onPress={() =>
                    router.push({
                      pathname: '/teamCareerDashboard',
                      params: { teamId: String(t.teamId), name: t.teamName },
                    } as any)
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderBottomWidth: i < data.topTeams.length - 1 ? 1 : 0,
                    borderBottomColor: '#1f2937',
                  }}
                  activeOpacity={0.7}
                >
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
                    <Text
                      style={{ color: '#39FF14', fontSize: 13, fontWeight: '700', flex: 1 }}
                      numberOfLines={1}
                    >
                      {t.teamName}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: '#9ca3af', fontSize: 11 }}>
                      {t.matches} PJ · {t.goals}G
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color="#39FF14" />
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
