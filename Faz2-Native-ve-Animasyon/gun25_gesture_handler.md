# Gün 25 — Gesture Handler: Touch ve Swipe

## Neden Ayrı Bir Kütüphane?

Web'de fare olayları basittir: `onMouseDown`, `onMouseMove`, `onMouseUp`. Kullanıcı fareyi hareket ettiriyor, tarayıcı olayları bildiriyor.

Mobilde ise parmak hareketleri çok daha karmaşık:

- Kaç parmak var?
- Parmaklar birbirine mi yaklaşıyor (pinch)?
- Hız ne kadar (velocity)?
- Hareket yönü dikey mi yatay mı?
- Başka bir gesture ile çakışıyor mu?

Bütün bunları React Native'in yerleşik `Pressable` veya `TouchableOpacity`'si doğru işleyemiyor. Ve en büyük sorun: **JS Thread'de çalışıyorlar.** JS Thread meşgulken dokunma tepkisi gecikmeli hissettiriyor.

`react-native-gesture-handler` tüm dokunma tanımayı native thread'e taşır. Ekranı dondursan bile gesture'lar çalışmaya devam eder.

**Analoji: Kapı Zili vs Akıllı Kilit**

`onPress` → kapı zili. Zil çalınca içeride birinin duyması lazım (JS Thread). İçerideki meşgulse duymuyor.

Gesture Handler → akıllı kilit. Kartı kapıda okuyuyor (native thread). İçeride kimse olmasına gerek yok.

---

## Yeni API: `GestureDetector` + `Gesture.*`

Gesture Handler v2 ile API tamamen değişti. Eski sarıcı (wrapper) yaklaşımı yerine artık hook benzeri bir yapı var:

```tsx
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

// Gesture tanımla
const tap = Gesture.Tap()
  .onEnd(() => {
    console.log('tıklandı');
  });

// GestureDetector ile sar
<GestureDetector gesture={tap}>
  <View>
    {/* içerik */}
  </View>
</GestureDetector>
```

**Neden `GestureDetector` var, direkt `onPress` olmaz mı?**  
`onPress` → tek tip dokunma, JS Thread. `GestureDetector` → her türlü gesture, native thread, Reanimated ile direkt bağlantı.

---

## Tap Gesture: Basit Dokunma

```tsx
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

function AnimasyonluButon({ onPress, children }: Props) {
  const olcek = useSharedValue(1);

  const tap = Gesture.Tap()
    .onBegin(() => {
      // Parmak değdi — küçül
      'worklet';
      olcek.value = withSpring(0.92);
    })
    .onFinalize(() => {
      // Parmak kalktı (başarılı veya iptal) — geri büyü
      'worklet';
      olcek.value = withSpring(1, { damping: 5, stiffness: 200 });
    })
    .onEnd(() => {
      // Başarılı tap — JS Thread'deki callback çağır
      runOnJS(onPress)();
    });

  const animasyonluStil = useAnimatedStyle(() => ({
    transform: [{ scale: olcek.value }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View style={animasyonluStil}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
```

**`onBegin` vs `onEnd` vs `onFinalize` farkı:**
- `onBegin`: parmak ekrana değdi, henüz gesture başlamadı
- `onEnd`: gesture başarıyla tamamlandı (parmak kalktı, iptal edilmedi)
- `onFinalize`: her durumda — başarılı da olsa iptal de olsa çalışır

**Neden `onFinalize`'da büyütüyoruz?**  
Kullanıcı butona bastı, küçüldü. Sonra parmağını kaydırdı (tap iptal). Ama küçük kaldı. `onFinalize` iptal durumunda da büyümeyi garantiliyor.

---

## Pan Gesture: Sürükleme

Pan gesture parmağın ekran üzerindeki hareketi — drag, swipe, kaydırma.

```
onBegin   → parmak değdi
onStart   → yeterince hareket etti, gesture tanındı
onUpdate  → hareket devam ediyor (her frame çağrılır)
onEnd     → parmak kalktı
```

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

function SuruklenebilirKart() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      // event.translationX: başlangıçtan bu yana X'te kaç px gittin
      // event.translationY: başlangıçtan bu yana Y'de kaç px gittin
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      'worklet';
      // Parmak kalktı — orijinal konuma geri dön
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animasyonluStil = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.kart, animasyonluStil]}>
        <Text>Sürükle beni</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

### ShopApp: Sepet satırını sola kaydırınca sil

E-posta uygulamalarındaki swipe-to-delete gibi. Kullanıcı satırı sola kaydırırsa silme butonu çıkar veya direkt silinir.

