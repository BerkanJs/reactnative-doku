import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Urun } from '@/types';

export type SepetItem = {
  urun: Urun;
  adet: number;
};

type CartStore = {
  items: SepetItem[];
  addItem: (urun: Urun) => void;
  removeItem: (id: string) => void;
  deleteItem: (id: string) => void;
  clear: () => void;
  toplamAdet: () => number;
  toplamFiyat: () => number;
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (urun) => {
        const mevcut = get().items.find((i) => i.urun.id === urun.id);
        if (mevcut) {
          set((state) => ({
            items: state.items.map((i) =>
              i.urun.id === urun.id ? { ...i, adet: i.adet + 1 } : i
            ),
          }));
        } else {
          set((state) => ({
            items: [...state.items, { urun, adet: 1 }],
          }));
        }
      },

      removeItem: (id) => {
        const item = get().items.find((i) => i.urun.id === id);
        if (!item) return;

        if (item.adet === 1) {
          set((state) => ({
            items: state.items.filter((i) => i.urun.id !== id),
          }));
        } else {
          set((state) => ({
            items: state.items.map((i) =>
              i.urun.id === id ? { ...i, adet: i.adet - 1 } : i
            ),
          }));
        }
      },

      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.urun.id !== id),
        }));
      },

      clear: () => set({ items: [] }),

      toplamAdet: () =>
        get().items.reduce((toplam, i) => toplam + i.adet, 0),

      toplamFiyat: () =>
        get().items.reduce((toplam, i) => {
          const fiyat = i.urun.indirimYuzdesi
            ? i.urun.fiyat * (1 - i.urun.indirimYuzdesi / 100)
            : i.urun.fiyat;
          return toplam + fiyat * i.adet;
        }, 0),
    }),
    {
      name: '@shopapp/cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
