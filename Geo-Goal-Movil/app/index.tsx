import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { StatusBar } from 'expo-status-bar';
import { checkAuthToken } from "@/hooks/useAuth";
import { getUser } from "@/Api/AuthApi";
import { useQueryClient } from "@tanstack/react-query";

export default function index() {
  const [isReady, setIsReady] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 900);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const hasToken = await checkAuthToken();
        if (!hasToken) {
          queryClient.removeQueries({ queryKey: ['user'] });
          queryClient.clear();
          setIsCheckingSession(false);
          return;
        }

        const user = await getUser();
        queryClient.setQueryData(['user'], user);
        router.replace('/(tabs)/home');
      } catch {
        queryClient.removeQueries({ queryKey: ['user'] });
        queryClient.clear();
      } finally {
        setIsCheckingSession(false);
      }
    };

    restoreSession();
  }, [queryClient, router]);

  return (
    <>
      <StatusBar style='auto'/>
      {!isReady || isCheckingSession ? (
        <View className="flex-1 bg-geo-green justify-center items-center">
          <Image
            source={require("../assets/logo.png")}
            className="w-40 h-40 mb-4"
            resizeMode="contain"
          />
          <Text className="text-geo-black font-geo text-6xl font-bold tracking-wide">
            Geo-Goal
          </Text>
          <ActivityIndicator color="#0a0a0a" className="mt-4" />
        </View>
      ) : (
        <View className="flex-1 bg-geo-black justify-center items-center">
          <View className="items-center mt-10">
            <Image
              source={require("../assets/logo.png")}
              className="w-40 h-40 mb-4"
              resizeMode="contain"
            />
            <Text className="font-geo text-geo-green text-6xl font-bold tracking-wide">
              Geo-Goal
            </Text>
            <Text className="text-geo-text-muted-dark mx-safe-offset-20 text-center mt-3">
              Fútbol a otro nivel
            </Text>
          </View>

          <TouchableOpacity
            className="bg-geo-green w-3/5 py-4 rounded-2xl items-center mt-7 shadow-lg shadow-geo-green/30"
            onPress={() => router.push('/(Auth)/login')}
          >
            <Text className="text-geo-black font-bold text-2xl tracking-wide">Ingresar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-geo-bg-card w-3/5 py-4 rounded-2xl items-center mt-5 border-2 border-geo-green"
            onPress={() => router.push('/(Auth)/RegisterView')}
          >
            <Text className="text-geo-green font-bold text-2xl tracking-wide">
              Registrarse
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="mt-6"
            onPress={() => router.push('/(tabs)/public')}
          >
            <Text className="text-geo-green font-bold">
              Modo Invitado
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="mt-6" onPress={() => router.push('/(Auth)/ForgotPasswordView')}>
            <Text className="text-geo-green font-bold">
              ¿Has olvidado tu contraseña?
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
