# Gün 23 — Animated API: JavaScript Thread Animasyonları

## Önce Şunu Anlayalım: Animasyon Neden Zordur?

Web'de bir şeyi animasyonlu yapmak istiyordun:

```css
.kart {
  transition: opacity 0.3s ease;
}
.kart:hover {
  opacity: 0;
}
```

Yazdın, çalıştı. Pürüzsüz. Neden bu kadar kolay? Çünkü tarayıcı bu işi tamamen GPU'ya devrediyor — JavaScript hiç karışmıyor.

React Native'de durum farklı. Animasyon **nerede çalışıyor** meselesi kritik, çünkü yanlış yerde çalışırsa ekran takılıyor. Bugün bunu anlayacağız.

---

## İki Thread, İki Dünya

React Native'de iki önemli iş parçacığı (thread) var:

**JS Thread — Yönetici**  
JavaScript kodunun çalıştığı yer. React bileşenlerin render'ı, state güncellemeleri, event handler'lar, API istekleri — hepsi burada. Meşgul olursa diğer işleri beklemek zorunda.

**UI Thread — Çizer**  
Ekrana pikselleri çizen yer. Her saniye 60 kare çizmesi gerekiyor (60fps). Bir kareyi çizmek için 16 milisaniye var. Bu çok kısa bir süre.

### Sorun şu:

Varsayılan (naive) animasyonda JS Thread her kare için UI Thread'e mesaj gönderir:

```
JS Thread: "opacity şimdi 0.1 olsun"  → UI Thread: çizdi
JS Thread: "opacity şimdi 0.2 olsun"  → UI Thread: çizdi
JS Thread: "opacity şimdi 0.3 olsun"  → UI Thread: çizdi
...
```

Bu sırada JS Thread'de başka bir şey olursa — API isteği bitip 50 ürün parse ediliyorsa — animasyon mesajları gecikerek gidiyor. UI Thread bekliyor. Ekran takılıyor. Buna **jank** deniyor.

### Analoji: Mutfak ve Garson

JS Thread = mutfak. UI Thread = garson.

- Normal animasyon: garson her adımı mutfaktan soruyor. Mutfak yoğunsa garson bekliyor, müşteriler (kullanıcı) donuk garson görüyor.
- `useNativeDriver: true`: mutfak garsona tüm menüyü önceden veriyor. Garson mutfağı beklemeden bağımsız çalışıyor. Mutfak meşgul olsa bile animasyon akmaya devam ediyor.

---

## Animated.Value: Dimmer Switch

`Animated.Value` bir değer tutar — ama sıradan `number` değil. **Animasyonlu değer.** 

Fiziksel bir dimmer switch (kısma düğmesi) düşün. Düğme 0 ile 1 arasında. 0 = ışık kapalı, 1 = tam açık. Düğmeyi döndürünce ışık yavaşça değişiyor.

`Animated.Value(0)` → başlangıçta 0 (kapalı)  
Animate ettikçe değer yavaşça değişiyor (0.1, 0.2, ... 1.0)  
Bu değişen sayı doğrudan stil'e bağlı → opacity, transform, vs.

```tsx
import { useRef } from 'react';
import { Animated } from 'react-native';

// useRef: her render'da sıfırlanmasın
// useState ile yapsaydın: her değer değişiminde component yeniden render olurdu
// Bu da animasyonu bozardı — her render yeni bir değer başlatır
const opacity = useRef(new Animated.Value(0)).current;
//                                       ^
//                                       başlangıç değeri: 0 (görünmez)
```

**Neden `useRef`?**  
`useState(0)` kullansaydın ne olurdu? `setOpacity(0.1)`, `setOpacity(0.2)` her çağrıda component yeniden render olurdu. Animasyon "0, render, 0.1, render, 0.2, render..." diye giderdi. Performans felaketi. `useRef` değeri depolar ama render tetiklemez.

---

## Animated.timing: Düz, Öngörülebilir Animasyon

```tsx
// Değeri 0'dan 1'e 500ms'de götür
Animated.timing(opacity, {
  toValue: 1,           // hedef değer
  duration: 500,        // kaç milisaniye sürsün
  useNativeDriver: true // animasyonu UI thread'e ver, JS thread'i atlat
}).start();             // başlat
```

**`useNativeDriver: true` yazmasaydın ne olurdu?**  
Animasyon JS Thread üzerinde çalışırdı. Uygulama yoğunken (API isteği, hesaplama) animasyon takılırdı. Kartlar fade-in olurken ekran donardı.

**Kısıtı:** `useNativeDriver: true` sadece bazı özelliklerle çalışır:
- `opacity` ✅
- `transform` (translateX, translateY, scale, rotate) ✅
- `backgroundColor` ❌ — JS Thread'de kalmak zorunda
- `width`, `height`, `padding`, `margin` ❌

Boyut animasyonları yapmak istiyorsan `useNativeDriver: false` zorunlu — ama Reanimated 3 (yarın) bunu da native'de yapabiliyor.

### ShopApp: Ürün listesi yüklenince kartlar fade-in olsun

