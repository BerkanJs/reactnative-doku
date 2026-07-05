# Gün 5 — Expo Router: Next.js'ten Tanıdık File-based Routing

> **Faz:** 1 — Temeller | **Hafta:** 2 | **Gün:** 5 / 60
>
> **Bugünün Hedefi:** Expo Router'ı Next.js App Router ile karşılaştırarak öğrenmek.
> ShopApp'e ürün detay ekranı ve sayfa geçişi ekleyeceğiz.

---

## 1. Expo Router Nedir?

React Native'de navigasyon yapmak için tarihsel olarak **React Navigation** kullanılırdı — bileşen bazlı, konfigürasyon ağır bir kütüphane. Her route'u kodda tanımlamak gerekiyordu.

Expo Router, React Navigation'ın üzerine **Next.js App Router mantığını** getirdi: dosya adı = route. Next.js biliyor musun? O zaman Expo Router'ı da biliyorsun demektir — farklar küçük.

```
Next.js App Router:          Expo Router:
app/
├── page.tsx          →      app/
├── layout.tsx               ├── index.tsx
├── products/                ├── _layout.tsx
│   ├── page.tsx             ├── products/
│   └── [id]/                │   ├── index.tsx
│       └── page.tsx         │   └── [id].tsx
└── (auth)/                  └── (auth)/
    └── login/                   └── login.tsx
        └── page.tsx
```

En büyük fark: Next.js'te her route bir **klasör** içinde `page.tsx`. Expo Router'da route doğrudan **dosyanın kendisi** — `[id].tsx`, klasör değil.

---

## 2. Kurulum

Yeni bir Expo projesi oluştururken Expo Router varsayılan olarak gelir:

```bash
npx create-expo-app ShopApp
```

