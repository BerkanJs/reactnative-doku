# Gün 19 — Axios ve API Katmanı

> **Faz:** 1 — Temeller | **Hafta:** 3 | **Gün:** 19 / 60
>
> **Bugünün Hedefi:** API isteklerini düzenli ve sürdürülebilir hale getirmek.
> Her component'e `fetch` yazmak yerine merkezi bir API katmanı kuracağız.

---

## 1. Problem: Her Yere `fetch` Yazmak

Diyelim ki 10 farklı ekranda API isteği yapıyorsun. Her birinde şöyle bir şey var:

```jsx
// ProductListScreen.jsx
useEffect(() => {
  fetch("https://api.shopapp.com/products", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Hata!");
      return res.json();
    })
    .then(setProducts);
}, []);

// CartScreen.jsx
useEffect(() => {
  fetch("https://api.shopapp.com/cart", {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (!res.ok) throw new Error("Hata!");
      return res.json();
    })
    .then(setCart);
}, []);
```

Şimdi bir şey değişti: API'nin base URL'i değişti, ya da tüm isteklere yeni bir header eklemen gerekiyor. 10 dosyayı tek tek açıp düzelteceksin.

Ya token expire olunca 401 geldiğinde kullanıcıyı login sayfasına yönlendirmek istersen? Bu mantığı 10 yere mi yazacaksın?

**Çözüm:** API isteği mantığını tek bir yerden yönet. Buna **API katmanı** denir.

---

## 2. Axios Nedir, Neden `fetch` Değil?

`fetch` tarayıcının / React Native'in built-in API'si. Çalışır ama düşük seviyeli:
- `res.ok` kontrolü sen yaparsın
- JSON parse'ı sen yaparsın (`res.json()`)
- Timeout yok — istek sonsuza kadar bekleyebilir
- İsteklere global header eklemek karmaşık

**Axios** bunların hepsini halleder:
- 4xx/5xx yanıtları otomatik hata fırlatır
- JSON parse otomatik — `data` direkt gelir
- Timeout kolayca eklenir
- `interceptor` ile her isteğe/yanıta merkezi müdahale

```bash
npx expo install axios
```

---

## 3. Axios'un Temel Farkı

```js
// fetch ile
const res = await fetch("https://api.shopapp.com/products");
if (!res.ok) throw new Error("Sunucu hatası");
const data = await res.json();

// axios ile
const { data } = await axios.get("https://api.shopapp.com/products");
// Hata varsa otomatik fırlatıyor, JSON parse otomatik
```

İki satır → bir satır. Ama asıl güç `axios.create()`'te.

---

## 4. `axios.create()` — Kendi API İstemcini Yarat

`axios.create()` ile "bu projeye özel" bir Axios instance'ı yaratırsın. Base URL, timeout, default header gibi ayarları bir kez yaz, sonra her istekte tekrar yazma.

```js
// api/client.js
import axios from "axios";

const apiClient = axios.create({
  baseURL: "https://api.shopapp.com", // her istekte bu URL'e eklenecek
  timeout: 10_000,                    // 10 saniyeden uzun sürerse iptal et
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;
```

Artık URL'i tam yazmak zorunda değilsin:

```js
// ❌ Eski — URL her seferinde tam
await axios.get("https://api.shopapp.com/products");

// ✅ Yeni — sadece path
await apiClient.get("/products");
```

Base URL değişirse tek bir yeri güncelliyorsun.

---

## 5. Interceptor — Her İsteğe/Yanıta Müdahale

Interceptor, "her istek gitmeden önce / her yanıt gelmeden önce şunu yap" diyebildiğin bir kanca.

### Request Interceptor — Her İsteğe Token Ekle

```js
// api/client.js
import axios from "axios";
import { useUserStore } from "../store/userStore";

const apiClient = axios.create({
  baseURL: "https://api.shopapp.com",
  timeout: 10_000,
});

// İstek interceptor'u
apiClient.interceptors.request.use((config) => {
  // Her istek gitmeden önce burası çalışır
  const token = useUserStore.getState().user?.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config; // değiştirilmiş config'i geri ver, istek yollanır
});

export default apiClient;
```

