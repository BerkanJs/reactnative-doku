// Gün 39 — Dil seçimini kalıcı sakla (persist olmadan her açılışta cihaz diline döner)
// RTL dil seçilirse layout yönünü değiştirip uygulamayı yeniden başlatır

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import i18n, { RTL_DILLER } from '@/i18n';

export type DilKodu = 'tr' | 'en' | 'ar';

interface DilStore {
  dilKodu: DilKodu;
  dilDegistir: (yeniDil: DilKodu) => Promise<void>;
}

export const useDilStore = create<DilStore>()(
  persist(
    (set) => ({
      dilKodu: (i18n.language as DilKodu) ?? 'tr',

      dilDegistir: async (yeniDil) => {
        await i18n.changeLanguage(yeniDil);
        set({ dilKodu: yeniDil });

        const rtlOlmali = RTL_DILLER.includes(yeniDil);
        if (I18nManager.isRTL !== rtlOlmali) {
          I18nManager.forceRTL(rtlOlmali);
          try {
            await Updates.reloadAsync();
          } catch {
            // Expo Go'da reloadAsync desteklenmez — geliştirme build'inde manuel yeniden başlatma gerekir
            console.warn('Updates.reloadAsync desteklenmiyor — uygulamayı elle yeniden başlatın.');
          }
        }
      },
    }),
    {
      name: '@shopapp/dil',
      storage: createJSONStorage(() => AsyncStorage),
      // Uygulama açılışında kayıtlı dil, cihaz dilinden farklıysa i18n'i senkronla
      onRehydrateStorage: () => (state) => {
        if (state && state.dilKodu !== i18n.language) {
          i18n.changeLanguage(state.dilKodu);
        }
      },
    }
  )
);
