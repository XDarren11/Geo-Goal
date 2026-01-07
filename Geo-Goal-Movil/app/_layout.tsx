import '../global.css'
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import 'react-native-reanimated';

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name='index'  options={{headerShown: false}} />
        <Stack.Screen name="(Auth)"  options={{headerShown: false}} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
    </QueryClientProvider>
  );
}
