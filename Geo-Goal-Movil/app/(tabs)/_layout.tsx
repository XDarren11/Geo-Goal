import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import Loader from '@/components/Loader';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const { data: user, isLoading } = useAuth();

  if (isLoading) {
    return <Loader fullScreen label="Preparando tu inicio..." />;
  }

  if (!user) {
    return <Redirect href="/(Auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="codes"
        options={{
          title: 'Códigos',
          tabBarIcon: ({ color, size }) => <Ionicons name="key" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Cuenta',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
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
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="referee"
        options={{
          href: user.role === 'referee' ? undefined : null,
          title: 'Árbitro',
          tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
