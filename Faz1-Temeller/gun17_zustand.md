# Gün 17 — Zustand

> **Faz:** 1 — Temeller | **Hafta:** 3 | **Gün:** 17 / 60
>
> **Bugünün Hedefi:** Birden fazla ekranın aynı veriye erişmesi gerektiğinde ne yapacağını öğrenmek.
> ShopApp'te sepet, kullanıcı ve favori state'ini Zustand ile yöneteceksin.

---

## 1. Problem: Veriyi Ekranlar Arasında Taşımak

Düşün: Kullanıcı ürün listesinde bir ürüne "Sepete Ekle" dedi. Üst kısımdaki tab bar'da sepet ikonunun yanında "3" yazması lazım. Ödeme ekranında da aynı ürünler görünmeli.

```
ProductListScreen  →  [Sepete Ekle] butonu
     ↓ ürün eklendi
TabBar'daki sepet ikonu sayısı güncellenmeli
CartScreen'de ürün listesi güncellenmeli
CheckoutScreen'de toplam tutar güncellenmeli
```

Bu üç farklı component'ten hiçbirinin birbirinden haberi yok. Veriyi nasıl paylaşacaksın?

**Yanlış yol — prop drilling:**
```jsx
// App'ten başlayıp her katmana geç
<App cart={cart} setCart={setCart}>
  <TabBar cartCount={cart.length} />   // TabBar'ın cartCount'a ihtiyacı var
  <ProductListScreen addItem={addItem} />  // ProductList'in addItem'a ihtiyacı var
  <CartScreen cart={cart} removeItem={removeItem} />  // CartScreen'in cart'a ihtiyacı var
```

Arada onlarca component varsa hepsi `cart` prop'unu taşımak zorunda — kendileri kullanmasalar bile. Buna **prop drilling** denir ve gerçek projelerde kabusa döner.

**Doğru yol — global store:**

Veriyi "ortada" bir yere koy. Her component oradan alır, oraya yazar. Aralarında props geçişi olmaz.

```
Global Store (Zustand)
  ├── cart: [{ product, quantity }]
  ├── addItem: (product) => ...
  └── removeItem: (id) => ...

ProductListScreen  →  store'dan addItem'ı al, çağır
TabBar             →  store'dan cart.length'i al, göster
CartScreen         →  store'dan cart'ı al, removeItem'ı al
```

---

## 2. Kurulum

```bash
npx expo install zustand
```

---

## 3. İlk Store — Kavramı Anlamak

Zustand'da bir store oluşturmak şu anlama gelir: "Bu değişkenleri ve bu fonksiyonları sakla, isteyen her component alsın."

```js
import { create } from "zustand";

const useCounterStore = create((set) => ({
  // değişkenler (state)
  count: 0,

  // fonksiyonlar (actions)
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

`set` nedir? State'i güncelleyen fonksiyon. React'taki `setState` gibi düşün — ama store genelinde.

```js
// set ile mevcut state'e göre güncelleme
set((state) => ({ count: state.count + 1 }))
// "Mevcut count neyse, 1 artır."

// set ile direkt değer ver
set({ count: 0 })
// "count'u 0 yap."
```

Bu store'u herhangi bir component'te kullan:

```jsx
function CounterScreen() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const reset = useCounterStore((state) => state.reset);

  return (
    <View>
      <Text>{count}</Text>
      <Button title="Artır" onPress={increment} />
      <Button title="Sıfırla" onPress={reset} />
    </View>
  );
}

function AnotherScreen() {
  // Aynı store — aynı veri
  const count = useCounterStore((state) => state.count);
  return <Text>Toplam: {count}</Text>;
}
```

`CounterScreen`'de `increment`'e baştın → `AnotherScreen` otomatik güncellendi. Props geçmedin, Context yazmadın.

---

## 4. Selector — Sadece İhtiyacın Olanı Al

`useCounterStore((state) => state.count)` yazdığında aslında bir **selector** yazıyorsun. Selector şunu söylüyor: "Store'dan sadece `count`'u ver, geri kalanla ilgilenme."

```jsx
// ❌ Tüm store'u al — store'daki herhangi bir şey değişince re-render
const store = useCounterStore();

