import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getLeagueById, getFixture, getStandings } from '@/Api/leagueAPI';
import { Ionicons } from '@expo/vector-icons';
import type { FixtureByRound } from '@/types';

export default function LeagueDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [activeTab, setActiveTab] = React.useState<'info' | 'fixture' | 'standings'>('info');

  const leagueId = typeof id === 'string' ? parseInt(id, 10) : typeof id === 'number' ? id : 0;

  const { data: league, isLoading: leagueLoading } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => getLeagueById(leagueId),
    enabled: !!leagueId && !isNaN(leagueId),
  });

  const { data: fixture, isLoading: fixtureLoading } = useQuery({
    queryKey: ['fixture', leagueId],
    queryFn: () => getFixture(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && activeTab === 'fixture',
  });

  const { data: standings, isLoading: standingsLoading } = useQuery({
    queryKey: ['standings', leagueId],
    queryFn: () => getStandings(leagueId),
    enabled: !!leagueId && !isNaN(leagueId) && activeTab === 'standings',
  });

  if (leagueLoading) {
    return (
      <View className="flex-1 bg-geo-black justify-center items-center">
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  if (!league) {
    return (
      <View className="flex-1 bg-geo-black justify-center items-center">
        <Text className="text-geo-green">Liga no encontrada</Text>
      </View>
    );
  }

  // Get all fixture rounds
  const fixtureRounds = fixture ? Object.entries(fixture as FixtureByRound).flatMap(([round, matches]) =>
    matches.map(match => ({ round, ...match }))
  ) : [];

  return (
    <View className="flex-1 bg-geo-black">
      {/* Header */}
      <View className="bg-gray-900 border-b border-geo-green px-4 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#39FF14" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-bold text-lg">{league.name}</Text>
          <Text className="text-gray-400 text-xs">{league.teams?.length || 0} equipos</Text>
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
            <Text className="text-gray-300">{league.description || 'Sin descripción'}</Text>
          </View>

          <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-4">
            <Text className="text-geo-green font-bold mb-2">Equipos ({league.teams?.length || 0})</Text>
            <FlatList
              scrollEnabled={false}
              data={league.teams || []}
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
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#39FF14" />
          </View>
        ) : (
          <ScrollView className="flex-1 px-4 py-4">
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
                        {item.date ? new Date(item.date).toLocaleDateString() : 'Próximamente'}
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
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#39FF14" />
          </View>
        ) : (
          <ScrollView className="flex-1 px-4 py-4">
            {standings ? (
              <FlatList
                scrollEnabled={false}
                data={Object.entries(standings as Record<string, any>).map(([, v], idx) => v)}
                keyExtractor={(_, idx) => `standings-${idx}`}
                renderItem={({ item, index }) => (
                  <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-2 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <Text className="text-geo-green font-bold w-8">{index + 1}</Text>
                      <Text className="text-white font-bold ml-2 flex-1">{(item as any).teamName || 'N/A'}</Text>
                    </View>
                    <View className="flex-row gap-3">
                      <View className="items-center">
                        <Text className="text-xs text-gray-400">PJ</Text>
                        <Text className="text-white font-bold">{(item as any).played || 0}</Text>
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
