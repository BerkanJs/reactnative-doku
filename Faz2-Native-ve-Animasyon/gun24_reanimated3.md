# Gün 24 — Reanimated 3: Native Thread Animasyonları

## Dünün Sorunu, Bugünün Çözümü

Dün Animated API'yi öğrendin. Güçlü ama bir kısıtı var: `useNativeDriver: true` kullansan bile **sadece** `opacity` ve `transform` native'de çalışıyor. `backgroundColor`, `width`, `height` animasyonu yapmak istersen JS Thread'e geri dönmek zorunda kalıyorsun — bu da jank riski.

Reanimated 3'ün cevabı: **her şeyi** native thread'de çalıştır. JS Thread'e hiç sorma.

---

## Temel Fark: Değer Nerede Yaşıyor?

### Dün: `Animated.Value` — JS Thread'de doğar

```
Animated.Value(0)  →  JS Thread'de yaşıyor
                       useNativeDriver: true dersen native'e "kopyalanıyor"
                       ama hâlâ JS Thread'den yönetiliyor
```

### Bugün: `useSharedValue` — Native Thread'de doğar

```
useSharedValue(0)  →  Doğrudan Native Thread'de yaşıyor
                       JS Thread haberi bile olmayabilir
                       Her iki thread de okuyup yazabilir
```

**Analoji:**  
`Animated.Value` senin masandaki bir sayaç. Native thread görmek isteyince sana haber gönderiyor, sen de ona söylüyorsun. Meşgulsen gecikiyor.

`useSharedValue` odanın ortasındaki ortak bir ekran. Her iki taraf da direkt bakabiliyor. Sen meşgul olsan bile ekran güncelleniyor.

---

## `useSharedValue`: Native'de Yaşayan Değer

```tsx
import { useSharedValue } from 'react-native-reanimated';

// 0'dan başlayan, native thread'de yaşayan değer
const opacity = useSharedValue(0);

// Değeri değiştirmek için .value kullanıyorsun
opacity.value = 1; // anında değişir, animasyon yok
```

**`Animated.Value` ile sözdizimi farkı:**

| Animated API | Reanimated 3 |
|-------------|--------------|
| `const val = useRef(new Animated.Value(0)).current` | `const val = useSharedValue(0)` |
| Değişiklik: `Animated.timing(val, { toValue: 1 })` | Değişiklik: `val.value = withTiming(1)` |
| Okuma: mümkün değil (animasyonlu) | Okuma: `val.value` |

Dikkat et: `val.value = 1` yazarsan **anında** değişir, animasyonsuz. Animasyon için `withTiming`, `withSpring` gibi fonksiyonları atarsın.

---

## `useAnimatedStyle`: Shared Value'yu Stile Bağla

Shared value tek başına bir şey yapmaz. Bir bileşenin stiline bağlamak için `useAnimatedStyle` kullanıyorsun.

```tsx
import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

const opacity = useSharedValue(0);

// Bu fonksiyon native thread'de çalışıyor — her kare yeniden hesaplanıyor
const animasyonluStil = useAnimatedStyle(() => ({
  opacity: opacity.value, // opacity değeri değişince stil otomatik güncelleniyor
}));

// Normal View değil, Animated.View — Reanimated'ın özel bileşeni
return (
  <Animated.View style={[styles.kart, animasyonluStil]}>
    {/* içerik */}
  </Animated.View>
);
```

**`useAnimatedStyle` içindeki fonksiyon neden `() => ({})`?**  
Bu fonksiyon **her animasyon karesi** yeniden çalışıyor — saniyede 60 kez. Ve bu JS Thread'de değil, native thread'de çalışıyor. O yüzden içindeki her şey native thread tarafından anlaşılabilir olmalı.

---

## `worklet`: "Bu Fonksiyon Native Thread'de Çalışacak"

Reanimated'ın en kritik kavramı bu. Anlamadan hata yaparsın.

**Normal bir fonksiyon** JS Thread'de çalışır. Native thread onu çağıramaz.