// ✅ Sadece count'u al — count değişince re-render
const count = useCounterStore((state) => state.count);
```

Neden önemli? Sepet store'unda hem `items` hem `isLoading` hem `lastUpdated` olsun. Sadece ürün sayısını gösteren TabBar ikonu:

- Tüm store'u alırsa: `isLoading` değiştiğinde TabBar gereksiz yere yeniden render olur
- Sadece `items.length`'i alırsa: ürün eklenip çıkarılınca render olur, başka değişimlerde olmaz

---

## 5. `get` — Store İçinde Store'u Okumak

`set` state'i yazar. Peki store içindeki bir fonksiyonun, mevcut state'e bakması gerekirse?

```js
const useCartStore = create((set, get) => ({
  items: [],

  addItem: (product) => {
    // Ürün zaten sepette mi? Bunu bilmek için mevcut items'a bakmam lazım
    const currentItems = get().items;  // ← get() ile şu anki state'i oku
    const existing = currentItems.find((i) => i.product.id === product.id);

    if (existing) {
      // Varsa adeti artır
      set((state) => ({
        items: state.items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      }));
    } else {
      // Yoksa ekle
      set((state) => ({
        items: [...state.items, { product, quantity: 1 }],
      }));
    }
  },
}));
```

`get()` = "Store'u şu an olduğu haliyle getir." Fonksiyon içinde mevcut state'e ihtiyaç duyunca kullanırsın.

---

## 6. ShopApp — Sepet Store'u

Adım adım düşünelim: Sepet store'unda ne olmalı?

**Veri:**
- `items` → sepetteki ürünler, her birinin adeti var

**İşlemler:**
- `addItem` → ürün ekle, zaten varsa adeti artır
- `removeItem` → adeti 1 azalt, 0 olunca listeden çıkar
- `deleteItem` → ürünü tamamen sil
- `clear` → sepeti boşalt

```js
// store/cartStore.js
import { create } from "zustand";

export const useCartStore = create((set, get) => ({
  items: [], // [{ product: {...}, quantity: 2 }]

  addItem: (product) => {
    const existing = get().items.find((i) => i.product.id === product.id);

    if (existing) {
      // Sepette bu ürün var → adeti 1 artır
      set((state) => ({
        items: state.items.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        ),
      }));
    } else {
      // Sepette bu ürün yok → yeni ekle, adet 1
      set((state) => ({
        items: [...state.items, { product, quantity: 1 }],
      }));
    }
  },

  removeItem: (productId) => {
    const item = get().items.find((i) => i.product.id === productId);
    if (!item) return;

    if (item.quantity === 1) {
      // Adet 1'e düştü → listeden tamamen çıkar
      set((state) => ({
        items: state.items.filter((i) => i.product.id !== productId),
      }));
    } else {
      // Adeti 1 azalt
      set((state) => ({
        items: state.items.map((i) =>
          i.product.id === productId
            ? { ...i, quantity: i.quantity - 1 }
            : i
        ),
      }));
    }
  },

  deleteItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }));
  },

  clear: () => set({ items: [] }),
}));
```

Bunu kullanan 3 farklı component — birbirlerinden bağımsız:

```jsx
// Ürün kartı — Sepete Ekle butonu
function ProductCard({ product }) {
  const addItem = useCartStore((state) => state.addItem);
  return (
    <TouchableOpacity onPress={() => addItem(product)}>
      <Text>Sepete Ekle</Text>
    </TouchableOpacity>
  );
}

// Tab bar'daki sepet ikonu — sadece toplam adeti gösteriyor
function CartTabIcon() {
  const items = useCartStore((state) => state.items);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  return <Badge count={totalCount} />;
}

// Sepet ekranı — listeyi gösteriyor
function CartScreen() {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const clear = useCartStore((state) => state.clear);

  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View>
          <Text>{item.product.name} x{item.quantity}</Text>
          <TouchableOpacity onPress={() => removeItem(item.product.id)}>
            <Text>-</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}
