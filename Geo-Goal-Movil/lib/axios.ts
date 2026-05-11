import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Configuración de la URL
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
    baseURL: API_URL
});

const rawApi = axios.create({
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

const refreshAccessToken = async (): Promise<string> => {
    const refreshToken = await AsyncStorage.getItem('REFRESH_TOKEN');
    if (!refreshToken) {
        throw new Error('No refresh token');
    }

    const { data } = await rawApi.post<{ token?: string; accessToken?: string; refreshToken?: string }>(
        '/auth/refresh-token',
        { refreshToken }
    );
    const accessToken = data?.accessToken || data?.token;
    if (!accessToken) {
        throw new Error('No access token');
    }

    await AsyncStorage.setItem('AUTH_TOKEN', accessToken);
    if (data?.refreshToken) {
        await AsyncStorage.setItem('REFRESH_TOKEN', data.refreshToken);
    }

    return accessToken;
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as any;
        if (error?.response?.status === 401 && !originalRequest?._retry) {
            originalRequest._retry = true;
            try {
                const newAccessToken = await refreshAccessToken();
                originalRequest.headers = {
                    ...(originalRequest.headers || {}),
                    Authorization: `Bearer ${newAccessToken}`,
                };
                return api(originalRequest);
            } catch (refreshError) {
                await AsyncStorage.removeItem('AUTH_TOKEN');
                await AsyncStorage.removeItem('REFRESH_TOKEN');
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;