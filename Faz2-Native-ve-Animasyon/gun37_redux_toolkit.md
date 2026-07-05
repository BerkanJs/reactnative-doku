# Gün 37 — Redux Toolkit: Şirket Projelerinde Standart

## Neden RTK Öğrenmeli?

ShopApp'te Zustand kullandın — minimal, hızlı, az boilerplate. Peki neden Redux Toolkit öğrenmek gerekiyor?

**Gerçek dünya:** İş ilanlarının büyük çoğunluğu "Redux" veya "RTK" bilgisi istiyor. Var olan enterprise projeleri genellikle Redux üzerine kurulu. Bir startup'tan büyük şirkete geçtiğinde RTK bilen biri olman bekleniyor.

**Temel fark:**
- **Zustand** → küçük proje, hızlı geliştirme, az ekip, minimal API
- **RTK** → büyük ekip, yapılandırılmış kod, DevTools entegrasyonu, açık kaynak takımı standartları

---

## RTK vs Zustand: Karşılaştırma

Aynı işlevi gören iki yaklaşım:

```tsx
// Zustand — 10 satır
const useUrunStore = create<UrunStore>((set) => ({
  urunler: [],
  yukleniyor: false,
  urunleriGetir: async () => {
    set({ yukleniyor: true });
    const data = await api.get('/urunler');
    set({ urunler: data, yukleniyor: false });
  },
}));

// RTK — daha verbose ama daha yapılandırılmış
const urunSlice = createSlice({
  name: 'urun',
  initialState: { liste: [], yukleniyor: false, hata: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(urunleriGetir.pending, (state) => { state.yukleniyor = true; })
      .addCase(urunleriGetir.fulfilled, (state, action) => {
        state.yukleniyor = false;
        state.liste = action.payload;
      })
      .addCase(urunleriGetir.rejected, (state, action) => {
        state.yukleniyor = false;
        state.hata = action.error.message ?? null;
      });
  },
});
```

RTK daha fazla kod — ama her durumu (pending/fulfilled/rejected) açıkça tanımlıyor. 10 kişilik ekipte herkes aynı pattern'i kullanıyor.

---

## Kurulum

```bash
npx expo install @reduxjs/toolkit react-redux
```

---

## `createSlice`: Reducer + Action Tek Yerde

Eski Redux'ta ayrı `action creators`, ayrı `reducer` yazılırdı. RTK bunu birleştiriyor:

```tsx
// store/urunSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Urun = {
  id: string;
  ad: string;
  fiyat: number;
  stok: number;
};

type UrunState = {
  liste: Urun[];
  yukleniyor: boolean;
  hata: string | null;
  seciliUrunId: string | null;
};

const urunSlice = createSlice({
  name: 'urun',
  initialState: {
    liste: [],
    yukleniyor: false,
    hata: null,
    seciliUrunId: null,
  } as UrunState,

  reducers: {
    // Senkron action'lar
    urunSec: (state, action: PayloadAction<string>) => {
      // RTK içinde Immer var — direkt mutate edebilirsin
      // bunu yazmasaydık: state = { ...state, seciliUrunId: action.payload }
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
      if (urun) urun.stok = action.payload.yeniStok; // Immer: direkt mutate
    },
  },
});

export const { urunSec, urunSil, stoklarGuncelle } = urunSlice.actions;
export default urunSlice.reducer;
```

**Neden direkt `state.liste = ...` yazabiliyoruz?**  
RTK, Immer kütüphanesini içinde barındırır. Immer, `state` nesnesini bir proxy'e sarar — direkt mutation'ları izler ve immutable kopyasını üretir. Bu sayede `state.seciliUrunId = action.payload` yazabilirsin, state gerçekte mutate edilmez.

---

## `createAsyncThunk`: Async İşlemler

