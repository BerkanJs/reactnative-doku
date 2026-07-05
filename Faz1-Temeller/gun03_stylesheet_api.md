# Gün 3 — StyleSheet API: CSS Yok, Ama Flexbox Var

> **Faz:** 1 — Temeller | **Hafta:** 1 | **Gün:** 3 / 60
>
> **Bugünün Hedefi:** React Native'de stil nasıl yazılır, CSS'den ne fark eder, neler yoktur?
> ShopApp için **tema sistemi** kuracağız — renkler, spacing, typography tek dosyada.

---

## 1. CSS Tarayıcıda Çalışır, React Native'de Tarayıcı Yok

Web'de stil yazarken tarayıcı CSS motoru devreye giriyordu:
- Sınıf (class) seçiciler
- ID seçiciler
- `:hover`, `:focus`, `:active` pseudo-class'lar
- Kalıtım (inheritance): `font-size` parent'tan child'a geçerdi
- Cascade: birden fazla kural aynı elemente uygulanabilirdi

React Native'de **bunların hiçbiri yok.** Tarayıcı yok, DOM yok, CSSOM yok.

Stil yazmak için iki yol var:

```tsx
// 1. Inline style (her render'da yeni obje — küçük kullanımlar için)
<Text style={{ fontSize: 16, color: '#333' }}>Ürün Adı</Text>

// 2. StyleSheet.create (önerilen — bir kez oluşturulur, yeniden kullanılır)
const styles = StyleSheet.create({
  urunAdi: { fontSize: 16, color: '#333' }
});
<Text style={styles.urunAdi}>Ürün Adı</Text>
```

---

## 2. Birimler: `px` Yok, `dp` Var

Web'de `px`, `rem`, `em`, `vw`, `vh` kullanırdık. React Native'de **sadece sayı** yazılır.

```tsx
// Web:
<p style={{ fontSize: '16px', marginBottom: '8px', borderRadius: '12px' }}>

// React Native:
<Text style={{ fontSize: 16, marginBottom: 8, borderRadius: 12 }}>
```

Bu sayıların birimi **dp (density-independent pixels)**. Fiziksel piksel değil, ekranın DPI'ına göre ölçeklenir.

### dp neden önemli?

| Ekran | DPI | 1dp = kaç fiziksel piksel? |
|---|---|---|
| Düşük yoğunluk | 160 dpi | 1px |
| Orta yoğunluk (mdpi) | 160 dpi | 1px |
| Yüksek yoğunluk (xhdpi) | 320 dpi | 2px |
| Çok yüksek (xxhdpi) | 480 dpi | 3px |

`fontSize: 16` yazarsan — eski bir telefonda 16 piksel, retina bir iPhone'da 32 piksel olarak render edilir. Ama gözüne **her iki ekranda da aynı boyutta** görünür. Bunu tarayıcı senin için yapıyordu, şimdi React Native yapıyor.

### `%` desteği kısıtlıdır:

```tsx
// Çalışır:
<View style={{ width: '50%' }}>    // parent genişliğinin %50'si
<View style={{ height: '100%' }}>  // parent yüksekliğinin %100'ü

// Çalışmaz (desteklenmez):
<Text style={{ fontSize: '10%' }}>    // ❌ yazı boyutu % ile olmaz
<View style={{ margin: '5%' }}>       // ❌ margin % desteklemez
```

---

## 3. `StyleSheet.create` Neden Tercih Edilir?

```tsx
// Her render'da yeni obje oluşturur — GC baskısı
<View style={{ backgroundColor: '#fff', padding: 16 }}>

// StyleSheet.create: obje bir kez oluşturulur, freeze edilir
const styles = StyleSheet.create({
  kart: { backgroundColor: '#fff', padding: 16 }
});
<View style={styles.kart}>
```

**Arka planda ne oluyor?**

1. `StyleSheet.create` çağrıldığında obje dondurulur (freeze) ve her stile bir **integer ID** atanır.
2. Bu ID, React Native'nin JS↔Native köprüsünden geçirilir — tüm obje değil sadece sayı.
3. Native taraf bu ID'ye karşılık gelen stili önbellekte tutar.

Inline `style={{ }}` ile her render'da yeni bir JS objesi oluşturulur ve köprüden tüm veri geçer. `FlatList`'te 100 item varsa bu 100 gereksiz obje.

**Pratik kural:** Statik stiller → `StyleSheet.create`. Dinamik stiller (değişkene göre değişen) → inline veya array birleştirme:

```tsx
// Stokta yoksa kırmızı göster — dinamik stil
<Text style={[styles.fiyat, stokYok && styles.stokYok]}>
  {fiyat} TL
</Text>

const styles = StyleSheet.create({
  fiyat: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  stokYok: { color: '#ef4444', textDecorationLine: 'line-through' },
});
```

---

## 4. Desteklenmeyen CSS Özellikleri

Web'den gelince bunları ararsın ama yoklar:

| CSS (Web) | React Native Karşılığı |
|---|---|
| `display: grid` | **Yok.** Sadece Flexbox var (Gün 4). |
| `position: fixed` | **Yok.** `absolute` kullanılır ama tüm sayfaya göre değil, en yakın parent'a göre. Sabit header/tab için Navigation (Gün 5-6). |
| `:hover` | **Yok.** `onPressIn` / `onHoverIn` (RN 0.71+, web only). |
| `:focus` | **Yok.** `TextInput`'un `onFocus` event'i var. |
| CSS kalıtımı | **Yok.** Her `Text` kendi stilini taşır; parent'tan `color` geçmez. |
| `z-index` | **Kısıtlı.** Sibling'ler arasında çalışır, cross-hierarchy'de davranışı tahmin edilemez. |
| `calc()` | **Yok.** JS ile hesaplama yap: `width: screenWidth - 32`. |
| CSS değişkenleri (`--color-primary`) | **Yok.** JS sabitleri kullan: `COLORS.primary`. |
| Tailwind class'ları | **Yok** (doğrudan). NativeWind kütüphanesi ile mümkün — Gün 36. |

### Kalıtım yokluğu önemli:

```tsx
// Web'de parent'taki color child'lara geçer:
<div style={{ color: 'red' }}>
  <p>Bu da kırmızı</p>   {/* kalıtım */}
</div>

// React Native'de GEÇMİYOR:
<View style={{ color: 'red' }}>  // ❌ View'ın color özelliği zaten yok
  <Text>Bu default renkte</Text>  // kalıtım almaz
</View>

// Her Text kendi rengini taşımalı:
<View>
  <Text style={{ color: 'red' }}>Kırmızı</Text>
</View>
```

---

## 5. Shadow: iOS ve Android Farklı

Gün 2'de kısaca gördük. Şimdi neden farklı olduğunu anlayalım.

**iOS:** Apple'ın UIKit sistemi `CALayer` shadow'u kullanıyor.
**Android:** Google'ın Material Design sistemi `elevation` kullanıyor.

```tsx
const styles = StyleSheet.create({
  kart: {
    // iOS GÖLGE (Android'de hiçbir etkisi yok):
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    // width: yatay kayma, height: dikey kayma
    // Web'deki box-shadow'un x ve y offset'i
    shadowOpacity: 0.12,
    // 0-1 arası: Web'deki rgba(0,0,0,0.12) gibi
    shadowRadius: 6,
    // blur radius — Web'deki box-shadow blur değeri

    // ANDROID GÖLGE (iOS'ta hiçbir etkisi yok):
    elevation: 4,
    // Sayı büyüdükçe gölge belirginleşir ve derinleşir
    // 0 = gölge yok, 24 = maksimum gölge

    // Her ikisini de yazarsan her platform kendininkini kullanır ✅
  },
});
```

**Görsel karşılaştırma:**

```
iOS shadow:         Android elevation:
┌──────────┐        ┌──────────┐
│  Kart    │        │  Kart    │
└──────────┘        └──────────┘
  ░░░░░░░             ░░░░░░░
  (diffuse)          (ambient)
```

iOS gölgesi daha yumuşak, yönlü. Android gölgesi daha dairesel, ambient.

---

## 6. Platform-Specific Stil

Bazen iOS ve Android için farklı stil gerekir. Bunun için `Platform` modülü var:

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  baslik: {
    fontSize: 20,
    fontWeight: 'bold',

    // Platform.OS: 'ios' | 'android' | 'web'
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    // iPhone'da status bar daha uzun — fazladan padding
  },

  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    // Android'de underline geliyor, iOS'ta gelmiyor:
    ...(Platform.OS === 'android' && {
      paddingHorizontal: 8,
      // Android TextInput kendi padding'i var, iOS'ta yok
    }),
  },
});
```

### Platform.select — daha temiz yazım:

```tsx
const styles = StyleSheet.create({
  kart: {
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
    // Platform.select: platform'a göre spread et
    // iOS cihazda sadece shadow özellikleri eklenir
    // Android'de sadece elevation eklenir
  },
});
```

---

## 7. Responsive Tasarım: `Dimensions` ve `useWindowDimensions`

Web'de `vw`, `vh`, media query kullanırdık. React Native'de ekran boyutuna JS ile erişilir:

```tsx
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// 'window': kullanılabilir ekran alanı (status bar hariç)
// 'screen': fiziksel ekran boyutu (status bar dahil)
// Çoğunlukla 'window' kullanılır