Artık her API fonksiyonunda `Authorization` header'ı yazmak zorunda değilsin. Kullanıcı giriş yaptıysa token otomatik ekleniyor.

### Response Interceptor — 401 Gelince Oturumu Kapat

```js
// api/client.js (devamı)
import { router } from "expo-router";

// Yanıt interceptor'u
apiClient.interceptors.response.use(
  (response) => response, // başarılı yanıt — olduğu gibi geçir

  (error) => {
    // Hatalı yanıt — burası çalışır
    if (error.response?.status === 401) {
      // Token geçersiz veya süresi dolmuş
      // Kullanıcıyı logout yap, login sayfasına gönder
      useUserStore.getState().logout();
      router.replace("/login");
    }

    return Promise.reject(error); // hatayı ilgili yere ilet
  }
);
```

10 farklı yerde 401 kontrolü yazmak yerine bir yerde yazdın — hepsi buradan geçiyor.

---

## 6. API Fonksiyonları — Her Domain Ayrı Dosya

`apiClient` hazır. Şimdi her domain (ürünler, sepet, kullanıcı) için ayrı fonksiyon dosyaları:

```
api/
  client.js          ← axios instance + interceptorlar
  products.js        ← ürünlerle ilgili tüm istekler
  cart.js            ← sepetle ilgili tüm istekler
  auth.js            ← giriş/çıkış istekleri
  orders.js          ← siparişlerle ilgili istekler
```

### `api/products.js`

```js
import apiClient from "./client";

// Tüm ürünleri getir — kategori ve sayfa filtresi opsiyonel
export const fetchProducts = async ({ category, page = 1 } = {}) => {
  const { data } = await apiClient.get("/products", {
    params: { category, page },
  });
  return data;
};

// Tek ürün getir
export const fetchProduct = async (id) => {
  const { data } = await apiClient.get(`/products/${id}`);
  return data;
};

// Ürün ara
export const searchProducts = async (query) => {
  const { data } = await apiClient.get("/products/search", {
    params: { q: query },
  });
  return data;
};
```

### `api/cart.js`

```js
import apiClient from "./client";

// Sepeti getir
export const fetchCart = async () => {
  const { data } = await apiClient.get("/cart");
  return data;
};

// Sepete ürün ekle
export const addToCart = async (productId, quantity = 1) => {
  const { data } = await apiClient.post("/cart/items", { productId, quantity });
  return data;
};

// Sepetten ürün çıkar
export const removeFromCart = async (itemId) => {
  const { data } = await apiClient.delete(`/cart/items/${itemId}`);
  return data;
};

// Sepeti temizle
export const clearCart = async () => {
  const { data } = await apiClient.delete("/cart");
  return data;
};
```

### `api/auth.js`

```js
import apiClient from "./client";

export const login = async (email, password) => {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data; // { user: {...}, token: "..." }
};

export const register = async (name, email, password) => {
  const { data } = await apiClient.post("/auth/register", { name, email, password });
  return data;
};

export const refreshToken = async (refreshToken) => {
  const { data } = await apiClient.post("/auth/refresh", { refreshToken });
  return data;
};
```

---

## 7. Hata Yönetimi — Ne Zaman Neyi Yakala?

```js
// Axios hata nesnesi şu bilgileri içerir:
error.response       // Sunucudan yanıt geldi ama hata kodu (4xx, 5xx)
error.response.status    // → 404, 401, 500 gibi
error.response.data      // → sunucunun gönderdiği hata mesajı
error.request        // İstek gönderildi ama yanıt gelmedi (timeout, bağlantı yok)
error.message        // Açıklanamayan hata
```

```js
// api/products.js — hata yönetimi ile
export const fetchProduct = async (id) => {
  try {
    const { data } = await apiClient.get(`/products/${id}`);
    return data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error("Ürün bulunamadı.");
    }
    if (!error.response) {
      throw new Error("İnternet bağlantınızı kontrol edin.");
    }
    throw new Error("Bir hata oluştu, lütfen tekrar deneyin.");
  }
};
```

