import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FavoritesStore = {
  ids: string[];
  toggle: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      ids: [],

      toggle: (id) => {
        const mevcut = get().ids.includes(id);
        set({
          ids: mevcut
            ? get().ids.filter((i) => i !== id)
            : [...get().ids, id],
        });
      },

      isFavorite: (id) => get().ids.includes(id),
    }),
    {
      name: '@shopapp/favorites',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
