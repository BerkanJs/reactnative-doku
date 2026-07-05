# Gün 14 — Hafta 2 Özet

> **Faz:** 1 — Temeller | **Hafta:** 2 | **Gün:** 14 / 60
>
> **Bugünün Hedefi:** Gün 8–13 arasında öğrendiklerini pekiştirmek, boşlukları kapatmak.
> ShopApp'in temel UI katmanını tamamlamak için kontrol listesi.

---

## Bu Haftanın Konuları

| Gün | Konu | Temel Çıktı |
|-----|------|-------------|
| 8 | FlatList | Liste render — `keyExtractor`, `renderItem`, `numColumns` |
| 9 | TextInput & Form | Kontrollü input, klavye yönetimi, `ref` ile focus zinciri |
| 10 | Platform API | `Platform.OS`, `Platform.select`, platform-specific dosyalar |
| 11 | SafeAreaView & Dimensions | Notch/çentik koruması, ekran boyutu okuma, `useWindowDimensions` |
| 12 | Modal & Alert | `Alert.alert`, `<Modal>`, bottom sheet pattern |
| 13 | Image Optimizasyonu | `expo-image`, blurhash, cachePolicy, FlatList performans |

---

## 1. FlatList — Hızlı Referans

```jsx
<FlatList
  data={products}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index }) => <ProductCard product={item} />}
  numColumns={2}
  columnWrapperStyle={{ gap: 12 }}
  contentContainerStyle={{ padding: 16 }}
  ListEmptyComponent={<EmptyState />}
  ListHeaderComponent={<FilterBar />}
  onEndReached={loadMore}
  onEndReachedThreshold={0.3}
  // Performans
  initialNumToRender={6}
  windowSize={5}
  removeClippedSubviews={true}
/>
```

**Web'den fark:** `map()` yerine `FlatList` — virtualization otomatik, büyük listelerde zorunlu.

---

## 2. TextInput & Form — Hızlı Referans

```jsx
const emailRef = useRef(null);
const passwordRef = useRef(null);

<TextInput
  value={email}
  onChangeText={setEmail}
  placeholder="E-posta"
  keyboardType="email-address"
  autoCapitalize="none"
  returnKeyType="next"
  onSubmitEditing={() => passwordRef.current?.focus()}
  blurOnSubmit={false}
/>
<TextInput
  ref={passwordRef}
  value={password}
  onChangeText={setPassword}
  secureTextEntry
  returnKeyType="done"
  onSubmitEditing={handleLogin}
/>
```

**Klavye yönetimi:** `KeyboardAvoidingView` + `Platform.OS === "ios" ? "padding" : "height"`.

---

## 3. Platform API — Hızlı Referans

```jsx
// Koşullu değer
const hitSlop = Platform.select({ ios: 10, android: 8, default: 10 });

// Koşullu stil
const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    android: { elevation: 4 },
  }),
});

// Platform-specific dosya (otomatik seçilir)
// Button.ios.jsx   → iOS'ta
// Button.android.jsx → Android'de
```

---

## 4. SafeAreaView & Dimensions — Hızlı Referans

```jsx
import { SafeAreaView } from "react-native-safe-area-context";

// Tüm ekran kök layout'u
<SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
  {/* İçerik */}
</SafeAreaView>

// Dinamik boyut (orientation değişimini takip eder)
const { width, height } = useWindowDimensions();
const numColumns = width > 600 ? 3 : 2;
```

**Neden:** Notch, Dynamic Island, gesture bar — bunlar olmadan içerik sistem UI'ının altında kalır.

---

## 5. Modal & Alert — Hızlı Referans

```jsx
// Hızlı onay
Alert.alert("Sil", "Emin misin?", [
  { text: "İptal", style: "cancel" },
  { text: "Sil", style: "destructive", onPress: () => deleteItem(id) },
]);

// Custom overlay
<Modal
  visible={visible}
  animationType="slide"
  transparent={true}
  onRequestClose={onClose}   // Android geri tuşu — zorunlu
>
  <Pressable style={styles.backdrop} onPress={onClose} />
  <View style={styles.sheet}>
    {/* İçerik */}
  </View>
</Modal>
```

**Kritik:** `transparent={true}` olmadan `rgba` arka plan çalışmaz. `onRequestClose` olmadan Android'de geri tuşu modalı kapatmaz.

---

## 6. Image — Hızlı Referans

```jsx
import { Image } from "expo-image";

<Image
  source={{ uri: product.imageUrl }}
  placeholder={{ blurhash: product.blurhash }}
  style={{ width: "100%", height: 180 }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

**Kritik:** Core `Image` için `width`+`height` zorunlu, yoksa hiçbir şey görünmez. `expo-image` ürün listeleri için tercih et.

---

## ShopApp — Hafta 2 Kontrol Listesi

Bu haftanın sonunda ShopApp'te şunlar çalışıyor olmalı:

### Ürün Listesi Ekranı
- [ ] `FlatList` ile 2 kolonlu grid
- [ ] `expo-image` + blurhash placeholder
- [ ] `initialNumToRender`, `windowSize` ayarları
- [ ] `ListEmptyComponent` — yükleme ve boş durum

### Arama / Filtre
- [ ] `TextInput` arama kutusu — `keyboardType="default"`, `returnKeyType="search"`
- [ ] `KeyboardAvoidingView` (liste yukarı kaymalı)

### Ürün Detayı
- [ ] Bottom sheet `Modal` — `animationType="slide"`, `transparent={true}`
- [ ] Backdrop'a tıklayınca kapanıyor
- [ ] `SafeAreaView` bottom padding (sepete ekle butonu gesture bar'a gömülmüyor)

### Sepet
- [ ] Ürün sil — `Alert.alert` + `destructive` stil
- [ ] Tüm sepeti temizle — `Alert.alert` onayı

### Genel
- [ ] `SafeAreaView` ile root layout
- [ ] `Platform.select` ile iOS/Android shadow farkı
- [ ] `useWindowDimensions` ile tablet desteği (3 kolon)

---

## Sık Yapılan Hatalar — Özet

| Hata | Neden | Çözüm |
|------|-------|-------|
| `Image` görünmüyor | `width`/`height` yok | Her zaman explicit boyut ver |
| Modal arka planı siyah | `transparent={false}` | `transparent={true}` + overlay View |
| Android geri tuşu Modal'ı kapatmıyor | `onRequestClose` yok | Her Modal'a ekle |
| İçerik notch'a giriyor | `SafeAreaView` yok | Kök layout'ta `SafeAreaView` |
| Klavye formu örtüyor | `KeyboardAvoidingView` yok | Form sarmalayıcıya ekle |
| FlatList'te `key` uyarısı | `keyExtractor` yok | `keyExtractor={(item) => item.id}` |

---

## Faz 1'in Geri Kalanı (Gün 15–21)

Önümüzdeki hafta state yönetimi ve veri katmanına geçiyoruz:

- **Gün 15** — AsyncStorage (yerel kalıcı depolama)
- **Gün 16** — `useEffect` ve yaşam döngüsü
- **Gün 17** — Zustand (global state)
- **Gün 18** — TanStack Query (server state)
- **Gün 19** — Axios ile API katmanı
- **Gün 20** — Auth flow (giriş/çıkış, protected routes)
- **Gün 21** — Hafta 3 Özet

---

**Sonraki Gün:** [Gün 15 — AsyncStorage](gun15_asyncstorage.md)