```tsx
// store/urunSlice.ts (devam)
import { createAsyncThunk } from '@reduxjs/toolkit';

// createAsyncThunk: pending, fulfilled, rejected action'larını otomatik üretir
// bunu yazmasaydık: 3 ayrı action tipi manuel yazardık
export const urunleriGetir = createAsyncThunk(
  'urun/getir',         // action type prefix
  async (sayfa: number, { rejectWithValue }) => {
    try {
      const yanit = await api.get<Urun[]>(`/urunler?sayfa=${sayfa}`);
      return yanit.data;
    } catch (hata) {
      // rejectWithValue: özel hata mesajı gönder
      return rejectWithValue('Ürünler yüklenemedi');
    }
  }
);

export const urunEkle = createAsyncThunk(
  'urun/ekle',
  async (yeniUrun: Omit<Urun, 'id'>, { rejectWithValue }) => {
    try {
      const yanit = await api.post<Urun>('/urunler', yeniUrun);
      return yanit.data;
    } catch (hata) {
      return rejectWithValue('Ürün eklenemedi');
    }
  }
);

// extraReducers içinde async thunk durumlarını handle et
const urunSliceGuncellenmis = createSlice({
  name: 'urun',
  initialState: { liste: [], yukleniyor: false, hata: null } as UrunState,
  reducers: { /* senkron action'lar */ },
  extraReducers: (builder) => {
    // urunleriGetir
    builder
      .addCase(urunleriGetir.pending, (state) => {
        state.yukleniyor = true;
        state.hata = null; // önceki hatayı temizle
      })
      .addCase(urunleriGetir.fulfilled, (state, action) => {
        state.yukleniyor = false;
        state.liste = action.payload; // type-safe: Urun[]
      })
      .addCase(urunleriGetir.rejected, (state, action) => {
        state.yukleniyor = false;
        state.hata = action.payload as string; // rejectWithValue'dan gelen
      });

    // urunEkle
    builder
      .addCase(urunEkle.fulfilled, (state, action) => {
        state.liste.push(action.payload); // Immer: direkt push
      });
  },
});
```

---

## Store Kurulumu

```tsx
// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import urunReducer from './urunSlice';
import sepetReducer from './sepetSlice';
import authReducer from './authSlice';

export const store = configureStore({
  reducer: {
    urun: urunReducer,
    sepet: sepetReducer,
    auth: authReducer,
  },
  // middleware: (getDefaultMiddleware) => getDefaultMiddleware() — default zaten ekli
});

// TypeScript için tip çıkarımı
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hook'lar — useSelector ve useDispatch'ı her yerde doğrudan yazmak yerine
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T) =>
  useSelector<RootState, T>(selector);
```

```tsx
// app/_layout.tsx
import { Provider } from 'react-redux';
import { store } from '@/store';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack />
    </Provider>
  );
}
```

---

## Bileşende Kullanım

```tsx
// app/(tabs)/index.tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { urunleriGetir } from '@/store/urunSlice';

export default function Anasayfa() {
  const dispatch = useAppDispatch();

  // Selector: sadece ihtiyacın olan state parçasını al
  // Tüm store'u almak her state değişiminde re-render tetikler
  const urunler = useAppSelector((state) => state.urun.liste);
  const yukleniyor = useAppSelector((state) => state.urun.yukleniyor);
  const hata = useAppSelector((state) => state.urun.hata);

  useEffect(() => {
    dispatch(urunleriGetir(1)); // thunk dispatch et
  }, [dispatch]);

  if (yukleniyor) return <SkeletonListesi />;
  if (hata) return <HataEkrani mesaj={hata} />;

  return (
    <FlatList
      data={urunler}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <UrunKart urun={item} />}
    />
  );
}
```

---

## RTK Query: TanStack Query'nin RTK Versiyonu

RTK Query, TanStack Query gibi data fetching ve caching çözümü — ama Redux store'a entegre:

