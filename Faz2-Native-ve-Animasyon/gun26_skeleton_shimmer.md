# Gün 26 — Skeleton Loading ve Shimmer Efekti

## Neden Spinner Değil Skeleton?

Klasik yükleme göstergesi: dönen bir çember. Kullanıcıya der ki "bekle, bir şeyler oluyor." Basit ama iki sorunu var:

1. Kullanıcı ne göreceğini bilmiyor — içerik mi gelecek, hata mı çıkacak, boş sayfa mı?
2. Bekleme süresi belirsiz hissettiriyor — spinner ne zaman duracak?

Skeleton yükleme ise bunu tersine çevirir. İçerik gelmeden önce **içeriğin şeklini** gösteriyorsun — gri kutular, çizgiler, daireler. Kullanıcı "ah, buraya kart gelecek, buraya başlık" diyor. Bekleme daha kısa hissettiriyor.

**Analoji: Restoran masası**

Spinner: "Yemek geliyor, bekleyin" yazısı.

Skeleton: Önüne boş tabak, çatal, bıçak, peçete konuluyor. Yemek henüz yok ama masa hazır. Bekleme aynı süre ama farklı hissettiriyor.

**Araştırmalar ne diyor?**  
Facebook ve LinkedIn skeleton'a geçince kullanıcıların "uygulama daha hızlı" hissine kapıldığı görüldü — aslında yükleme süresi değişmedi. Algı değişti.

---

## Temel Skeleton Bileşeni: Şekil Placeholder'ları

Shimmer olmadan önce basit gri kutuları anlayalım.

```tsx
// components/ui/Skeleton.tsx
import { View, StyleSheet } from 'react-native';

type Props = {
  genislik: number | `${number}%`;
  yukseklik: number;
  borderRadius?: number;
};

export function Skeleton({ genislik, yukseklik, borderRadius = 6 }: Props) {
  return (
    <View
      style={[
        styles.iskelet,
        { width: genislik, height: yukseklik, borderRadius },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  iskelet: {
    backgroundColor: '#E8E8E8',
  },
});
```

Bu kadar. Şimdi bu bileşeni kullanarak içerik şeklini taklit edebilirsin:

```tsx
// Başlık ve iki satır metin taklidi
<View style={{ gap: 8 }}>
  <Skeleton genislik="80%" yukseklik={20} />
  <Skeleton genislik="60%" yukseklik={16} />
  <Skeleton genislik="40%" yukseklik={16} />
</View>
```

---

## Shimmer Efekti: Akan Parıltı

Statik gri kutular skeleton'un temel formu. Shimmer ise üzerinden sağdan sola kayan parlak bir ışık efekti ekliyor — "yükleniyor" hissini güçlendiriyor.

**Nasıl çalışır?**

```
[gri arka plan] + [üzerinden kayan şeffaf gradient] = shimmer
```

Gradient: sol taraf şeffaf → orta beyaz → sağ taraf şeffaf. Bu gradiente'i soldan sağa kaydırıyorsun.

**Analoji:** Araba lastiği cilalanırken fırçanın üzerinden geçen parıltı gibi — fırça hareket ediyor, lastik duruyor.

### `expo-linear-gradient` ile implementasyon

```tsx
// components/ui/ShimmerSkeleton.tsx
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useEffect } from 'react';

type Props = {
  genislik: number | `${number}%`;
  yukseklik: number;
  borderRadius?: number;
};

export function ShimmerSkeleton({ genislik, yukseklik, borderRadius = 6 }: Props) {
  const translateX = useSharedValue(-200); // sola dışından başla

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(200, { duration: 1000 }), // sağa dışına çık
      -1, // sonsuz tekrar
      false, // her seferinde sıfırlayarak başlat (reverse değil)
    );
  }, []);

  const shimmerStil = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.konteyner,
        { width: genislik, height: yukseklik, borderRadius },
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStil]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.5)', 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  konteyner: {
    backgroundColor: '#E8E8E8',
    overflow: 'hidden', // gradient dışarı taşmasın
  },
});
```

**`overflow: 'hidden'` neden zorunlu?**  
Gradient kutu dışından başlıyor ve dışına çıkıyor. `overflow: 'hidden'` olmadan gradient kutu dışında da görünür. Bu prop sayesinde içerik kutunun sınırlarında kırpılıyor.

**`translateX` neden -200'den başlıyor?**  
Gradient kutunun genişliği kadar sola itiyoruz — görünmeden başlasın. Animasyon onu sağa +200'e taşıyor. Genişlik değişirse bu sayıyı güncellemen gerekebilir; daha gelişmiş versiyonda bileşen genişliğini `onLayout` ile ölçüp kullanabilirsin.

---

## ShopApp: Ürün Kartı Skeleton'u

Gerçek ürün kartının şeklini taklit eden skeleton:

