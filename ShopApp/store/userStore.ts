import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Kullanici = {
  id: string;
  isim: string;
  email: string;
  avatar?: string;
};

type UserStore = {
  kullanici: Kullanici | null;
  girisYapildi: boolean;
  girisYap: (kullanici: Kullanici) => void;
  cikisYap: () => void;
  profilGuncelle: (guncellemeler: Partial<Kullanici>) => void;
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      kullanici: null,
      girisYapildi: false,

      girisYap: (kullanici) =>
        set({ kullanici, girisYapildi: true }),

      cikisYap: () =>
        set({ kullanici: null, girisYapildi: false }),

      profilGuncelle: (guncellemeler) =>
        set((state) => ({
          kullanici: state.kullanici
            ? { ...state.kullanici, ...guncellemeler }
            : null,
        })),
    }),
    {
      name: '@shopapp/user',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
