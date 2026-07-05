# Gün 18 — TanStack Query

> **Faz:** 1 — Temeller | **Hafta:** 3 | **Gün:** 18 / 60
>
> **Bugünün Hedefi:** Sunucudan gelen veriyi yönetmek için TanStack Query'yi öğrenmek.
> Zustand'ın olmadığı yerde TanStack Query başlar — API'den gelen veri onun işi.

---

## 1. Problem: "Sunucu Verisi" vs "UI Verisi"

Zustand'ı öğrenince her şeyi oraya koymak cazip gelir. Ama bir düşün:

- **Sepet (items, quantity)** → kullanıcı manipüle ediyor → **UI state** → Zustand
- **Ürün listesi (API'den geliyor)** → sunucu manipüle ediyor → **Server state** → TanStack Query

Server state'in kendine özgü problemleri var:

1. **Stale (bayat) veri** — 5 dakika önce çektiğin fiyat artık geçerli değil
2. **Loading / error durumu** — her `useEffect`'te `isLoading`, `isError` state'i yazmak
3. **Cache** — aynı veriyi birden fazla component isteyince kaç kez API çağrısı yapılmalı?
4. **Refetch** — ekrana her dönüşte veriyi yenilemeli mi?

TanStack Query bunların hepsini otomatik halleder.

---

## 2. Kurulum

```bash
npx expo install @tanstack/react-query
```

`_layout.jsx`'e provider ekle:

```jsx
// app/_layout.jsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 dakika — bu süre geçmeden refetch yok
      retry: 2,                  // hata olursa 2 kez daha dene
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
```

---

## 3. `useQuery` — Veri Çekme

Web'de muhtemelen böyle yazıyordun:

```jsx
// ❌ Eski usul — her seferinde aynı boilerplate
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetch("/api/products")
    .then((res) => res.json())
    .then(setProducts)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);
```

TanStack Query ile:

```jsx
// ✅ TanStack Query versiyonu
import { useQuery } from "@tanstack/react-query";

function ProductListScreen() {
  const { data: products, isLoading, isError, error } = useQuery({
    queryKey: ["products"],       // cache anahtarı
    queryFn: () => fetchProducts(), // veriyi çeken async fonksiyon
  });

  if (isLoading) return <ActivityIndicator />;
  if (isError) return <Text>Hata: {error.message}</Text>;

  return <FlatList data={products} /* ... */ />;
}
```

Loading/error state yönetimi sıfır satır — TanStack Query halletti.

---

## 4. `queryKey` — Cache'in Anahtarı

`queryKey` TanStack Query'nin hafızası. Aynı key → aynı cache.

```jsx
// Sabit key — tüm ürünler
useQuery({ queryKey: ["products"], queryFn: fetchProducts });

// Dinamik key — belirli bir ürün
useQuery({ queryKey: ["products", productId], queryFn: () => fetchProduct(productId) });

// Filtreyle — kategori bazlı
useQuery({ queryKey: ["products", { category }], queryFn: () => fetchByCategory(category) });
```

### Cache nasıl çalışıyor?

Düşün: Kullanıcı ürün listesini açtı, veriler geldi. Ürün detayına girdi, geri döndü. TanStack Query şöyle davranır:

1. Listeye ilk gelince API çağrısı yaptı, sonucu `["products"]` key'iyle cache'e koydu
2. Ürün detayına gidince `["products", "42"]` key'iyle ayrı bir cache oluşturdu
3. Listeye geri dönünce: cache'de `["products"]` var → **anında göster** (eski veri), arka planda yenile
4. Yeni veri gelince ekranı güncelle

Kullanıcı siyah bir ekran görmeden veriyi görüyor — ama aynı zamanda güncel de kalıyor.

---

## 5. `staleTime` — Veri Ne Zaman "Bayatlar"?

```jsx
useQuery({
  queryKey: ["products"],
  queryFn: fetchProducts,
  staleTime: 1000 * 60 * 10, // 10 dakika — bu süre içinde refetch yapma
});
```

| `staleTime` | Davranış | Kullanım |
|---|---|---|
| `0` (varsayılan) | Her focus'ta hemen refetch | Stok, fiyat gibi anlık değişen |
| `1000 * 60 * 5` | 5 dakika geçmeden refetch yok | Ürün listesi, kategoriler |
| `Infinity` | Hiç refetch yapma | Ülke listesi, sabit config |

---

## 6. `useMutation` — Veri Değiştirme

`useQuery` sadece okur. Veri **yazma, güncelleme, silme** için `useMutation`:

```jsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

function AddToCartButton({ product }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (productId) => addToCartAPI(productId), // API çağrısı

    onSuccess: () => {
      // Başarılı olunca sepet cache'ini geçersiz kıl — yeniden çek
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },

    onError: (error) => {
      Alert.alert("Hata", error.message);
    },
  });

  return (
    <TouchableOpacity
      onPress={() => mutation.mutate(product.id)}
      disabled={mutation.isPending}
    >
      <Text>{mutation.isPending ? "Ekleniyor..." : "Sepete Ekle"}</Text>
    </TouchableOpacity>
  );
}
```

### `invalidateQueries` — Cache'i Geçersiz Kılmak

Sepete ürün ekledin. Sepet cache'indeki veri artık yanlış. `invalidateQueries` ile "bu cache bayat, bir sonraki okumada yeniden çek" diyorsun:

```jsx
// Sepet güncellendi → sepet cache'ini sıfırla
queryClient.invalidateQueries({ queryKey: ["cart"] });

// Ürün silindi → hem ürün listesini hem detayı sıfırla
queryClient.invalidateQueries({ queryKey: ["products"] });
```

---

## 7. ShopApp — Ürün Listesi ve Detay

### API Fonksiyonları (ayrı dosyada)

```js
// api/products.js
import axios from "axios";

const BASE = "https://api.shopapp.com";

export const fetchProducts = async ({ category, page = 1 } = {}) => {
  const { data } = await axios.get(`${BASE}/products`, {
    params: { category, page },
  });
  return data;
};

export const fetchProduct = async (id) => {
  const { data } = await axios.get(`${BASE}/products/${id}`);
  return data;
};
```

### Ürün Listesi Hook'u

```jsx
// hooks/useProducts.js
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "../api/products";

export function useProducts({ category } = {}) {
  return useQuery({
    queryKey: ["products", { category }],
    queryFn: () => fetchProducts({ category }),
    staleTime: 1000 * 60 * 5,
  });
}
```

```jsx
// screens/ProductListScreen.jsx
import { useProducts } from "../hooks/useProducts";

export default function ProductListScreen() {
  const { data: products, isLoading, isError, refetch } = useProducts();

  if (isLoading) return <ProductListSkeleton />;
  if (isError) return <ErrorScreen onRetry={refetch} />;

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductCard product={item} />}
      onRefresh={refetch}         // pull-to-refresh
      refreshing={isLoading}
    />
  );
}
```

### Ürün Detay Hook'u

```jsx
// hooks/useProduct.js
import { useQuery } from "@tanstack/react-query";
import { fetchProduct } from "../api/products";

export function useProduct(id) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,            // id yoksa çalışma
    staleTime: 1000 * 60 * 2, // 2 dakika — fiyat daha sık değişebilir
  });
}
```

```jsx
// screens/ProductDetailScreen.jsx
import { useProduct } from "../hooks/useProduct";
import { useLocalSearchParams } from "expo-router";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { data: product, isLoading } = useProduct(id);

  if (isLoading) return <ProductDetailSkeleton />;

  return (
    <ScrollView>
      <Image source={{ uri: product.imageUrl }} style={{ width: "100%", height: 280 }} />
      <Text>{product.name}</Text>
      <Text>{product.price} ₺</Text>
    </ScrollView>
  );
}
```

### Sepet İşlemleri

```jsx
// hooks/useCart.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCart, addToCart, removeFromCart } from "../api/cart";

export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: fetchCart,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId) => addToCart(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}

export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId) => removeFromCart(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });
}
```

---

## 8. Pull-to-Refresh

FlatList ile pull-to-refresh ücretsiz gelir:

```jsx
const { data, isLoading, refetch, isRefetching } = useProducts();

<FlatList
  data={data}
  onRefresh={refetch}
  refreshing={isRefetching}  // isLoading değil isRefetching — ilk yükle vs yenile farkı
  /* ... */
/>
```

---

## 9. Ekrana Focus'ta Yenile

Gün 16'da `useFocusEffect` öğrenmiştin. TanStack Query ile birlikte kullanmak:

```jsx
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

function CartScreen() {
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      // Ekrana her gelince sepet cache'ini geçersiz kıl
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    }, [])
  );

  const { data: cart } = useCart();
  // ...
}
```

---

## 10. Zustand + TanStack Query — Birlikte Kullanım

İkisi birbirinin alternatifi değil, tamamlayıcısı:

```
Zustand   → Kullanıcının yönettiği veri: sepet adet, tema, filtre seçimi
TanStack  → Sunucudan gelen veri: ürün listesi, ürün detayı, kullanıcı profili
```

```jsx
function ProductDetailScreen() {
  const { id } = useLocalSearchParams();

  // Sunucudan gelen ürün verisi → TanStack Query
  const { data: product } = useProduct(id);

  // Kullanıcının sepete ekle aksiyonu → Zustand
  const addItem = useCartStore((state) => state.addItem);

  // Ya da sepet API'da tutuluyorsa → TanStack mutation
  const addToCartMutation = useAddToCart();

  return (
    <TouchableOpacity onPress={() => addItem(product)}>
      <Text>Sepete Ekle</Text>
    </TouchableOpacity>
  );
}
```

---

## 11. Web vs React Native Karşılaştırması

| Özellik | Web | React Native |
|---|---|---|
| Kurulum | Aynı | Aynı |
| Provider | `<QueryClientProvider>` — aynı | Aynı |
| Focus'ta refetch | `windowFocus` default açık | `refetchOnWindowFocus: false` yap — RN'de tab focus farklı çalışır |
| Pull-to-refresh | Manuel | `onRefresh` + `refreshing` prop |
| DevTools | Tarayıcı eklentisi | `@tanstack/query-devtools` + Flipper |

> **Not:** React Native'de `refetchOnWindowFocus: false` yapmak genellikle daha iyi — Expo Router'ın focus event'leri web tab focus'uyla aynı değil. Bunun yerine `useFocusEffect` + `invalidateQueries` kullan.

```js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false, // RN'de kapat
    },
  },
});
```

---

## Özet

- TanStack Query = sunucudan gelen verinin yöneticisi (loading, error, cache, refetch otomatik)
- `useQuery({ queryKey, queryFn })` → veri çek
- `useMutation({ mutationFn, onSuccess })` → veri değiştir
- `queryKey` = cache'in anahtarı — aynı key, aynı cache
- `staleTime` = verinin kaç ms "taze" sayılacağı
- `invalidateQueries` = "bu cache eskidi, yeniden çek"
- Zustand ile çakışmaz: sunucu verisi TanStack, UI state'i Zustand

---

## Mini Görev

1. `app/_layout.jsx`'e `QueryClientProvider` ekle, `refetchOnWindowFocus: false` yap
2. `useProducts` hook'u yaz — kategori filtresi destekli
3. `ProductListScreen`'de `useProducts` kullan, pull-to-refresh ekle
4. `useProduct(id)` hook'u yaz, `ProductDetailScreen`'de kullan
5. `CartScreen`'de `useFocusEffect` + `invalidateQueries` kombinasyonu uygula

---

**Sonraki Gün:** [Gün 19 — Axios ve API Katmanı](gun19_axios_api_katmani.md)