**Worklet** ise native thread'de çalışmak üzere derlenen özel bir fonksiyon.

```tsx
// 'worklet' direktifini birinci satıra yazınca bu fonksiyon native'de çalışabilir
function animasyonHesapla(deger: number) {
  'worklet';
  return deger * 2 + 10;
}
```

**`useAnimatedStyle` içindeki fonksiyon otomatik worklet sayılıyor** — ayrıca yazmak gerekmez.

Ama kendi yazdığın yardımcı fonksiyonu içeri çağırıyorsan, o fonksiyonun da worklet olması gerekiyor:

```tsx
// Bu fonksiyon worklet DEĞİL — native thread çağıramaz
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Bu fonksiyon worklet — native thread çağırabilir
function lerp(a: number, b: number, t: number) {
  'worklet';
  return a + (b - a) * t;
}

const animasyonluStil = useAnimatedStyle(() => ({
  // lerp worklet olduğu için burada kullanılabilir
  opacity: lerp(0, 1, ilerleme.value),
}));
```

**Worklet olmayan fonksiyonu `useAnimatedStyle` içinde çağırırsan ne olur?**  
Uygulama hata verir: "Tried to synchronously call function {X} from a different thread." Çünkü native thread, JS Thread'deki fonksiyonu senkron çağıramıyor.

---

## `withTiming` ve `withSpring`: Animasyonlu Değer Atama

Dünkü `Animated.timing(val, { toValue: 1 })` yerine bugün çok daha kısa:

```tsx
import { withTiming, withSpring } from 'react-native-reanimated';

// Animasyonsuz, anında:
opacity.value = 1;

// Animasyonlu — 500ms'de 0'dan 1'e:
opacity.value = withTiming(1, { duration: 500 });

// Yay fiziği ile:
scale.value = withSpring(1, { damping: 10, stiffness: 100 });
```

**`damping` ve `stiffness` ne?**  
Dünkü `friction` ve `tension`'ın Reanimated karşılığı:
- `damping` (sönümleme): yüksekse yay çabuk durur, düşükse uzun sallanır
- `stiffness` (sertlik): yüksekse sert/hızlı yay, düşükse yumuşak/yavaş

### ShopApp: Ürün kartı aşağıdan süzülsün

```tsx
// components/ProductCard.tsx
import { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

type Props = {
  urun: Urun;
  onPress: () => void;
  index: number; // listedeki sıra — gecikme için
};

export function ProductCard({ urun, onPress, index }: Props) {
  const translateY = useSharedValue(40); // 40px aşağıdan başla
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Her kart kendi sırasına göre geciksin (staggered animasyon)
    const gecikme = index * 80; // 0. kart hemen, 1. kart 80ms, 2. kart 160ms...

    translateY.value = withDelay(gecikme, withTiming(0, { duration: 400 }));
    opacity.value = withDelay(gecikme, withTiming(1, { duration: 400 }));
  }, []);

  const animasyonluStil = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animasyonluStil}>
      <Pressable onPress={onPress} style={styles.kart}>
        {/* kart içeriği */}
      </Pressable>
    </Animated.View>
  );
}
```

**Stagger efekti neden güzel?** Tüm kartlar aynı anda çıkınca göz hangi karta bakacağını bilemez. Sırayla çıkınca göz soldan sağa, yukarıdan aşağıya tarar — doğal hissettiriyor.

---

## `withSequence` ve `withRepeat`: Kombinasyonlar

### `withSequence`: Biri bitince diğeri

```tsx
// Dün: Animated.sequence([...]).start()
// Bugün:
scale.value = withSequence(
  withTiming(0.9, { duration: 100 }),  // önce küçül
  withSpring(1, { damping: 4 })         // sonra yay gibi geri gel
);
```

### `withRepeat`: Tekrar et

