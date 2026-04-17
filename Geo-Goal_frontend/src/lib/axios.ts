import axios from "axios";

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || "/api";
const ACCESS_TOKEN_KEY = "AUTH_TOKEN";
const REFRESH_TOKEN_KEY = "AUTH_REFRESH_TOKEN";

const api = axios.create({
    baseURL: API_BASE_URL
})
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
    if(token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

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
        // Solo invalidamos storage cuando el refresh token ya no es válido.
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as any;
    const status = error?.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
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