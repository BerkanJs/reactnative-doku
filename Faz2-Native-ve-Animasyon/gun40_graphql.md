# Gün 40 — GraphQL: Apollo Client ile Veri Çekimi

## REST'in Sorunu, GraphQL'in Çözümü

ShopApp'in ürün listesi ekranında ne lazım? Sadece: `id`, `ad`, `fiyat`, `gorselUrl`. Ama REST endpoint'in döndürdüğü:

```json
{
  "id": "1",
  "ad": "Nike Air Max",
  "fiyat": 1299,
  "gorselUrl": "...",
  "aciklama": "...",      // lazım değil
  "marka": {...},           // lazım değil
  "kategori": {...},        // lazım değil
  "yorumlar": [...],        // lazım değil — 100 yorum
  "stokDetayi": {...},      // lazım değil
  "satici": {...}           // lazım değil
}
```

**Overfetch:** İhtiyaçtan fazla veri geliyor — bant genişliği ve parse süresi boşa gidiyor.

**Underfetch:** Ürün detay sayfasında yorumlar lazım ama listede gelmiyor. `GET /urunler/1` → `GET /urunler/1/yorumlar` → `GET /yorumlar/5/kullanici` — 3 ayrı istek.

GraphQL çözümü: **Tek endpoint, istediğin field'ları iste:**

```graphql
query UrunListesi {
  urunler {
    id
    ad
    fiyat
    gorselUrl
  }
}
```

Sadece bu 4 field gelir. Fazlası yok, eksiği yok.

---

## GraphQL Temel Kavramlar

| Kavram | Açıklama | REST karşılığı |
|--------|----------|---------------|
| Query | Veri oku | GET |
| Mutation | Veri yaz/güncelle/sil | POST/PUT/DELETE |
| Subscription | Gerçek zamanlı veri | WebSocket |
| Schema | Tip tanımları | OpenAPI/Swagger |
| Resolver | Her field'ın veri kaynağı | Controller |
| Fragment | Tekrar eden field grubu | — |

---

## Kurulum

```bash
npx expo install @apollo/client graphql
```

---

## Apollo Client Kurulumu

```tsx
// services/apollo.ts
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  ApolloLink,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import * as SecureStore from 'expo-secure-store';

// HTTP bağlantısı
const httpLink = createHttpLink({
  uri: 'https://api.shopapp.com/graphql',
});

// Auth token her istekte header'a ekle — Axios interceptor'ın GraphQL karşılığı
const authLink = setContext(async (_, { headers }) => {
  const token = await SecureStore.getItemAsync('access_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// InMemoryCache: Apollo'nun cache sistemi
// id field'ına göre normalize eder — aynı ürün iki sorgudan gelirse tek kopya
export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache({
    typePolicies: {
      Urun: {
        keyFields: ['id'], // normalize için anahtar — varsayılan zaten id
      },
      Sepet: {
        keyFields: ['kullaniciId'], // kullanıcıya göre cache
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first', // önce cache, yoksa network
    },
  },
});
```

```tsx
// app/_layout.tsx
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/services/apollo';

export default function RootLayout() {
  return (
    <ApolloProvider client={apolloClient}>
      <Stack />
    </ApolloProvider>
  );
}
```

---

## Fragment: Tekrar Eden Field'ları Parçala

```tsx
// queries/fragments.ts
import { gql } from '@apollo/client';

// Ürün kartında gereken minimal bilgi
export const URUN_OZET_FRAGMENT = gql`
  fragment UrunOzet on Urun {
    id
    ad
    fiyat
    gorselUrl
    indirimYuzdesi
    stok
  }
`;

// Ürün detayında gereken tam bilgi
export const URUN_DETAY_FRAGMENT = gql`
  fragment UrunDetay on Urun {
    ...UrunOzet
    aciklama
    marka {
      id
      ad
      logo
    }
    kategori {
      id
      ad
      slug
    }
    ozellikler {
      ad
      deger
    }
  }
  ${URUN_OZET_FRAGMENT}
`;
```

---

## `useQuery`: Veri Çekme

```tsx
// queries/urunler.ts
import { gql } from '@apollo/client';
import { URUN_OZET_FRAGMENT } from './fragments';

export const URUNLERI_GETIR = gql`
  ${URUN_OZET_FRAGMENT}
  query UrunleriGetir($sayfa: Int!, $kategori: String, $sirala: SiralamaSecenegi) {
    urunler(sayfa: $sayfa, kategori: $kategori, sirala: $sirala) {
      toplam
      sayfaSayisi
      urunler {
        ...UrunOzet
      }
    }
  }
`;

export const URUN_DETAYI_GETIR = gql`
  ${URUN_DETAY_FRAGMENT}
  query UrunDetayiGetir($id: ID!) {
    urun(id: $id) {
      ...UrunDetay
      yorumlar(limit: 5) {
        id
        puan
        metin
        kullanici {
          ad
          avatar
        }
      }
    }
  }
`;
```

