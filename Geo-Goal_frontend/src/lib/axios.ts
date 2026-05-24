import axios from "axios";

// --- JWT Decode ---
function decodeJwtPayload(token: string): { exp: number } | null {
    try {
        const base64Url = token.split('.')[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
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

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "/api";
const ACCESS_TOKEN_KEY = "AUTH_TOKEN";
const REFRESH_TOKEN_KEY = "AUTH_REFRESH_TOKEN";

const AUTH_ENDPOINTS = new Set([
    '/auth/login',
    '/auth/create-account',
    '/auth/confirm-account',
    '/auth/request-code',
    '/auth/forgot-password',
    '/auth/validate-token',
    '/auth/refresh-token',
]);

const shouldSkipRefresh = (url?: string) => {
    if (!url) return false;
    return AUTH_ENDPOINTS.has(url);
};

const api = axios.create({
    baseURL: API_BASE_URL
})
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
});

let refreshPromise: Promise<string | null> | null = null;

const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

const refreshAccessToken = async (): Promise<string | null> => {
  const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!currentRefreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data } = await refreshClient.post(
          "/auth/refresh-token",
          { refreshToken: currentRefreshToken }
        );

        const nextAccessToken = data?.accessToken || data?.token || null;
        const nextRefreshToken = data?.refreshToken || null;

        if (!nextAccessToken || !nextRefreshToken) {
          return null;
        }

        localStorage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);
        return nextAccessToken;
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          clearSession();
        }
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
};

// Request Interceptor — attach token + proactive refresh
api.interceptors.request.use(async (config) => {
    let token = localStorage.getItem(ACCESS_TOKEN_KEY);

    if (token && !shouldSkipRefresh(config.url) && isTokenExpiringSoon(token)) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            token = newToken;
        }
    }

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor — reactive 401 refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as any;
    const status = error?.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      if (shouldSkipRefresh(originalRequest?.url)) {
        return Promise.reject(error);
      }
      originalRequest._retry = true;
      const nextAccessToken = await refreshAccessToken();
      if (nextAccessToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default api
