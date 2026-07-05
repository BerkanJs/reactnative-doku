# Gün 13 — Image Optimizasyonu

> **Faz:** 1 — Temeller | **Hafta:** 2 | **Gün:** 13 / 60
>
> **Bugünün Hedefi:** React Native'de resimleri doğru yüklemek, boyutlandırmak ve performansını artırmak.
> ShopApp ürün görselleri için optimum görüntü yönetimini kuracağız.

---

## 1. Web'de Ne Yapıyorduk?

```html
<!-- HTML'de native lazy loading -->
<img src="product.jpg" alt="Ürün" loading="lazy" width="300" height="200" />

<!-- Next.js'te otomatik optimizasyon -->
<Image src="/product.jpg" width={300} height={200} alt="Ürün" priority />
```

Web'de tarayıcı:
- Resmi otomatik cache'ler
- `loading="lazy"` ile viewport dışı resimleri erteler
- WebP dönüşümünü yönetir

React Native'de **bunların hiçbiri otomatik değil.** `<Image>` basit bir wrapper; cache, placeholder, hata yönetimi hepsini sen yazarsın — ya da `expo-image` / `react-native-fast-image` gibi kütüphaneler kullanırsın.

---

## 2. Core `Image` Component

### Temel Kullanım

```jsx
import { Image, StyleSheet } from "react-native";

// Uzak URL
<Image
  source={{ uri: "https://example.com/product.jpg" }}
  style={styles.image}
/>

// Yerel dosya (bundle'a dahil edilir)
<Image
  source={require("../assets/logo.png")}
  style={styles.image}
/>

const styles = StyleSheet.create({
  image: {
    width: 200,
    height: 200,
  },
});
```

> **Önemli:** `Image` için **mutlaka** `width` ve `height` ver. Yoksa hiçbir şey görünmez — web'deki gibi intrinsic boyut yoktur.

---

## 3. `resizeMode` — Görüntü Yerleşimi

CSS `object-fit`'in React Native karşılığı:

```jsx
<Image
  source={{ uri: product.imageUrl }}
  style={{ width: 200, height: 200 }}
  resizeMode="cover"  // varsayılan
/>
```

| `resizeMode` | CSS Karşılığı | Kullanım |
|---|---|---|
| `"cover"` | `object-fit: cover` | Ürün kartları, hero görseller |
| `"contain"` | `object-fit: contain` | Logo, ikon, tam görünmesi gereken resimler |
| `"stretch"` | `object-fit: fill` | Nadir — oranı bozar |
| `"center"` | `object-fit: none` | Küçük ikonlar, merkeze al |
| `"repeat"` | `background-repeat: repeat` | Desen arka planlar |

---

## 4. Placeholder ve Loading State

Core `Image` yükleme sırasında boş gösterir. Placeholder için ya `onLoadStart`/`onLoadEnd` kullanırsın ya da `expo-image` tercih edersin:

```jsx
import { Image, View, ActivityIndicator, StyleSheet } from "react-native";
import { useState } from "react";

function ProductImage({ uri }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.placeholder}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      )}

      {error ? (
        <View style={[styles.placeholder, styles.errorBox]}>
          {/* Fallback — bozuk resim ikonunu göster */}
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={[styles.image, loading && { opacity: 0 }]}
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 200, height: 200 },
  placeholder: {
    ...StyleSheet.absoluteFillObject,  // position: absolute + fill
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  errorBox: { backgroundColor: "#fee2e2" },
  image: { width: "100%", height: "100%" },
});
```

---

## 5. `expo-image` — Önerilen Yol

`expo-image`, `expo` projelerinde core `Image`'ın yerini alacak şekilde tasarlanmış; blurhash, placeholder, cache yönetimi built-in.

```bash
npx expo install expo-image
```

```jsx
import { Image } from "expo-image";

<Image
  source={{ uri: product.imageUrl }}
  style={{ width: 200, height: 200 }}
  placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
  contentFit="cover"         // resizeMode'un expo-image karşılığı
  transition={300}           // ms — yüklenince fade-in
  cachePolicy="memory-disk"  // "none" | "disk" | "memory" | "memory-disk"
/>
```

### `blurhash` Placeholder

