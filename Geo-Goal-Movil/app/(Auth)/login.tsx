import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { authenticateUser } from '@/Api/AuthApi'; 
import type { UserLoginForm } from '@/types'; 

export default function LoginScreen() {
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    // 1. Configuración del Formulario
    const { control, handleSubmit, formState: { errors } } = useForm<UserLoginForm>({
        defaultValues: {
            email: '',
            password: ''
        }
    });

    // 2. Configuración de la Mutación (TanStack Query)
    const { mutate, isPending } = useMutation({
        mutationFn: authenticateUser,
        onError: (error) => {
            Alert.alert("Error", error.message || "Hubo un error al iniciar sesión");
        },
        onSuccess: () => {
            router.replace('/(tabs)/home'); 
        }
    });

    // 3. Función de envío
    const handleLogin = (formData: UserLoginForm) => {
        mutate(formData);
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-[#0ED000]"
        >
            <StatusBar style='auto'/>

            <ScrollView contentContainerStyle={{flexGrow:1}}>

                <View className="h-[25%] justify-center items-center pt-10">
                    <Text className="text-black text-4xl font-bold tracking-wider">
                        Bienvenido
                    </Text>
                </View>

                <View className="flex-1 bg-black rounded-t-[60px] px-8 pt-12 pb-10 justify-start">
                    
                    {/* --- Input: Email --- */}
                    <View className="mb-6">
                        <Text className="text-[#0ED000] font-bold mb-2 ml-5">Email o Usuario</Text>
                        
                        <Controller
                            control={control}
                            name="email"
                            rules={{
                                required: "El Email es obligatorio",
                                pattern: {
                                    value: /\S+@\S+\.\S+/,
                                    message: "E-mail no válido",
                                }
                            }}
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput 
                                    placeholder="example@example.com"
                                    placeholderTextColor="#888"
                                    className="bg-[#E8F7E6] rounded-full py-4 px-6 text-black text-lg"
                                    onBlur={onBlur}
                                    onChangeText={onChange}
                                    value={value}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                />
                            )}
                        />
                        {errors.email && (
                            <Text className="text-red-500 ml-5 mt-1">{errors.email.message}</Text>
                        )}
                    </View>

                    {/* --- Input: Password --- */}
                    <View className="mb-8">
                        <Text className="text-[#0ED000] font-bold mb-2 ml-5">Contraseña</Text>
                        <View className="flex-row items-center bg-[#E8F7E6] rounded-full px-6 py-1">
                            <Controller
                                control={control}
                                name="password" // Asegúrate que coincida con tu Type
                                rules={{ required: "El Password es obligatorio" }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput 
                                        placeholder="● ● ● ● ● ● ●"
                                        placeholderTextColor="#888"
                                        secureTextEntry={!showPassword}
                                        className="flex-1 text-black text-lg py-3" // Añadí py-3 para mejor hit area
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                    />
                                )}
                            />
                            
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons 
                                    name={showPassword ? "eye-off" : "eye"} 
                                    size={24} 
                                    color="gray" 
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password && ( // Asumiendo que errors puede tener password
                            <Text className="text-red-500 ml-5 mt-1">{errors.password?.message}</Text>
                        )}
                    </View>
                    
                    <View className=" justify-center items-center">
                        {/* Botón de Ingresar */}
                        <TouchableOpacity
                            className={`bg-[#0ED000] w-3/5 py-3 rounded-full items-center mt-7 shadow-lg shadow-green-900 ${isPending ? 'opacity-50' : ''}`}
                            onPress={handleSubmit(handleLogin)}
                            disabled={isPending}
                        >
                            {isPending ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text className="text-black font-bold text-2xl">Ingresar</Text>
                            )}
                        </TouchableOpacity>

                        {/* Navegación (Links) */}
                        <TouchableOpacity className="mt-6" onPress={() => router.push('/(Auth)/RegisterView')}>
                            <Text className=" text-[#0ED000] font-bold">
                                ¿No tienes cuenta? Crear Una
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity className="mt-6">
                            <Text className=" text-[#0ED000] font-bold">
                                ¿Has olvidado tu contraseña?
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}