const styles = StyleSheet.create({
  urunGorseli: {
    width: SCREEN_WIDTH,
    // Ekranın tam genişliği
    height: SCREEN_WIDTH * 0.6,
    // 3:5 oranında — genişlik ne olursa olsun orantılı
  },

  ikinciSutun: {
    width: (SCREEN_WIDTH - 48) / 2,
    // İki sütunlu grid: toplam boşluk 48dp (16+16+16), kalan ikiye bölünür
  },
});
```

### `useWindowDimensions` hook — cihaz döndürülünce güncellenir:

```tsx
import { useWindowDimensions } from 'react-native';

function UrunGaleri() {
  const { width } = useWindowDimensions();
  // Dimensions.get statik — bileşen mount'ta bir kez okur
  // useWindowDimensions reaktif — cihaz döndürülünce yeniden render

  const sutunSayisi = width > 600 ? 3 : 2;
  // Tablet (>600dp) → 3 sütun, telefon → 2 sütun

  return (
    <FlatList
      numColumns={sutunSayisi}
      // ...
    />
  );
}
```

**Kural:** Stil dosyasında statik hesaplama → `Dimensions.get`. Bileşen içinde boyuta göre render → `useWindowDimensions`.

---

## 8. Font Scaling: `rem` Yok, Erişilebilirlik Var

Web'de `rem` kullanmanın sebebi kullanıcının tarayıcı font boyutunu büyütmesine saygı göstermekti.

React Native'de kullanıcı "Yazı Boyutu" ayarını büyütebilir. Bu `PixelRatio` üzerinden çalışır ve varsayılan olarak **tüm Text bileşenlerini etkiler.**

```tsx
import { Text, StyleSheet } from 'react-native';

// Varsayılan davranış: kullanıcı sistemi büyütürse bu metin de büyür
<Text style={{ fontSize: 16 }}>Ürün Adı</Text>

// Ölçeklemeyi kapat (erişilebilirlik açısından önerilmez):
<Text style={{ fontSize: 16 }} allowFontScaling={false}>
  Logo metni
</Text>
```

> **Pratik:** Genel içerik metinlerinde `allowFontScaling` dokunma. Sadece logolar veya sabit boyutlu UI elemanları (badge sayısı gibi) için `false` yap.

---

## 9. ShopApp için Tema Sistemi

Şimdiye kadar renkleri ve boyutları doğrudan sayı olarak yazdık: `color: '#ef4444'`, `fontSize: 16`. Bu yaklaşım ölçeklenmiyor.

Profesyonel projelerde tüm stil sabitleri tek bir dosyada tutulur. Şimdi ShopApp'in temasını kuralım.

`constants/` klasörü oluştur, içine `theme.ts` ekle:

```ts
// constants/theme.ts

export const COLORS = {
  // Marka renkleri
  primary: '#3b82f6',      // Ana mavi — butonlar, linkler
  primaryDark: '#1d4ed8',  // Koyu mavi — basılı durum
  secondary: '#f97316',    // Turuncu — vurgu, kampanya

  // Durum renkleri
  success: '#22c55e',      // Stokta var, ödeme başarılı
  warning: '#f59e0b',      // Az stok
  error: '#ef4444',        // Hata, stok yok, indirim etiketi
  info: '#06b6d4',         // Bilgi mesajları

  // Nötr renkler
  white: '#ffffff',
  black: '#000000',

  // Gri paleti (UI elementleri)
  gray50: '#f8fafc',
  gray100: '#f1f5f9',      // Sayfa arka planı
  gray200: '#e2e8f0',      // Border, ayırıcı
  gray300: '#cbd5e1',
  gray400: '#94a3b8',      // Placeholder metin
  gray500: '#64748b',
  gray600: '#475569',      // İkincil metin
  gray700: '#334155',
  gray800: '#1e293b',      // Ana metin
  gray900: '#0f172a',

  // Semantik takma adlar — rengi değiştirmek istersen tek yerden
  background: '#f1f5f9',
  surface: '#ffffff',       // Kart, modal yüzeyi
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textDisabled: '#94a3b8',
  border: '#e2e8f0',
};

