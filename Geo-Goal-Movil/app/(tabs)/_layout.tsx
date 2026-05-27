import { Tabs, usePathname, useRouter } from 'expo-router';
import React from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import Loader from '@/components/Loader';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

const EXIT_DELAY_MS = 2000;

export default function TabLayout() {
  const { data: user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const exitTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const canExitRef = React.useRef(false);

  // Limpiar el timer al desmontar
  React.useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;

    const rootTabPaths = new Set([
      '/(tabs)/home',
      '/(tabs)/explore',
      '/(tabs)/codes',
      '/(tabs)/account',
      '/(tabs)/public',
      '/(tabs)/referee',
    ]);

    const guestRootPaths = new Set([
      '/(tabs)/public',
    ]);

    const onBackPress = () => {
      // Invitado en pestaña pública → redirigir a login
      if (!user && guestRootPaths.has(pathname)) {
        router.replace('/(Auth)/login');
        return true;
      }

      // Usuario autenticado en una pestaña raíz → doble toque para salir
      if (user && rootTabPaths.has(pathname)) {
        if (canExitRef.current) {
          BackHandler.exitApp();
          return true;
        }

        canExitRef.current = true;
        ToastAndroid.show('Presiona de nuevo para salir', ToastAndroid.SHORT);

        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => {
          canExitRef.current = false;
        }, EXIT_DELAY_MS);

        return true;
      }

      // Pantalla de detalle (leagueDetail, teamDetail, matchDetail, etc.)
      // → dejar que el Stack nativo maneje el pop
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [pathname, router, user]);

  if (isLoading) {
    return <Loader fullScreen label="Preparando tu inicio..." />;
  }

  const isGuest = !user;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#39FF14',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1f2937',
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'android' ? 8 : 0,
          paddingTop: 4,
          height: Platform.OS === 'android' ? 60 : 50,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}>
      {!isGuest ? (
        <>
          {/* Dashboard — todos los roles */}
          <Tabs.Screen
            name="home"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            }}
          />

          {/* Explore (ligas/equipos) — admin, coach, player */}
          {user?.role !== 'referee' && (
            <Tabs.Screen
              name="explore"
              options={{
                title: 'Explore',
                tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
              }}
            />
          )}

          {/* Códigos — todos los roles */}
          <Tabs.Screen
            name="codes"
            options={{
              title: 'Códigos',
              tabBarIcon: ({ color, size }) => <Ionicons name="key" size={size} color={color} />,
            }}
          />

          {/* Cuenta — todos los roles */}
          <Tabs.Screen
            name="account"
            options={{
              title: 'Cuenta',
              tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
            }}
          />

          {/* Árbitro — solo referee */}
          {user?.role === 'referee' && (
            <Tabs.Screen
              name="referee"
              options={{
                href: undefined,
                title: 'Árbitro',
                tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} />,
              }}
            />
          )}
        </>
      ) : null}
      <Tabs.Screen
        name="public"
        options={{
          title: 'Resultados',
          tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leagueDetail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="teamDetail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="matchDetail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="navigation"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      {/* Fase 8 + nuevas funcionalidades — ocultas de la barra de tabs */}
      <Tabs.Screen name="playerCareerDashboard" options={{ href: null }} />
      <Tabs.Screen name="teamCareerDashboard" options={{ href: null }} />
      <Tabs.Screen name="coachCareerDashboard" options={{ href: null }} />
      <Tabs.Screen name="playersList" options={{ href: null }} />
    </Tabs>
  );
}