Mevcut bir projeye eklemek için:

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens
```

`package.json`'da `main` alanını güncelle:

```json
{
  "main": "expo-router/entry"
}
```

---

## 3. Dosya Yapısı → Route Yapısı

```
app/
├── _layout.tsx          → Kök layout (tüm uygulamanın sarmalayıcısı)
├── index.tsx            → "/" → Ana sayfa (ürün listesi)
├── products/
│   ├── _layout.tsx      → /products altındaki tüm ekranların layout'u
│   └── [id].tsx         → "/products/123" → Ürün detay
├── cart/
│   └── index.tsx        → "/cart" → Sepet
└── (auth)/              → Parantez = route group (URL'ye yansımaz)
    ├── _layout.tsx
    ├── login.tsx         → "/login" (NOT: "/auth/login" değil)
    └── register.tsx      → "/register"
```

### Önemli kurallar:

**`index.tsx`** → klasörün kendisi (`/products/index.tsx` = `/products`)
**`[id].tsx`** → dinamik segment (`/products/[id].tsx` = `/products/herhangi-bir-deger`)
**`_layout.tsx`** → o klasördeki ekranların ortak sarmalayıcısı
**`(klasor)/`** → route group — URL'ye yansımaz, sadece düzenleme amaçlı

---

## 4. Next.js ile Karşılaştırma

| Next.js App Router | Expo Router | Fark |
|---|---|---|
| `app/page.tsx` | `app/index.tsx` | Dosya adı: `page` → `index` |
| `app/products/[id]/page.tsx` | `app/products/[id].tsx` | Klasör değil direkt dosya |
| `layout.tsx` | `_layout.tsx` | Alt çizgi prefix |
| `<Link href="/products/1">` | `<Link href="/products/1">` | Aynı! |
| `useSearchParams()` | `useLocalSearchParams()` | "Local" = bu ekrana ait |
| `useParams()` | `useLocalSearchParams()` | Aynı hook, farklı isim |
| `router.push('/products/1')` | `router.push('/products/1')` | Aynı! |
| `router.replace(...)` | `router.replace(...)` | Aynı! |
| `router.back()` | `router.back()` | Aynı! |
| `notFound()` | `router.push('/+not-found')` | Farklı yaklaşım |

Neden `useLocalSearchParams`? Çünkü React Navigation'da "global" params da var. `useLocalSearchParams` yalnızca aktif ekranın parametrelerini alır — Next.js'teki `useSearchParams` ile aynı davranış.

---

## 5. `_layout.tsx` — Kök Layout

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      {/*
        Stack Navigator: ekranlar üst üste yığılır
        Yeni ekran açıldığında üstten kayarak gelir (iOS)
        Geri tuşu / swipe ile önceki ekrana döner
        Gün 6'da derinlemesine işleyeceğiz
      */}
      <Stack.Screen name="index" options={{ title: 'ShopApp' }} />
      <Stack.Screen name="products/[id]" options={{ title: 'Ürün Detayı' }} />
    </Stack>
  );
}
```

Next.js'teki `layout.tsx` ile aynı mantık: tüm alt route'ları sarar.

---

## 6. Ana Sayfa — `app/index.tsx`

```tsx
// app/index.tsx
import { View, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { ProductGrid } from '../components/ProductGrid';
import { COLORS, SPACING } from '../constants/theme';

const URUNLER = [
  { id: '1', isim: 'Nike Air Max 270', fiyat: 2999, gorsel: 'https://picsum.photos/seed/nike/400/400', indirim: 20 },
  { id: '2', isim: 'Adidas Ultraboost 22', fiyat: 3499, gorsel: 'https://picsum.photos/seed/adidas/400/400' },
  { id: '3', isim: 'Puma RS-X', fiyat: 1899, gorsel: 'https://picsum.photos/seed/puma/400/400', indirim: 10 },
  { id: '4', isim: 'New Balance 574', fiyat: 2199, gorsel: 'https://picsum.photos/seed/nb/400/400' },
];

export default function AnaSayfa() {
  return (
    <View style={styles.sayfa}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProductGrid
          urunler={URUNLER}
          onUrunPress={(id) => {
            // Gün 5'te navigasyonu Link ile yapacağız — bu callback'e gerek kalmayacak
            // Şimdilik console.log bırakıyoruz, aşağıda Link örneğini göreceğiz
            console.log(id);
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sayfa: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
```

---

## 7. Navigasyon: `<Link>` ve `useRouter`

### `<Link>` — Declarative (Next.js ile birebir aynı)

```tsx
import { Link } from 'expo-router';
import { Text, Pressable } from 'react-native';

// Basit link:
<Link href="/products/1">
  <Text>Ürün Detayı</Text>
</Link>

// Dinamik:
<Link href={`/products/${urun.id}`}>
  <Text>{urun.isim}</Text>
</Link>

// asChild: Link'i başka bir bileşene uygula (Pressable üzerinde Link davranışı)
<Link href={`/products/${urun.id}`} asChild>
  <Pressable style={styles.kart}>
    <Text>{urun.isim}</Text>
  </Pressable>
</Link>
// asChild olmadan Link kendi View'ını oluşturur — stil vermek zor
// asChild ile Pressable'ın press davranışını + Link'in navigasyonunu birleştiriyoruz
```

### `useRouter` — Imperative (programatik yönlendirme)

```tsx
import { useRouter } from 'expo-router';

function SepetButonu({ urunId }: { urunId: string }) {
  const router = useRouter();

  const sepeteEkleVeGit = () => {
    // Önce bir iş yap, sonra navigate et
    sepeteEkle(urunId);
    router.push('/cart');
  };

  return (
    <Pressable onPress={sepeteEkleVeGit}>
      <Text>Sepete Ekle</Text>
    </Pressable>
  );
}
```

### `push` vs `replace` — Auth redirect'te kritik fark:

```tsx
// push: stack'e ekle — geri tuşuyla önceki ekrana dönülebilir
router.push('/products/1');
// Stack: [AnaSayfa] → [AnaSayfa, UrunDetay]
// Geri tuşu → AnaSayfa'ya döner

// replace: mevcut ekranı değiştir — geri tuşuyla dönülemez
router.replace('/home');
// Kullanım: login başarılı → Home'a git, login ekranına dönülmesin
// Stack: [Login] → [Home]  (Login stack'ten çıktı)

// back: bir önceki ekrana dön
router.back();
// Stack: [AnaSayfa, UrunDetay] → [AnaSayfa]
```

---

## 8. Parametre Almak: `useLocalSearchParams`

```tsx
// app/products/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { View, Text } from 'react-native';

export default function UrunDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // TypeScript generic ile tip güvenliği
  // id: "/products/nike-air-max-270" → "nike-air-max-270"

  return (
    <View>
      <Text>Ürün ID: {id}</Text>
    </View>
  );
}
```

### Query string parametreleri:

```tsx
// Link ile query string:
<Link href="/products/1?renk=kirmizi&beden=42">

// veya obje syntax (daha temiz):
<Link href={{ pathname: '/products/[id]', params: { id: '1', renk: 'kirmizi', beden: '42' } }}>

// Almak:
const { id, renk, beden } = useLocalSearchParams<{
  id: string;
  renk: string;
  beden: string;
}>();
```

---

## 9. ShopApp: Ürün Detay Ekranı

`app/products/[id].tsx` dosyasını oluştur:

```tsx
// app/products/[id].tsx
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOW } from '../../constants/theme';

// Normalde API'den gelir — Gün 18'de gerçek API bağlayacağız
const URUN_DETAYLARI: Record<string, {
  isim: string;
  fiyat: number;
  gorsel: string;
  aciklama: string;
  indirim?: number;
}> = {
  '1': {
    isim: 'Nike Air Max 270',
    fiyat: 2999,
    gorsel: 'https://picsum.photos/seed/nike/800/600',
    aciklama: 'Air Max 270, Nike\'nin en büyük Air birimine sahip ilk lifestyle ayakkabısıdır. Gün boyu konfor sağlar.',
    indirim: 20,
  },
  '2': {
    isim: 'Adidas Ultraboost 22',
    fiyat: 3499,
    gorsel: 'https://picsum.photos/seed/adidas/800/600',
    aciklama: 'Boost teknolojisi ile maksimum enerji iadesi. Her adımda fark hissedilir.',
  },
};

export default function UrunDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const urun = URUN_DETAYLARI[id];

  // Ürün bulunamadıysa geri git
  if (!urun) {
    return (
      <View style={styles.hata}>
        <Text style={styles.hataYazi}>Ürün bulunamadı</Text>
        <Pressable style={styles.geriButon} onPress={() => router.back()}>
          <Text style={styles.geriButonYazi}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const indirimliKFiyat = urun.indirim ? urun.fiyat * (1 - urun.indirim / 100) : null;

  return (
    <>
      {/*
        Stack.Screen: bu ekranın header ayarlarını burada da yapabilirsin
        _layout.tsx'te tanımlamak yerine ekran içinden dinamik başlık vermek için
      */}
      <Stack.Screen options={{ title: urun.isim }} />

      <ScrollView style={styles.sayfa} showsVerticalScrollIndicator={false}>

        {/* GÖRSEL */}
        <Image
          source={{ uri: urun.gorsel }}
          style={styles.gorsel}
          resizeMode="cover"
        />

        {/* DETAY ALANI */}
        <View style={styles.detay}>

          <Text style={styles.isim}>{urun.isim}</Text>

          {/* FİYAT */}
          <View style={styles.fiyatAlani}>
            {indirimliKFiyat ? (
              <>
                <Text style={styles.yeniFiyat}>
                  {indirimliKFiyat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                </Text>
                <View style={styles.indirimBadge}>
                  <Text style={styles.indirimYazi}>%{urun.indirim} İndirim</Text>
                </View>
                <Text style={styles.eskiFiyat}>
                  {urun.fiyat.toLocaleString('tr-TR')} TL
                </Text>
              </>
            ) : (
              <Text style={styles.fiyat}>
                {urun.fiyat.toLocaleString('tr-TR')} TL
              </Text>
            )}
          </View>

          {/* AÇIKLAMA */}
          <Text style={styles.aciklamaBaslik}>Ürün Açıklaması</Text>
          <Text style={styles.aciklama}>{urun.aciklama}</Text>

          {/* SEPETE EKLE */}
          <Pressable
            style={({ pressed }) => [
              styles.sepetButon,
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => {
              // Gün 14'te state management — şimdilik log
              console.log('Sepete eklendi:', id);
              router.push('/cart');
            }}
          >
            <Text style={styles.sepetButonYazi}>Sepete Ekle</Text>
          </Pressable>

        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  sayfa: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  gorsel: {
    width: '100%',
    height: 320,
  },

  detay: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    marginTop: -SPACING.xl,
    // Negatif margin: görsel üstüne bindirme efekti
    // Web'de de aynı trick kullanılır
    ...SHADOW.lg,
  },

  isim: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  fiyatAlani: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },

  fiyat: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  yeniFiyat: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
  },

  eskiFiyat: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textDisabled,
    textDecorationLine: 'line-through',
  },

  indirimBadge: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },

  indirimYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },

  aciklamaBaslik: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },

  aciklama: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },

  sepetButon: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },

  sepetButonYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },

  hata: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
  },

  hataYazi: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },

  geriButon: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },

  geriButonYazi: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
```

### Ana sayfadan detaya bağla:

`ProductGrid.tsx`'te `onUrunPress` yerine doğrudan `Link` kullanalım:

```tsx
// components/ProductGrid.tsx — Pressable'ı Link ile sar
import { Link } from 'expo-router';

// ...

<Link href={`/products/${urun.id}`} asChild>
  <Pressable
    style={({ pressed }) => [
      styles.kart,
      { width: kartGenisligi },
      pressed && { opacity: 0.85 },
    ]}
  >
    {/* ...kart içeriği */}
  </Pressable>
</Link>
```

---

## 10. Route Grupları: `(auth)`, `(tabs)`

Parantezli klasörler URL'ye yansımaz — sadece dosya organizasyonu ve layout ayırmak için:

```
app/
├── (auth)/
│   ├── _layout.tsx    → Sadece auth ekranları için layout (header yok)
│   ├── login.tsx      → Route: "/login" (NOT: "/auth/login")
│   └── register.tsx   → Route: "/register"
│
└── (shop)/
    ├── _layout.tsx    → Tab Navigator (Gün 6)
    ├── index.tsx      → Route: "/"
    └── cart.tsx       → Route: "/cart"
```

```tsx
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth ekranlarında header yok */}
    </Stack>
  );
}
```

---

## 11. Expo Router vs React Navigation

Projelerde her ikisini de görürsün — fark ne?

| | React Navigation | Expo Router |
|---|---|---|
| **Yapı** | Kodda tanımlanır | Dosya sistemi |
| **Öğrenme** | Konfigürasyon ağır | Next.js biliyorsan hızlı |
| **Deep link** | Manuel kurulum gerekir | Otomatik (URL ↔ route) |
| **Web desteği** | Sınırlı | Tam (React Native Web) |
| **Altında ne var?** | Kendisi | React Navigation |
| **Şirkette kullanım** | Çok yaygın (eski projeler) | Yeni Expo projeleri |

> Expo Router, React Navigation'ın üzerine kurulu — ikisi çelişmez. Expo Router ile yeni proje başlıyorsan file-based routing kullan. Eski React Navigation projesi görürsen konfigürasyona alış.

---

## 12. Yaygın Hatalar

**Hata 1: `_layout.tsx` yokken white screen**
```
app/
└── index.tsx   ← _layout.tsx yok → uygulama açılmaz

app/
├── _layout.tsx  ← şart
└── index.tsx
```

**Hata 2: Dinamik route ismi yanlış**
```tsx
// Dosya: app/products/[id].tsx
// ❌ Yanlış parametre adı:
const { productId } = useLocalSearchParams();  // undefined

// ✅ Dosya adındaki köşeli parantez içindeki isim:
const { id } = useLocalSearchParams();
```

**Hata 3: `router.push` ile geri dönülemeyen ekran**
```tsx
// Login → Home geçişinde push kullanılırsa:
router.push('/home');
// Kullanıcı geri tuşuna basınca Login'e döner — istenmiyor

// ✅ replace kullan:
router.replace('/home');
// Login stack'ten çıkar, geri tuşu çalışmaz
```

**Hata 4: `Link` içinde Pressable — `asChild` unutuldu**
```tsx
// ❌ asChild yok → Link kendi View'ını oluşturur, Pressable ayrı render edilir
<Link href="/products/1">
  <Pressable style={styles.kart}>
    <Text>Ürün</Text>
  </Pressable>
</Link>

// ✅ asChild → Link, Pressable'ı ele geçirir
<Link href="/products/1" asChild>
  <Pressable style={styles.kart}>
    <Text>Ürün</Text>
  </Pressable>
</Link>
```

---

## 13. Kontrol Soruları

**1. `(tabs)` klasörü neden parantez içinde? URL'ye yansır mı?**
> Parantezli klasörler route group — URL'ye yansımaz. `app/(tabs)/index.tsx` → route `/`. Sadece dosya organizasyonu ve `_layout.tsx` ayrımı için. Tab Navigator'ı shop ekranlarından ayırmak, auth layout'unu ayrı tutmak gibi amaçlar.

**2. Expo Router ile React Navigation arasındaki fark ne?**
> Expo Router, React Navigation'ın üzerine inşa edilmiş file-based bir soyutlama. React Navigation'da tüm route'lar kodda tanımlanır; Expo Router'da dosya adı = route. Yeni Expo projelerinde Expo Router tercih edilir. Eski projelerde React Navigation görürsün — Gün 6'da her ikisini de işleyeceğiz.

**3. `router.replace` ile `router.push` farkı — auth redirect'te hangisi?**
> `push` stack'e ekler — geri tuşuyla dönülebilir. `replace` mevcut ekranı değiştirir — geri tuşuyla dönülemez. Login başarılı → Home: mutlaka `replace` kullan. Aksi halde kullanıcı Home'dayken geri tuşuna basınca Login'e düşer.

---

## Bugün Ne Yaptık?

```
✅ Expo Router'ın Next.js App Router ile farkını anladık
✅ Dosya sistemi → route dönüşümünü kavradık
✅ _layout.tsx'in rolünü öğrendik
✅ Link ve useRouter ile navigasyon yazdık
✅ push vs replace farkını (auth redirect) anladık
✅ useLocalSearchParams ile dinamik parametre aldık
✅ Route group (parantezli klasör) mantığını anladık
✅ Ürün detay ekranı yazdık — ana sayfadan tıklanabilir
✅ asChild pattern ile Link + Pressable birleştirdik
```

---

## Sonraki Gün

**[Gün 6 → Stack ve Tab Navigator ile Gerçek Navigasyon](gun06_stack_tab_navigator.md)**

Stack'in davranışı, Tab bar, Drawer, header özelleştirme.
ShopApp'e alt tab bar ekliyoruz: Ürünler, Sepet, Profil.

---

*← [Gün 4](gun04_flexbox.md) | [Müfredat](../reactNaitiveMufredat.md) | [Gün 6 →](gun06_stack_tab_navigator.md)*
