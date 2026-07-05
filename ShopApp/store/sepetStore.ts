// Gün 17 — Zustand ile sepet yönetimi (Gün 33 — offline optimistic update)
// MMKV ile persist: uygulama kapansa bile sepet korunur
// Gün 50 — Remote Config: sepetteki maksimum ürün adedi sunucudan gelir

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { sepeteEklendiOlayi } from '@/services/firebaseServisi';
import { maksimumSepetAdedi } from '@/services/remoteConfigServisi';
import type { Urun, SepetItem } from '@/types';

interface SepetStore {
  itemlar: SepetItem[];
  ekle: (urun: Urun, adet?: number) => void;
  cikar: (urunId: string) => void;
  adediniGuncelle: (urunId: string, adet: number) => void;
  bosalt: () => void;
  toplamFiyat: () => number;
  toplamAdet: () => number;
}

export const useSepetStore = create<SepetStore>()(
  persist(
    (set, get) => ({
      itemlar: [],

      ekle: (urun, adet = 1) =>
        set((state) => {
          // Gün 49 — Sentry breadcrumb: hata olduğunda "kullanıcı ne yapıyordu?" izini bırak
          Sentry.addBreadcrumb({
            category: 'kullanici-aksiyonu',
            message: 'Sepete ürün eklendi',
            data: { urunId: urun.id, adet },
            level: 'info',
          });

          sepeteEklendiOlayi(urun, adet);

          // Gün 50 — Remote Config: bir üründen sepette en fazla kaç adet olabilir
          const maksimum = maksimumSepetAdedi();

          const mevcutIndex = state.itemlar.findIndex((i) => i.urun.id === urun.id);
          if (mevcutIndex >= 0) {
            const yeniItemlar = [...state.itemlar];
            yeniItemlar[mevcutIndex] = {
              ...yeniItemlar[mevcutIndex],
              adet: Math.min(yeniItemlar[mevcutIndex].adet + adet, maksimum),
            };
            return { itemlar: yeniItemlar };
          }
          return { itemlar: [...state.itemlar, { urun, adet: Math.min(adet, maksimum) }] };
        }),

      cikar: (urunId) =>
        set((state) => ({
          itemlar: state.itemlar.filter((i) => i.urun.id !== urunId),
        })),

      adediniGuncelle: (urunId, adet) =>
        set((state) => {
          if (adet <= 0) {
            return { itemlar: state.itemlar.filter((i) => i.urun.id !== urunId) };
          }
          return {
            itemlar: state.itemlar.map((i) =>
              i.urun.id === urunId ? { ...i, adet } : i
            ),
          };
        }),

      bosalt: () => set({ itemlar: [] }),

      toplamFiyat: () => {
        const { itemlar } = get();
        return itemlar.reduce((toplam, item) => {
          const fiyat = item.urun.indirimYuzdesi
            ? item.urun.fiyat * (1 - item.urun.indirimYuzdesi / 100)
            : item.urun.fiyat;
          return toplam + fiyat * item.adet;
        }, 0);
      },

      toplamAdet: () => {
        const { itemlar } = get();
        return itemlar.reduce((toplam, item) => toplam + item.adet, 0);
      },
    }),
    {
      name: 'sepet',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