```tsx
// components/SwipeableSepetSatiri.tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  useSharedValue, useAnimatedStyle,
  withTiming, withSpring, runOnJS
} from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

const SILME_ESIGI = -80; // 80px sola kaydırırsa sil

type Props = { item: SepetItem; onSil: (id: string) => void };

export function SwipeableSepetSatiri({ item, onSil }: Props) {
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10]) // 10px hareket etmeden başlatma — yanlışlıkla tetiklenmesin
    .onUpdate((event) => {
      'worklet';
      // Sadece sola gitsin — sağa gitmeye izin verme
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd((event) => {
      'worklet';
      if (translateX.value < SILME_ESIGI) {
        // Yeterince kaydırdı — sola fırlat ve sil
        translateX.value = withTiming(-500, { duration: 200 }, () => {
          runOnJS(onSil)(item.urun.id);
        });
      } else {
        // Yeterince kaydırmadı — geri döndür
        translateX.value = withSpring(0);
      }
    });

  const satirStil = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Arka planda görünen silme alanı
  const silmeArkaplaniStil = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  return (
    <View>
      {/* Arka plan: kırmızı silme alanı */}
      <Animated.View style={[styles.silmeArka, silmeArkaplaniStil]}>
        <Ionicons name="trash-outline" size={24} color="white" />
        <Text style={styles.silmeYazi}>Sil</Text>
      </Animated.View>

      {/* Öndeki satır */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.satir, satirStil]}>
          {/* satır içeriği */}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
```

**`activeOffsetX([-10, 10])` neden var?**  
Kullanıcı bazen hafifçe sola/sağa titreşimle dokunuyor. Bu eşik olmadan her tap swipe olarak algılanıyor. 10px hareketten sonra başlat demek.

---

## Gesture Çakışması: FlatList Scroll vs Swipe

En sık karşılaşılan sorun: `FlatList` dikey kaydırma yapıyor. İçindeki satırlar yatay swipe yapıyor. Parmak hareket ettiğinde kimin kazandığına kim karar veriyor?

**Problem:**
```
FlatList (dikey scroll)
  └── SwipeableSatir (yatay swipe)
       └── GestureDetector (pan)
```

Kullanıcı çapraz kaydırırsa her ikisi de "bu benim gesture'ım" der. Çakışma.

**Çözüm: `activeOffsetX` + `failOffsetY`**

```tsx
const pan = Gesture.Pan()
  .activeOffsetX([-15, 15])  // yatay 15px geçerse swipe başlat
  .failOffsetY([-10, 10]);    // dikey 10px geçerse swipe iptal — FlatList kazanır
```

**Bu nasıl çalışır?**  
Parmak ilk hareket ettiğinde yön belirleniyor:
- Yatay 15px ilk geçerse → swipe kazandı, FlatList duraksatılıyor
- Dikey 10px ilk geçerse → swipe iptal, FlatList kaydırmaya devam ediyor

**Analoji:** İki kişi aynı kapıdan geçmek istiyor. Kural koyuyorsun: "Yataydan gelen önce geçer, dikey gelirse dur ve bekle."

---

## Long Press Gesture

Uzun basma — mesajlarda seçim modunu açmak gibi.

```tsx
const longPress = Gesture.LongPress()
  .minDuration(500) // kaç ms basılı tutunca tetiklensin (varsayılan 500)
  .onStart(() => {
    'worklet';
    // Titreşim geri bildirimi — JS Thread'de çalışır
    runOnJS(hapticFeedback)();
    olcek.value = withSpring(1.05); // hafifçe büyü
  });
```

### Gesture Kompozisyonu: Tap + LongPress Birlikte

```tsx
const tap = Gesture.Tap().onEnd(() => {
  'worklet';
  runOnJS(normalTikla)();
});

const longPress = Gesture.LongPress()
  .minDuration(600)
  .onStart(() => {
    'worklet';
    runOnJS(uzunTikla)();
  });

// ExclusiveGesture: ikisinden biri çalışsın, aynı anda değil
const gesture = Gesture.Exclusive(longPress, tap);
// Önce longPress dene, olmazsa tap

<GestureDetector gesture={gesture}>
  <View>...</View>
</GestureDetector>
```

**`Gesture.Exclusive` vs `Gesture.Simultaneous` ne demek?**

- `Exclusive`: birden fazla gesture tanımlandı ama **sadece biri** kazanır — ilk tanınan diğerini iptal eder
- `Simultaneous`: birden fazla gesture **aynı anda** çalışabilir — örneğin döndür + zoom

```tsx
// Aynı anda döndürme + zoom — fotoğraf galeri uygulaması
const pinch = Gesture.Pinch()...;
const rotation = Gesture.Rotation()...;

const gesture = Gesture.Simultaneous(pinch, rotation);
```

---

## Pinch Gesture: Yakınlaştırma/Uzaklaştırma

İki parmakla sıkıştırma — ürün görseli zoom.