export const SPACING = {
  // Tüm boşluklar 4'ün katı — görsel ritim için
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
};

export const FONT_WEIGHT = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,  // Tam yuvarlak (badge, avatar)
};

export const SHADOW = {
  // Her platform için platform.select içinde kullan
  sm: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 8,
  },
};
```

---

## 10. Temayı ProductCard'a Entegre Et

Gün 2'deki `ProductCard.tsx` dosyasını açıp şu değişiklikleri yap:

```tsx
// components/ProductCard.tsx
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOW } from '../constants/theme';

type Props = {
  id: string;
  isim: string;
  fiyat: number;
  gorsel: string;
  indirim?: number;
  onPress: () => void;
};

export function ProductCard({ isim, fiyat, gorsel, indirim, onPress }: Props) {
  const indirimliKFiyat = indirim ? fiyat * (1 - indirim / 100) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.kart,
        pressed && { opacity: 0.9 },
      ]}
    >
      <Image source={{ uri: gorsel }} style={styles.gorsel} resizeMode="cover" />

      {indirim && (
        <View style={styles.indirimEtiketi}>
          <Text style={styles.indirimYazi}>%{indirim}</Text>
        </View>
      )}

      <View style={styles.bilgi}>
        <Text style={styles.isim} numberOfLines={2}>{isim}</Text>

        <View style={styles.fiyatAlani}>
          {indirimliKFiyat ? (
            <>
              <Text style={styles.eskiFiyat}>
                {fiyat.toLocaleString('tr-TR')} TL
              </Text>
              <Text style={styles.yeniFiyat}>
                {indirimliKFiyat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
              </Text>
            </>
          ) : (
            <Text style={styles.fiyat}>{fiyat.toLocaleString('tr-TR')} TL</Text>
          )}
        </View>

        <Pressable style={styles.buton} onPress={onPress}>
          <Text style={styles.butonYazi}>Sepete Ekle</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOW.md,
    // Spread ile shadow objesini StyleSheet'e ekle
    // iOS'ta shadowColor/shadowOffset/... çalışır
    // Android'de elevation çalışır
  },

  gorsel: {
    width: '100%',
    height: 200,
  },

  indirimEtiketi: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },

  indirimYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },

  bilgi: {
    padding: SPACING.md,
  },

  isim: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  fiyatAlani: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  eskiFiyat: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textDisabled,
    textDecorationLine: 'line-through',
  },

  yeniFiyat: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
  },

  fiyat: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  buton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
  },

  butonYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
```

Artık `COLORS.primary`'i değiştirince butondaki mavi tek yerden güncelleniyor.

---

## 11. Genel Karşılaştırma Tablosu

| CSS (Web) | StyleSheet (RN) | Fark |
|---|---|---|
| `.class`, `#id` | Yok | Sadece StyleSheet objesi veya inline |
| `px`, `rem`, `em` | Sayı (dp) | `fontSize: 16` = 16dp |
| `:hover`, `:focus` | Yok | `onPressIn`, `onFocus` event'leri |
| `:active` | `pressed` state | `Pressable` style prop'u fonksiyon alır |
| `display: grid` | Yok | Sadece Flexbox |
| `position: fixed` | Yok | Navigation component'leri kullan |
| CSS kalıtımı | Yok | Her Text kendi rengini taşır |
| CSS değişkenleri | JS sabitleri | `COLORS.primary` gibi |
| `box-shadow` | `shadowColor` + `elevation` | İOS ve Android ayrı özellikler |
| media query | `useWindowDimensions` | JS hook ile ekran boyutu |
| Tailwind class | StyleSheet obje | NativeWind ile Tailwind mümkün (Gün 36) |

---

## 12. Yaygın Hatalar

**Hata 1: Renk hex yerine name yazınca bazı renkler çalışmıyor**
```tsx
// ✅ Çalışır: temel HTML renk isimleri
<Text style={{ color: 'red' }}>
<Text style={{ color: 'blue' }}>

// ❌ Çalışmaz: bazı CSS renk isimleri RN'de tanımsız
<Text style={{ color: 'crimson' }}>   // undefined
<Text style={{ color: 'steelblue' }}> // undefined

// ✅ Her zaman çalışır: hex kullan
<Text style={{ color: '#dc143c' }}>
```

