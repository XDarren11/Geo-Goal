import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTeam } from '@/Api/teamAPI';
import BackButton from '@/components/BackButton';

type Form = {
  name: string;
  fieldAddress: string;
};

export default function CreateTeamView() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    defaultValues: { name: '', fieldAddress: '' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: Form) =>
      createTeam({
        name: data.name,
        fieldAddress: data.fieldAddress || undefined,
      }),
    onError: (e: Error) => Alert.alert('Error', e.message),
    onSuccess: (msg) => {
      queryClient.invalidateQueries({ queryKey: ['coachDashboard'] });
      Alert.alert(
        '¡Éxito!',
        typeof msg === 'string' ? msg : 'Equipo creado exitosamente',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
  });

  return (
    <ScrollView className="flex-1 bg-geo-black px-5 pt-8">
      <BackButton />

      <Text className="text-gray-400 text-xs mt-2">Entrenador</Text>
      <Text className="font-geo text-4xl text-white tracking-wide">Crear equipo</Text>
      <Text className="mt-2 text-gray-400 mb-8">
        Nombre y cancha local del equipo.
      </Text>

      <View className="bg-gray-900/80 border border-geo-green/20 rounded-2xl p-5 mb-10">

        {/* Nombre del equipo */}
        <View className="mb-5">
          <Text className="text-white font-bold mb-2">Nombre del equipo</Text>
          <Controller
            control={control}
            name="name"
            rules={{ required: 'El nombre es obligatorio' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className={`bg-geo-black border ${
                  errors.name ? 'border-red-500' : 'border-gray-700/80'
                } text-white rounded-xl p-4`}
                placeholder="Ej: Tigres FC"
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

        {/* Cancha local */}
        <View className="mb-6">
          <Text className="text-white font-bold mb-2">
            Cancha local{' '}
            <Text className="text-gray-500 font-normal text-xs">(opcional)</Text>
          </Text>
          <Controller
            control={control}
            name="fieldAddress"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-geo-black border border-gray-700/80 text-white rounded-xl p-4"
                placeholder="Ej: Av. Principal 123, Col. Centro"
                placeholderTextColor="#6b7280"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit((data) => mutate(data))}
          disabled={isPending}
          className={`bg-geo-green py-4 rounded-xl items-center flex-row justify-center ${
            isPending ? 'opacity-60' : ''
          }`}
        >
          {isPending ? (
            <>
              <ActivityIndicator color="#000000" className="mr-2" />
              <Text className="text-geo-black font-bold text-lg tracking-wide">
                Creando...
              </Text>
            </>
          ) : (
            <Text className="text-geo-black font-bold text-lg tracking-wide">
              Crear equipo
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
