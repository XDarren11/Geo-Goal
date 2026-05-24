import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { getPublicLeagues } from "@/Api/publicAPI";
import Loader from "@/components/Loader";
import { useAuth } from "@/hooks/useAuth";

export default function PublicResultsScreen() {
  const router = useRouter();
  const { data: user } = useAuth();
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  useEffect(() => {
    setShowRegisterPrompt(!user);
  }, [user]);

  const {
    data: leagues = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["public-leagues"],
    queryFn: getPublicLeagues,
    enabled: true,
  });

  return (
    <View className="flex-1 bg-geo-black">
      <Modal visible={showRegisterPrompt} transparent animationType="fade">
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="w-full rounded-2xl bg-gray-900 border border-geo-green/30 p-5">
            <Text className="text-white text-lg font-bold">Regístrate para más funciones</Text>
            <Text className="text-gray-400 text-sm mt-2">
              Crea tu cuenta para guardar favoritos, seguir tu equipo y recibir notificaciones.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowRegisterPrompt(false);
                router.push("/(Auth)/RegisterView");
              }}
              className="mt-4 bg-geo-green rounded-xl py-3 items-center"
            >
              <Text className="text-geo-black font-bold">Crear cuenta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowRegisterPrompt(false)}
              className="mt-2 py-2 items-center"
            >
              <Text className="text-gray-400 text-sm">Ahora no</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View className="bg-gray-900/90 border-b border-geo-green/30 px-4 pt-6 pb-5">
        <Text className="text-white text-xs tracking-wide">Público</Text>
        <Text className="text-geo-green text-2xl font-extrabold">Resultados</Text>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#39FF14" />}
      >
        {!user && (
          <View className="bg-gray-900/80 border border-geo-green/20 rounded-2xl p-4 mb-4">
            <Text className="text-white font-bold text-base">Regístrate para más funciones</Text>
            <Text className="text-gray-400 text-xs mt-1">
              Guarda favoritos, sigue tu equipo y recibe notificaciones.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(Auth)/RegisterView")}
              className="mt-3 bg-geo-green rounded-xl py-3 items-center"
            >
              <Text className="text-geo-black font-bold">Crear cuenta</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <Loader fullScreen label="Cargando ligas..." />
        ) : leagues.length > 0 ? (
          <View className="pb-6">
            {leagues.map((league) => (
              <TouchableOpacity
                key={`public-league-${league.id}`}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/leagueDetail",
                    params: { id: String(league.id), name: league.name },
                  })
                }
                className="bg-gray-900/80 border border-geo-green/20 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg">{league.name}</Text>
                    {league.description ? (
                      <Text className="text-gray-400 text-xs mt-1">{league.description}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#6b7280" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="py-10 items-center">
            <Ionicons name="trophy-outline" size={48} color="#374151" />
            <Text className="text-gray-400 mt-3">No hay ligas disponibles</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
