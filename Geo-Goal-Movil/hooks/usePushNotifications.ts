import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./useAuth";
import api from "@/lib/axios";

// Mostrar la notificación como alerta visual cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registra el Expo Push Token en el backend cuando el usuario inicia sesión.
 * También maneja el tap en notificaciones → deep link al partido/equipo.
 *
 * Usar en el layout raíz (_layout.tsx) una sola vez.
 */
export function usePushNotifications() {
  const { data: user } = useAuth();
  const router = useRouter();
  const registeredToken = useRef<string | null>(null);

  // ── Registro del token ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    async function registerPushToken() {
      if (!Device.isDevice) {
        console.log("[push] Push solo funciona en dispositivo físico");
        return;
      }

      // Pedir permisos
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("[push] Usuario denegó permisos de notificación");
        return;
      }

      // Canal de Android (required)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Geo-Goal",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#39FF14",
        });
      }

      // Obtener Expo Push Token
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;

      if (!projectId) {
        console.warn("[push] projectId no encontrado en app.json, omitiendo registro");
        return;
      }

      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (registeredToken.current === token) return; // ya registrado en esta sesión

        const platform =
          Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";

        await api.post("/account/device-tokens", { token, platform });
        registeredToken.current = token;
        console.log("[push] Token registrado:", token.slice(0, 40) + "...");
      } catch (err) {
        console.error("[push] Error registrando token:", err);
      }
    }

    registerPushToken();
  }, [user]);

  // ── Deep link al tap en notificación ─────────────────────────────────────
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        if (data?.matchId) {
          router.push(`/matches/${data.matchId}` as any);
        } else if (data?.teamId) {
          router.push(`/teams/${data.teamId}` as any);
        }
      }
    );
    return () => subscription.remove();
  }, [router]);
}

