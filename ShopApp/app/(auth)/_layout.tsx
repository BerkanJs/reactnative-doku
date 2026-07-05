// Gün 20 — Auth grubu layout
// Header yok, tam ekran auth akışı

import { Stack } from 'expo-router';
import { useTema } from '@/hooks/useTema';

export default function AuthLayout() {
  const { tema } = useTema();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tema.colors.arka },
        animation: 'fade',
      }}
    />
  );
}
