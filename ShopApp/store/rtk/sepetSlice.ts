// Gün 37 — Redux Toolkit: sepet slice (bkz. store/rtk/urunSlice.ts başındaki not)

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Urun } from '@/types';
import type { RootState } from './index';

interface SepetOgesi {
  urun: Urun;
  adet: number;
}

interface SepetState {
  ogeler: SepetOgesi[];
  toplamFiyat: number;
}

const baslangicDurumu: SepetState = { ogeler: [], toplamFiyat: 0 };

function toplamHesapla(ogeler: SepetOgesi[]): number {
  return ogeler.reduce((toplam, oge) => {
    const fiyat = oge.urun.indirimYuzdesi
      ? oge.urun.fiyat * (1 - oge.urun.indirimYuzdesi / 100)
      : oge.urun.fiyat;
    return toplam + fiyat * oge.adet;
  }, 0);
}

const sepetSlice = createSlice({
  name: 'sepet',
  initialState: baslangicDurumu,
  reducers: {
    sepeteEkle: (state, action: PayloadAction<{ urun: Urun; adet?: number }>) => {
      const { urun, adet = 1 } = action.payload;
      const mevcutOge = state.ogeler.find((o) => o.urun.id === urun.id);
      if (mevcutOge) {
        mevcutOge.adet += adet;
      } else {
        state.ogeler.push({ urun, adet });
      }
      state.toplamFiyat = toplamHesapla(state.ogeler);
    },
    sepettenCikar: (state, action: PayloadAction<string>) => {
      state.ogeler = state.ogeler.filter((o) => o.urun.id !== action.payload);
      state.toplamFiyat = toplamHesapla(state.ogeler);
    },
    sepetTemizle: (state) => {
      state.ogeler = [];
      state.toplamFiyat = 0;
    },
  },
});

export const { sepeteEkle, sepettenCikar, sepetTemizle } = sepetSlice.actions;
export default sepetSlice.reducer;

// Selector — hesaplanmış değer için (reselect olmadan basit hali)
export const sepetAdetSelector = (state: RootState) =>
  state.sepet.ogeler.reduce((toplam, oge) => toplam + oge.adet, 0);
