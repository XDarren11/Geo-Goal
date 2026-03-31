import { useQuery } from "@tanstack/react-query";
import { getUser, logout } from "@/Api/AuthApi";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
    const { data, isError, isLoading } = useQuery({
        queryKey: ['user'],
        queryFn: getUser,
        retry: 1,
        refetchOnWindowFocus: false
    });

    const handleLogout = async () => {
        await logout();
        // Invalidar la query del usuario
    };

    return { data, isError, isLoading, logout: handleLogout };
};

export const checkAuthToken = async (): Promise<boolean> => {
    try {
        const token = await AsyncStorage.getItem('AUTH_TOKEN');
        return !!token;
    } catch (error) {
        return false;
    }
};