```tsx
// app/(tabs)/index.tsx
import { useQuery } from '@apollo/client';
import { URUNLERI_GETIR } from '@/queries/urunler';

export default function Anasayfa() {
  const { data, loading, error, fetchMore, refetch } = useQuery(URUNLERI_GETIR, {
    variables: { sayfa: 1 },
    fetchPolicy: 'cache-first',
    // cache-first → önce cache bak (hızlı), yoksa network'e git
    // network-only → her zaman network'ten al (sepet gibi kritik veriler)
    // cache-and-network → cache'i göster, arka planda da yenile
    notifyOnNetworkStatusChange: true, // fetchMore'da loading değişsin
  });

  if (loading && !data) return <SkeletonListesi />;
  if (error) return <HataEkrani mesaj={error.message} onRetry={refetch} />;

  const { urunler, toplam, sayfaSayisi } = data.urunler;
  const dahaFazlaVar = data.urunler.sayfa < sayfaSayisi;

  function dahaFazlaYukle() {
    if (!dahaFazlaVar) return;
    fetchMore({
      variables: { sayfa: data.urunler.sayfa + 1 },
      updateQuery: (eskiData, { fetchMoreResult }) => {
        if (!fetchMoreResult) return eskiData;
        return {
          urunler: {
            ...fetchMoreResult.urunler,
            urunler: [
              ...eskiData.urunler.urunler,
              ...fetchMoreResult.urunler.urunler,
            ],
          },
        };
      },
    });
  }

  return (
    <FlatList
      data={urunler}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <UrunKart urun={item} />}
      onEndReached={dahaFazlaYukle}
      onEndReachedThreshold={0.3}
    />
  );
}
```

---

## `useMutation`: Veri Yazma

```tsx
// queries/sepet.ts
import { gql } from '@apollo/client';

export const SEPETE_EKLE = gql`
  mutation SepeteEkle($urunId: ID!, $adet: Int!) {
    sepeteEkle(urunId: $urunId, adet: $adet) {
      id
      toplam
      ogeler {
        urunId
        adet
        urun {
          id
          ad
          fiyat
          gorselUrl
        }
      }
    }
  }
`;

export const SEPETTEN_CIKAR = gql`
  mutation SepettenCikar($urunId: ID!) {
    sepettenCikar(urunId: $urunId) {
      id
      toplam
    }
  }
`;
```

```tsx
// components/SepeteEkleButonu.tsx
import { useMutation } from '@apollo/client';
import { SEPETE_EKLE } from '@/queries/sepet';

export function SepeteEkleButonu({ urunId }: { urunId: string }) {
  const [sepeteEkle, { loading, error }] = useMutation(SEPETE_EKLE, {
    // Mutation sonrası ilgili query'leri yenile
    refetchQueries: ['SepetGetir'],
    // Optimistic UI — sunucu yanıtı beklenmeden anlık güncelleme
    optimisticResponse: {
      sepeteEkle: {
        __typename: 'Sepet',
        id: 'temp',
        toplam: 0, // gerçek değer mutation'dan gelecek
      },
    },
    onCompleted: (data) => {
      // Başarılı — Toast göster
    },
    onError: (hata) => {
      Alert.alert('Hata', hata.message);
    },
  });

  async function ekle() {
    try {
      await sepeteEkle({
        variables: { urunId, adet: 1 },
      });
    } catch {
      // onError zaten halleder
    }
  }

  return (
    <Pressable
      onPress={ekle}
      disabled={loading}
      accessibilityLabel="Sepete Ekle"
      accessibilityRole="button"
      accessibilityState={{ busy: loading }}
    >
      {loading ? <ActivityIndicator /> : <Text>Sepete Ekle</Text>}
    </Pressable>
  );
}
```

---

## `useSubscription`: Gerçek Zamanlı

```tsx
// Sipariş durumu gerçek zamanlı güncelleme
import { gql, useSubscription } from '@apollo/client';

const SIPARIS_DURUMU_ABONELIK = gql`
  subscription SiparisDurumuDegisti($siparisId: ID!) {
    siparisDurumuDegisti(siparisId: $siparisId) {
      id
      durum
      guncellemeTarihi
      konum {
        lat
        lng
      }
    }
  }
`;

export function SiparisTakip({ siparisId }: { siparisId: string }) {
  const { data, loading } = useSubscription(SIPARIS_DURUMU_ABONELIK, {
    variables: { siparisId },
  });

  const durum = data?.siparisDurumuDegisti;

  return (
    <View>
      <Text>{durum?.durum ?? 'Yükleniyor...'}</Text>
      {/* Gerçek zamanlı güncelleniyor */}
    </View>
  );
}
```

Subscription için Apollo Client'a WebSocket link eklemek gerekir:

```tsx
import { split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const wsLink = new GraphQLWsLink(
  createClient({ url: 'wss://api.shopapp.com/graphql' })
);

// Query/Mutation → HTTP, Subscription → WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);
```

---

