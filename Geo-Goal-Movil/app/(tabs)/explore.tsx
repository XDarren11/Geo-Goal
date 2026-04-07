import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getLeagues } from '@/Api/leagueAPI';
import { getActiveLeagues, getMyPlayerTeams, getMyTeams } from '@/Api/teamAPI';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import type { League } from '@/types';
import Loader from '@/components/Loader';

export default function ExploreScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'leagues' | 'teams'>('leagues');
  const params = useLocalSearchParams();
  const { data: user } = useAuth();

  const { data: leagues = [], isLoading: leaguesLoading, refetch: refetchLeagues } = useQuery({
    queryKey: ['leagues', 'mobile-explore', user?.role],
    queryFn: async () => {
      if (user?.role === 'coach') {
        return getActiveLeagues();
      }

      if (user?.role === 'player') {
        const teams = await getMyPlayerTeams();
        const byLeague = new Map<number, League>();

        teams.forEach((team) => {
          if (!team.leagueId) return;
          if (byLeague.has(team.leagueId)) return;
          byLeague.set(team.leagueId, {
            id: team.leagueId,
            name: team.league?.name || `Liga ${team.leagueId}`,
          });
        });

        return Array.from(byLeague.values());
      }

      return getLeagues();
    },
    enabled: !!user,
  });

  const { data: teams = [], isLoading: teamsLoading, refetch: refetchTeams } = useQuery({
    queryKey: ['myTeams', 'mobile-explore', user?.role],
    queryFn: async () => {
      if (user?.role === 'player') return getMyPlayerTeams();
      if (user?.role === 'coach') return getMyTeams();
      return [];
    },
    enabled: !!user,
  });

  const handleRefresh = async () => {
    await Promise.all([refetchLeagues(), refetchTeams()]);
  };

  const handleLeaguePress = (leagueId: string | number, leagueName?: string) => {
    router.push({
      pathname: '/(tabs)/leagueDetail',
      params: { id: String(leagueId), name: leagueName || '' },
    });
  };

  const handleTeamPress = (team: any) => {
    if (user?.role === 'coach' || user?.role === 'player') {
      router.push({
        pathname: '/(tabs)/teamDetail',
        params: { id: String(team.id) },
      });
      return;
    }
  };

  return (
    <View className="flex-1 bg-geo-black">
      {/* Header */}
      <View className="bg-geo-black border-b border-geo-green px-4 py-4">
        <Text className="text-geo-green text-2xl font-bold">Explorar</Text>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-geo-green/30 px-4 gap-4">
        <TouchableOpacity
          onPress={() => setActiveTab('leagues')}
          className={`py-4 px-2 border-b-2 ${activeTab === 'leagues' ? 'border-geo-green' : 'border-transparent'}`}
        >
          <Text className={`font-bold ${activeTab === 'leagues' ? 'text-geo-green' : 'text-gray-400'}`}>
            Ligas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('teams')}
          className={`py-4 px-2 border-b-2 ${activeTab === 'teams' ? 'border-geo-green' : 'border-transparent'}`}
        >
          <Text className={`font-bold ${activeTab === 'teams' ? 'text-geo-green' : 'text-gray-400'}`}>
            Equipos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'leagues' ? (
        leaguesLoading ? (
          <Loader fullScreen label="Cargando ligas..." />
        ) : (
          <ScrollView
            refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor="#39FF14" />}
            className="flex-1 px-4 pt-4"
          >
            {leagues.length > 0 ? (
              <FlatList
                scrollEnabled={false}
                data={leagues}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleLeaguePress(item.id, item.name)}
                    className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-3"
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-geo-green font-bold text-lg">{item.name}</Text>
                        <Text className="text-gray-400 text-sm mt-1">{item.teams?.length || 0} equipos</Text>
                        <Text className="text-gray-500 text-xs mt-2">{item.description}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#39FF14" />
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View className="flex-1 justify-center items-center py-10">
                <Text className="text-gray-400">No hay ligas disponibles</Text>
              </View>
            )}
          </ScrollView>
        )
      ) : teamsLoading ? (
        <Loader fullScreen label="Cargando equipos..." />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor="#39FF14" />}
          className="flex-1 px-4 pt-4"
        >
          {teams.length > 0 ? (
            <FlatList
              scrollEnabled={false}
              data={teams}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleTeamPress(item)}
                  className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-3"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-geo-green font-bold text-lg">{item.name}</Text>
                      <Text className="text-gray-400 text-sm mt-1">
                        {item.league?.name || (item.leagueId ? `Liga ${item.leagueId}` : 'Sin liga')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#39FF14" />
                  </View>
                </TouchableOpacity>
              )}
            />
          ) : (
            <View className="flex-1 justify-center items-center py-10">
              <Text className="text-gray-400">No tienes equipos</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
