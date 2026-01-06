import { router } from "expo-router";
import { View, Image, Text, TouchableOpacity, KeyboardAvoidingView, ScrollView, TextInput } from "react-native";
import { StatusBar } from 'expo-status-bar';
import { useState } from "react";
import { Ionicons, FontAwesome } from '@expo/vector-icons';

export default function login() {

    const [showPassword, setShowPassword] = useState(false);

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#0ED000]">
        <StatusBar style='auto'/>

        <ScrollView contentContainerStyle={{flexGrow:1}}>

            <View className="h-[25%] justify-center items-center pt-10">
                <Text className="text-black text-4xl font-bold tracking-wider">
                    Bienvenido
                </Text>
            </View>

            <View className="flex-1 bg-black rounded-t-[60px] px-8 pt-12 pb-10 justify-start">
                
                {/* Input: Username */}
                <View className="mb-6">
                    <Text className="text-[#0ED000] font-bold mb-2 ml-5">Email o Usuario</Text>
                    <TextInput 
                        placeholder="example@example.com"
                        placeholderTextColor="#888"
                        className="bg-[#E8F7E6] rounded-full py-4 px-6 text-black text-lg"
                    />
                </View>

                {/* Input: Password */}
                <View className="mb-8">
                    <Text className="text-[#0ED000] font-bold mb-2 ml-5">Contraseña</Text>
                    <View className="flex-row items-center bg-[#E8F7E6] rounded-full px-6 py-1">
                    <TextInput 
                        placeholder="● ● ● ● ● ● ●"
                        placeholderTextColor="#888"
                        secureTextEntry={!showPassword}
                        className="flex-1 text-black text-lg"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons 
                        name={showPassword ? "eye-off" : "eye"} 
                        size={24} 
                        color="gray" 
                        />
                    </TouchableOpacity>
                    </View>
                </View>
            </View>
        </ScrollView>
    </KeyboardAvoidingView>
  )
}