```tsx
// services/urunApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import * as SecureStore from 'expo-secure-store';

export const urunApi = createApi({
  reducerPath: 'urunApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://api.shopapp.com',
    prepareHeaders: async (headers) => {
      const token = await SecureStore.getItemAsync('access_token');
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Urun', 'Sepet', 'Siparis'],

  endpoints: (builder) => ({
    // Query: veri çek
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
      providesTags: (result, error, id) => [{ type: 'Urun', id }],
    }),

    // Mutation: veri yaz
    sepeteEkle: builder.mutation<Sepet, { urunId: string; adet: number }>({
      query: ({ urunId, adet }) => ({
        url: `/sepet`,
        method: 'POST',
        body: { urunId, adet },
      }),
      invalidatesTags: ['Sepet'],
      // 'Sepet' tag'ini sağlayan tüm query'leri geçersiz kıl — otomatik refetch
    }),

    siparisVer: builder.mutation<Siparis, SiparisBilgisi>({
      query: (bilgi) => ({
        url: '/siparisler',
        method: 'POST',
        body: bilgi,
      }),
      invalidatesTags: ['Sepet', 'Siparis'],
    }),
  }),
});

// Otomatik üretilen hook'lar
export const {
  useUrunleriGetirQuery,
  useUrunDetayQuery,
  useSepeteEkleMutation,
  useSiparisVerMutation,
} = urunApi;
```

```tsx
// store/index.ts — RTK Query reducer'ını ekle
export const store = configureStore({
  reducer: {
    urun: urunReducer,
    sepet: sepetReducer,
    [urunApi.reducerPath]: urunApi.reducer, // RTK Query cache
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(urunApi.middleware), // RTK Query middleware
});
```

```tsx
// Bileşende kullanım — TanStack Query gibi ama Redux içinde
export function UrunListesi({ kategori }: { kategori?: string }) {
  const { data, isLoading, error, refetch } = useUrunleriGetirQuery({
    sayfa: 1,
    kategori,
  });

  const [sepeteEkle, { isLoading: ekleniyor }] = useSepeteEkleMutation();

  async function urunEkle(urunId: string) {
    try {
      await sepeteEkle({ urunId, adet: 1 }).unwrap();
      // unwrap(): promise döndürür, rejected olursa throw eder
      // bunu yazmasaydık: başarı/hata durumu manuel kontrol edilirdi
    } catch (hata) {
      Alert.alert('Hata', 'Ürün sepete eklenemedi');
    }
  }

  if (isLoading) return <SkeletonListesi />;
  if (error) return <HataEkrani />;

  return (
    <FlatList
      data={data}
      renderItem={({ item }) => (
        <UrunKart
          urun={item}
          onSepeteEkle={() => urunEkle(item.id)}
          ekleniyor={ekleniyor}
        />
      )}
    />
  );
}
```

**`invalidatesTags` nasıl çalışır?**  
`sepeteEkle` mutation çalışıp başarılı olunca, `'Sepet'` tag'ini `providesTags` ile sağlayan tüm query'ler otomatik yenilenir. Sepet sayfasını manuel `refetch()` çağırmana gerek kalmaz.

---

## Sepet Slice: Tam Örnek

```tsx
// store/sepetSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type SepetOge = { urunId: string; adet: number; fiyat: number; ad: string };
type SepetState = { ogeler: SepetOge[]; toplamFiyat: number };

const sepetSlice = createSlice({
  name: 'sepet',
  initialState: { ogeler: [], toplamFiyat: 0 } as SepetState,
  reducers: {
    sepeteEkle: (state, action: PayloadAction<SepetOge>) => {
      const mevcutOge = state.ogeler.find((o) => o.urunId === action.payload.urunId);
      if (mevcutOge) {
        mevcutOge.adet += action.payload.adet;
      } else {
        state.ogeler.push(action.payload);
      }
      state.toplamFiyat = state.ogeler.reduce(
        (toplam, oge) => toplam + oge.fiyat * oge.adet,
        0
      );
    },
    sepettenCikar: (state, action: PayloadAction<string>) => {
      state.ogeler = state.ogeler.filter((o) => o.urunId !== action.payload);
      state.toplamFiyat = state.ogeler.reduce(
        (toplam, oge) => toplam + oge.fiyat * oge.adet,
        0
      );
    },
    sepetTemizle: (state) => {
      state.ogeler = [];
      state.toplamFiyat = 0;
    },
  },
});

export const { sepeteEkle, sepettenCikar, sepetTemizle } = sepetSlice.actions;
export default sepetSlice.reducer;

// Selector — hesaplanmış değerler için
export const sepetAdetSelector = (state: RootState) =>
  state.sepet.ogeler.reduce((toplam, oge) => toplam + oge.adet, 0);
```

