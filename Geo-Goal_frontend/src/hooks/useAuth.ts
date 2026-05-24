import { getUser } from "@/api/AuthAPI";
import { useQuery } from "@tanstack/react-query";

export const useAuth = () => {
    const {data, isError, isLoading} = useQuery({
        queryKey: ['user'],
        queryFn: getUser,
        retry: 1,
        refetchOnWindowFocus: false,
        // El usuario logueado prácticamente nunca cambia durante una sesión.
        // 5 min de fresco evita que cada componente que use useAuth dispare
        // un GET /api/auth/user al montar (causa principal de los 2 SELECTs
        // duplicados en los logs del backend).
        staleTime: 5 * 60_000,
        // Mantén en caché 30 min después de que ningún componente lo use,
        // para que un volver-atrás no re-pegue al backend.
        gcTime: 30 * 60_000,
    })

    return {data, isError, isLoading}
}