> **İpucu:** API fonksiyonlarında hata fırlatmak iyi bir pratik — kim çağırırsa kendi `catch` bloğunda ele alır. Ya da TanStack Query'nin `isError` ile otomatik yakalamasına bırak.

---

## 8. ShopApp'te Tam Akış

Şu ana kadar öğrendiklerini birleştirerek bir ürün detayı ekranının tam akışı:

```
Kullanıcı ürüne tıkladı
  → ProductDetailScreen açıldı
  → useProduct(id) hook'u çalıştı (Gün 18 — TanStack Query)
  → TanStack Query, fetchProduct(id)'yi çağırdı (Gün 19 — bu dosya)
  → fetchProduct, apiClient.get("/products/42") yaptı
  → interceptor token'ı header'a ekledi (bu dosya)
  → Yanıt geldi, TanStack cache'e koydu
  → Kullanıcı "Sepete Ekle" dedi
  → useCartStore.addItem çağrıldı (Gün 17 — Zustand)
  → persist middleware AsyncStorage'a yazdı (Gün 15)
```

Her katman kendi işini yapıyor, birbirinin içine girmiyor.

---

## 9. Environment Variable — URL'i Sabit Yazmamak

Base URL'i `client.js`'e sabit yazmak yerine environment variable kullan. Böylece geliştirme ve production için farklı URL olabilir.

```bash
# .env
EXPO_PUBLIC_API_URL=https://api.shopapp.com
```

```js
// api/client.js
const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10_000,
});
```

> **Not:** Expo'da environment variable isimleri `EXPO_PUBLIC_` ile başlamalı — aksi halde client'ta görünmez.

---

## 10. `fetch` vs `axios` vs `apiClient`

```
fetch          → built-in, düşük seviyeli, elle kontrol
axios          → library, kolaylaştırılmış ama hâlâ global
apiClient      → senin oluşturduğun instance, projeye özel ayarlar
API fonksiyonu → apiClient'ı saran, domain mantığı taşıyan fonksiyon
```

Bir component içinde şunlardan hiçbirini görmemelisin:

```jsx
// ❌ Component içinde doğrudan fetch/axios — kötü pratik
function ProductScreen() {
  useEffect(() => {
    axios.get("https://api.shopapp.com/products").then(setProducts);
  }, []);
}

// ✅ Component sadece hook çağırır
function ProductScreen() {
  const { data: products } = useProducts(); // hook içinde TanStack, o da api/products.js'i çağırır
}
```

Component ne URL bilir, ne token bilir, ne de hata kodları bilir. Bunların hepsi API katmanında.

---

## Özet

- Her componente `fetch`/`axios` yazmak → URL değişince 10 dosya güncelleme, token her yere kopyala-yapıştır
- **`axios.create()`** → projeye özel instance, base URL tek yerde
- **Interceptor** → her isteğe token ekle (request), 401'de logout yap (response) — tek satır değişim hepsini etkiler
- **`api/` klasörü** → her domain için ayrı dosya (`products.js`, `cart.js`, `auth.js`)
- Component → hook → TanStack Query → API fonksiyonu → apiClient → sunucu

---

## Mini Görev

1. `api/client.js` oluştur — `axios.create` + request interceptor (token ekle) + response interceptor (401 → logout)
2. `api/products.js` oluştur — `fetchProducts`, `fetchProduct`, `searchProducts`
3. `api/cart.js` oluştur — `fetchCart`, `addToCart`, `removeFromCart`, `clearCart`
4. `.env` dosyasına `EXPO_PUBLIC_API_URL` ekle
5. Gün 18'deki `useProducts` ve `useProduct` hook'larını bu API fonksiyonlarını kullanacak şekilde güncelle

---

**Sonraki Gün:** [Gün 20 — Auth Flow](gun20_auth_flow.md)
