import React from 'react';
import { Alert, View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAdminDashboardSummary } from '@/Api/adminAPI';
import { getCoachDashboardSummary, getPlayerDashboardSummary } from '@/Api/teamAPI';
import { getRefereeDashboardSummary } from '@/Api/refereeAPI';
import { Ionicons } from '@expo/vector-icons';
import Loader from '@/components/Loader';
import { getMyNotifications, markAllNotificationsAsRead } from '@/Api/notificationAPI';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  coach: 'Entrenador',
  player: 'Jugador',
  referee: 'Árbitro',
};

export default function HomeScreen() {
  const router = useRouter();
  const { data: user, isLoading: userLoading, logout } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  const { data: adminDashboard, isLoading: adminLoading } = useQuery({
    queryKey: ['adminDashboard', 'mobile', user?.id],
    queryFn: getAdminDashboardSummary,
    enabled: user?.role === 'admin',
  });

  const { data: coachDashboard, isLoading: coachLoading } = useQuery({
    queryKey: ['coachDashboard', 'mobile', user?.id],
    queryFn: getCoachDashboardSummary,
    enabled: user?.role === 'coach',
  });

  const { data: playerDashboard, isLoading: playerLoading } = useQuery({
    queryKey: ['playerDashboard', 'mobile', user?.id],
    queryFn: getPlayerDashboardSummary,
    enabled: user?.role === 'player',
  });

  const { data: refereeDashboard, isLoading: refereeLoading } = useQuery({
    queryKey: ['refereeDashboard', 'mobile', user?.id],
    queryFn: getRefereeDashboardSummary,
    enabled: user?.role === 'referee',
  });

  const { data: notifications = [], isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', 'mobile-home'],
    queryFn: () => getMyNotifications(false),
    enabled: !!user,
  });

  const markAllNotificationsMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      refetchNotifications();
    },
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const openDirections = (lat?: number, lng?: number, fieldName?: string | null) => {
    if (lat == null || lng == null) return;
    router.push({
      pathname: '/navigation',
      params: {
        destLat: lat,
        destLng: lng,
        fieldName: fieldName ?? undefined,
      },
    });
  };

  const formatDate = (date?: string | null) => {
    if (!date) return 'Sin fecha';
    return new Date(date).toLocaleString();
  };

  const openMatchDetail = (matchId: number) => {
    router.push(`/matchDetail?id=${matchId}`);
  };

  if (userLoading) {
    return <Loader fullScreen label="Cargando tu sesión..." />;
  }

  if (!user) {
    return (
      <View className="flex-1 bg-geo-black justify-center items-center">
        <Text className="text-geo-green text-lg">Por favor inicia sesión</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-geo-black">
    <ScrollView className="flex-1 bg-geo-black">
      {/* Header */}
      <View className="bg-gray-900/90 border-b border-geo-green/30 px-4 pt-7 pb-6">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-gray-400 text-xs">Bienvenido</Text>
            <Text className="text-geo-green text-2xl font-extrabold" numberOfLines={1}>{user.name}</Text>
            <Text className="text-gray-500 text-xs mt-1">{ROLE_LABEL[user.role] ?? user.role}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setNotificationsOpen(true)}
              className="bg-gray-800/80 p-3 rounded-2xl border border-geo-green/20 relative"
            >
              <Ionicons name="notifications-outline" size={20} color="#39FF14" />
              {unreadCount > 0 ? (
                <View className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-geo-green items-center justify-center">
                  <Text className="text-[10px] font-black text-geo-black">{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              className="bg-gray-800/80 p-3 rounded-2xl border border-geo-green/20"
            >
              <Ionicons name="log-out" size={20} color="#39FF14" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-4 py-6 gap-4">
        {user.role === 'admin' && (
          <>
            <Text className="text-white text-lg font-bold mb-2">Administrador</Text>
            <TouchableOpacity
              onPress={() => router.push('/league/create')}
              className="border border-geo-green rounded-xl p-4 flex-row items-center justify-between bg-geo-green/10"
            >
              <View className="flex-1">
                <Text className="text-geo-green font-bold">Crear Liga</Text>
                <Text className="text-gray-400 text-sm">Configura nombre, descripción y formato</Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color="#39FF14" />
            </TouchableOpacity>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white text-lg font-bold">Dashboard Admin</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/adminCareerDashboard',
                    params: { adminId: String(user.id), name: user.name },
                  } as any)
                }
                className="flex-row items-center gap-1 rounded-xl border border-geo-green/40 bg-geo-green/10 px-3 py-1.5"
              >
                <Text className="text-geo-green text-xs font-bold">Ver ligas</Text>
                <Ionicons name="chevron-forward" size={12} color="#39FF14" />
              </TouchableOpacity>
            </View>
            <View className="flex-row gap-2">
              <KPI label="Ligas" value={adminDashboard?.stats?.leagues ?? 0} />
              <KPI label="Próximos" value={adminDashboard?.stats?.nextMatches ?? 0} />
              <KPI label="Resultados" value={adminDashboard?.stats?.recentResults ?? 0} />
            </View>

            <Section title="Próximos partidos">
              {adminLoading ? <Loader label="Cargando..." /> : (adminDashboard?.nextMatches ?? []).slice(0, 4).map((m: any) => (
                <SimpleRow
                  key={`a-next-${m.id}`}
                  title={`${m.homeTeam?.name || 'Local'} vs ${m.awayTeam?.name || 'Visitante'}`}
                  subtitle={`${m.league?.name || 'Liga'} · ${formatDate(m.date)}`}
                  onPress={() => openMatchDetail(m.id)}
                />
              ))}
            </Section>

            <Section title="Últimos resultados">
              {(adminDashboard?.recentResults ?? []).slice(0, 4).map((m: any) => (
                <SimpleRow
                  key={`a-res-${m.id}`}
                  title={`${m.homeTeam?.name || 'Local'} ${m.homeScore} - ${m.awayScore} ${m.awayTeam?.name || 'Visitante'}`}
                  subtitle={m.league?.name || 'Liga'}
                  onPress={() => openMatchDetail(m.id)}
                />
              ))}
            </Section>
          </>
        )}

        {user.role === 'coach' && (
          <>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white text-lg font-bold">Dashboard Entrenador</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/coachCareerDashboard',
                    params: { coachId: String(user.id), name: user.name },
                  } as any)
                }
                className="flex-row items-center gap-1 rounded-xl border border-geo-green/40 bg-geo-green/10 px-3 py-1.5"
              >
                <Ionicons name="stats-chart" size={14} color="#39FF14" />
                <Text className="text-geo-green text-xs font-bold">Mi carrera</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row gap-2 flex-wrap">
              <KPI label="PJ" value={coachDashboard?.stats?.playedMatches ?? 0} />
              <KPI label="PTS" value={coachDashboard?.stats?.points ?? 0} />
              <KPI label="GF" value={coachDashboard?.stats?.goalsFor ?? 0} />
              <KPI label="GC" value={coachDashboard?.stats?.goalsAgainst ?? 0} />
              <KPI label="Racha" value={coachDashboard?.stats?.streak ?? '-'} />
            </View>

            <TouchableOpacity
              onPress={() => router.push('/team/create')}
              className="border border-sky-500/60 rounded-xl p-4 flex-row items-center justify-between bg-sky-500/10"
            >
              <View className="flex-1">
                <Text className="text-sky-400 font-bold">Crear Equipo</Text>
                <Text className="text-gray-400 text-sm">Registra tu equipo con nombre y cancha</Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color="#38bdf8" />
            </TouchableOpacity>

            <Section title="Próximos partidos">
              {coachLoading ? <Loader label="Cargando..." /> : (coachDashboard?.upcomingMatches ?? []).slice(0, 4).map((m: any) => (
                
                <TouchableOpacity 
                  key={`c-up-${m.id}`} 
                  className="bg-gray-800 border border-geo-green/20 rounded-lg p-3 mb-2"
                  activeOpacity={0.7}
                  onPress={() => {
                    router.push({
                      pathname: "/matchDetail",
                      params: { id: m.id } 
                    });
                  }}
                >
                  <Text className="text-white font-bold">{m.teamName} vs {m.opponentName}</Text>
                  <Text className="text-gray-400 text-xs">{m.leagueName} · {formatDate(m.date)}</Text>
                  
                  {m.location?.lat != null && m.location?.lng != null ? (
                    <TouchableOpacity 
                      onPress={() => {
                        router.push({
                          pathname: "/navigation",
                          params: { 
                            destLat: m.location.lat, 
                            destLng: m.location.lng,
                            fieldName: m.location.fieldName
                          }
                        });
                      }} 
                      className="mt-2 self-start border border-geo-green rounded px-2 py-1"
                    >
                      <Text className="text-geo-green text-xs font-bold">Cómo llegar (GPS)</Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
                
              ))}
            </Section>

            <Section title="Tendencia y resultados">
              <View className="flex-row gap-2 mb-2">
                <Badge label={`W ${coachDashboard?.trend?.W ?? 0}`} color="emerald" />
                <Badge label={`D ${coachDashboard?.trend?.D ?? 0}`} color="slate" />
                <Badge label={`L ${coachDashboard?.trend?.L ?? 0}`} color="rose" />
              </View>
              {(coachDashboard?.recentResults ?? []).slice(0, 4).map((m: any) => (
                <SimpleRow
                  key={`c-res-${m.id}`}
                  title={`${m.homeTeam?.name || 'Local'} ${m.homeScore} - ${m.awayScore} ${m.awayTeam?.name || 'Visitante'}`}
                  subtitle={formatDate(m.date)}
                  onPress={() => openMatchDetail(m.id)}
                />
              ))}
            </Section>

            <Section title="Top jugadores">
              {(coachDashboard?.topPlayers ?? []).slice(0, 5).map((p: any, idx: number) => (
                <SimpleRow
                  key={`c-pl-${p.playerId}-${idx}`}
                  title={`${idx + 1}. ${p.name}`}
                  subtitle={`G:${p.goals} A:${p.assists} TA:${p.yellowCards} TR:${p.redCards} Min:${p.minutes}`}
                />
              ))}
            </Section>
          </>
        )}

        {user.role === 'player' && (
          <>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white text-lg font-bold">Dashboard Jugador</Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/playerCareerDashboard',
                    params: { playerId: String(user.id), name: user.name },
                  } as any)
                }
                className="flex-row items-center gap-1 rounded-xl border border-geo-green/40 bg-geo-green/10 px-3 py-1.5"
              >
                <Ionicons name="stats-chart" size={14} color="#39FF14" />
                <Text className="text-geo-green text-xs font-bold">Mi carrera</Text>
              </TouchableOpacity>
            </View>
            <Section title="Próximo juego">
              {playerLoading ? <Loader label="Cargando..." /> : playerDashboard?.nextMatch ? (
                <View className="bg-gray-800 border border-geo-green/20 rounded-lg p-3">
                  <Text className="text-white font-bold">{playerDashboard.nextMatch.homeTeam?.name || 'Local'} vs {playerDashboard.nextMatch.awayTeam?.name || 'Visitante'}</Text>
                  <Text className="text-gray-400 text-xs">{formatDate(playerDashboard.nextMatch.date)}</Text>
                  <Text className="text-gray-400 text-xs">Cancha: {playerDashboard.nextMatch.fieldAddress || 'Por confirmar'}</Text>
                  {playerDashboard.nextMatch.location?.lat != null && playerDashboard.nextMatch.location?.lng != null ? (
                    <TouchableOpacity
                      onPress={() => openDirections(
                        playerDashboard.nextMatch.location?.lat,
                        playerDashboard.nextMatch.location?.lng,
                        playerDashboard.nextMatch.location?.fieldName
                      )}
                      className="mt-2 self-start border border-geo-green rounded px-2 py-1"
                    >
                      <Text className="text-geo-green text-xs font-bold">Cómo llegar (GPS)</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <Text className="text-gray-400">No tienes próximo juego.</Text>
              )}
            </Section>

            <Section title="Rendimiento personal (hex)">
              <View className="bg-gray-800 border border-geo-green/20 rounded-lg p-3">
                <Text className="text-white text-sm">Rating promedio: {playerDashboard?.personalPerformance?.averageRating ?? 0}</Text>
                <Text className="text-gray-400 text-xs">Minutos: {playerDashboard?.personalPerformance?.minutes ?? 0} · Contribuciones: {playerDashboard?.personalPerformance?.contributions ?? 0}</Text>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {(playerDashboard?.personalPerformance?.radar ?? []).map((r: any) => (
                    <View key={r.metric} className="rounded-full border border-geo-green/40 px-3 py-1 bg-geo-green/10">
                      <Text className="text-geo-green text-xs font-bold">{r.metric}: {r.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Section>

            <Section title="Últimos resultados del equipo">
              {(playerDashboard?.recentTeamResults ?? []).slice(0, 4).map((m: any) => (
                <SimpleRow
                  key={`p-res-${m.id}`}
                  title={`${m.homeTeam?.name || 'Local'} ${m.homeScore} - ${m.awayScore} ${m.awayTeam?.name || 'Visitante'}`}
                  subtitle={formatDate(m.date)}
                  onPress={() => openMatchDetail(m.id)}
                />
              ))}
            </Section>

            <Section title="Eventos recientes">
              {(playerDashboard?.recentEvents ?? []).slice(0, 6).map((e: any) => (
                <SimpleRow
                  key={`p-ev-${e.id}`}
                  title={`${e.eventType} · ${e.minute}'${e.extraMinute ? `+${e.extraMinute}` : ''}`}
                  subtitle={`${e.match?.homeTeam?.name || 'Local'} vs ${e.match?.awayTeam?.name || 'Visitante'}`}
                />
              ))}
            </Section>
          </>
        )}

        {user.role === 'referee' && (
          <>
            <Text className="text-white text-lg font-bold mb-2">Dashboard Árbitro</Text>
            <View className="flex-row gap-2">
              <KPI label="Asignados" value={refereeDashboard?.stats?.assignedWeek ?? 0} />
              <KPI label="Check-ins" value={refereeDashboard?.stats?.checkIns ?? 0} />
              <KPI label="Cerrados" value={refereeDashboard?.stats?.closedMatches ?? 0} />
            </View>

            <Section title="Próximos partidos asignados">
              {refereeLoading ? <Loader label="Cargando..." /> : (refereeDashboard?.upcomingAssignedMatches ?? []).slice(0, 5).map((a: any) => (
                <SimpleRow
                  key={`r-up-${a.id}`}
                  title={`${a.match?.homeTeam?.name || 'Local'} vs ${a.match?.awayTeam?.name || 'Visitante'}`}
                  subtitle={`${(a.match as any)?.league?.name || 'Liga'} · ${formatDate(a.match?.date)}`}
                  onPress={() => openMatchDetail(a.matchId)}
                />
              ))}
            </Section>

            <Section title="Estado del partido">
              {(refereeDashboard?.matchStatus ?? []).slice(0, 6).map((s: any) => (
                <View key={`r-st-${s.assignmentId}`} className="bg-gray-800 border border-geo-green/20 rounded-lg p-3 mb-2 flex-row justify-between items-center">
                  <View className="flex-1 mr-2">
                    <Text className="text-white font-bold">{s.match?.homeTeam?.name || 'Local'} vs {s.match?.awayTeam?.name || 'Visitante'}</Text>
                    <Text className="text-gray-400 text-xs">{formatDate(s.match?.date)}</Text>
                  </View>
                  <Badge label={s.status === 'in_progress' ? 'En curso' : s.status === 'closed' ? 'Cerrado' : 'Pendiente'} color={s.status === 'closed' ? 'emerald' : s.status === 'in_progress' ? 'amber' : 'slate'} />
                </View>
              ))}
            </Section>

            <Section title="Atajos rápidos">
              {(refereeDashboard?.quickActions ?? []).map((a: any) => (
                <TouchableOpacity key={`r-act-${a.key}`} onPress={() => router.push('/(tabs)/referee')} className="bg-gray-800 border border-geo-green/20 rounded-lg p-3 mb-2">
                  <Text className="text-white font-bold">{a.label}</Text>
                  <Text className="text-gray-400 text-xs">{a.description}</Text>
                </TouchableOpacity>
              ))}
            </Section>

            <Section title="Historial reciente">
              {(refereeDashboard?.recentHistory ?? []).slice(0, 5).map((h: any) => (
                <SimpleRow
                  key={`r-h-${h.assignmentId}`}
                  title={`${h.match?.homeTeam?.name || 'Local'} vs ${h.match?.awayTeam?.name || 'Visitante'}`}
                  subtitle={`Ev:${h.metrics?.eventsCount ?? 0} Gol:${h.metrics?.goals ?? 0} Tar:${h.metrics?.cards ?? 0} Trk:${h.metrics?.trackingFrames ?? 0}`}
                  onPress={() => openMatchDetail(h.matchId ?? h.match?.id)}
                />
              ))}
            </Section>
          </>
        )}
      </View>

    </ScrollView>

      {/* Modal de notificaciones FUERA del ScrollView para evitar ANR */}
      <Modal
        visible={notificationsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationsOpen(false)}
      >
        <View className="flex-1 bg-black/60 justify-center px-4">
          <View className="max-h-[75%] rounded-2xl border border-geo-green/40 bg-gray-900 p-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-white text-lg font-bold">Notificaciones</Text>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  disabled={markAllNotificationsMutation.isPending || notifications.length === 0}
                  onPress={() => markAllNotificationsMutation.mutate()}
                  className="border border-geo-green rounded-lg px-3 py-1"
                >
                  <Text className="text-geo-green text-xs font-bold">Marcar todas</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setNotificationsOpen(false)}
                  className="border border-gray-700 rounded-lg px-3 py-1"
                >
                  <Text className="text-gray-300 text-xs font-bold">Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {notificationsLoading ? (
              <Loader label="Cargando notificaciones..." />
            ) : notifications.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {notifications.slice(0, 10).map((item: any) => (
                  <View key={String(item.id)} className="bg-gray-800 border border-geo-green/20 rounded-lg p-4 mb-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-white font-bold flex-1 mr-2">{item.title}</Text>
                      {!item.readAt ? <Text className="text-geo-green text-[10px] font-bold uppercase">Nueva</Text> : null}
                    </View>
                    <Text className="text-gray-400 text-sm mt-1">{item.message}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View className="bg-gray-800 border border-geo-green/20 rounded-lg p-4">
                <Text className="text-gray-400">No tienes notificaciones.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-1 bg-gray-900/80 border border-geo-green/20 rounded-2xl p-3">
      <Text className="text-gray-500 text-[10px] uppercase tracking-wide">{label}</Text>
      <Text className="text-geo-green text-xl font-extrabold mt-1">{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="text-white text-base font-bold mb-2">{title}</Text>
      <View className="bg-gray-900/80 border border-geo-green/20 rounded-2xl p-3">{children}</View>
    </View>
  );
}

function SimpleRow({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress?: () => void }) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container onPress={onPress} className="bg-gray-800/80 border border-gray-700/60 rounded-2xl p-3 mb-2 active:opacity-90">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-white font-semibold">{title}</Text>
          {subtitle ? <Text className="text-gray-400 text-xs mt-1">{subtitle}</Text> : null}
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={16} color="#39FF14" /> : null}
      </View>
    </Container>
  );
}

function Badge({ label, color }: { label: string; color: 'emerald' | 'rose' | 'slate' | 'amber' }) {
  const map = {
    emerald: 'bg-emerald-500/20 text-emerald-400',
    rose: 'bg-rose-500/20 text-rose-400',
    slate: 'bg-slate-500/20 text-slate-300',
    amber: 'bg-amber-500/20 text-amber-300',
  } as const;

  return (
    <View className={`rounded px-2 py-1 ${map[color]}`}>
      <Text className="text-xs font-bold">{label}</Text>
    </View>
  );
}
