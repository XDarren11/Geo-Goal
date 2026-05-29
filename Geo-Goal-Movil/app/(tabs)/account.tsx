import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  coach: 'Entrenador',
  player: 'Jugador',
  referee: 'Árbitro',
};
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import Loader from '@/components/Loader';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { resendAccountConfirmationEmail, updateAccountPassword, updateAccountUsername } from '@/Api/AuthApi';
import { getApiErrorMessage } from '@/lib/getApiErrorMessage';
import { getFavorites, removeFavoriteById, type FavoriteItem } from '@/Api/favoritesAPI';

export default function AccountScreen() {
  const router = useRouter();
  const { data: user, isLoading, logout } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');

  useEffect(() => {
    setUsername(user?.username ? `@${user.username}` : '');
  }, [user?.username]);

  const normalizedUsername = username.trim().replace(/^@+/, '');

  const usernameMutation = useMutation({
    mutationFn: () => updateAccountUsername(normalizedUsername),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      Alert.alert('Listo', 'Nombre de usuario actualizado');
    },
    onError: (error) => Alert.alert('Error', getApiErrorMessage(error, 'No se pudo actualizar el usuario')),
  });

  const passwordMutation = useMutation({
    mutationFn: () => updateAccountPassword({ currentPassword, newPassword, newPasswordConfirmation }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      Alert.alert('Listo', 'Contraseña actualizada');
    },
    onError: (error) => Alert.alert('Error', getApiErrorMessage(error, 'No se pudo actualizar la contraseña')),
  });

  const resendMutation = useMutation({
    mutationFn: resendAccountConfirmationEmail,
    onSuccess: (data) => Alert.alert('Correo enviado', data.message),
    onError: (error) => Alert.alert('Error', getApiErrorMessage(error, 'No se pudo reenviar la confirmación')),
  });

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  // ── Favoritos ────────────────────────────────────────────────────────────────
  const { data: favorites = [] } = useQuery({
    queryKey: ['account', 'favorites'],
    queryFn: () => getFavorites(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const removeFav = useMutation({
    mutationFn: (id: number) => removeFavoriteById(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account', 'favorites'] }),
    onError: () => Alert.alert('Error', 'No se pudo quitar el favorito'),
  });

  function favoriteRoute(f: FavoriteItem): { pathname: string; params: Record<string, string> } | null {
    switch (f.entityType) {
      case 'team':
        return { pathname: '/teamCareerDashboard', params: { teamId: String(f.entityId), name: f.label ?? '' } };
      case 'player':
        return { pathname: '/playerCareerDashboard', params: { playerId: String(f.entityId), name: f.label ?? '' } };
      case 'coach':
        return { pathname: '/coachCareerDashboard', params: { coachId: String(f.entityId), name: f.label ?? '' } };
      default:
        return null;
    }
  }

  if (isLoading) {
    return <Loader fullScreen label="Cargando cuenta..." />;
  }

  if (!user) {
    return <Loader fullScreen label="Sin sesión activa..." />;
  }

  return (
    <ScrollView className="flex-1 bg-geo-black px-4 py-5">
      <Text className="text-gray-400 text-xs">Perfil</Text>
      <Text className="text-geo-green text-2xl font-extrabold">Cuenta</Text>
      <Text className="text-gray-500 mt-1">Gestiona la seguridad y opciones de tu perfil.</Text>

      <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
        <Text className="text-white font-bold text-lg">{user.name}</Text>
        <Text className="text-gray-400 mt-1">{user.email}</Text>
        <Text className="text-gray-400 mt-1">{user.username ? `@${user.username}` : 'Sin username'}</Text>
        <Text className="text-geo-green mt-1 uppercase text-xs">Rol: {ROLE_LABEL[user.role] ?? user.role}</Text>
        <Text className={`mt-2 text-xs font-bold ${user.confirmed ? 'text-emerald-400' : 'text-amber-400'}`}>
          {user.confirmed ? 'Correo confirmado' : 'Correo pendiente de confirmación'}
        </Text>
      </View>

      <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
        <Text className="text-white font-bold text-lg mb-3">Nombre de usuario</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder="@tuusuario"
          placeholderTextColor="#777"
          autoCapitalize="none"
          className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 text-white mb-3"
        />
        <TouchableOpacity
          onPress={() => usernameMutation.mutate()}
          disabled={usernameMutation.isPending || !normalizedUsername}
          className="rounded-xl bg-geo-green px-4 py-3 items-center"
        >
          <Text className="text-geo-black font-bold">{usernameMutation.isPending ? 'Guardando...' : 'Actualizar username'}</Text>
        </TouchableOpacity>
        {!user.confirmed ? (
          <TouchableOpacity
            onPress={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            className="mt-3 rounded-xl border border-geo-green/40 px-4 py-3 items-center"
          >
            <Text className="text-geo-green font-bold">
              {resendMutation.isPending ? 'Enviando...' : 'Reenviar confirmación'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="mt-5 rounded-2xl border border-geo-green/20 bg-gray-900/80 p-4">
        <Text className="text-white font-bold text-lg mb-3">Seguridad</Text>

        <TouchableOpacity
          onPress={() => router.push('/(Auth)/ForgotPasswordView')}
          className="mb-3 rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-white font-semibold">Cambiar contraseña</Text>
            <Text className="text-gray-400 text-xs mt-1">Usar recuperación por correo</Text>
          </View>
          <Ionicons name="key" size={18} color="#39FF14" />
        </TouchableOpacity>

        <View className="rounded-xl border border-gray-700/80 bg-gray-800/80 px-4 py-3">
          <Text className="text-white font-semibold mb-3">Cambio directo de contraseña</Text>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Contraseña actual"
            placeholderTextColor="#777"
            secureTextEntry
            className="rounded-lg border border-gray-700/80 bg-gray-900/80 px-3 py-2 text-white mb-2"
          />
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nueva contraseña"
            placeholderTextColor="#777"
            secureTextEntry
            className="rounded-lg border border-gray-700/80 bg-gray-900/80 px-3 py-2 text-white mb-2"
          />
          <TextInput
            value={newPasswordConfirmation}
            onChangeText={setNewPasswordConfirmation}
            placeholder="Confirmar nueva contraseña"
            placeholderTextColor="#777"
            secureTextEntry
            className="rounded-lg border border-gray-700/80 bg-gray-900/80 px-3 py-2 text-white mb-3"
          />
          <TouchableOpacity
            onPress={() => passwordMutation.mutate()}
            disabled={passwordMutation.isPending}
            className="rounded-xl bg-geo-green px-4 py-3 items-center"
          >
            <Text className="text-geo-black font-bold">{passwordMutation.isPending ? 'Guardando...' : 'Cambiar contraseña'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Favoritos */}
      {favorites.length > 0 && (
        <View className="mt-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="star" size={16} color="#facc15" />
            <Text className="text-yellow-300 font-bold text-base">Favoritos</Text>
          </View>
          {favorites.map((f, i) => {
            const route = favoriteRoute(f);
            const displayName = f.label || f.display?.name || `${f.entityType} #${f.entityId}`;
            const iconMap: Record<string, string> = {
              team: 'football',
              player: 'person',
              coach: 'school',
              league: 'trophy',
            };
            return (
              <View
                key={f.id}
                className={`flex-row items-center gap-3 py-2.5 ${i < favorites.length - 1 ? 'border-b border-yellow-500/10' : ''}`}
              >
                <Ionicons name={(iconMap[f.entityType] ?? 'star') as any} size={16} color="#facc15" />
                <TouchableOpacity
                  className="flex-1"
                  onPress={() => {
                    if (route) router.push(route as any);
                  }}
                  disabled={!route}
                >
                  <Text className="text-white font-semibold text-sm" numberOfLines={1}>{displayName}</Text>
                  <Text className="text-gray-500 text-[10px] capitalize">{f.entityType}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('Quitar favorito', `¿Quitar "${displayName}" de favoritos?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Quitar', style: 'destructive', onPress: () => removeFav.mutate(f.id) },
                    ])
                  }
                  className="p-1"
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <View className="mt-5 rounded-2xl border border-red-500/40 bg-red-900/20 p-4">
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Cerrar sesión', '¿Deseas cerrar tu sesión?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sí, cerrar', style: 'destructive', onPress: handleLogout },
            ]);
          }}
          className="rounded-xl bg-red-500/20 px-4 py-3 items-center"
        >
          <Text className="text-red-300 font-bold">Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