---

## Ne Zaman Zustand, Ne Zaman RTK?

| Kriter | Zustand | Redux Toolkit |
|--------|---------|--------------|
| Proje büyüklüğü | Küçük-orta | Büyük, enterprise |
| Ekip büyüklüğü | 1-3 kişi | 4+ kişi |
| Boilerplate | Az | Fazla ama yapılandırılmış |
| DevTools | Sınırlı | Redux DevTools (mükemmel) |
| Async işlem | Middleware ile | createAsyncThunk |
| Data fetching | TanStack Query ile | RTK Query |
| İş ilanı gereksinimi | Bazen | Çoğunlukla |
| Mevcut proje | — | Genellikle RTK |

---

## Redux DevTools

React Native için Redux DevTools'u Flipper veya remote debugger ile kullanabilirsin:

```bash
npx expo install react-native-flipper redux-flipper
```

```tsx
// store/index.ts
import { remoteDevTools } from 'redux-devtools-expo-dev-plugin';

export const store = configureStore({
  reducer: { ... },
  enhancers: (getDefaultEnhancers) =>
    __DEV__ ? getDefaultEnhancers().concat(remoteDevTools()) : getDefaultEnhancers(),
});
```

DevTools ile her action'ı izleyebilir, state'i zamanda geri alabilirsin.

---

## Web ile Karşılaştırma

| Zustand | Redux Toolkit | Fark |
|---------|--------------|------|
| `create((set) => ({ ... }))` | `createSlice({ reducers })` | RTK daha verbose |
| `useStore(state => state.x)` | `useSelector(state => state.slice.x)` | Benzer |
| `useStore.getState().fn()` | `dispatch(action())` | RTK action dispatch |
| TanStack Query | RTK Query | İkisi de cache yönetir |
| Minimal API | Yapılandırılmış API | Trade-off |

---

## Kontrol Soruları

1. `createAsyncThunk` olmadan async işlemi RTK ile nasıl yazardın? Ne kadar daha karmaşık olurdu?

2. Immer neden RTK'ya dahil? `state.liste.push(item)` yazmak neden güvenli?

3. RTK Query'de `providesTags` ve `invalidatesTags` nasıl çalışır? TanStack Query'nin `queryKey` ile farkı?

4. `useSelector` her render'da çalışır — performansı nasıl optimize edersin? `reselect` ne işe yarar?

5. Sepet verisini RTK store'da mı yoksa RTK Query cache'inde mi tutmalısın? İkisi arasındaki fark ne?

---

## Özet

| Konu | RTK API |
|------|---------|
| Slice (reducer + action) | `createSlice` |
| Async işlem | `createAsyncThunk` |
| Store kurulumu | `configureStore` |
| Store'u sağla | `<Provider store={store}>` |
| State okuma | `useAppSelector` |
| Action dispatch | `useAppDispatch` + `dispatch()` |
| Data fetching | `createApi` + builder endpoints |
| Cache invalidation | `invalidatesTags` / `providesTags` |
| Immer | Dahili — direkt mutate edebilirsin |

**Yarın (Gün 38):** Accessibility (A11y) — `accessibilityLabel`, `accessibilityRole`, VoiceOver/TalkBack, ekran okuyucu testleri, ShopApp'i herkes için kullanılabilir yap.
