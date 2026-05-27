import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getLeagueById, getLeagueMatches, getStandings, updateMatchSchedule, leagueLogoUrl, updateLeague } from '@/Api/leagueAPI';
import { getPublicLeagueDetail, getPublicFixture, getPublicStandings } from '@/Api/publicAPI';
import { Ionicons } from '@expo/vector-icons';
import type { FixtureByRound } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import Loader from '@/components/Loader';
import BackButton from '@/components/BackButton';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

export default function LeagueDetailScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const [activeTab, setActiveTab] = React.useState<'info' | 'fixture' | 'standings'>('info');
  const [selectedMatchId, setSelectedMatchId] = React.useState<number | null>(null);
  const [scheduleInput, setScheduleInput] = React.useState('');
  const [leagueLogoAsset, setLeagueLogoAsset] = React.useState<any | null>(null);
  const [leagueDescriptionInput, setLeagueDescriptionInput] = React.useState<string | undefined>(undefined);
  const { data: user } = useAuth();

  const leagueId = typeof id === 'string' ? parseInt(id, 10) : typeof id === 'number' ? id : 0;
  const leagueName = typeof name === 'string' ? decodeURIComponent(name) : 'Liga';

  const isAdmin = user?.role === 'admin';

  const { data: league, isLoading: leagueLoading } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => getLeagueById(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && isAdmin,
  });

  const { data: publicLeague, isLoading: publicLeagueLoading } = useQuery({
    queryKey: ['public-league', leagueId],
    queryFn: () => getPublicLeagueDetail(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && !isAdmin,
  });

  const { data: matchesData, isLoading: fixtureLoading, refetch: refetchMatches } = useQuery({
    queryKey: ['matches', leagueId],
    queryFn: () => getLeagueMatches(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && activeTab === 'fixture' && isAdmin,
  });

  // Pre-carga el fixture al entrar (no esperar al tab) para evitar spinner tardío.
  const { data: publicFixture, isLoading: publicFixtureLoading } = useQuery({
    queryKey: ['public-fixture', leagueId],
    queryFn: () => getPublicFixture(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && !isAdmin,
    staleTime: 60_000,
  });

  const { data: standings, isLoading: standingsLoading } = useQuery({
    queryKey: ['standings', leagueId],
    queryFn: () => getStandings(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && activeTab === 'standings' && isAdmin,
  });

  // Carga los standings en cuanto se conoce el leagueId (no esperar al tab)
  // así están listos cuando el usuario cambia de tab sin volver a esperar.
  const { data: publicStandings, isLoading: publicStandingsLoading } = useQuery({
    queryKey: ['public-standings', leagueId],
    queryFn: () => getPublicStandings(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && !isAdmin,
    staleTime: 60_000,
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

  React.useEffect(() => {
    if (league) {
      setLeagueDescriptionInput(league.description ?? undefined);
    }
  }, [league?.description]);

  const pickLeagueLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir el logo de la liga');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setLeagueLogoAsset(result.assets[0]);
    }
  };

  const handleLeagueLogoPress = () => {
    Alert.alert('Logo de la Liga', '', [
      { text: 'Cambiar logo', onPress: pickLeagueLogo },
      { text: 'Eliminar logo', onPress: () => setLeagueLogoAsset(null), style: 'destructive' },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const updateLeagueMutation = useMutation({
    mutationFn: () =>
      updateLeague(leagueId, {
        description: leagueDescriptionInput ?? null,
        logo: leagueLogoAsset ? { uri: leagueLogoAsset.uri, name: leagueLogoAsset.fileName || 'logo.jpg', type: leagueLogoAsset.mimeType || 'image/jpeg' } : undefined,
      }),
    onSuccess: () => {
      Alert.alert('Listo', 'Liga actualizada correctamente');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'No se pudo actualizar la liga');
    },
  });

  if ((leagueLoading && isAdmin) || (publicLeagueLoading && !isAdmin)) {
    return <Loader fullScreen label="Cargando liga..." />;
  }

  if (isAdmin && !league) {
    return (
      <View className="flex-1 bg-geo-black justify-center items-center">
        <Text className="text-geo-green">Liga no encontrada</Text>
      </View>
    );
  }

  // Para no-admin: los equipos pueden venir en league.teams O en el array
  // top-level teams de PublicLeagueDetail — probamos los dos.
  const effectiveLeague = isAdmin
    ? league!
    : {
        ...(publicLeague?.league ?? { id: leagueId, name: leagueName, description: undefined }),
        teams:
          (publicLeague?.league?.teams?.length
            ? publicLeague.league.teams
            : publicLeague?.teams) ?? [],
      };

  const fixtureSource = isAdmin ? matchesData : publicFixture ?? publicLeague?.fixture;
  const isGrouped = fixtureSource && !Array.isArray(fixtureSource) && typeof fixtureSource === 'object';
  const fixtureRounds = fixtureSource
    ? isGrouped
      ? Object.entries(fixtureSource as Record<string, any[]>).flatMap(([round, matches]) =>
          matches.map((match) => ({ round, ...match }))
        )
      : (fixtureSource as any[])
    : [];

  const standingsList = Array.isArray(isAdmin ? standings : publicStandings ?? publicLeague?.standings)
    ? (isAdmin ? standings : publicStandings ?? publicLeague?.standings)
    : [];

  const selectedMatch = fixtureRounds.find((m: any) => m.id === selectedMatchId);
  const selectedMatchIsPast = Boolean(
    selectedMatch?.date && new Date(selectedMatch.date).getTime() < Date.now()
  );

  return (
    <View className="flex-1 bg-geo-black">
      {/* Header */}
      <View className="bg-gray-900/90 border-b border-geo-green/30 px-4 pt-6 pb-5 flex-row items-center">
        <BackButton variant="compact" />
        <View className="flex-1 flex-row items-center gap-3">
          <View className="h-14 w-14 rounded-2xl overflow-hidden bg-gray-800 items-center justify-center border border-geo-green/30">
            {effectiveLeague.logoUrl ? (
              <Image source={{ uri: leagueLogoUrl(effectiveLeague.logoUrl) }} style={{ width: 56, height: 56 }} contentFit="cover" />
            ) : (
              <Ionicons name="trophy-outline" size={26} color="#39FF14" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-white font-extrabold text-lg" numberOfLines={1}>{effectiveLeague.name}</Text>
            <View className="flex-row items-center gap-2 mt-1">
              <Text className="text-gray-400 text-xs">{effectiveLeague.teams?.length || 0} equipos</Text>
              <View className="h-1 w-1 rounded-full bg-gray-600" />
              <Text className="text-geo-green text-xs font-semibold">Liga activa</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="px-4 py-3 bg-geo-black">
        <View className="flex-row rounded-2xl bg-gray-900/80 border border-geo-green/20 p-1">
        {(['info', 'fixture', 'standings'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`py-2 px-2 flex-1 rounded-xl ${activeTab === tab ? 'bg-geo-green/15' : ''}`}
          >
            <Text
              className={`font-semibold text-xs text-center capitalize ${
                activeTab === tab ? 'text-geo-green' : 'text-gray-400'
              }`}
            >
              {tab === 'info' ? 'Información' : tab === 'fixture' ? 'Calendario' : 'Clasificación'}
            </Text>
          </TouchableOpacity>
        ))}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'info' && (
        <ScrollView className="flex-1 px-4 py-4">
          <View className="bg-gray-900/80 border border-geo-green/20 rounded-2xl p-4 mb-4">
            <Text className="text-geo-green font-bold mb-2">Descripción</Text>
            {isAdmin ? (
              <View>
                <TextInput
                  value={leagueDescriptionInput ?? ''}
                  onChangeText={setLeagueDescriptionInput}
                  placeholder="Descripción de la liga"
                  placeholderTextColor="#777"
                  multiline
                  className="bg-gray-800/80 rounded-xl border border-gray-700/80 p-3 text-white h-24 mb-3"
                />
                <View className="flex-row items-center gap-4 mb-3">
                  <TouchableOpacity
                    onPress={handleLeagueLogoPress}
                    className="relative w-16 h-16 rounded-2xl bg-gray-800 items-center justify-center border-2 border-geo-green/50"
                  >
                    {effectiveLeague.logoUrl || leagueLogoAsset ? (
                      <Image
                        source={{ uri: leagueLogoAsset ? leagueLogoAsset.uri : leagueLogoUrl(effectiveLeague.logoUrl!) }}
                        style={{ width: 64, height: 64, borderRadius: 16 }}
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name="image-outline" size={22} color="#39FF14" />
                    )}
                    <View className="absolute -bottom-1 -right-1 bg-geo-green rounded-full w-6 h-6 items-center justify-center border-2 border-gray-900">
                      <Ionicons name="add" size={16} color="#000" />
                    </View>
                  </TouchableOpacity>
                  <View className="flex-1">
                    <Text className="text-gray-400 text-xs mb-2">Toca el logo para editar</Text>
                    <TouchableOpacity
                      onPress={() => updateLeagueMutation.mutate()}
                      disabled={updateLeagueMutation.isPending}
                      className="rounded-xl bg-geo-green px-3 py-2 items-center"
                    >
                      <Text className="text-geo-black font-bold text-xs">Guardar cambios</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <Text className="text-gray-300">{effectiveLeague.description || 'Información disponible en versión web de administrador'}</Text>
            )}
          </View>

          <View className="bg-gray-900/80 border border-geo-green/20 rounded-2xl p-4 mb-4">
            <Text className="text-geo-green font-bold mb-2">Equipos ({effectiveLeague.teams?.length || 0})</Text>
            <FlatList
              scrollEnabled={false}
              data={effectiveLeague.teams || []}
              keyExtractor={(item) => `team-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/teamCareerDashboard' as any,
                      params: { teamId: String(item.id), name: item.name },
                    })
                  }
                  activeOpacity={0.7}
                  className="bg-gray-800/80 rounded-xl p-3 mb-2 flex-row justify-between items-center border border-gray-700/60"
                >
                  <View className="flex-row items-center gap-2 flex-1">
                    <View className="w-7 h-7 rounded-lg bg-geo-green/10 border border-geo-green/20 items-center justify-center">
                      <Ionicons name="shield-outline" size={13} color="#39FF14" />
                    </View>
                    <Text className="text-white flex-1 font-semibold">{item.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#39FF14" />
                </TouchableOpacity>
              )}
            />
          </View>
        </ScrollView>
      )}

      {activeTab === 'fixture' && (
        fixtureLoading || publicFixtureLoading ? (
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
        standingsLoading || publicStandingsLoading ? (
          <Loader fullScreen label="Cargando clasificación..." />
        ) : (
          <ScrollView className="flex-1 px-4 py-4">
            {standingsList && standingsList.length > 0 ? (
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
