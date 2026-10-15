import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { colors } from '../theme';

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}>
        <Stack.Screen name="index" options={{ title: 'Gym Tracker' }} />
        <Stack.Screen name="onboarding" options={{ title: 'Tu perfil' }} />
        <Stack.Screen name="plan" options={{ title: 'Tu semana' }} />
        <Stack.Screen name="exercises" options={{ title: 'Ejercicios' }} />
        <Stack.Screen name="routine/[id]" options={{ title: '' }} />
        <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
        <Stack.Screen name="new-routine" options={{ title: 'Nueva rutina', presentation: 'modal' }} />
        <Stack.Screen name="new-exercise" options={{ title: 'Nuevo ejercicio', presentation: 'modal' }} />
      </Stack>
    </QueryClientProvider>
  );
}
