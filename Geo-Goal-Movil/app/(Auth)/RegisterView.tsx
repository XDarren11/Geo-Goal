import React, { useState } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    KeyboardAvoidingView, 
    Platform, 
    StatusBar, 
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { useRouter, Link } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import type { UserRegistrationForm } from '@/types/index';
import { createAccount } from '@/Api/AuthApi';

export default function RegisterView() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);

    const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<UserRegistrationForm>({
        defaultValues: { name: '', email: '', password: '', password_confirmation: '' }
    });

    const password = watch('password');

    const { mutate, isPending } = useMutation({
        mutationFn: createAccount,
        onError: (error: any) => Alert.alert("Error", error.message),
        onSuccess: (data) => {
            Alert.alert("Cuenta Creada", data, [{ text: "OK", onPress: () => router.replace('/(Auth)/login') }]);
            reset();
        }
    });

    const handleRegister = (formData: UserRegistrationForm) => mutate(formData);

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
            style={{ flex: 1 }}
        >
            <View className="flex-1 bg-[#0ED000]">
                <StatusBar barStyle="default"/>

                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View className="pt-16 pb-10 justify-center items-center">
                        <Text className="text-black text-4xl font-bold tracking-wider">
                            Regístrate
                        </Text>
                    </View>

                    <View className="flex-1 bg-black rounded-t-[60px] px-8 pt-12 pb-40 justify-start">

                        {/* --- Input: Nombre --- */}
                        <View className="mb-6">
                            <Text className="text-[#0ED000] font-bold mb-2 ml-5">Nombre del Usuario</Text>
                            <Controller
                                control={control}
                                name="name"
                                rules={{ required: "El Nombre es obligatorio" }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        placeholder="GeoGoal"
                                        placeholderTextColor="#888"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        className={`bg-[#E8F7E6] rounded-full py-4 px-6 text-black text-lg ${errors.name ? 'border-2 border-red-500' : ''}`}
                                    />
                                )}
                            />
                            {errors.name && <Text className="text-red-500 ml-5 mt-1 font-bold">{errors.name.message}</Text>}
                        </View>

                        {/* --- Input: Email --- */}
                        <View className="mb-6">
                            <Text className="text-[#0ED000] font-bold mb-2 ml-5">Email</Text>
                            <Controller
                                control={control}
                                name="email"
                                rules={{
                                    required: "El Email es obligatorio",
                                    pattern: { value: /\S+@\S+\.\S+/, message: "E-mail no válido" },
                                }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <TextInput
                                        placeholder="example@example.com"
                                        placeholderTextColor="#888"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        onBlur={onBlur}
                                        onChangeText={onChange}
                                        value={value}
                                        className={`bg-[#E8F7E6] rounded-full py-4 px-6 text-black text-lg ${errors.email ? 'border-2 border-red-500' : ''}`}
                                    />
                                )}
                            />
                            {errors.email && <Text className="text-red-500 ml-5 mt-1 font-bold">{errors.email.message}</Text>}
                        </View>

                        {/* --- Input: Password --- */}
                        <View className="mb-6">
                            <Text className="text-[#0ED000] font-bold mb-2 ml-5">Contraseña</Text>
                            <Controller
                                control={control}
                                name="password"
                                rules={{ required: "El Password es obligatorio", minLength: { value: 8, message: 'Mínimo 8 caracteres' } }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View className={`flex-row items-center bg-[#E8F7E6] rounded-full px-6 py-1 ${errors.password ? 'border-2 border-red-500' : ''}`}>
                                        <TextInput
                                            placeholder="••••••••"
                                            placeholderTextColor="#888"
                                            secureTextEntry={!showPassword}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            className="flex-1 text-black text-lg py-3"
                                        />
                                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                            <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="gray" />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                            {errors.password && <Text className="text-red-500 ml-5 mt-1 font-bold">{errors.password.message}</Text>}
                        </View>

                        {/* --- Input: Confirm Password --- */}
                        <View className="mb-8">
                            <Text className="text-[#0ED000] font-bold mb-2 ml-5">Confirmar Contraseña</Text>
                            <Controller
                                control={control}
                                name="password_confirmation"
                                rules={{ required: "Repetir Password es obligatorio", validate: value => value === password || 'Los Passwords no coinciden' }}
                                render={({ field: { onChange, onBlur, value } }) => (
                                    <View className={`flex-row items-center bg-[#E8F7E6] rounded-full px-6 py-1 ${errors.password_confirmation ? 'border-2 border-red-500' : ''}`}>
                                        <TextInput
                                            placeholder="••••••••"
                                            placeholderTextColor="#888"
                                            secureTextEntry={!showPassword}
                                            onBlur={onBlur}
                                            onChangeText={onChange}
                                            value={value}
                                            className="flex-1 text-black text-lg py-3"
                                        />
                                    </View>
                                )}
                            />
                            {errors.password_confirmation && <Text className="text-red-500 ml-5 mt-1 font-bold">{errors.password_confirmation.message}</Text>}
                        </View>
                        
                        {/* --- Botones --- */}
                        <View className="justify-center items-center">
                            <TouchableOpacity
                                className={`bg-[#0ED000] w-3/5 py-4 rounded-full items-center mt-2 shadow-lg shadow-green-900 ${isPending ? 'opacity-50' : ''}`}
                                onPress={handleSubmit(handleRegister)}
                                disabled={isPending}
                            >
                                {isPending ? <ActivityIndicator color="black" /> : <Text className="text-black font-bold text-2xl">Regístrate</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity className="mt-8 py-2" onPress={() => router.push('/(Auth)/login')}>
                                <Text className="text-[#0ED000] font-bold text-lg text-center">
                                    ¿Ya tienes cuenta? Inicia sesión
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="mt-4 py-2" onPress={() => router.push('/(Auth)/ForgotPasswordView')}>
                                <Text className="text-[#0ED000] font-bold text-lg text-center">
                                    ¿Has olvidado tu contraseña?
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}