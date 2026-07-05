// Gün 37 — RTK Query: TanStack Query'nin Redux'a entegre versiyonu
// ShopApp'te veri çekimi zaten TanStack Query ile yapılıyor (bkz. hooks/useUrunler.ts,
// services/urunServisi.ts) — bu dosya sadece RTK Query'nin nasıl yapılandırıldığını
// göstermek için bağımsız bir örnektir, store/rtk/index.ts'e eklenmiş değildir.

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';
import type { Urun } from '@/types';

export const urunApi = createApi({
  reducerPath: 'urunApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.shopapp.example.com',
    prepareHeaders: async (headers) => {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Urun', 'Sepet'],

  endpoints: (builder) => ({
    urunleriGetir: builder.query<Urun[], { sayfa: number; kategori?: string }>({
      query: ({ sayfa, kategori }) =>
        `/urunler?sayfa=${sayfa}${kategori ? `&kategori=${kategori}` : ''}`,
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Urun' as const, id })), 'Urun']
          : ['Urun'],
    }),

    urunDetay: builder.query<Urun, string>({
      query: (id) => `/urunler/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Urun', id }],
    }),

    sepeteEkle: builder.mutation<{ toplam: number }, { urunId: string; adet: number }>({
      query: ({ urunId, adet }) => ({
        url: '/sepet',
        method: 'POST',
        body: { urunId, adet },
      }),
      // Bu mutation başarılı olunca 'Sepet' tag'ini sağlayan tüm query'ler otomatik yenilenir
      invalidatesTags: ['Sepet'],
    }),
  }),
});

export const { useUrunleriGetirQuery, useUrunDetayQuery, useSepeteEkleMutation } = urunApi;
