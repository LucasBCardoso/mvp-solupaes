import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { initDb } from '../src/lib/db';
import { startNetworkWatcher } from '../src/lib/sync';
import { bootstrapSession, useSessionState } from '../src/lib/sessionState';
import '../global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function RootLayout() {
  const { authed, loaded } = useSessionState();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initDb();
    bootstrapSession();
    const unsub = startNetworkWatcher(() => undefined);
    return unsub;
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!authed && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (authed && inAuthGroup) {
      router.replace('/');
    }
  }, [authed, loaded, segments, router]);

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900">
        <ActivityIndicator color="#f59e0b" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
