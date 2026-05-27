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

type ExploreTab = 'leagues' | 'teams' | 'players';

export default function ExploreScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ExploreTab>('leagues');
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

  // Mi equipo dinámico: si el jugador tiene exactamente 1 equipo, atajo directo al dashboard
  const singleTeam = user?.role === 'player' && teams.length === 1 ? teams[0] : null;

  return (
    <View className="flex-1 bg-geo-black">
      {/* Header */}
      <View className="bg-gray-900/90 border-b border-geo-green/30 px-4 pt-6 pb-5">
        <Text className="text-white text-xs tracking-wide">Descubre</Text>
        <Text className="text-geo-green text-2xl font-extrabold">Explorar</Text>
      </View>

      {/* Mi equipo dinámico: atajo si el jugador tiene 1 solo equipo */}
      {singleTeam ? (
        <View className="mx-4 mt-3">
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/(tabs)/teamCareerDashboard' as any,
                params: { teamId: String(singleTeam.id), name: singleTeam.name },
              })
            }
            className="flex-row items-center gap-3 rounded-2xl border border-geo-green/40 bg-geo-green/10 px-4 py-3"
          >
            <Ionicons name="football" size={20} color="#39FF14" />
            <View className="flex-1">
              <Text className="text-geo-green text-xs uppercase tracking-wider font-bold">Mi equipo</Text>
              <Text className="text-white font-semibold">{singleTeam.name}</Text>
            </View>
            <Ionicons name="stats-chart" size={18} color="#39FF14" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Tabs */}
      <View className="px-4 py-3">
        <View className="flex-row rounded-2xl bg-gray-900/80 border border-geo-green/20 p-1">
          <TouchableOpacity
            onPress={() => setActiveTab('leagues')}
            className={`py-2 px-2 flex-1 rounded-xl ${activeTab === 'leagues' ? 'bg-geo-green/15' : ''}`}
          >
            <Text className={`font-semibold text-center text-xs ${activeTab === 'leagues' ? 'text-geo-green' : 'text-gray-400'}`}>
              Ligas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('teams')}
            className={`py-2 px-2 flex-1 rounded-xl ${activeTab === 'teams' ? 'bg-geo-green/15' : ''}`}
          >
            <Text className={`font-semibold text-center text-xs ${activeTab === 'teams' ? 'text-geo-green' : 'text-gray-400'}`}>
              Equipos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/playersList' as any)}
            className="py-2 px-2 flex-1 rounded-xl"
          >
            <Text className="font-semibold text-center text-xs text-gray-400">Jugadores</Text>
          </TouchableOpacity>
        </View>
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
                    className="bg-gray-900/80 border border-geo-green/20 rounded-2xl p-4 mb-3"
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-white font-bold text-lg">{item.name}</Text>
                        <Text className="text-gray-400 text-sm mt-1">{item.teams?.length || 0} equipos</Text>
                        {item.description ? <Text className="text-gray-500 text-xs mt-2">{item.description}</Text> : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#6b7280" />
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
                  className="bg-gray-900/80 border border-geo-green/20 rounded-2xl p-4 mb-3"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-white font-bold text-lg">{item.name}</Text>
                      <Text className="text-gray-400 text-sm mt-1">
                        {item.league?.name || (item.leagueId ? `Liga ${item.leagueId}` : 'Sin liga')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#6b7280" />
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
