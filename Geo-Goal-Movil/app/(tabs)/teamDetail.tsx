import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addPlayerToTeam, findPlayer, getTeamById, getPlayersTeam, teamLogoUrl, avatarUrl, updatePlayerProfile } from '@/Api/teamAPI';
import { Ionicons } from '@expo/vector-icons';
import Loader from '@/components/Loader';
import { useAuth } from '@/hooks/useAuth';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export default function TeamDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { data: user } = useAuth();
  const queryClient = useQueryClient();
  const isCoach = user?.role === 'coach';
  const isPlayer = user?.role === 'player';

  const teamId = typeof id === 'string' ? parseInt(id, 10) : typeof id === 'number' ? id : 0;
  const [searchValue, setSearchValue] = useState('');
  const [foundPlayer, setFoundPlayer] = useState<any | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileJersey, setProfileJersey] = useState('');
  const [profileAvatar, setProfileAvatar] = useState<ImagePicker.ImagePickerAsset | null>(null);

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

  const currentMembership = useMemo(
    () => players?.find((p) => p.id === user?.id) ?? null,
    [players, user?.id]
  );

  useEffect(() => {
    if (!currentMembership) return;
    setProfileName(currentMembership.playerName || currentMembership.name || '');
    setProfileJersey(currentMembership.jerseyNumber != null ? String(currentMembership.jerseyNumber) : '');
    setProfileAvatar(null);
  }, [currentMembership]);

  const addPlayerMutation = useMutation({
    mutationFn: (playerId: number) => addPlayerToTeam(teamId, playerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teamPlayers', teamId] });
      setFoundPlayer(null);
      setSearchValue('');
      Alert.alert('Listo', 'Jugador agregado al equipo');
    },
    onError: (error: any) => Alert.alert('Error', error?.message || 'No se pudo agregar el jugador'),
  });

  const profileMutation = useMutation({
    mutationFn: () =>
      updatePlayerProfile(teamId, {
        playerName: profileName.trim(),
        jerseyNumber: profileJersey.trim() ? Number(profileJersey) : undefined,
        avatar: profileAvatar
          ? { uri: profileAvatar.uri, name: profileAvatar.fileName || 'avatar.jpg', type: profileAvatar.mimeType || 'image/jpeg' }
          : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teamPlayers', teamId] });
      setProfileAvatar(null);
      Alert.alert('Listo', 'Tu perfil del equipo se actualizó');
    },
    onError: (error: any) => Alert.alert('Error', error?.message || 'No se pudo actualizar tu perfil'),
  });

  const handleSearchPlayer = async () => {
    if (!searchValue.trim()) return;
    try {
      const result = await findPlayer(teamId, searchValue.trim());
      setFoundPlayer(result);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Jugador no encontrado');
    }
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para subir tu avatar');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setProfileAvatar(result.assets[0]);
    }
  };

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
        <View className="flex-1 flex-row items-center gap-3">
          {team.logoUrl ? (
            <Image source={{ uri: teamLogoUrl(team.logoUrl) }} style={{ width: 44, height: 44, borderRadius: 22 }} contentFit="cover" />
          ) : null}
          <View className="flex-1">
            <Text className="text-white font-bold text-lg">{team.name}</Text>
            <Text className="text-gray-400 text-xs">{players?.length || 0} jugadores</Text>
          </View>
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

        {isPlayer && currentMembership ? (
          <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4 mb-4">
            <Text className="text-geo-green font-bold mb-3">Mi ficha en el equipo</Text>
            <View className="flex-row items-center gap-3 mb-3">
              <View className="h-16 w-16 overflow-hidden rounded-full bg-gray-800 items-center justify-center border border-geo-green/30">
                {currentMembership.avatarUrl ? (
                  <Image source={{ uri: avatarUrl(currentMembership.avatarUrl) }} style={{ width: 64, height: 64, borderRadius: 32 }} contentFit="cover" />
                ) : (
                  <Ionicons name="person" size={28} color="#39FF14" />
                )}
              </View>
              <View className="flex-1">
                <TextInput
                  value={profileName}
                  onChangeText={setProfileName}
                  placeholder="Tu nombre en el equipo"
                  placeholderTextColor="#777"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white mb-2"
                />
                <TextInput
                  value={profileJersey}
                  onChangeText={setProfileJersey}
                  placeholder="Tu dorsal"
                  placeholderTextColor="#777"
                  keyboardType="numeric"
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white"
                />
              </View>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={pickAvatar} className="flex-1 rounded-lg border border-geo-green/40 px-4 py-3 items-center">
                <Text className="text-geo-green font-bold">{profileAvatar ? 'Cambiar foto' : 'Elegir foto'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => profileMutation.mutate()}
                disabled={profileMutation.isPending}
                className="flex-1 rounded-lg bg-geo-green px-4 py-3 items-center"
              >
                <Text className="text-geo-black font-bold">Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Players Section */}
        <View className="bg-gray-900 border border-geo-green/30 rounded-lg p-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-geo-green font-bold">Jugadores</Text>
          </View>

          {isCoach ? (
            <View className="mb-4 rounded-xl border border-gray-700 bg-gray-800 p-3">
              <Text className="text-white font-bold mb-2">Buscar jugador por correo o @usuario</Text>
              <View className="flex-row gap-2">
                <TextInput
                  value={searchValue}
                  onChangeText={setSearchValue}
                  placeholder="correo@jugador.com o @usuario"
                  placeholderTextColor="#777"
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white"
                />
                <TouchableOpacity onPress={handleSearchPlayer} className="rounded-lg bg-geo-green px-4 py-2 items-center justify-center">
                  <Text className="text-geo-black font-bold">Buscar</Text>
                </TouchableOpacity>
              </View>
              {foundPlayer ? (
                <View className="mt-3 rounded-lg border border-gray-700 bg-gray-900 p-3 flex-row items-center justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-white font-bold">{foundPlayer.playerName || foundPlayer.name}</Text>
                    <Text className="text-gray-400 text-xs">{foundPlayer.email}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => addPlayerMutation.mutate(foundPlayer.id)}
                    disabled={addPlayerMutation.isPending}
                    className="rounded-lg border border-geo-green px-3 py-2"
                  >
                    <Text className="text-geo-green text-xs font-bold">Agregar</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : null}

          {playersLoading ? (
            <Loader label="Cargando jugadores..." />
          ) : players && players.length > 0 ? (
            <FlatList
              scrollEnabled={false}
              data={players}
              keyExtractor={(item) => `player-${item.id}`}
              renderItem={({ item }) => (
                <View className="bg-gray-800 rounded-lg p-3 mb-2 flex-row justify-between items-center">
                  <View className="flex-1 flex-row items-center gap-3">
                    <View className="h-10 w-10 overflow-hidden rounded-full bg-gray-900 items-center justify-center border border-geo-green/30">
                      {item.avatarUrl ? (
                        <Image source={{ uri: avatarUrl(item.avatarUrl) }} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="cover" />
                      ) : (
                        <Ionicons name="person" size={18} color="#39FF14" />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-bold">{item.playerName || item.name}</Text>
                      <Text className="text-gray-400 text-xs">{item.email}</Text>
                      {item.jerseyNumber ? <Text className="text-geo-green text-xs">#{item.jerseyNumber}</Text> : null}
                    </View>
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
