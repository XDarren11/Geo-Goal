import api from "@/lib/axios";
import { userSchema, type ConfirmToken, type ForgotPasswordForm, type NewPasswordForm, type RequestConfirmationCodeForm, type UserLoginForm, type UserRegistrationForm } from "@/types";
import { isAxiosError } from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function createAccount(formData: UserRegistrationForm) {
    try {
        const url = '/auth/create-account';
        const { data } = await api.post<string>(url, formData);
        return data;
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
    }
}

export async function confirmAccount(formData: ConfirmToken) {
    try {
        const url = '/auth/confirm-account';
        const { data } = await api.post<string>(url, formData);
        return data;
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
    }
}

export async function requestConfirmationCode(formData: RequestConfirmationCodeForm) {
    try {
        const url = '/auth/request-code';
        const { data } = await api.post<string>(url, formData);
        return data;
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
    }
}

export async function authenticateUser(formData: UserLoginForm) {
    try {
        const url = '/auth/login';
        const { data } = await api.post<string | { token?: string; accessToken?: string; refreshToken?: string }>(url, formData);
        const accessToken = typeof data === 'string' ? data : (data?.accessToken || data?.token);
        const refreshToken = typeof data === 'string' ? null : (data?.refreshToken || null);

        if (!accessToken) {
            throw new Error('No se recibió token de autenticación');
        }

        await AsyncStorage.setItem('AUTH_TOKEN', accessToken);
        if (refreshToken) {
            await AsyncStorage.setItem('REFRESH_TOKEN', refreshToken);
        }

        return accessToken;
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
        throw error;
    }
}

export async function forgotPassword(formData: ForgotPasswordForm) {
    try {
        const url = '/auth/forgot-password';
        const { data } = await api.post<string>(url, formData);
        return data;
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
    }
}

export async function validateToken(formData: ConfirmToken) {
    try {
        const url = '/auth/validate-token';
        const { data } = await api.post<string>(url, formData);
        return data;
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
    }
}

export async function updatePasswordWithToken({ formData, token }: { formData: NewPasswordForm, token: ConfirmToken['token'] }) {
    try {
        const url = `/auth/update-password/${token}`;
        const { data } = await api.post<string>(url, formData);
        return data;
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
    }
}

export async function getUser() {
    try {
        const { data } = await api.get('/auth/user');
        
        const response = userSchema.safeParse(data);
        if (response.success) {
            return response.data;
        }
        throw new Error('Invalid user data');
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
        throw error;
    }
}

export async function updateAccountUsername(username: string) {
    try {
        const { data } = await api.patch('/account/username', { username });
        return data as { username: string | null };
    } catch (error) {
        if (isAxiosError(error) && error.response) {
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
        const { data } = await api.patch('/account/password', formData);
        return data as { message: string };
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
        throw error;
    }
}

export async function resendAccountConfirmationEmail() {
    try {
        const { data } = await api.post('/account/resend-confirmation');
        return data as { message: string };
    } catch (error) {
        if (isAxiosError(error) && error.response) {
            throw new Error(error.response.data.error);
        }
        throw error;
    }
}

export async function logout() {
    try {
        const refreshToken = await AsyncStorage.getItem('REFRESH_TOKEN');
        if (refreshToken) {
            await api.post('/auth/logout', { refreshToken });
        }
        await AsyncStorage.removeItem('AUTH_TOKEN');
        await AsyncStorage.removeItem('REFRESH_TOKEN');
    } catch (error) {
        console.error("Error al cerrar sesión", error);
    }
}