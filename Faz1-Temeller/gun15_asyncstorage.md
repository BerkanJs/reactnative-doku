# Gün 15 — AsyncStorage

> **Faz:** 1 — Temeller | **Hafta:** 3 | **Gün:** 15 / 60
>
> **Bugünün Hedefi:** Uygulama kapansa bile veriyi cihazda saklamayı öğrenmek.
> ShopApp'te son görüntülenen ürünler, sepet verisi ve kullanıcı tercihlerini kalıcı hale getireceğiz.

---

## 1. Web'de Ne Yapıyorduk?

```js
// localStorage — senkron, string key-value
localStorage.setItem("theme", "dark");
const theme = localStorage.getItem("theme");
localStorage.removeItem("theme");

// sessionStorage — sekme kapanınca siliniyor
sessionStorage.setItem("cart", JSON.stringify(cartItems));
```

React Native'de `localStorage` yok. Bunun yerine **`AsyncStorage`** — aynı key-value mantığı ama:
- **Asenkron** (her işlem `Promise` döner)
- **String** saklıyor (obje → `JSON.stringify`, okurken → `JSON.parse`)
- Uygulama silinene kadar kalıcı

---

## 2. Kurulum

```bash
npx expo install @react-native-async-storage/async-storage
```

> Core React Native'den çıkarıldı, artık ayrı paket. Expo managed workflow'da otomatik link.

---

## 3. Temel API

```js
import AsyncStorage from "@react-native-async-storage/async-storage";

// Yaz
await AsyncStorage.setItem("theme", "dark");

// Oku
const theme = await AsyncStorage.getItem("theme");
// → "dark" | null (key yoksa null döner)

// Sil
await AsyncStorage.removeItem("theme");

// Tüm key'leri listele
const keys = await AsyncStorage.getAllKeys();

// Toplu sil
await AsyncStorage.multiRemove(["theme", "cart"]);

// Toplu oku
const values = await AsyncStorage.multiGet(["theme", "cart"]);
// → [["theme", "dark"], ["cart", "[...]"]]
```

---

## 4. Obje Saklama — JSON Zorunluluğu

AsyncStorage sadece string kabul eder:

```js
// ❌ Yanlış — obje doğrudan saklanamaz
await AsyncStorage.setItem("user", { name: "Berkan" });

// ✅ Doğru
await AsyncStorage.setItem("user", JSON.stringify({ name: "Berkan" }));

const raw = await AsyncStorage.getItem("user");
const user = raw ? JSON.parse(raw) : null;
```

---

## 5. Yardımcı Katman — `storage.js`

Her yerde `JSON.stringify`/`JSON.parse` yazmak yerine bir wrapper:

```js
// utils/storage.js
import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  async get(key) {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  },

  async set(key, value) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key) {
    await AsyncStorage.removeItem(key);
  },

  async clear() {
    await AsyncStorage.clear();
  },
};
```

Kullanım:

```js
import { storage } from "../utils/storage";

await storage.set("cart", cartItems);
const cart = await storage.get("cart"); // doğrudan array gelir
```

---

## 6. React ile Entegrasyon — `useAsyncStorage` Hook

```js
// hooks/useAsyncStorage.js
import { useState, useEffect, useCallback } from "react";
import { storage } from "../utils/storage";

export function useAsyncStorage(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(true);

  // Başlangıçta oku
  useEffect(() => {
    storage.get(key).then((stored) => {
      if (stored !== null) setValue(stored);
      setLoading(false);
    });
  }, [key]);

  // Yaz + state güncelle
  const save = useCallback(async (newValue) => {
    setValue(newValue);
    await storage.set(key, newValue);
  }, [key]);

  const remove = useCallback(async () => {
    setValue(initialValue);
    await storage.remove(key);
  }, [key, initialValue]);

  return { value, save, remove, loading };
}
```

Kullanım:

```jsx
function ThemeToggle() {
  const { value: theme, save: setTheme, loading } = useAsyncStorage("theme", "light");

  if (loading) return <ActivityIndicator />;

  return (
    <Switch
      value={theme === "dark"}
      onValueChange={(isDark) => setTheme(isDark ? "dark" : "light")}
    />
  );
}
```

---

## 7. ShopApp Senaryoları

### Senaryo 1: Sepeti Kalıcı Hale Getirme

Zustand store'una AsyncStorage persist eklemek (Gün 17'de Zustand işlenecek, şimdilik vanilla):

```js
// store/cartStore.js — basit versiyon
import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "@shopapp/cart";

export async function loadCart() {
  const raw = await AsyncStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveCart(items) {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
}

export async function clearCart() {
  await AsyncStorage.removeItem(CART_KEY);
}
```

```jsx
// App başlangıcında sepeti yükle
function CartScreen() {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    loadCart().then(setCartItems);
  }, []);

  async function addItem(product) {
    const updated = [...cartItems, product];
    setCartItems(updated);
    await saveCart(updated); // state güncellenince kaydet
  }

  async function removeItem(productId) {
    const updated = cartItems.filter((item) => item.id !== productId);
    setCartItems(updated);
    await saveCart(updated);
  }

  // ...
}
```