```tsx
// Sonsuz tekrar — nefes efekti
scale.value = withRepeat(
  withSequence(
    withTiming(1.05, { duration: 800 }),
    withTiming(1, { duration: 800 }),
  ),
  -1,    // -1 = sonsuz, pozitif sayı = kaç kere
  false  // reverse: true olsaydı her tekrarda yön değişirdi
);
```

### ShopApp: Sepet ikonunu zıplat

```tsx
// app/(tabs)/_layout.tsx — sepet tab ikonunu zıplat
import { useSharedValue, useAnimatedStyle, withSequence, withTiming, withSpring } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

function SepetIkonu({ renk, boyut }: { renk: string; boyut: number }) {
  const translateY = useSharedValue(0);
  const toplamAdet = useCartStore(s => s.toplamAdet());

  useEffect(() => {
    if (toplamAdet === 0) return;
    // Sepete ürün eklenince ikon zıplasın
    translateY.value = withSequence(
      withTiming(-8, { duration: 150 }),  // yukarı git
      withSpring(0, { damping: 4, stiffness: 200 }), // geri zıpla
    );
  }, [toplamAdet]);

  const ikonStil = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={ikonStil}>
      <Ionicons name="cart" size={boyut} color={renk} />
    </Animated.View>
  );
}
```

---

## Layout Animasyonları: Element Eklenince/Çıkınca

Reanimated 3'ün Animated API'de olmayan büyük avantajı: **layout animasyonları.** Element DOM'a eklenince veya çıkınca otomatik animasyon.

```tsx
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

// Entering: element görünür olduğunda
// Exiting: element kaybolduğunda
<Animated.View
  entering={FadeIn.duration(300)}
  exiting={FadeOut.duration(200)}
>
  <Text>Bu element görünür olunca fade in, kaybolunca fade out</Text>
</Animated.View>
```

**Hazır animasyon preset'leri:**

```tsx
// Girişler:
FadeIn          // opaklık 0→1
SlideInRight    // sağdan kayarak gir
SlideInUp       // aşağıdan yukarı gir
BounceIn        // zıplayarak gir
ZoomIn          // küçükten büyüyerek gir

// Çıkışlar (aynı mantıkla):
FadeOut
SlideOutLeft
SlideOutDown
ZoomOut
```

**Zincirleme:**
```tsx
// Gecikme ve hız ayarlama
entering={SlideInUp.delay(200).duration(400).springify()}
//                  ^gecikme   ^süre          ^spring fiziği kullan
```

### ShopApp: Sepetten ürün silinince kayan animasyon

```tsx
// app/(tabs)/cart.tsx
import Animated, { SlideOutLeft, Layout } from 'react-native-reanimated';

function SepetSatiri({ item }: { item: SepetItem }) {
  return (
    <Animated.View
      exiting={SlideOutLeft.duration(300)} // sola kayarak çık
      layout={Layout.springify()}           // diğer satırlar yerleşirken animate olsun
    >
      {/* satır içeriği */}
    </Animated.View>
  );
}
```

**`layout={Layout.springify()}` neden önemli?**  
İlk öğeyi sildikten sonra ikinci öğe birinci konumuna aniden ısınır. `layout` prop'u olmadan bu "zıplayarak" görünür. `layout` prop'u varsa diğer öğeler de animate olarak yeni konumlarına kayar.

---

## `runOnJS`: Native Thread'den JS Thread'e Geri Dön

Bazen animasyon sırasında JS Thread'de bir şey yapman gerekiyor — state güncelleme, router.push, console.log, vs.

Worklet içinden doğrudan yapman mümkün değil. `runOnJS` ile sarman gerekiyor:

```tsx
import { runOnJS } from 'react-native-reanimated';

function urunSil(id: string) {
  // Bu JS Thread'de tanımlı — state güncelleme içeriyor
  deleteItem(id);
}

const animasyonluStil = useAnimatedStyle(() => {
  if (translateX.value < -100) {
    // Native Thread'den JS Thread'e geç
    runOnJS(urunSil)(id); // ← böyle çağırıyorsun
  }
  return { transform: [{ translateX: translateX.value }] };
});
```

