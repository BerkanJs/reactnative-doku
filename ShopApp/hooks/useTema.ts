// Gün 27 — Dark Mode: aktif temayı döndüren hook
// Kullanıcı seçimi + sistem teması birleştirilir

import { useColorScheme } from 'react-native';
import { useTemaStore } from '@/store/temaStore';
import { acikTema, koyuTema, type Tema } from '@/constants/tema';

interface UseTemaResult {
  tema: Tema;
  koyuMu: boolean;
  secim: 'acik' | 'koyu' | 'sistem';
  setSecim: (s: 'acik' | 'koyu' | 'sistem') => void;
}

export function useTema(): UseTemaResult {
  const sistemTema = useColorScheme();  // 'light' | 'dark' | null
  const { secim, setSecim } = useTemaStore();

  const koyuMu =
    secim === 'koyu' ||
    (secim === 'sistem' && sistemTema === 'dark');

  return {
    tema: (koyuMu ? koyuTema : acikTema) as Tema,
    koyuMu,
    secim,
    setSecim,
  };
}