Sunucudan gelen küçük bir string'den bulanık önizleme oluşturur. Görsel yüklenene kadar kullanıcıya anlamsız beyaz kutu yerine renk/şekil ipucu verir:

```jsx
// Backend'den her ürünle birlikte blurhash string'i de gönder
const product = {
  id: "1",
  name: "Kablosuz Kulaklık",
  imageUrl: "https://cdn.example.com/headphone.jpg",
  blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
};

<Image
  source={{ uri: product.imageUrl }}
  placeholder={{ blurhash: product.blurhash }}
  style={{ width: "100%", height: 240 }}
  contentFit="cover"
  transition={200}
/>
```

### `cachePolicy`

| Değer | Davranış | Ne Zaman |
|---|---|---|
| `"memory-disk"` | RAM + disk cache | Ürün listeleri (varsayılan) |
| `"disk"` | Sadece disk | Büyük resimler, az tekrar |
| `"memory"` | Sadece RAM | Küçük ikonlar, çok tekrar |
| `"none"` | Cache yok | Her seferinde taze çek |

---

## 6. FlatList ile Image Performansı

FlatList'te çok sayıda resim varsa iki önemli prop:

```jsx
<FlatList
  data={products}
  renderItem={({ item }) => <ProductCard product={item} />}
  // Kaç ekran önceden render edilsin (varsayılan: 10 item)
  windowSize={5}
  // Görünüm dışına çıkınca resmi bellekten at (RAM tasarrufu)
  removeClippedSubviews={true}
  // İlk render'da kaç item göster
  initialNumToRender={6}
/>
```

---

## 7. Yerel Resimler — `require` vs `uri`

```jsx
// require → build time'da bundle'a dahil, her zaman mevcut
<Image source={require("../assets/logo.png")} style={{ width: 120, height: 40 }} />

// uri → runtime'da network'ten çekilir, yüklenemeyebilir
<Image source={{ uri: "https://cdn.example.com/product.jpg" }} style={{ width: 200, height: 200 }} />

// Dinamik uri — width/height zorunlu, yoksa görünmez
const imageUrl = product?.imageUrl;
<Image
  source={imageUrl ? { uri: imageUrl } : require("../assets/placeholder.png")}
  style={{ width: 200, height: 200 }}
/>
```

---

## 8. ShopApp — ProductCard Görseli

```jsx
// components/ProductCard.jsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";

export function ProductCard({ product, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={{ uri: product.imageUrl }}
        placeholder={{ blurhash: product.blurhash }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.price}>{product.price} ₺</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,      // Android shadow
  },
  image: {
    width: "100%",
    height: 180,
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6366f1",
  },
});
```

---

## 9. Web vs React Native Karşılaştırması

| Özellik | Web / Next.js | React Native |
|---|---|---|
| Lazy loading | `loading="lazy"` | FlatList `windowSize` |
| Otomatik boyut | HTML intrinsic size | `width`+`height` zorunlu |
| Placeholder | CSS skeleton / blur | `expo-image` blurhash |
| Cache | Browser otomatik | `expo-image` cachePolicy |
| Object-fit | CSS `object-fit` | `resizeMode` / `contentFit` |
| Hata yönetimi | `onerror` | `onError` callback |
| Retina (@2x/@3x) | `srcset` | RN otomatik tanır (`logo@2x.png`) |

---

## 10. Özet

- Core `Image`: basit kullanım için yeterli, `width`/`height` zorunlu
- **`expo-image`**: blurhash placeholder, built-in cache, fade transition — ürün görselleri için tercih et
- `resizeMode` / `contentFit`: ürün kartı → `"cover"`, logo → `"contain"`
- FlatList'te `windowSize`, `removeClippedSubviews`, `initialNumToRender` üçlüsü
- Dinamik `uri` için her zaman fallback (`require`) hazırla

---

## Mini Görev

ShopApp'te şunları uygula:

1. `expo-image` kur ve `ProductCard`'daki `Image`'ı `expo-image` ile değiştir
2. `contentFit="cover"` + `transition={200}` ekle
3. Resim yüklenemezse (`onError`) gri bir placeholder kutusu göster
4. Ürün listesini `FlatList`'te gösteriyorsan `initialNumToRender={6}` ve `windowSize={5}` ekle

---

**Sonraki Gün:** [Gün 14 — Hafta 2 Özet](gun14_hafta2_ozet.md)
