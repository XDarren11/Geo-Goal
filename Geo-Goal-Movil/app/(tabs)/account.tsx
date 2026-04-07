import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import Loader from '@/components/Loader';

export default function AccountScreen() {
  const router = useRouter();
  const { data: user, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (isLoading) {
    return <Loader fullScreen label="Cargando cuenta..." />;
  }

  if (!user) {
    return <Loader fullScreen label="Sin sesión activa..." />;
  }

  return (
    <ScrollView className="flex-1 bg-geo-black px-4 py-4">
      <Text className="text-geo-green text-2xl font-bold">Cuenta</Text>
      <Text className="text-gray-400 mt-1">Gestiona la seguridad y opciones de tu perfil.</Text>

      <View className="mt-5 rounded-2xl border border-geo-green/30 bg-gray-900 p-4">
        <Text className="text-white font-bold text-lg">{user.name}</Text>
        <Text className="text-gray-400 mt-1">{user.email}</Text>
        <Text className="text-geo-green mt-1 uppercase text-xs">Rol: {user.role}</Text>
      </View>

      <View className="mt-5 rounded-2xl border border-geo-green/30 bg-gray-900 p-4">
        <Text className="text-white font-bold text-lg mb-3">Seguridad</Text>

        <TouchableOpacity
          onPress={() => router.push('/(Auth)/ForgotPasswordView')}
          className="mb-3 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-white font-semibold">Cambiar contraseña</Text>
            <Text className="text-gray-400 text-xs mt-1">Usar recuperación por correo</Text>
          </View>
          <Ionicons name="key" size={18} color="#39FF14" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(Auth)/ForgotPasswordView')}
          className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-white font-semibold">Recuperar acceso</Text>
            <Text className="text-gray-400 text-xs mt-1">Restablecer contraseña</Text>
          </View>
          <Ionicons name="refresh" size={18} color="#39FF14" />
        </TouchableOpacity>
      </View>

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