## `graphql-codegen`: Otomatik TypeScript Tipi

GraphQL şemasından TypeScript tiplerini otomatik üret — elle yazmak yok:

```bash
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo
```

```ts
// codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'https://api.shopapp.com/graphql',
  documents: ['queries/**/*.ts', 'app/**/*.tsx'],
  generates: {
    'src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
    },
  },
};

export default config;
```

```bash
npx graphql-codegen --config codegen.ts
```

```tsx
// Üretilen hook'ları kullan — tip güvenli, otomatik
import { useUrunleriGetirQuery, useSepeteEkleMutation } from '@/generated/graphql';

export function UrunListesi() {
  const { data, loading } = useUrunleriGetirQuery({
    variables: { sayfa: 1 },
    // data.urunler.urunler → tam autocomplete, tip güvencesi
  });

  const [sepeteEkle] = useSepeteEkleMutation();
  // değişkenler otomatik tiplenmiş: { urunId: string, adet: number }
}
```

**Elle yazmadan tip güvencesi:** Şema değişince `codegen` tekrar çalıştırınca tipler güncellenir. Elle yazdıysan şema değiştiğinde uyumsuzluk runtime'da fark edilir.

---

## `fetchPolicy`: Ne Zaman Hangisi?

```tsx
// Ürün listesi — biraz eskimiş veri sorun değil, hız önemli
useQuery(URUNLERI_GETIR, { fetchPolicy: 'cache-first' });

// Sepet — her zaman güncel olmalı
useQuery(SEPET_GETIR, { fetchPolicy: 'network-only' });

// Profil — cache göster, arka planda yenile
useQuery(PROFIL_GETIR, { fetchPolicy: 'cache-and-network' });

// Arama sonuçları — cache kullanma, her aramada taze veri
useQuery(ARA, {
  variables: { kelime },
  fetchPolicy: 'no-cache',
});
```

---

## Ne Zaman GraphQL, Ne Zaman REST?

| Durum | Tercih | Neden |
|-------|--------|-------|
| Backend GraphQL sunuyor | Apollo / URQL | Doğal seçim |
| Backend REST, değiştiremiyorsun | TanStack Query + Axios | REST için daha basit |
| Mobil + web aynı API | GraphQL | Her platform istediğini alır |
| Gerçek zamanlı (canlı stok, sipariş) | GraphQL Subscription | WebSocket built-in |
| Basit CRUD, küçük proje | REST | GraphQL setup maliyeti yüksek |
| Overfetch/underfetch sorunu varsa | GraphQL | Asıl çözüm bu |

---

## Web ile Karşılaştırma

| Web | React Native | Fark |
|-----|-------------|------|
| Apollo Client | Apollo Client | Aynı kütüphane! |
| `useQuery`, `useMutation` | `useQuery`, `useMutation` | Birebir aynı |
| `ApolloProvider` | `ApolloProvider` | Birebir aynı |
| InMemoryCache | InMemoryCache | Birebir aynı |
| SSR: `getServerSideProps` | Yok | RN'de SSR yok |
| `graphql-codegen` | `graphql-codegen` | Birebir aynı |
| Offline: Service Worker | Apollo persist link | Farklı mekanizma |

---

## Kontrol Soruları

1. REST'te `/urunler` tüm field'ları dönüyor ama listede sadece 4 alan lazım. GraphQL bunu nasıl çözer? Performans farkı ne?

2. Apollo `InMemoryCache` normalize etmek ne demek? Aynı ürün hem `UrunleriGetir` hem `UrunDetayi` sorgusundan gelirse ne olur?

3. `fetchPolicy: 'cache-first'` vs `'network-only'` farkı ne? Sepet ekranı için hangisi?

4. `refetchQueries: ['SepetGetir']` ile RTK Query'deki `invalidatesTags` farkı ne? İkisi de ne zaman tetiklenir?

5. `graphql-codegen` kurulmadan TypeScript ile GraphQL kullanılabilir mi? Trade-off nedir?

---

## Özet

| Konu | API |
|------|-----|
| Client kurulumu | `new ApolloClient({ link, cache })` |
| Provider | `<ApolloProvider client={client}>` |
| Veri okuma | `useQuery(QUERY, { variables })` |
| Veri yazma | `useMutation(MUTATION)` |
| Gerçek zamanlı | `useSubscription(SUBSCRIPTION)` |
| Sayfalama | `fetchMore({ variables, updateQuery })` |
| Fragment | Tekrar eden field'ları parçala |
| Cache politikası | `fetchPolicy`: cache-first, network-only... |
| Invalidation | `refetchQueries` mutation'dan sonra |
| Tip üretimi | `graphql-codegen` + şema |
| Normalize cache | `InMemoryCache` — id'ye göre dedup |

**Faz 2 tamamlandı!** Yarın (Gün 42) Faz 3 başlıyor: JS Thread vs UI Thread, render performansı, jank analizi, `useMemo`/`useCallback` ne zaman gerçekten yardımcı olur.
