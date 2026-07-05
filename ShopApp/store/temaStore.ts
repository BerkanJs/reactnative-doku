// Gün 27 — Dark Mode: Zustand + AsyncStorage persist
// Kullanıcının manuel tema tercihini saklar

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TemaSecimi = 'acik' | 'koyu' | 'sistem';

interface TemaStore {
  secim: TemaSecimi;
  setSecim: (secim: TemaSecimi) => void;
}

export const useTemaStore = create<TemaStore>()(
  persist(
    (set) => ({
      secim: 'sistem',
      setSecim: (secim) => set({ secim }),
    }),
    {
      name: 'tema-tercihi',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