```tsx
// components/ProductCard.tsx
import { useRef, useEffect } from 'react';
import { Animated, Pressable } from 'react-native';

export function ProductCard({ ... }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Component mount olunca animasyonu başlat
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []); // [] → sadece mount'ta bir kez

  // Pressable yerine Animated.createAnimatedComponent(Pressable) ya da
  // <Animated.View> ile sarıyoruz — normal View animated style'ı anlamaz
  return (
    <Animated.View style={{ opacity }}>
      <Pressable ...>
        {/* kart içeriği */}
      </Pressable>
    </Animated.View>
  );
}
```

**`Animated.View` neden var, normal `View` olmuyor mu?**  
Normal `View`, `style={{ opacity: animatedValue }}` verildiğinde `Animated.Value` objesini anlayamaz. `Animated.View` ise özel bir sarıcı — `Animated.Value` değişikliklerini dinleyip stil'e doğrudan uyguluyor.

---

## Animated.spring: Fizik Tabanlı, Doğal Animasyon

`timing` sabit hızda gider. `spring` ise yay gibi — hedefe giderken biraz aşıp geri gelir. Daha doğal hissettiriyor.

```tsx
const olcek = useRef(new Animated.Value(1)).current;

function sepeteEkle() {
  // Butonu önce küçült, sonra yay gibi geri döndür
  Animated.spring(olcek, {
    toValue: 0.85,  // %85'e küçül
    useNativeDriver: true,
  }).start(() => {
    // Animasyon bitince callback — geri büyüt
    Animated.spring(olcek, {
      toValue: 1,   // normal boyuta dön
      friction: 3,  // sürtünme: düşük = daha çok sallanma
      tension: 40,  // gerilim: yüksek = daha sert yay
      useNativeDriver: true,
    }).start();
  });
}
```

**`friction` ve `tension` ne?**  
Fizik simülasyonu. Gerçek yayı düşün:
- `friction` (sürtünme): yüksekse yay çabuk durur, düşükse uzun sallanır
- `tension` (gerilim): yüksekse sert yay (hızlı gider), düşükse yumuşak yay (yavaş gider)

### ShopApp: Sepete ekle butonuna basınca "sıkışma" efekti

```tsx
// app/products/[id].tsx
const butonOlcek = useRef(new Animated.Value(1)).current;

function sepeteEkleAnimasyonlu() {
  Animated.sequence([
    Animated.spring(butonOlcek, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 5,
    }),
    Animated.spring(butonOlcek, {
      toValue: 1,
      useNativeDriver: true,
      friction: 3,
      tension: 40,
    }),
  ]).start();

  addItem(urun); // asıl sepete ekleme işlemi
}

// JSX:
<Animated.View style={{ transform: [{ scale: butonOlcek }] }}>
  <Pressable onPress={sepeteEkleAnimasyonlu} style={styles.sepetButon}>
    <Text>Sepete Ekle</Text>
  </Pressable>
</Animated.View>
```

---

## Animated.sequence ve Animated.parallel: Sıralı ve Eş Zamanlı

### sequence: Biri bitince diğeri başlasın

```tsx
// Önce kaybolsun, sonra yer değiştirsin, sonra tekrar görünsün
Animated.sequence([
  Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
  Animated.timing(translateY, { toValue: -20, duration: 0, useNativeDriver: true }),
  Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
]).start();
```

**Ne zaman kullanılır?** Birinin bitmesine bağlı animasyonlarda. Buton tıklanınca önce tıklanma efekti, sonra loading, sonra başarı.

### parallel: Hepsi aynı anda başlasın

```tsx
// Opacity ve yukarı kayma aynı anda başlasın
const translateY = useRef(new Animated.Value(30)).current;

Animated.parallel([
  Animated.timing(opacity, {
    toValue: 1,
    duration: 400,
    useNativeDriver: true,
  }),
  Animated.timing(translateY, {
    toValue: 0,         // aşağıdan yukarıya gel
    duration: 400,
    useNativeDriver: true,
  }),
]).start();
```

**Görsel etki:** Element hem görünürleşiyor (opacity) hem de aşağıdan yukarı süzülüyor (translateY). Birlikte çok daha zengin bir animasyon.

### ShopApp: Toast bildirimi aşağıdan süzülsün

```tsx
// components/Toast.tsx
type Props = { mesaj: string; gorunur: boolean };

export function Toast({ mesaj, gorunur }: Props) {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (gorunur) {
      // Görün: aşağıdan gel + fade in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Kaybol: aşağı git + fade out
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [gorunur]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={styles.mesaj}>{mesaj}</Text>
    </Animated.View>
  );
}
```

---

## Animated.loop: Sürekli Dönen Animasyon

Yükleniyor spinner'ı, kalp atışı, "yeni ürün" rozeti gibi sürekli tekrar eden animasyonlar için.

```tsx
const dondur = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.loop(
    Animated.timing(dondur, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    })
  ).start();

  // Cleanup: component unmount olunca animasyonu durdur
  return () => dondur.stopAnimation();
}, []);

// 0-1 değerini 0deg-360deg'e çevir
const donusInterpolated = dondur.interpolate({
  inputRange: [0, 1],
  outputRange: ['0deg', '360deg'],
});

<Animated.View style={{ transform: [{ rotate: donusInterpolated }] }}>
  <Ionicons name="refresh" size={24} color={COLORS.primary} />
</Animated.View>
```

