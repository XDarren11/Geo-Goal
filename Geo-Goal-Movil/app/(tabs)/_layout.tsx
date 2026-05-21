import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import Loader from '@/components/Loader';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const { data: user, isLoading } = useAuth();

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
          <Tabs.Screen
            name="home"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: 'Explore',
              tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="codes"
            options={{
              title: 'Códigos',
              tabBarIcon: ({ color, size }) => <Ionicons name="key" size={size} color={color} />,
            }}
          />
          <Tabs.Screen
            name="account"
            options={{
              title: 'Cuenta',
              tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
            }}
          />
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
    </Tabs>
  );
}
