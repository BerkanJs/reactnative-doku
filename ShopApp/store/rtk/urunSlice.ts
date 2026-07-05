// Gün 37 — Redux Toolkit: örnek slice
//
// NOT: ShopApp'in gerçek state yönetimi Zustand ile yapılıyor (bkz. store/sepetStore.ts,
// store/authStore.ts). Bu klasör (store/rtk/) enterprise projelerde standart olan RTK'yı
// öğrenmek ve Zustand ile karşılaştırmak için ayrı, bağımsız bir örnek modüldür —
// ShopApp'in aktif akışına bağlı değildir.

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { urunleriGetir as urunleriGetirApi } from '@/services/urunServisi';
import type { Urun, SayfalamaParams } from '@/types';

interface UrunState {
  liste: Urun[];
  yukleniyor: boolean;
  hata: string | null;
  seciliUrunId: string | null;
}

const baslangicDurumu: UrunState = {
  liste: [],
  yukleniyor: false,
  hata: null,
  seciliUrunId: null,
};

// createAsyncThunk: pending/fulfilled/rejected action'larını otomatik üretir
export const urunleriGetir = createAsyncThunk(
  'urun/getir',
  async (params: SayfalamaParams, { rejectWithValue }) => {
    try {
      const yanit = await urunleriGetirApi(params);
      return yanit.veri;
    } catch {
      return rejectWithValue('Ürünler yüklenemedi');
    }
  }
);

const urunSlice = createSlice({
  name: 'urun',
  initialState: baslangicDurumu,
  reducers: {
    urunSec: (state, action: PayloadAction<string>) => {
      // RTK içinde Immer var — direkt mutate edebiliyoruz, state kopyası Immer'ın işi
      state.seciliUrunId = action.payload;
    },
    urunSil: (state, action: PayloadAction<string>) => {
      state.liste = state.liste.filter((u) => u.id !== action.payload);
    },
    stoklarGuncelle: (
      state,
      action: PayloadAction<{ urunId: string; yeniStok: number }>
    ) => {
      const urun = state.liste.find((u) => u.id === action.payload.urunId);
      if (urun) urun.stok = action.payload.yeniStok;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(urunleriGetir.pending, (state) => {
        state.yukleniyor = true;
        state.hata = null;
      })
      .addCase(urunleriGetir.fulfilled, (state, action) => {
        state.yukleniyor = false;
        state.liste = action.payload;
      })
      .addCase(urunleriGetir.rejected, (state, action) => {
        state.yukleniyor = false;
        state.hata = (action.payload as string) ?? 'Bilinmeyen hata';
      });
  },
});

export const { urunSec, urunSil, stoklarGuncelle } = urunSlice.actions;
export default urunSlice.reducer;