```tsx
function ZoomlanabilirGorsel({ uri }: { uri: string }) {
  const olcek = useSharedValue(1);
  const baslangicOlcegi = useSharedValue(1); // gesture başlangıcındaki değer

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      baslangicOlcegi.value = olcek.value; // başlangıç değerini kaydet
    })
    .onUpdate((event) => {
      'worklet';
      // event.scale: bu gesture sırasında parmakların birbirine göre oranı
      // Başlangıç ölçeğiyle çarp — birden fazla pinch'i biriktir
      olcek.value = baslangicOlcegi.value * event.scale;
    })
    .onEnd(() => {
      'worklet';
      // Minimum 1x, maximum 3x sınırla
      if (olcek.value < 1) olcek.value = withSpring(1);
      if (olcek.value > 3) olcek.value = withSpring(3);
    });

  const gorselStil = useAnimatedStyle(() => ({
    transform: [{ scale: olcek.value }],
  }));

  return (
    <GestureDetector gesture={pinch}>
      <Animated.Image source={{ uri }} style={[styles.gorsel, gorselStil]} />
    </GestureDetector>
  );
}
```

**`baslangicOlcegi` neden gerekli?**  
`event.scale` her gesture'da 1'den başlıyor. Kullanıcı iki kez pinch yaparsa: birinci pinch 2x yaptı → bıraktı. İkinci pinch `event.scale = 1.5` verdi ama sen bunu 2x üzerine uygulaman lazım: `2 * 1.5 = 3x`. Başlangıç değerini saklamadan bu biriktirme mümkün değil.

---

## Web ile Karşılaştırma

| Web | React Native Gesture Handler | Fark |
|-----|------------------------------|------|
| `onClick` | `Gesture.Tap()` | Native thread, daha hızlı tepki |
| `onMouseDown` + `onMouseMove` | `Gesture.Pan()` | Velocity, direction hazır geliyor |
| Swipe: yok (CSS veya library) | `Gesture.Pan()` + threshold | Built-in pattern |
| Pinch: yok (DeviceOrientationEvent) | `Gesture.Pinch()` | Multi-touch native |
| Long press: `setTimeout` ile simüle | `Gesture.LongPress()` | Native, hafızasız temiz |
| Çakışma yönetimi: yok | `activeOffsetX`, `failOffsetY` | Hassas kontrol |

---

## Dikkat Edilecekler

**1. GestureHandlerRootView zorunlu**  
Uygulamanın en üstünde `GestureHandlerRootView` olmalı. Expo Router projelerinde genellikle zaten var ama kontrol et:

```tsx
// app/_layout.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* geri kalan layout */}
    </GestureHandlerRootView>
  );
}
```

**2. `.worklet()` direktifi bazı callback'lerde gerekiyor**  
`onUpdate`, `onEnd` gibi callback'ler otomatik worklet sayılıyor. Ama bazı eski örneklerde hâlâ `'worklet'` direktifi görürsün — Gesture Handler v2'de buna gerek yok, otomatik.

**3. `runOnJS` state güncellemeleri için**  
Gesture callback içinde store'u değiştirmek, navigation yapmak, console.log → hepsi `runOnJS` ile.

---

## Kontrol Soruları

1. `Pressable` ile `GestureDetector + Gesture.Tap()` arasındaki fark ne? Küçük bir buton için hangisini seçersin, neden?

2. FlatList içindeki swipe-to-delete neden çakışma yaşar? `activeOffsetX` ve `failOffsetY` bunu nasıl çözer?

3. Pinch gesture'da `baslangicOlcegi` neden kaydediyoruz? Kaydetmesek ne olur?

4. `Gesture.Exclusive` ve `Gesture.Simultaneous` farkı ne? Tap + LongPress için hangisi, Pinch + Rotation için hangisi?

5. Gesture callback içinde neden direkt `setState` veya `dispatch` çağıramazsın? `runOnJS` bunu nasıl çözüyor?

---

## Özet

| Gesture | Ne zaman | Temel event'ler |
|---------|----------|-----------------|
| `Gesture.Tap()` | Basit dokunma, buton press | `onBegin`, `onEnd`, `onFinalize` |
| `Gesture.LongPress()` | Uzun basma, seçim modu | `onStart`, `onEnd` |
| `Gesture.Pan()` | Sürükleme, swipe, kaydırma | `onUpdate` (translationX/Y, velocityX/Y) |
| `Gesture.Pinch()` | İki parmak zoom | `onUpdate` (scale) |
| `Gesture.Rotation()` | İki parmak döndürme | `onUpdate` (rotation) |
| `Gesture.Exclusive(a, b)` | Birden fazla gesture, biri kazansın | — |
| `Gesture.Simultaneous(a, b)` | İkisi aynı anda çalışsın | — |

**Yarın (Gün 26):** Skeleton Loading ve Shimmer Efekti — veri gelene kadar içerik placeholder'ı göster, `expo-linear-gradient` ile shimmer animasyonu.