### Senaryo 2: Son Görüntülenen Ürünler

```js
// utils/recentProducts.js
import { storage } from "./storage";

const KEY = "@shopapp/recent_products";
const MAX = 10;

export async function addRecentProduct(product) {
  const current = (await storage.get(KEY)) ?? [];
  // Aynı ürün varsa başa taşı, yoksa ekle
  const filtered = current.filter((p) => p.id !== product.id);
  const updated = [product, ...filtered].slice(0, MAX);
  await storage.set(KEY, updated);
}

export async function getRecentProducts() {
  return (await storage.get(KEY)) ?? [];
}
```

### Senaryo 3: Kullanıcı Tercihleri

```js
// utils/preferences.js
import { storage } from "./storage";

const KEY = "@shopapp/preferences";

const defaults = {
  theme: "light",
  currency: "TRY",
  notificationsEnabled: true,
  sortOrder: "popular",
};

export async function getPreferences() {
  const saved = await storage.get(KEY);
  return { ...defaults, ...saved }; // eksik key'leri default ile doldur
}

export async function updatePreference(key, value) {
  const current = await getPreferences();
  await storage.set(KEY, { ...current, [key]: value });
}
```

---

## 8. Key Stratejisi — Namespace Kullanımı

```js
// ❌ Kötü — çakışma riski
"cart"
"user"
"theme"

// ✅ İyi — uygulama adı prefix
"@shopapp/cart"
"@shopapp/user"
"@shopapp/theme"

// ✅ Kullanıcıya özel data için uid ekle
`@shopapp/wishlist_${userId}`
`@shopapp/orders_${userId}`
```

---

## 9. Sınırlamalar ve Alternatifler

| Özellik | AsyncStorage | MMKV | SQLite |
|---|---|---|---|
| Hız | Orta | **Çok hızlı** (senkron) | Orta |
| Tip desteği | Sadece string | String, number, bool | Tam SQL |
| Şifreli depolama | ❌ | ✅ (opsiyonel) | ✅ (opsiyonel) |
| Karmaşık sorgular | ❌ | ❌ | ✅ |
| Ne zaman kullan | Basit key-value | Performans kritikse | İlişkisel veri |

ShopApp için **AsyncStorage yeterli** — tercihler, son görüntülenenler, cart cache. Büyük katalog veya offline sorgular gerekirse SQLite'a geçilir.

---

## 10. Yaygın Hatalar

### `null` kontrolü unutmak

```js
// ❌ — key yoksa null, JSON.parse(null) hata fırlatır
const raw = await AsyncStorage.getItem("cart");
const cart = JSON.parse(raw); // TypeError: null

// ✅
const cart = raw ? JSON.parse(raw) : [];
```

### `await` unutmak

```js
// ❌ — Promise döner, değer değil
const cart = AsyncStorage.getItem("cart");
console.log(cart); // Promise { pending }

// ✅
const cart = await AsyncStorage.getItem("cart");
```

### `useEffect` içinde async

```js
// ❌ — useEffect callback'i async olamaz
useEffect(async () => {
  const data = await storage.get("cart");
}, []);

// ✅ — İçeride async fonksiyon tanımla
useEffect(() => {
  async function load() {
    const data = await storage.get("cart");
    setCart(data ?? []);
  }
  load();
}, []);
```

---

## 11. Web vs React Native Karşılaştırması

| Özellik | Web (`localStorage`) | React Native (`AsyncStorage`) |
|---|---|---|
| Senkron mu? | ✅ Evet | ❌ Hayır (async) |
| Tip | String | String (JSON ile obje) |
| Kapasite | ~5-10 MB | ~6 MB (iOS), sınırsız benzeri (Android) |
| Şifreleme | ❌ | ❌ (MMKV ile ✅) |
| Temizleme | Kullanıcı tarayıcıdan silebilir | Uygulama silinince gider |

---

## Özet

- AsyncStorage = React Native'in `localStorage`'ı — ama **async**
- Her zaman `JSON.stringify`/`JSON.parse` kullan — ya da bir `storage` wrapper yaz
- Key'lere `@uygulama/` namespace ekle
- `useEffect` içinde async için iç fonksiyon pattern'ı kullan
- `null` kontrolü zorunlu — key yoksa `null` gelir

---

## Mini Görev

ShopApp'te şunları uygula:

1. `utils/storage.js` wrapper'ı oluştur
2. Sepet verisi AsyncStorage'a kaydedilsin, uygulama yeniden açılınca yüklensin
3. Son görüntülenen 5 ürünü `@shopapp/recent_products` key'iyle sakla
4. Anasayfaya "Son Görüntülenenler" horizontal `FlatList`'i ekle

---

**Sonraki Gün:** [Gün 16 — useEffect ve Yaşam Döngüsü](gun16_useeffect_yasam_dongusu.md)
