import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getTeamById, getPlayersTeam } from '@/Api/teamAPI';
import { Ionicons } from '@expo/vector-icons';
import Loader from '@/components/Loader';
import { useAuth } from '@/hooks/useAuth';

export default function TeamDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { data: user } = useAuth();
  const isCoach = user?.role === 'coach';

  const teamId = typeof id === 'string' ? parseInt(id, 10) : typeof id === 'number' ? id : 0;

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => getTeamById(teamId),
    enabled: !!teamId && !isNaN(teamId),
  });

  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['teamPlayers', teamId],
    queryFn: () => getPlayersTeam(teamId),
    enabled: !!teamId && !isNaN(teamId),
  });

  if (teamLoading) {
    return <Loader fullScreen label="Cargando equipo..." />;
  }

  if (!team) {
    return (
      <View className="flex-1 bg-geo-black justify-center items-center">
        <Text className="text-geo-green">Equipo no encontrado</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-geo-black">
      {/* Header */}
      <View className="bg-gray-900 border-b border-geo-green px-4 py-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#39FF14" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-bold text-lg">{team.name}</Text>
          <Text className="text-gray-400 text-xs">{players?.length || 0} jugadores</Text>
        </View>
      </View>

      {/* Team Info */}
      <ScrollView className="flex-1 px-4 py-4">
        {/* Field Location */}
        {team.fieldAddress && (
          <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-4">
            <Text className="text-geo-green font-bold mb-2">Ubicación del Campo</Text>
            <View className="flex-row items-start gap-2">
              <Ionicons name="location" size={16} color="#39FF14" />
              <Text className="text-gray-300 flex-1">{team.fieldAddress}</Text>
            </View>
          </View>
        )}

        {/* Players Section */}
        <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-geo-green font-bold">Jugadores</Text>
            {isCoach ? (
              <TouchableOpacity className="bg-geo-green/10 p-2 rounded-lg">
                <Ionicons name="add" size={20} color="#39FF14" />
              </TouchableOpacity>
            ) : null}
          </View>

          {playersLoading ? (
            <Loader label="Cargando jugadores..." />
          ) : players && players.length > 0 ? (
            <FlatList
              scrollEnabled={false}
              data={players}
              keyExtractor={(item) => `player-${item.id}`}
              renderItem={({ item }) => (
                <View className="bg-gray-800 rounded-lg p-3 mb-2 flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-white font-bold">{item.name}</Text>
                    <Text className="text-gray-400 text-xs">{item.email}</Text>
                  </View>
                  {isCoach ? (
                    <TouchableOpacity className="p-2">
                      <Ionicons name="trash" size={16} color="#ff6b6b" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            />
          ) : (
            <Text className="text-gray-400 text-center py-4">No hay jugadores en el equipo</Text>
          )}
        </View>

        {/* Add Player Button */}
        {isCoach ? (
          <TouchableOpacity className="bg-geo-green rounded-lg p-4 mt-4 items-center">
            <Text className="text-geo-black font-bold">Agregar Jugador</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}
