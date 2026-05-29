import '../global.css';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { usePushNotifications } from '../hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Registrar bajo el nombre exacto que usa el componente Ionicons internamente
    Ionicons: require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PushNotificationsProvider />
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(Auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="leagueDetail" options={{ headerShown: false }} />
          <Stack.Screen name="teamDetail" options={{ headerShown: false }} />
          <Stack.Screen name="matchDetail" options={{ headerShown: false }} />
          <Stack.Screen name="playerCareerDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="teamCareerDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="coachCareerDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="adminCareerDashboard" options={{ headerShown: false }} />
          <Stack.Screen name="playersList" options={{ headerShown: false }} />
          <Stack.Screen name="navigation" options={{ headerShown: false }} />
        </Stack>
      </View>
    </QueryClientProvider>
  );
}

/** Componente auxiliar para que usePushNotifications viva dentro del QueryClientProvider */
function PushNotificationsProvider() {
  usePushNotifications();
  return null;
}

