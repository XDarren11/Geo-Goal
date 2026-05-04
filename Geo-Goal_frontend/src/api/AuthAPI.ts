import api from "@/lib/axios";
import { userSchema, type ConfirmToken, type ForgotPasswordForm, type NewPasswordForm, type RequestConfirmationCodeForm, type UserRegistrationForm, type UserLoginForm } from "@/types";
import { isAxiosError } from "axios";

const ACCESS_TOKEN_KEY = "AUTH_TOKEN";
const REFRESH_TOKEN_KEY = "AUTH_REFRESH_TOKEN";

type AuthTokenPair = {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: "Bearer";
};

const saveTokens = (payload: AuthTokenPair) => {
  const accessToken = payload.accessToken || payload.token;
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (payload.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
};

export async function createAccount(formData: UserRegistrationForm) {
  try {
    const { data } = await api.post<string>( "/auth/create-account", formData);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function confirmAccount(formData: ConfirmToken) {
  try {
    const { data } = await api.post<string>("/auth/confirm-account", formData);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function requestConfirmationCode(formData: RequestConfirmationCodeForm) {
  try {
    const { data } = await api.post<string>("/auth/request-code", formData);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function authenticateUser(formData: UserLoginForm) {
  try {
    const { data } = await api.post<string | AuthTokenPair>("/auth/login", formData);
    if (typeof data === "string") {
      localStorage.setItem(ACCESS_TOKEN_KEY, data);
      return data;
    }
    saveTokens(data);
    return data.accessToken || data.token || data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function logout() {
  try {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await api.post<string>("/auth/logout", { refreshToken });
    }
  } catch {
    // Silencioso: siempre limpiamos storage local.
  } finally {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export async function logoutAll() {
  try {
    await api.post<string>("/auth/logout-all");
  } finally {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export async function forgotPassword(formData: ForgotPasswordForm) {
  try {
    const { data } = await api.post<string>("/auth/forgot-password", formData);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function validateToken(formData: ConfirmToken) {
  try {
    const { data } = await api.post<string>("/auth/validate-token", formData);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function updatePasswordWithToken({
  formData,
  token,
}: {
  formData: NewPasswordForm;
  token: ConfirmToken["token"];
}) {
  try {
    const { data } = await api.post<string>(`/auth/update-password/${encodeURIComponent(token)}`, formData);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function getUser() {
  try {
    const { data } = await api.get("/auth/user");
    const parsed = userSchema.safeParse(data);
    if (parsed.success) return parsed.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function updateAccountUsername(username: string) {
  try {
    const { data } = await api.patch<{ username: string | null }>("/account/username", { username });
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function updateAccountPassword(formData: {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirmation: string;
}) {
  try {
    const { data } = await api.patch<{ message: string }>("/account/password", formData);
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}

export async function resendAccountConfirmationEmail() {
  try {
    const { data } = await api.post<{ message: string }>("/account/resend-confirmation");
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
}