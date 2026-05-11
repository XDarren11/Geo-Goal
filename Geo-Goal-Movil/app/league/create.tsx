import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { createLeague } from "@/Api/leagueAPI"; // Usamos tu ruta de API
import { Ionicons } from "@expo/vector-icons";

type Form = { name: string; description: string };

export default function CreateLeagueView() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false); // Para efecto de archivo (placeholder)

  const { control, handleSubmit, formState: { errors } } = useForm<Form>({
    defaultValues: { name: "", description: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: createLeague,
    onError: (e: Error) => Alert.alert("Error", e.message),
    onSuccess: (msg) => {
      Alert.alert("¡Éxito!", typeof msg === "string" ? msg : "Liga creada exitosamente");
      // Regresamos a la pantalla anterior (Home)
      router.back(); 
    },
  });

  return (
    <ScrollView className="flex-1 bg-geo-black px-5 pt-8">
      {/* Botón de regreso */}
      <TouchableOpacity 
        onPress={() => router.back()} 
        className="flex-row items-center mb-6"
      >
        <Ionicons name="arrow-back" size={24} color="#39FF14" />
        <Text className="text-geo-green ml-2 font-bold text-lg">Volver</Text>
      </TouchableOpacity>

      <Text className="text-gray-400 text-xs">Administración</Text>
      <Text className="font-geo text-4xl text-white tracking-wide">
        Crear liga
      </Text>
      <Text className="mt-2 text-gray-400 mb-8">
        Nombre y descripción de la liga.
      </Text>

      <View className="bg-gray-900/80 border border-geo-green/20 rounded-2xl p-5 mb-10">
        
        {/* Campo: Nombre de la liga */}
        <View className="mb-5">
          <Text className="text-white font-bold mb-2">Nombre de la liga</Text>
          <Controller
            control={control}
            name="name"
            rules={{ required: "El nombre es obligatorio" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className={`bg-geo-black border ${errors.name ? 'border-red-500' : 'border-gray-700/80'} text-white rounded-xl p-4 focus:border-geo-green`}
                placeholder="Ej: Liga Municipal 2026"
                placeholderTextColor="#6b7280"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.name && (
            <Text className="text-red-500 text-sm mt-1">{errors.name.message}</Text>
          )}
        </View>

        {/* Campo: Descripción */}
        <View className="mb-5">
          <Text className="text-white font-bold mb-2">Descripción</Text>
          <Controller
            control={control}
            name="description"
            rules={{ required: "La descripción es obligatoria" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className={`bg-geo-black border ${errors.description ? 'border-red-500' : 'border-gray-700/80'} text-white rounded-xl p-4 focus:border-geo-green h-24`}
                placeholder="Descripción de la liga"
                placeholderTextColor="#6b7280"
                multiline
                textAlignVertical="top"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.description && (
            <Text className="text-red-500 text-sm mt-1">{errors.description.message}</Text>
          )}
        </View>

        {/* Botón Submit */}
        <TouchableOpacity
          onPress={handleSubmit((data) => mutate(data))}
          disabled={isPending}
          className={`bg-geo-green py-4 rounded-xl items-center flex-row justify-center ${isPending ? 'opacity-60' : ''}`}
        >
          {isPending ? (
            <>
              <ActivityIndicator color="#000000" className="mr-2" />
              <Text className="text-geo-black font-bold text-lg tracking-wide">Creando...</Text>
            </>
          ) : (
            <Text className="text-geo-black font-bold text-lg tracking-wide">Crear liga</Text>
          )}
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}