```tsx
// components/ProductCardSkeleton.tsx
import { View, StyleSheet } from 'react-native';
import { ShimmerSkeleton } from './ui/ShimmerSkeleton';

export function ProductCardSkeleton() {
  return (
    <View style={styles.kart}>
      {/* Görsel alanı */}
      <ShimmerSkeleton genislik="100%" yukseklik={160} borderRadius={8} />

      <View style={styles.bilgiler}>
        {/* Ürün adı */}
        <ShimmerSkeleton genislik="75%" yukseklik={16} />

        {/* Marka */}
        <ShimmerSkeleton genislik="50%" yukseklik={13} />

        <View style={styles.fiyatSatir}>
          {/* Fiyat */}
          <ShimmerSkeleton genislik={80} yukseklik={20} />
          {/* İndirim rozeti */}
          <ShimmerSkeleton genislik={44} yukseklik={22} borderRadius={11} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kart: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  bilgiler: {
    padding: 12,
    gap: 8,
  },
  fiyatSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
});
```

### FlatList ile skeleton listesi

```tsx
// app/(tabs)/index.tsx — isLoading durumunda skeleton listesi göster
import { ProductCardSkeleton } from '@/components/ProductCardSkeleton';

export default function Anasayfa() {
  const { data: urunler, isLoading, isError } = useUrunler();

  if (isLoading) {
    return (
      <FlatList
        data={Array.from({ length: 6 }, (_, i) => i)} // 6 skeleton kart
        keyExtractor={(i) => i.toString()}
        renderItem={() => <ProductCardSkeleton />}
        contentContainerStyle={{ padding: 16 }}
      />
    );
  }

  if (isError) {
    return <ErrorView />;
  }

  return (
    <FlatList
      data={urunler}
      keyExtractor={(u) => u.id}
      renderItem={({ item }) => <ProductCard urun={item} />}
      contentContainerStyle={{ padding: 16 }}
    />
  );
}
```

**Neden `Array.from({ length: 6 })`?**  
6 tane skeleton göstermek için bir dizi oluşturuyoruz. İçindeki değerler önemli değil, sadece 6 elemanlı bir dizi lazım. `[0, 1, 2, 3, 4, 5]` da yazılabilirdi ama bu daha temiz.

---

## ShopApp: Ürün Detay Skeleton'u

Detay sayfası farklı düzen — büyük görsel, uzun başlık, fiyat, açıklama:

```tsx
// components/ProductDetailSkeleton.tsx
import { View, ScrollView, StyleSheet } from 'react-native';
import { ShimmerSkeleton } from './ui/ShimmerSkeleton';

export function ProductDetailSkeleton() {
  return (
    <ScrollView>
      {/* Ana görsel */}
      <ShimmerSkeleton genislik="100%" yukseklik={320} borderRadius={0} />

      <View style={styles.icerik}>
        {/* Başlık */}
        <ShimmerSkeleton genislik="90%" yukseklik={24} />
        <ShimmerSkeleton genislik="70%" yukseklik={24} />

        {/* Fiyat + indirim */}
        <View style={styles.fiyatSatir}>
          <ShimmerSkeleton genislik={100} yukseklik={28} />
          <ShimmerSkeleton genislik={60} yukseklik={20} />
        </View>

        {/* Açıklama satırları */}
        <View style={{ gap: 6, marginTop: 16 }}>
          <ShimmerSkeleton genislik="100%" yukseklik={14} />
          <ShimmerSkeleton genislik="100%" yukseklik={14} />
          <ShimmerSkeleton genislik="80%" yukseklik={14} />
        </View>

        {/* Sepete ekle butonu */}
        <ShimmerSkeleton genislik="100%" yukseklik={52} borderRadius={12} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  icerik: { padding: 16, gap: 12 },
  fiyatSatir: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
```

```tsx
// app/product/[id].tsx
export default function UrunDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: urun, isLoading } = useUrunDetay(id);

  if (isLoading) return <ProductDetailSkeleton />;
  if (!urun) return null;

  return <UrunDetayIcerigi urun={urun} />;
}
```

---

## Shimmer Senkronizasyonu: Tüm Kartlar Aynı Anda Parıldasın

Şu anki implementasyonda her `ShimmerSkeleton` kendi animasyonunu başlatıyor — listede 6 kart varsa 6 ayrı animasyon, hepsi farklı fazda başlıyor. Parıltılar senkronize değil.

Düzeltmek için paylaşılan bir zamanlayıcı kullanılabilir:

```tsx
// hooks/useShimmerValue.ts — uygulama genelinde tek bir shared value
import { useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useEffect } from 'react';
import { createContext, useContext } from 'react';

// Context ile paylaş
const ShimmerContext = createContext(null);

export function ShimmerProvider({ children }) {
  const offset = useSharedValue(-200);

  useEffect(() => {
    offset.value = withRepeat(withTiming(200, { duration: 1000 }), -1, false);
  }, []);

  return (
    <ShimmerContext.Provider value={offset}>
      {children}
    </ShimmerContext.Provider>
  );
}

export function useShimmerOffset() {
  return useContext(ShimmerContext);
}
```

```tsx
// ShimmerSkeleton'da kullan
export function ShimmerSkeleton({ ... }) {
  const translateX = useShimmerOffset(); // paylaşılan değer

  const shimmerStil = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  // ...
}
```

Şimdi tüm shimmer'lar aynı `useSharedValue`'yu okuyor — tek animasyon, senkronize parıltı.

---

## `moti` Kütüphanesi: Hazır Çözüm

Elle yazmak yerine `moti` kütüphanesini de kullanabilirsin. Reanimated üzerine kurulu, daha kısa syntax:

```tsx
import { MotiView } from 'moti/skeleton';
import { Skeleton } from 'moti/skeleton';

// Tek satır skeleton
<Skeleton colorMode="light" width={200} height={20} />

// Skeleton grup — aralarında otomatik boşluk
<Skeleton.Group show={isLoading}>
  <Skeleton colorMode="light" width="100%" height={200} />
  <Skeleton colorMode="light" width="80%" height={20} />
  <Skeleton colorMode="light" width="60%" height={16} />
</Skeleton.Group>
```

`show={false}` olunca skeleton kaybolup gerçek içerik (children) görünüyor. `show={true}` iken skeleton görünüyor.

**Ne zaman `moti` kullan?**  
Hızlı implementasyon, özelleştirme gerekmiyorsa. Kendi shimmer renklerini, animasyon hızını, yönünü kontrol etmek istiyorsan elle yaz.

---

## Web ile Karşılaştırma

| Web | React Native | Fark |
|-----|-------------|------|
| `react-loading-skeleton` | Elle implement veya `moti` | Hazır kütüphane RN'de daha az gelişmiş |
| CSS `background: linear-gradient(...)` | `expo-linear-gradient` | Aynı mantık, farklı API |
| CSS `animation: shimmer 1s infinite` | Reanimated `withRepeat` | JS/native thread farkı |
| `@keyframes` | `withTiming` + `withRepeat` | Reanimated daha esnek |
| Genel olarak kolay | Biraz daha kurulum gerekli | — |

---

## TanStack Query ile Entegrasyon Notu

Dün kullandığın `useUrunler()` zaten `isLoading` döndürüyor. Skeleton sadece bu değeri takip ediyor:

```tsx
const { data, isLoading, isError, refetch } = useUrunler();

// isLoading: true iken → SkeletonListesi
// isLoading: false, isError: true iken → ErrorView
// isLoading: false, isError: false iken → GerçekListe
```

`isLoading` vs `isFetching` farkı:
- `isLoading`: veri hiç yokken yükleniyor (ilk yükleme) — skeleton göster
- `isFetching`: veri var ama yenileniyor (background refetch) — skeleton gösterme, belki küçük spinner

```tsx
if (isLoading) return <SkeletonListesi />; // ✅ ilk yüklemede skeleton
// isFetching sırasında refetch göstergesi istersen:
{isFetching && !isLoading && <RefreshIndicator />}
```

---

## Kontrol Soruları

1. Spinner yerine skeleton neden daha iyi kullanıcı deneyimi sunuyor? Hangi psikolojik mekanizma bunu açıklıyor?

2. `overflow: 'hidden'` ShimmerSkeleton'da neden zorunlu? Olmadan ne görürsün?

3. 6 ayrı skeleton kartının shimmer'ı senkronize değil, hepsi farklı fazda parlıyor. Bunu nasıl düzeltirsin?

4. TanStack Query'nin `isLoading` ile `isFetching` farkı ne? Hangi durumda skeleton gösterirsin?

5. `moti` kütüphanesini ne zaman tercih edersin, ne zaman elle yazarsın?

---

## Özet

| Kavram | Ne yapar |
|--------|----------|
| Skeleton | İçerik şeklini gri kutularla taklit eder |
| Shimmer | Üzerinden kayan parıltı efekti — "yükleniyor" hissi |
| `LinearGradient` | Şeffaf → beyaz → şeffaf gradient şeridi |
| `withRepeat(-1)` | Sonsuz animasyon döngüsü |
| `overflow: 'hidden'` | Gradient kutu dışına taşmasın |
| Senkronizasyon | Paylaşılan SharedValue ile tüm shimmer'lar aynı anda |
| `moti` | Hazır skeleton kütüphanesi (Reanimated üstüne) |

**Yarın (Gün 27):** Dark Mode — `useColorScheme`, tema sistemi, Zustand ile manuel tema seçimi, ShopApp'e dark/light toggle.
