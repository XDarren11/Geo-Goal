import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { StatusBar } from 'expo-status-bar';

export default function index() {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <StatusBar style='auto'/>
      {!isReady ? (
        
        <View className="flex-1 bg-[#0ED000] justify-center items-center">
          <Image
            source={require("../assets/logo.png")}
            className="w-40 h-40 mb-4"
            resizeMode="contain"
          />
          <Text className="text-white text-6xl font-bold tracking-tighter">
            GeoGoal
          </Text>
        </View>

      ) : (

        <View className="flex-1 bg-black justify-center items-center">
          <View className=" items-center mt-10">
            <Image
              source={require("../assets/logo.png")}
              className="w-40 h-40 mb-4"
              resizeMode="contain"
            />
            <Text className="text-[#0ED000] text-6xl font-bold tracking-tighter">
              GeoGoal
            </Text>
            <Text className="text-white mx-safe-offset-20 text-center mt-3">
              Donde tu pasión por el fútbol encuentra su lugar.
            </Text>
          </View>

          <TouchableOpacity
            className=" bg-[#0ED000] w-3/5 py-3 rounded-full items-center mt-7"
            onPress={() => router.push('/(Auth)/login')}
          >
            <Text className=" text-black font-bold text-2xl">Ingresar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className=" bg-white w-3/5 py-3 rounded-full items-center mt-5"
            onPress={() => router.push('/(Auth)/RegisterView')}
          >
            <Text className=" text-gray-400 font-bold text-2xl">
              Registrate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="mt-4" onPress={() => router.push('/(Auth)/ForgotPasswordView')}>
            <Text className=" text-[#0ED000] font-bold">
              ¿Has olvidado tu contraseña?
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
