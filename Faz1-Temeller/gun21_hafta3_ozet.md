# Gün 21 — Hafta 3 Özet & Faz 1 Sonu

> **Faz:** 1 — Temeller | **Hafta:** 3 | **Gün:** 21 / 60
>
> Faz 1'in son günü. 20 günde neleri öğrendiğini ve React Native'de React'ta karşılaşmadığın kavramları toparlıyoruz.

---

## React Native'de React'ta Olmayan Kilit Başlıklar

Web React'ı biliyorsun. Aşağıdaki kavramların hiçbiri web'de yoktu — React Native'e geçince bunları sıfırdan öğrenmek zorundasın.

---

### 1. `SafeAreaView` — Ekran Kenarlarından Korunma

Web'de böyle bir şey yok. Telefon ekranında notch (çentik), Dynamic Island, home bar, status bar var — içerik bunların altına girerse görünmez.

```jsx
import { SafeAreaView } from "react-native-safe-area-context";

// ❌ View ile — içerik notch'a girer
<View style={{ flex: 1 }}>
  <Text>Bu başlık notch'un altına girebilir</Text>
</View>

// ✅ SafeAreaView ile — güvenli alan içinde kalır
<SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
  <Text>Bu başlık her telefonda güvenli</Text>
</SafeAreaView>
```

**Web karşılığı yok.** Var olmadığı için bilinmez; React Native'de her ekranın kök componenti SafeAreaView olmalı.

---

### 2. `Dimensions` / `useWindowDimensions` — Ekran Boyutu

Web'de CSS media query vardı:
```css
@media (max-width: 768px) { .grid { columns: 2 } }
```

React Native'de CSS yok. Ekran genişliğini JavaScript'te okursun:

```jsx
import { useWindowDimensions } from "react-native";

function ProductGrid() {
  const { width } = useWindowDimensions(); // orientation değişince güncellenir
  const columns = width > 600 ? 3 : 2;

  return <FlatList numColumns={columns} /* ... */ />;
}
```

**Neden önemli:** `Dimensions.get` tek seferlik okur (orientation değişince güncellenmez). `useWindowDimensions` hook'u güncellenir — onu kullan.

---

### 3. `AsyncStorage` — Kalıcı Veri Depolama

Web'de `localStorage` senkrondur:
```js
localStorage.setItem("theme", "dark");
const theme = localStorage.getItem("theme"); // direkt değer gelir
```

React Native'de her şey **asenkron**:
```js
await AsyncStorage.setItem("theme", "dark");
const theme = await AsyncStorage.getItem("theme"); // Promise
```

Şunu asla unutma:
- Obje kaydetmek için → `JSON.stringify`
- Okurken → `JSON.parse`
- Key yoksa → `null` döner (JSON.parse(null) hata verir — kontrol et)
- `useEffect` içinde async → callback'i async yapma, içeride async fonksiyon tanımla

---

### 4. `Platform` API — iOS ve Android Ayrımı

Web'de tarayıcılar arası fark yönetimini CSS'te ya da user agent ile yapıyordun. React Native'de iki farklı işletim sistemi var:

```jsx
import { Platform, StyleSheet } from "react-native";

// Koşullu değer
const statusBarHeight = Platform.OS === "ios" ? 44 : 24;

// Platform.select — daha temiz
const shadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    elevation: 4, // Android'de shadow yerine elevation
  },
});
```

iOS'ta `shadow*` prop'ları çalışır, Android'de çalışmaz — `elevation` kullanılır. Bu en sık karşılaşılan platform farkı.

---

### 5. `FlatList` — Virtualized Liste

Web'de `array.map()` ile liste render ederdin. 10.000 ürün de olsa hepsini DOM'a basardın (ve sayfa kasardı).

React Native'de `FlatList` **sadece ekranda görünenleri render eder** (virtualization). 10.000 ürün listesi FlatList ile sorunsuz çalışır.

```jsx
// ❌ Web alışkanlığı — RN'de performans felaketi
{products.map((p) => <ProductCard key={p.id} product={p} />)}

// ✅ RN'de doğru yol
<FlatList
  data={products}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ProductCard product={item} />}
  initialNumToRender={6}
  windowSize={5}
  removeClippedSubviews={true}
/>
```

`key` prop değil `keyExtractor` — bu da RN'ye özel.

---

### 6. `useFocusEffect` — Ekran Her Açılınca

Web'de sayfa geçişi = unmount + mount. Geri gelince `useEffect([])` tekrar çalışır.

React Native'de ekranlar **unmount olmaz**, arka planda uyur. Geri gelince `useEffect([])` çalışmaz.

```jsx
// ❌ Geri dönünce çalışmaz
useEffect(() => { loadCart(); }, []);

// ✅ Her ekrana gelişte çalışır
useFocusEffect(useCallback(() => { loadCart(); }, []));
```

React Native'e geçince ilk ay boyunca en çok bu seni şaşırtacak. **Her veri tazeleme gereken yerde `useFocusEffect` kullan.**

---

### 7. `AppState` — Uygulama Arka Plana İnince

Web'de `document.visibilitychange` vardı. React Native'de:

