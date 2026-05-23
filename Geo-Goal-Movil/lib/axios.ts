import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- JWT Decode ---
function decodeJwtPayload(token: string): { exp: number } | null {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        if (typeof atob !== 'function') return null;
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

const TOKEN_REFRESH_BUFFER_MS = 30 * 60 * 1000; // 30 minutos
const isTokenExpiringSoon = (token: string): boolean => {
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return false;
    return payload.exp * 1000 - Date.now() < TOKEN_REFRESH_BUFFER_MS;
};

// 1. Configuración de la URL
const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://geo-goal.onrender.com/api/").replace(/\/+$/, "");

const api = axios.create({
    baseURL: API_URL
});

const rawApi = axios.create({
    baseURL: API_URL
});

const AUTH_ENDPOINTS = new Set([
    '/auth/login',
    '/auth/create-account',
    '/auth/confirm-account',
    '/auth/request-code',
    '/auth/forgot-password',
    '/auth/validate-token',
    '/auth/refresh-token',
]);

const normalizePath = (url?: string): string | null => {
    if (!url) return null;
    try {
        if (url.startsWith('http')) {
            const parsed = new URL(url);
            return parsed.pathname.replace(/\/+$/, "");
        }
        return url.startsWith('/') ? url : `/${url}`;
    } catch {
        return null;
    }
};

const shouldSkipRefresh = (url?: string, config?: any) => {
    if (config?.skipAuthRefresh) return true;
    const path = normalizePath(url);
    if (!path) return false;
    return AUTH_ENDPOINTS.has(path);
};

// --- Refresh mutex ---
let refreshPromise: Promise<string | null> | null = null;
const refreshAccessToken = async (): Promise<string | null> => {
    const currentRefreshToken = await AsyncStorage.getItem('REFRESH_TOKEN');
    if (!currentRefreshToken) return null;
    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const { data } = await rawApi.post<{ token?: string; accessToken?: string; refreshToken?: string }>(
                    '/auth/refresh-token',
                    { refreshToken: currentRefreshToken }
                );
                const accessToken = data?.accessToken || data?.token;
                if (!accessToken) return null;
                await AsyncStorage.setItem('AUTH_TOKEN', accessToken);
                if (data?.refreshToken) {
                    await AsyncStorage.setItem('REFRESH_TOKEN', data.refreshToken);
                }
                return accessToken;
            } catch (error: any) {
                const status = error?.response?.status;
                if (status === 401 || status === 403) {
                    await AsyncStorage.removeItem('AUTH_TOKEN');
                    await AsyncStorage.removeItem('REFRESH_TOKEN');
                }
                return null;
            } finally {
                refreshPromise = null;
            }
        })();
    }
    return refreshPromise;
};

// 2. Request Interceptor — attach token + proactive refresh
api.interceptors.request.use(async (config) => {
    try {
        let token = await AsyncStorage.getItem('AUTH_TOKEN');
        const refreshToken = await AsyncStorage.getItem('REFRESH_TOKEN');

        if (
            token &&
            refreshToken &&
            !shouldSkipRefresh(config.url, config) &&
            isTokenExpiringSoon(token)
        ) {
            const newToken = await refreshAccessToken();
            if (newToken) {
                token = newToken;
            }
        }

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

// 3. Response Interceptor — reactive 401 refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as any;
        const status = error?.response?.status;
        const isAuthEndpoint = shouldSkipRefresh(originalRequest?.url, originalRequest);

        if (status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
            const currentAccessToken = await AsyncStorage.getItem('AUTH_TOKEN');
            const currentRefreshToken = await AsyncStorage.getItem('REFRESH_TOKEN');
            if (!currentAccessToken || !currentRefreshToken) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            const newAccessToken = await refreshAccessToken();
            if (newAccessToken) {
                originalRequest.headers = {
                    ...(originalRequest.headers || {}),
                    Authorization: `Bearer ${newAccessToken}`,
                };
                return api(originalRequest);
            }
        }
        return Promise.reject(error);
    }
);

export { rawApi };
export default api;