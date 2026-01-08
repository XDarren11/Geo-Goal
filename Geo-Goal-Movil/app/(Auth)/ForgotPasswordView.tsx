import React from 'react';
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
import { useForm, Controller } from 'react-hook-form';
import { useRouter, Link } from 'expo-router';
import { useMutation } from '@tanstack/react-query';

// Importa tus tipos y api
import { ForgotPasswordForm } from '@/types/index';
import { forgotPassword } from '@/Api/AuthApi';

export default function ForgotPasswordView() {
    const router = useRouter();

    // 1. Configuración del Formulario
    const { control, handleSubmit, reset, formState: { errors } } = useForm<ForgotPasswordForm>({
        defaultValues: {
            email: ''
        }
    });

    // 2. Configuración de la Mutación (API)
    const { mutate, isPending } = useMutation({
        mutationFn: forgotPassword, // Tu función de API importada
        onError: (error: any) => {
            Alert.alert("Error", error.message);
        },
        onSuccess: (data) => {
            Alert.alert("Email Enviado", data, [
                { text: "OK", onPress: () => router.push('/(Auth)/login') }
            ]);
            reset();
        }
    });

    const handleForgotPassword = (formData: ForgotPasswordForm) => {
        mutate(formData);
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
        >
            <View className="flex-1 bg-[#0ED000]">
                <StatusBar barStyle="dark-content" backgroundColor="#0ED000"/>

                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View className="pt-16 pb-10 justify-center items-center">
                        <Text className="text-black text-3xl font-bold tracking-wider text-center px-4">
                            Reestablecer Contraseña
                        </Text>
                    </View>

                    {/* Contenedor Negro */}
                    {/* Nota: Mantenemos el pb-40 para evitar el bug visual del teclado */}
                    <View className="flex-1 bg-black rounded-t-[60px] px-8 pt-12 pb-40 justify-start">

                        {/* Texto descriptivo adaptado del web */}
                        <Text className="text-white text-lg font-light mb-8 text-center">
                            ¿Olvidaste tu contraseña? Coloca tu Email{' '}
                            <Text className="text-[#0ED000] font-bold">
                                y reestablece tu contraseña
                            </Text>
                        </Text>

                        {/* --- Input: Email --- */}
                        <View className="mb-6">
                            <Text className="text-[#0ED000] font-bold mb-2 ml-5">Email</Text>

                            <Controller
                                control={control}
                                name="email"
                                rules={{
                                    required: "El Email de registro es obligatorio",
                                    pattern: {
                                        value: /\S+@\S+\.\S+/,
                                        message: "E-mail no válido",
                                    },
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
                            {errors.email && (
                                <Text className="text-red-500 ml-5 mt-1 font-bold">
                                    {errors.email.message}
                                </Text>
                            )}
                        </View>
                        
                        {/* --- Botón Enviar --- */}
                        <View className="justify-center items-center">

                            <TouchableOpacity
                                className={`bg-[#0ED000] w-3/5 py-3 rounded-full items-center mt-7 shadow-lg shadow-green-900 ${isPending ? 'opacity-50' : ''}`}
                                onPress={handleSubmit(handleForgotPassword)}
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <ActivityIndicator color="black" />
                                ) : (
                                    <Text className="text-black font-bold text-xl text-center">
                                        Enviar Instrucciones
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* Links de Navegación */}
                            <TouchableOpacity className="mt-8" onPress={() => router.push('/(Auth)/RegisterView')}>
                                <Text className="text-[#0ED000] font-bold">
                                    ¿No tienes cuenta? Crear Una
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity className="mt-6" onPress={() => router.push('/(Auth)/login')}>
                                <Text className="text-[#0ED000] font-bold">
                                    ¿Ya tienes cuenta? Iniciar Sesión
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}