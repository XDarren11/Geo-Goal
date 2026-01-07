import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Configuración de la URL
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
    baseURL: API_URL
});

// 2. Interceptor
api.interceptors.request.use(async (config) => {
    try {
        // En React Native, leer datos es una operación asíncrona (await)
        const token = await AsyncStorage.getItem('AUTH_TOKEN');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (error) {
        console.error("Error leyendo el token", error);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;