**Neden direkt çağıramıyorsun?**  
`deleteItem(id)` Zustand store'unu değiştiriyor — bu JS Thread'de yaşıyor. Native thread JS Thread'deki fonksiyonları senkron çağıramaz. `runOnJS` "bu işi JS Thread'e gönder" diyor.

---

## Reanimated 3 vs Animated API: Ne Zaman Hangisi?

| Durum | Tercih | Neden |
|-------|--------|-------|
| Basit fade, slide | İkisi de olur | Animated API yeterli |
| Scroll'a bağlı animasyon | Reanimated 3 | `useScrollViewOffset` hazır |
| Gesture ile animasyon | Reanimated 3 | Gesture Handler ile mükemmel entegrasyon |
| `backgroundColor` animasyonu | Reanimated 3 | Animated API bunu native'de yapamıyor |
| Layout animasyonu (ekle/sil) | Reanimated 3 | `entering`/`exiting` hazır |
| Mevcut Animated API kodu | Değiştirme | Çalışıyorsa dokunma |

---

## Web (Framer Motion) ile Karşılaştırma

| Framer Motion (Web) | Reanimated 3 | Benzerlik |
|--------------------|-------------|-----------|
| `motion.div` | `Animated.View` | Sarıcı bileşen |
| `animate={{ opacity: 1 }}` | `useAnimatedStyle(() => ({ opacity: sv.value }))` | Stil bağlama |
| `initial={{ opacity: 0 }}` | `useSharedValue(0)` başlangıç değeri | Başlangıç |
| `whileTap={{ scale: 0.9 }}` | `withSpring(0.9)` onPress'te | Tap efekti |
| `AnimatePresence` | `entering`/`exiting` prop | Mount/unmount animasyonu |
| `variants` | — | Reanimated'da yok, useAnimatedStyle ile yapılır |

---

## Kontrol Soruları

1. `useSharedValue` ile `Animated.Value` arasındaki temel fark ne? Neden biri native thread'de yaşıyor, diğeri yaşamıyor?

2. `useAnimatedStyle` içindeki fonksiyon neden worklet sayılıyor? Kendi yazdığın yardımcı fonksiyon için ne yapmak gerekiyor?

3. Sepet sayfasında ürün silinince `deleteItem()` fonksiyonunu `useAnimatedStyle` içinde doğrudan çağıramazsın. Neden? Nasıl çağırırsın?

4. Layout animasyonu olmadan sepetten öğe silinince görsel olarak ne olur? `layout={Layout.springify()}` bunu nasıl düzeltiyor?

5. `withRepeat(animasyon, -1)` ile `Animated.loop(animasyon)` arasındaki fark ne?

---

## Özet

| API | Ne yapar | Dünkü karşılığı |
|-----|----------|-----------------|
| `useSharedValue(n)` | Native'de yaşayan değer | `useRef(new Animated.Value(n)).current` |
| `useAnimatedStyle(() => ({}))` | Stil hesapla, native'de çalış | `style={{ opacity: animVal }}` |
| `withTiming(n, config)` | Doğrusal animasyon | `Animated.timing(val, { toValue: n })` |
| `withSpring(n, config)` | Yay fiziği | `Animated.spring(val, { toValue: n })` |
| `withDelay(ms, animasyon)` | Gecikmeli başlat | `Animated.delay()` + sequence |
| `withSequence(...)` | Sıralı animasyonlar | `Animated.sequence([...])` |
| `withRepeat(anim, n)` | Tekrarlı animasyon | `Animated.loop(...)` |
| `entering`, `exiting` | Mount/unmount animasyonu | Yoktu |
| `'worklet'` | Native thread'de çalış | `useNativeDriver: true` (sınırlı) |
| `runOnJS(fn)` | Native → JS Thread geçiş | Yoktu |

**Yarın (Gün 25):** Gesture Handler — swipe, pan, pinch. Reanimated 3 ile birleşince gerçek native gesture deneyimi.