**Hata 2: `StyleSheet.create` dışına dinamik değer koyma**
```tsx
// ❌ Bu çalışır ama StyleSheet.create'in faydalarını iptal eder
const renk = seciliMi ? '#3b82f6' : '#e2e8f0';
const styles = StyleSheet.create({
  buton: { backgroundColor: renk }
  // Her render'da styles yeniden oluşturulur
});

// ✅ Statik temel stil + dinamik override
const styles = StyleSheet.create({
  buton: { backgroundColor: '#e2e8f0' },
  butonSecili: { backgroundColor: '#3b82f6' },
});
<View style={[styles.buton, seciliMi && styles.butonSecili]}>
```

**Hata 3: `overflow: 'hidden'` borderRadius kesmez (Android)**
```tsx
// iOS'ta çalışır, Android'de çalışmaz:
<View style={{ borderRadius: 12, overflow: 'hidden' }}>
  <Image ... />
</View>

// Android'de Image doğrudan borderRadius almalı:
<Image style={{ borderRadius: 12 }} ... />
```

---

## 13. Kontrol Soruları

**1. Web'de `rem` kullanıyorduk — RN'de font scaling nasıl yapılır?**
> RN'de `rem` yok. Kullanıcının sistem font boyutu ayarı `Text` bileşenlerine otomatik uygulanır. Bunu devre dışı bırakmak için `allowFontScaling={false}`. Erişilebilirlik için sadece zorunlu yerlerde kapat.

**2. `position: fixed` neden yok? Navigation bar'ı nasıl sabit tutarsın?**
> RN'de "scroll container dışında sabit kal" kavramı yok çünkü web gibi bir document flow yok. Sabit header/tab bar için React Navigation'ın kendi sistem bileşenleri kullanılır — bunlar native görünümde render edilir, scroll'dan etkilenmez (Gün 5-6).

**3. iOS shadow vs Android elevation farkı neden var?**
> iOS UIKit → `CALayer` shadow API kullanır. Android Material Design → `ViewCompat.setElevation` kullanır. İki platform tamamen farklı render sistemleri. React Native her platformun native API'sını çağırıyor, soyutlamıyor — bu yüzden her ikisini de yazmak gerekiyor.

**4. Tema dosyasındaki sabitleri TypeScript'te nasıl tip-güvenli kullanırsın?**
> `as const` veya `as 'bold'` gibi literal type casting. `FONT_WEIGHT.bold` değeri `string` değil `'700'` olarak tip alır. Bu sayede `fontWeight` prop'una sadece geçerli değerler gönderilir, `'750'` gibi hatalı değer TypeScript hatası verir.

**5. `Dimensions.get` ile `useWindowDimensions` farkı ne?**
> `Dimensions.get` statik — bileşen mount'ta bir kez hesaplar. Cihaz döndürülürse güncellenmez (StyleSheet içinde kullanım için uygun). `useWindowDimensions` reaktif — cihaz döndürülünce yeniden render tetikler. Bileşen içinde boyuta göre davranış değişikliği için kullan.

---

## Bugün Ne Yaptık?

```
✅ StyleSheet API'nin web CSS'inden farkını anladık
✅ dp birimini ve neden px yazmadığımızı öğrendik
✅ StyleSheet.create vs inline style performans farkını anladık
✅ Desteklenmeyen CSS özelliklerini (grid, fixed, pseudo-class, kalıtım) gördük
✅ iOS shadow ve Android elevation farkını anladık
✅ Platform.select ile platform-specific stil yazdık
✅ Dimensions ve useWindowDimensions ile responsive tasarım öğrendik
✅ ShopApp için tema sistemi (COLORS, SPACING, FONT_SIZE, SHADOW) kurduk
✅ ProductCard'ı temaya bağladık
```

---

## Sonraki Gün

**[Gün 4 → Flexbox: Web ile Farklar](gun04_flexbox.md)**

`flexDirection: 'column'` varsayılanı neden web'den farklı?
`flex: 1`, `alignItems`, `justifyContent`, `gap` — ShopApp'e ürün grid'i ekliyoruz.

---

*← [Gün 2](gun02_core_components.md) | [Müfredat](../reactNaitiveMufredat.md) | [Gün 4 →](gun04_flexbox.md)*