```

`ProductCard`'da "Sepete Ekle"ye bastın → `CartTabIcon` otomatik güncellendi → `CartScreen` açınca ürün orada. Hiç props geçmedin.

---

## 7. Persist — Uygulama Kapansa da Kalsın

Şu an store sadece bellekte. Uygulama kapanırsa sepet sıfırlanır. Bunu düzeltmek için Zustand'ın `persist` middleware'i var. Gün 15'te öğrendiğin AsyncStorage ile birleştiriyoruz:

```js
// store/cartStore.js — persist eklenmiş hali
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useCartStore = create(
  persist(
    // İç kısım tamamen aynı — hiçbir şey değişmedi
    (set, get) => ({
      items: [],
      addItem: (product) => { /* ... yukarıdakiyle aynı */ },
      removeItem: (productId) => { /* ... */ },
      deleteItem: (productId) => { /* ... */ },
      clear: () => set({ items: [] }),
    }),
    // Dış kısım — persist ayarları
    {
      name: "@shopapp/cart",                            // AsyncStorage'da hangi key'le saklanacak
      storage: createJSONStorage(() => AsyncStorage),   // nereye saklanacak
    }
  )
);
```

`persist` sardıktan sonra şu oluyor:
- `addItem` çağrılınca → state güncellendi + AsyncStorage'a yazıldı (otomatik)
- Uygulama kapandı → AsyncStorage'da veri duruyor
- Uygulama açıldı → Zustand AsyncStorage'dan okudu, store'u doldurdu (otomatik)

Gün 15'te `loadCart`/`saveCart` fonksiyonları yazıp `useEffect`'te çağırmak zorundaydın. Artık o kodların hiçbirine gerek yok.

---

## 8. Favori Store'u

Aynı mantık, daha basit:

```js
// store/favoritesStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      productIds: [], // favori ürünlerin id'leri

      toggle: (productId) => {
        const ids = get().productIds;
        const isFav = ids.includes(productId);

        set({
          productIds: isFav
            ? ids.filter((id) => id !== productId) // favoriden çıkar
            : [...ids, productId],                  // favoriye ekle
        });
      },

      isFavorite: (productId) => get().productIds.includes(productId),
    }),
    {
      name: "@shopapp/favorites",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

```jsx
function FavoriteButton({ productId }) {
  const toggle = useFavoritesStore((state) => state.toggle);
  // isFavorite bir fonksiyon — her render'da çağırarak güncel değeri alıyoruz
  const isFav = useFavoritesStore((state) => state.isFavorite(productId));

  return (
    <TouchableOpacity onPress={() => toggle(productId)}>
      <Text>{isFav ? "❤️" : "🤍"}</Text>
    </TouchableOpacity>
  );
}
```

---

## 9. Kullanıcı Store'u

```js
// store/userStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useUserStore = create(
  persist(
    (set) => ({
      user: null,        // { id, name, email, token }
      isLoggedIn: false,

      login: (userData) => set({ user: userData, isLoggedIn: true }),
      logout: () => set({ user: null, isLoggedIn: false }),
      updateProfile: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),
    }),
    {
      name: "@shopapp/user",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

Logout'ta `useCartStore`'u da temizlemek gerekirse:

```jsx
function LogoutButton() {
  const logout = useUserStore((state) => state.logout);
  const clearCart = useCartStore((state) => state.clear);

  function handleLogout() {
    logout();    // kullanıcı bilgilerini sil
    clearCart(); // sepeti boşalt
  }

  return <Button title="Çıkış Yap" onPress={handleLogout} />;
}
```

---

## 10. Context API ile Karşılaştırma

Context'i biliyorsun. Zustand neden daha iyi?

```jsx
// Context ile — her değişimde tüm tree re-render
const CartContext = createContext();

function CartProvider({ children }) {
  const [cart, setCart] = useState([]);  // cart değişince tüm children re-render

  return (
    <CartContext.Provider value={{ cart, setCart }}>
      {children}
    </CartContext.Provider>
  );
}

// Zustand ile — sadece ilgili component re-render
const count = useCartStore((state) => state.items.length);
// Sadece length değişince bu component render olur
```

Context'te `cart` değişince `CartContext.Provider`'ın tüm çocukları yeniden render olur. Zustand'ta selector sayesinde sadece o değeri kullanan component render olur.

---

## 11. Ne Zaman Zustand, Ne Zaman useState?

```
useState → Sadece o component'in kullandığı veri
  - Modal açık/kapalı mı?
  - TextInput'un değeri
  - Loading spinner görünüyor mu?

Zustand → Birden fazla ekranın/component'in kullandığı veri
  - Sepet (her yerden erişiliyor)
  - Oturum açık kullanıcı bilgisi
  - Favoriler
  - Tema (dark/light)
```

---

## Özet

- **Zustand** = birden fazla ekranın paylaştığı veriyi "ortada" tutan kutu
- `create((set, get) => ({ state, actions }))` — store tanımı
- `set` → state'i güncelle, `get()` → mevcut state'i oku
- Selector `(state) => state.count` → sadece ilgili değeri al, gereksiz re-render engelle
- `persist` + `AsyncStorage` → uygulama kapansa da veri kalsın
- ShopApp'te: `cartStore`, `favoritesStore`, `userStore` — her domain ayrı dosyada

---

## Mini Görev

1. `store/cartStore.js` oluştur — `addItem`, `removeItem`, `deleteItem`, `clear` + `persist`
2. `store/favoritesStore.js` oluştur — `toggle`, `isFavorite` + `persist`
3. `ProductCard`'a kalp ikonu ekle — `useFavoritesStore`
4. Tab bar'daki sepet ikonuna badge ekle — `useCartStore`'dan toplam ürün sayısı
5. Çıkış yap butonuna basılınca hem `userStore`'u hem `cartStore`'u sıfırla

---

**Sonraki Gün:** [Gün 18 — TanStack Query](gun18_tanstack_query.md)
