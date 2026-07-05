// Gün 20 — Auth Flow: token yönetimi
// Token SecureStore'da tutulur, store sadece kullanıcı bilgisini tutar
// Gün 49 — Sentry: hangi kullanıcının hatayı yaşadığını bilmek için user context

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { crashlyticsKullaniciAyarla } from '@/services/firebaseServisi';
import type { Kullanici } from '@/types';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

interface AuthStore {
  kullanici: Kullanici | null;
  yukleniyor: boolean;
  girisYap: (kullanici: Kullanici, token: string, refreshToken: string) => Promise<void>;
  cikisYap: () => Promise<void>;
  tokenGetir: () => Promise<string | null>;
  kullaniciyiGuncelle: (guncelleme: Partial<Kullanici>) => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  kullanici: null,
  yukleniyor: false,

  girisYap: async (kullanici, token, refreshToken) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    set({ kullanici });

    // GDPR: şifre, kart bilgisi gibi hassas veriler asla Sentry'ye/Crashlytics'e gönderilmez
    Sentry.setUser({ id: kullanici.id, email: kullanici.email, username: kullanici.ad });
    crashlyticsKullaniciAyarla(kullanici);
  },

  cikisYap: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ kullanici: null });

    Sentry.setUser(null);
  },

  tokenGetir: async () => {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  kullaniciyiGuncelle: (guncelleme) =>
    set((state) => ({
      kullanici: state.kullanici ? { ...state.kullanici, ...guncelleme } : null,
    })),
}));
