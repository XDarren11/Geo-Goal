import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUser, logout as logoutApi } from "@/Api/AuthApi";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const token = await AsyncStorage.getItem('AUTH_TOKEN');
            if (!token) return null;
            try {
                return await getUser();
            } catch {
                return null;
            }
        },
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
    });

    const handleLogout = async () => {
        await logoutApi();
        queryClient.setQueryData(['user'], null);
        queryClient.removeQueries({ queryKey: ['user'] });
        queryClient.clear();
    };

    return { data, isLoading, logout: handleLogout };
};

export const checkAuthToken = async (): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('AUTH_TOKEN');
        if (token) return true;
        const refreshToken = await AsyncStorage.getItem('REFRESH_TOKEN');
        return !!refreshToken;
    } catch (error) {
        return false;
    }
};
