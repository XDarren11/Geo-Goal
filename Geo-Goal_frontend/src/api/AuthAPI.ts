import api from "@/lib/axios";
import { userSchema, type ConfirmToken, type ForgotPasswordForm, type NewPasswordForm, type RequestConfirmationCodeForm, type UserRegistrationForm, type UserLoginForm } from "@/types";
import { isAxiosError } from "axios";

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

/** Login: backend responde con el JWT en texto plano (res.send(token)) */
export async function authenticateUser(formData: UserLoginForm) {
  try {
    const { data } = await api.post<string | { token?: string }>("/auth/login", formData);
    const token = typeof data === "string" ? data : data?.token;
    if (token) localStorage.setItem("AUTH_TOKEN", token);
    return token ?? data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
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