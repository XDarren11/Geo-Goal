import React, { useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getLeagues } from '@/Api/leagueAPI';
import { getMyTeams } from '@/Api/teamAPI';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const { data: user, isLoading: userLoading, logout } = useAuth();

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['leagues'],
    queryFn: getLeagues,
    enabled: !!user,
  });

  const { data: myTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['myTeams'],
    queryFn: getMyTeams,
    enabled: !!user,
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/(Auth)/login');
  };

  if (userLoading) {
    return (
      <View className="flex-1 bg-geo-black justify-center items-center">
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-geo-black justify-center items-center">
        <Text className="text-geo-green text-lg">Por favor inicia sesión</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-geo-black">
      {/* Header */}
      <View className="bg-geo-black border-b border-geo-green px-4 py-6">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-sm">Bienvenido</Text>
            <Text className="text-geo-green text-2xl font-bold">{user.name}</Text>
            <Text className="text-gray-400 text-xs mt-1">{user.role}</Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-geo-green/10 p-3 rounded-lg"
          >
            <Ionicons name="log-out" size={24} color="#39FF14" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View className="px-4 py-6 gap-4">
        {user.role === 'admin' && (
          <>
            <Text className="text-white text-lg font-bold mb-2">Administrador</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/explore')}
              className="bg-gradient-to-r from-geo-green/20 to-geo-green/5 border border-geo-green rounded-xl p-4 flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-geo-green font-bold">Crear Liga</Text>
                <Text className="text-gray-400 text-sm">Organiza torneo</Text>
              </View>
              <Ionicons name="add-circle" size={24} color="#39FF14" />
            </TouchableOpacity>
          </>
        )}

        {(user.role === 'admin' || user.role === 'coach') && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/explore')}
            className="bg-gradient-to-r from-geo-green/20 to-geo-green/5 border border-geo-green rounded-xl p-4 flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-geo-green font-bold">Crear Equipo</Text>
              <Text className="text-gray-400 text-sm">Nuevo equipo</Text>
            </View>
            <Ionicons name="people" size={24} color="#39FF14" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => router.push('/(tabs)/explore')}
          className="bg-gradient-to-r from-geo-green/20 to-geo-green/5 border border-geo-green rounded-xl p-4 flex-row items-center justify-between"
        >
          <View className="flex-1">
            <Text className="text-geo-green font-bold">Ver Ligas</Text>
            <Text className="text-gray-400 text-sm">{leagues.length} ligas disponibles</Text>
          </View>
          <Ionicons name="trophy" size={24} color="#39FF14" />
        </TouchableOpacity>
      </View>

      {/* My Teams Section */}
      {teamsLoading ? (
        <View className="px-4 py-4 items-center">
          <ActivityIndicator size="small" color="#39FF14" />
        </View>
      ) : myTeams.length > 0 ? (
        <View className="px-4 py-6">
          <Text className="text-white text-lg font-bold mb-4">Mis Equipos</Text>
          <FlatList
            scrollEnabled={false}
            data={myTeams}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/explore?teamId=${item.id}`)}
                className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-3 flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="text-white font-bold">{item.name}</Text>
                  <Text className="text-gray-400 text-sm">
                    {item.players?.length || 0} jugadores
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#39FF14" />
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {/* Leagues Section */}
      {leaguesLoading ? (
        <View className="px-4 py-4 items-center">
          <ActivityIndicator size="small" color="#39FF14" />
        </View>
      ) : leagues.length > 0 ? (
        <View className="px-4 py-6 pb-10">
          <Text className="text-white text-lg font-bold mb-4">Ligas Disponibles</Text>
          <FlatList
            scrollEnabled={false}
            data={leagues.slice(0, 3)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/(tabs)/explore?leagueId=${item.id}`)}
                className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-3 flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="text-white font-bold">{item.name}</Text>
                  <Text className="text-gray-400 text-sm">
                    {item.teams?.length || 0} equipos
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#39FF14" />
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}