---

## interpolate: Bir Değeri Başka Bir Değere Çevir

`dondur` 0'dan 1'e gidiyor. Ama rotate `'0deg'`'den `'360deg'`'e gitmeli. Nasıl çevirirsin?

`interpolate` bunu yapar. "0 iken şu, 1 iken bu" diyorsun:

```tsx
const genislik = olcek.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 300],
  // 0 → 0px genişlik
  // 1 → 300px genişlik
});

const renk = ilerleme.interpolate({
  inputRange: [0, 0.5, 1],
  outputRange: ['#ff0000', '#ffff00', '#00ff00'],
  // 0 → kırmızı, 0.5 → sarı, 1 → yeşil
  // Not: renk animasyonu useNativeDriver: false gerektiriyor
});
```

### ShopApp: İndirim rozetini nefes aldır

```tsx
const nefes = useRef(new Animated.Value(1)).current;

useEffect(() => {
  if (!urun.indirim) return;

  Animated.loop(
    Animated.sequence([
      Animated.timing(nefes, {
        toValue: 1.1, // %110'a büyü
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(nefes, {
        toValue: 1,   // normale dön
        duration: 800,
        useNativeDriver: true,
      }),
    ])
  ).start();

  return () => nefes.stopAnimation();
}, [urun.indirim]);

// İndirim rozeti:
{urun.indirim && (
  <Animated.View
    style={[
      styles.indirimRozeti,
      { transform: [{ scale: nefes }] },
    ]}
  >
    <Text style={styles.indirimYazi}>%{urun.indirim}</Text>
  </Animated.View>
)}
```

---

## Karşılaştırma: CSS Animasyon vs Animated API

| CSS (Web) | Animated API (RN) | Fark |
|-----------|-------------------|------|
| `transition: opacity 0.3s` | `Animated.timing(opacity, { duration: 300 })` | Imperative vs declarative |
| `@keyframes` | `Animated.sequence([...])` | Adımları kendin yazıyorsun |
| GPU otomatik | `useNativeDriver: true` ile | Özellikle belirtmek gerekiyor |
| `:hover`, `:active` | `onPressIn`, `onPressOut` event + `Animated.spring` | Event ile tetikleniyor |
| `animation-iteration-count: infinite` | `Animated.loop(...)` | Benzer mantık |
| `transform: scale(0.9)` | `transform: [{ scale: 0.9 }]` | Array içinde obje — farklı syntax |

---

## Dikkat: Animated API'nin Kısıtları

1. **`useNativeDriver: true` sadece transform ve opacity.** Renk, boyut, padding animasyonları için `false` kullanmak zorundaysın — ama bu jank riski demek. Bunlar için Reanimated 3 (yarın) çok daha iyi.

2. **`Animated.Value`'lar birleştirilince dikkat.** İki `Animated.Value`'yu matematiksel işleme sokmak için `Animated.add`, `Animated.multiply` gibi operatörler var. Sıradan `+` çalışmaz.

3. **Her animasyon için `useRef`.** `useRef` olmadan değer her render'da sıfırlanır.

4. **`stopAnimation` ile cleanup.** `useEffect` içinde başlatılan döngüsel animasyonları return fonksiyonunda durdur. Aksi halde component unmount olsa bile animasyon devam eder — memory leak.

---

## Kontrol Soruları

1. JS Thread animasyonu ile Native Thread animasyonu arasındaki görsel fark ne zaman hissedilir? Küçük projede fark eder mi?

2. `useRef(new Animated.Value(0))` yerine `useState(new Animated.Value(0))` yazsaydın ne olurdu?

3. `Animated.sequence` ile `Animated.parallel` farkını ShopApp'teki bir senaryo üzerinden açıkla.

4. `useNativeDriver: true` iken `backgroundColor` animasyonu neden çalışmıyor?

5. `Animated.loop` ile başlattığın animasyonu neden durdurmak zorundasın? Durdurmasan ne olur?

---

## Özet

| API | Ne yapar | Ne zaman |
|-----|----------|----------|
| `Animated.Value(n)` | Animasyonlu değer tutar | Her animasyonun başlangıcı |
| `Animated.timing` | Sabit hız, öngörülebilir | Açılma/kapanma, fade |
| `Animated.spring` | Yay gibi, doğal | Buton tap, geri yay efekti |
| `Animated.sequence` | Biri bitince diğeri | Adım adım animasyon |
| `Animated.parallel` | Aynı anda | Birden fazla özellik birlikte |
| `Animated.loop` | Sonsuz tekrar | Spinner, nefes efekti |
| `interpolate` | Değeri başka değere çevir | 0-1 → '0deg'-'360deg' |
| `useNativeDriver: true` | Native thread'e taşı | Mümkün her yerde |

**Yarın (Gün 24):** Reanimated 3 — animasyonları tamamen native thread'de çalıştır, `useSharedValue`, `withTiming`, `withSpring`. Bugünkü kısıtlar ortadan kalkıyor.
