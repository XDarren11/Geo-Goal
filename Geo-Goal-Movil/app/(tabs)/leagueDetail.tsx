import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getLeagueById, getLeagueMatches, getStandings, updateMatchSchedule, leagueLogoUrl } from '@/Api/leagueAPI';
import { Ionicons } from '@expo/vector-icons';
import type { FixtureByRound } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import Loader from '@/components/Loader';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { Image } from 'expo-image';

export default function LeagueDetailScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const [activeTab, setActiveTab] = React.useState<'info' | 'fixture' | 'standings'>('info');
  const [selectedMatchId, setSelectedMatchId] = React.useState<number | null>(null);
  const [scheduleInput, setScheduleInput] = React.useState('');
  const { data: user } = useAuth();

  const leagueId = typeof id === 'string' ? parseInt(id, 10) : typeof id === 'number' ? id : 0;
  const leagueName = typeof name === 'string' ? decodeURIComponent(name) : 'Liga';

  const { data: league, isLoading: leagueLoading } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => getLeagueById(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && user?.role === 'admin',
  });

  const { data: matchesData, isLoading: fixtureLoading, refetch: refetchMatches } = useQuery({
    queryKey: ['matches', leagueId],
    queryFn: () => getLeagueMatches(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && activeTab === 'fixture',
  });

  const { data: standings, isLoading: standingsLoading } = useQuery({
    queryKey: ['standings', leagueId],
    queryFn: () => getStandings(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && activeTab === 'standings',
  });

  const scheduleMutation = useMutation({
    mutationFn: ({ matchId, date }: { matchId: number; date: string }) => updateMatchSchedule(matchId, date),
    onSuccess: () => {
      Alert.alert('Listo', 'Partido programado correctamente. Se notificó a los participantes.');
      setSelectedMatchId(null);
      setScheduleInput('');
      refetchMatches();
    },
    onError: (error: any) => {
      Alert.alert('Error', getApiErrorMessage(error, 'No se pudo programar el partido'));
    },
  });

  if (leagueLoading && user?.role === 'admin') {
    return <Loader fullScreen label="Cargando liga..." />;
  }

  if (user?.role === 'admin' && !league) {
    return (
      <View className="flex-1 bg-geo-black justify-center items-center">
        <Text className="text-geo-green">Liga no encontrada</Text>
      </View>
    );
  }

  const effectiveLeague = league ?? {
    id: leagueId,
    name: leagueName,
    description: undefined,
    teams: [],
  };

  const isGrouped = matchesData && !Array.isArray(matchesData) && typeof matchesData === 'object';
  const fixtureRounds = matchesData
    ? isGrouped
      ? Object.entries(matchesData as Record<string, any[]>).flatMap(([round, matches]) =>
          matches.map((match) => ({ round, ...match }))
        )
      : (matchesData as any[])
    : [];

  const standingsList = Array.isArray(standings) ? standings : [];

  const selectedMatch = fixtureRounds.find((m: any) => m.id === selectedMatchId);
  const selectedMatchIsPast = Boolean(
    selectedMatch?.date && new Date(selectedMatch.date).getTime() < Date.now()
  );

  return (
    <View className="flex-1 bg-geo-black">
      {/* Header */}
      <View className="bg-gray-900 border-b border-geo-green px-4 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#39FF14" />
        </TouchableOpacity>
        <View className="flex-1 flex-row items-center gap-3">
          {effectiveLeague.logoUrl ? (
            <Image source={{ uri: leagueLogoUrl(effectiveLeague.logoUrl) }} style={{ width: 42, height: 42, borderRadius: 21 }} contentFit="cover" />
          ) : null}
          <View className="flex-1">
          <Text className="text-white font-bold text-lg">{effectiveLeague.name}</Text>
          <Text className="text-gray-400 text-xs">{effectiveLeague.teams?.length || 0} equipos</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-geo-green/30 px-4 gap-2">
        {(['info', 'fixture', 'standings'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`py-3 px-2 border-b-2 flex-1 ${activeTab === tab ? 'border-geo-green' : 'border-transparent'}`}
          >
            <Text
              className={`font-bold text-xs text-center capitalize ${
                activeTab === tab ? 'text-geo-green' : 'text-gray-400'
              }`}
            >
              {tab === 'info' ? 'Información' : tab === 'fixture' ? 'Calendario' : 'Clasificación'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'info' && (
        <ScrollView className="flex-1 px-4 py-4">
          <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-4">
            <Text className="text-geo-green font-bold mb-2">Descripción</Text>
            <Text className="text-gray-300">{effectiveLeague.description || 'Información disponible en versión web de administrador'}</Text>
          </View>

          <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-4">
            <Text className="text-geo-green font-bold mb-2">Equipos ({effectiveLeague.teams?.length || 0})</Text>
            <FlatList
              scrollEnabled={false}
              data={effectiveLeague.teams || []}
              keyExtractor={(item) => `team-${item.id}`}
              renderItem={({ item }) => (
                <View className="bg-gray-800 rounded-lg p-3 mb-2 flex-row justify-between items-center">
                  <Text className="text-white flex-1">{item.name}</Text>
                </View>
              )}
            />
          </View>
        </ScrollView>
      )}

      {activeTab === 'fixture' && (
        fixtureLoading ? (
          <Loader fullScreen label="Cargando calendario..." />
        ) : (
          <ScrollView className="flex-1 px-4 py-4">
            {user?.role === 'admin' && selectedMatchId ? (
              <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-4">
                <Text className="text-geo-green font-bold mb-2">Programar partido individual</Text>
                <Text className="text-gray-400 text-xs mb-2">
                  Formato: YYYY-MM-DDTHH:mm (hora local)
                </Text>
                {selectedMatchIsPast ? (
                  <Text className="text-yellow-400 text-xs mb-2">
                    Este partido ya pasó. No se permite cambiar su fecha.
                  </Text>
                ) : null}
                <TextInput
                  value={scheduleInput}
                  onChangeText={setScheduleInput}
                  placeholder="2026-04-12T19:30"
                  placeholderTextColor="#777"
                  editable={!selectedMatchIsPast}
                  className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-white mb-3"
                />
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    disabled={selectedMatchIsPast || !scheduleInput || scheduleMutation.isPending}
                    onPress={() => {
                      const d = new Date(scheduleInput);
                      if (Number.isNaN(d.getTime())) {
                        Alert.alert('Fecha inválida', 'Usa el formato YYYY-MM-DDTHH:mm');
                        return;
                      }
                      scheduleMutation.mutate({ matchId: selectedMatchId, date: d.toISOString() });
                    }}
                    className="flex-1 rounded-xl bg-geo-green py-3 items-center"
                  >
                    <Text className="font-bold text-geo-black">
                      {scheduleMutation.isPending ? 'Guardando...' : 'Guardar fecha/hora'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedMatchId(null);
                      setScheduleInput('');
                    }}
                    className="rounded-xl border border-gray-600 px-4 py-3"
                  >
                    <Text className="text-gray-300 font-semibold">Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {fixtureRounds.length > 0 ? (
              <FlatList
                scrollEnabled={false}
                data={fixtureRounds}
                keyExtractor={(item, idx) => `match-${item.id}-${idx}`}
                renderItem={({ item }) => (
                  <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-geo-green text-xs font-bold">{item.round}</Text>
                      <Text className="text-gray-400 text-xs">
                        {item.date ? new Date(item.date).toLocaleString() : 'Sin programar'}
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-white font-bold flex-1">{item.homeTeam?.name || 'TBD'}</Text>
                      <View className="mx-2 gap-1">
                        {item.played ? (
                          <>
                            <Text className="text-geo-green font-bold text-center">{item.homeScore}</Text>
                            <Text className="text-geo-green font-bold text-center">{item.awayScore}</Text>
                          </>
                        ) : (
                          <Text className="text-geo-green font-bold text-xs">vs</Text>
                        )}
                      </View>
                      <Text className="text-white font-bold flex-1 text-right">{item.awayTeam?.name || 'TBD'}</Text>
                    </View>

                    {user?.role === 'admin' ? (
                      <View className="mt-3 flex-row justify-end gap-2">
                        <TouchableOpacity
                          onPress={() => router.push(`/(tabs)/matchDetail?id=${item.id}`)}
                          className="rounded-lg border border-geo-green px-3 py-1"
                        >
                          <Text className="text-geo-green text-xs font-bold">Ver detalle táctico</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            if (item.date && new Date(item.date).getTime() < Date.now()) {
                              Alert.alert('Partido vencido', 'No se puede cambiar la fecha de un partido cuya fecha/hora ya pasó.');
                              return;
                            }
                            setSelectedMatchId(item.id);
                            setScheduleInput(item.date ? new Date(item.date).toISOString().slice(0, 16) : '');
                          }}
                          className="rounded-lg border border-geo-green px-3 py-1"
                        >
                          <Text className="text-geo-green text-xs font-bold">Programar fecha/hora</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => router.push(`/(tabs)/matchDetail?id=${item.id}`)}
                        className="mt-3 self-end rounded-lg border border-geo-green px-3 py-1"
                      >
                        <Text className="text-geo-green text-xs font-bold">Ver detalle táctico</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            ) : (
              <View className="flex-1 justify-center items-center py-10">
                <Text className="text-gray-400">No hay partidos disponibles</Text>
              </View>
            )}
          </ScrollView>
        )
      )}

      {activeTab === 'standings' && (
        standingsLoading ? (
          <Loader fullScreen label="Cargando clasificación..." />
        ) : (
          <ScrollView className="flex-1 px-4 py-4">
            {standings ? (
              <FlatList
                scrollEnabled={false}
                data={standingsList}
                keyExtractor={(_, idx) => `standings-${idx}`}
                renderItem={({ item, index }) => (
                  <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <Text className="text-geo-green font-bold w-8">{index + 1}</Text>
                      <Text className="text-white font-bold ml-2 flex-1">{(item as any).team?.name || 'N/A'}</Text>
                    </View>
                    <View className="flex-row gap-3">
                      <View className="items-center">
                        <Text className="text-xs text-gray-400">PJ</Text>
                        <Text className="text-white font-bold">{(item as any).gamesPlayed || 0}</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-xs text-gray-400">PTS</Text>
                        <Text className="text-geo-green font-bold">{(item as any).points || 0}</Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            ) : (
              <View className="flex-1 justify-center items-center py-10">
                <Text className="text-gray-400">No hay clasificación disponible</Text>
              </View>
            )}
          </ScrollView>
        )
      )}
    </View>
  );
}