```jsx
import { AppState } from "react-native";

AppState.addEventListener("change", (nextState) => {
  if (nextState === "active") {
    // Kullanıcı uygulamaya döndü — veriyi yenile
  }
});

// Değerler:
// "active"     → ön planda, kullanıcı burada
// "background" → home'a bastı veya başka uygulamaya geçti
// "inactive"   → iOS geçiş anı (telefon geldi, bildirim merkezi açıldı)
```

---

### 8. `KeyboardAvoidingView` — Klavye Formu Örtünce

Web'de klavye açılınca tarayıcı sayfayı otomatik kaydırır. React Native'de klavye form'un üstüne kapanır — kullanıcı ne yazdığını göremez.

```jsx
import { KeyboardAvoidingView, Platform } from "react-native";

<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  style={{ flex: 1 }}
>
  <TextInput placeholder="Mesajınız" />
  <Button title="Gönder" />
</KeyboardAvoidingView>
```

iOS ve Android davranışı farklı — `Platform.OS` kontrolü şart.

---

### 9. `Modal` ve `Alert` — Overlay Sistemi

Web'de `window.alert()` senkron, `document.body`'e portal açabilirdin.

React Native'de:
- `Alert.alert()` → OS'un native dialog'u, asenkron, callback ile
- `<Modal>` → React Native'in kendi overlay sistemi, DOM yok yani portal yok

```jsx
// Her Modal'da bu üç prop zorunlu
<Modal
  visible={visible}
  transparent={true}      // bunu yazmazsan rgba arka plan çalışmaz
  onRequestClose={onClose} // bunu yazmazsan Android geri tuşu kapatmaz
>
```

---

### 10. `expo-image` — Resim Optimizasyonu

Web'de `<img loading="lazy">` vardı, Next.js otomatik optimize ediyordu.

React Native'de core `<Image>`:
- `width` + `height` zorunlu (yoksa görünmez)
- Lazy loading yok
- Cache yok
- Placeholder yok

`expo-image` bunların hepsini çözer:

```jsx
import { Image } from "expo-image";

<Image
  source={{ uri: product.imageUrl }}
  placeholder={{ blurhash: product.blurhash }} // yüklenene kadar bulanık önizleme
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

---

### 11. `TextInput` Yönetimi

Web'de `<input>` focus/blur olduğunda sayfa kayma yapmaz. React Native'de klavye popup olur, `ref` zinciri ile focus yönetmezsen form kullanılamaz hale gelir.

```jsx
const emailRef = useRef(null);
const passwordRef = useRef(null);

<TextInput
  ref={emailRef}
  returnKeyType="next"
  onSubmitEditing={() => passwordRef.current?.focus()} // bir sonraki alana geç
  blurOnSubmit={false}
/>
<TextInput
  ref={passwordRef}
  returnKeyType="done"
  onSubmitEditing={handleSubmit}
/>
```

---

### 12. Shadow — iOS vs Android Farkı

```jsx
// Web'de tek bir box-shadow
// iOS'ta:
shadowColor: "#000"
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.1
shadowRadius: 4

// Android'de (yukarıdakiler hiç çalışmaz):
elevation: 4
```

Her kart, her modal, her buton — iki platform için ayrı shadow. `Platform.select` ile yaz.

---

## Hafta 3 Hızlı Referans (Gün 15-20)

| Gün | Konu | Tek Satır Özet |
|-----|------|----------------|
| 15 | AsyncStorage | `await storage.set(key, value)` — async, JSON, namespace kullan |
| 16 | useEffect & Yaşam Döngüsü | Geri dönünce veri tazelemek için `useFocusEffect`, uygulama arka plana inince `AppState` |
| 17 | Zustand | Global state — `create((set, get) => ...)`, selector ile al, `persist` ile kaydet |
| 18 | TanStack Query | Sunucu verisi — `useQuery` loading/error/cache otomatik, `useMutation` ile yaz |
| 19 | Axios & API Katmanı | `axios.create()` + interceptor — token otomatik, 401 otomatik logout |
| 20 | Auth Flow | Kök layout `isLoggedIn`'e bakır, tüm yönlendirme oradan |

---

## 20 Günde ShopApp'in Mevcut Durumu

```
✅ Navigation (Stack + Tab) — Expo Router
✅ Ürün listesi — FlatList + expo-image + blurhash
✅ Ürün detay — Modal bottom sheet
✅ Arama formu — TextInput + KeyboardAvoidingView
✅ Platform farkları — SafeAreaView, shadow, Platform.select
✅ Global state — Zustand (sepet, favoriler, kullanıcı)
✅ Kalıcı depolama — AsyncStorage (persist middleware)
✅ API katmanı — axios.create + interceptor
✅ Sunucu verisi — TanStack Query (useQuery + useMutation)
✅ Auth akışı — login/logout, korumalı ekranlar, token yönetimi
```

---

## Faz 2'ye Hazırlık

Gün 22'den itibaren şunları öğreneceksin:

- **TypeScript** — Faz 1'i JS ile geçtin, Faz 2'de tip güvenliği ekleyeceğiz
- **Animasyon** — Animated API, Reanimated 3, Gesture Handler
- **Native özellikler** — Kamera, konum, push notification
- **Form yönetimi** — React Hook Form + Zod validasyon
- **Dark mode** — tema sistemi

---

**Sonraki Gün:** [Gün 22 — TypeScript Derinlik](../Faz2-Native-ve-Animasyon/gun22_typescript_derinlik.md)
