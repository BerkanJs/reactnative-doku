# Gün 11 — SafeAreaView, Dimensions ve Responsive Layout

> **Faz:** 1 — Temeller | **Hafta:** 2 | **Gün:** 11 / 60
>
> **Bugünün Hedefi:** Ekran boyutuna göre layout yapmayı öğrenmek.
> ShopApp ürün grid'ini telefon/tablet için responsive yapmak.

---

## 1. Web'de Ne Yapıyorduk?

Web'de ekran boyutuna göre stil vermek için CSS media query yeterliydi:

```css
/* Telefon */
@media (max-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}

/* Tablet */
@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(3, 1fr); }
}
```

React Native'de **CSS yok, media query yok.** Ekran genişliğini JS'te okursun, koşulları JS'te yazarsın.

---

## 2. `Dimensions.get` — Ekran Boyutunu Oku

```tsx
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

console.log(width);   // örn. 393  (iPhone 14 Pro)
console.log(height);  // örn. 852
```

`'window'` ne demek? Ekranın kullanılabilir alanı — status bar hariç.

Bu değerler **dp** (density-independent pixels) cinsinden. Gün 3'te görmüştük — fiziksel piksel değil.

### Nerede kullanılır?

StyleSheet içinde sabit hesaplama yaparken:

```tsx
import { Dimensions, StyleSheet } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  kahraman: {
    width: width,          // tam ekran genişliği
    height: width * 0.6,   // genişliğe orantılı yükseklik
  },

  yarimGenislik: {
    width: (width - 48) / 2,
    // 48 = sol padding 16 + sağ padding 16 + ortadaki boşluk 16
  },
});
```

---

## 3. `Dimensions.get` Sorunu: Cihaz Döndürülünce Güncellenmez

`Dimensions.get` çağrıldığı **o an**ki değeri verir. Bileşen bir kez mount olur, `Dimensions.get` bir kez çalışır. Kullanıcı cihazı döndürürse eski değer kalır.

```tsx
// ❌ Problem: dosya bir kez yüklenince değer sabit kalır
const { width } = Dimensions.get('window');  // mount anındaki değer

function UrunListesi() {
  // Kullanıcı telefonu döndürdü — width hâlâ eski değer
  // Layout bozulur
}
```

Çözüm: `useWindowDimensions` hook'u.

---

## 4. `useWindowDimensions` — Değişince Haber Verir

```tsx
import { useWindowDimensions } from 'react-native';

function UrunListesi() {
  const { width, height } = useWindowDimensions();
  // Bu hook cihaz döndürüldüğünde veya ekran boyutu değiştiğinde
  // bileşeni otomatik olarak yeniden render eder

  console.log(width);  // her zaman güncel değer
}
```

### İkisi arasındaki fark — özet:

```
Dimensions.get('window')    → bir kez okur, değişmez
useWindowDimensions()       → değişince bileşeni günceller
```

**Ne zaman hangisi?**
- Sabit, hiç değişmeyecek bir hesaplama (StyleSheet içi) → `Dimensions.get`
- Bileşen içinde, orientation değişimine uyum sağlaması gereken → `useWindowDimensions`

---

## 5. Breakpoint: Telefon mu Tablet mi?

Web'de `768px` üstü tablet sayılır. React Native'de de aynı mantık, sadece birimi dp:

```tsx
import { useWindowDimensions } from 'react-native';

function UrunGrid() {
  const { width } = useWindowDimensions();

  // Genişliğe göre kaç sütun olsun?
  let sutunSayisi: number;
  if (width >= 1024) {
    sutunSayisi = 4;  // büyük tablet / yatay mod
  } else if (width >= 768) {
    sutunSayisi = 3;  // tablet
  } else {
    sutunSayisi = 2;  // telefon
  }

  return (
    <Text>Sütun sayısı: {sutunSayisi}</Text>
  );
}
```

---

## 6. Responsive Kart Genişliği Hesabı

2 sütunlu grid'de her kartın ne kadar geniş olması gerektiğini elle hesaplıyoruz:

```
Ekran:  |  16  |  [Kart]  |  12  |  [Kart]  |  16  |
           ↑                  ↑                  ↑
        sol padding       sütunlar arası     sağ padding
           16dp               12dp               16dp

Toplam yatay boşluk: 16 + 12 + 16 = 44dp
Kalan alan: screenWidth - 44
Her kartın genişliği: (screenWidth - 44) / 2
```

Koda dökelim:

```tsx
function UrunGrid() {
  const { width } = useWindowDimensions();

  const SOL_PADDING = 16;
  const SAG_PADDING = 16;
  const SUTUN_ARALIGI = 12;
  const SUTUN_SAYISI = 2;

  const kartGenisligi =
    (width - SOL_PADDING - SAG_PADDING - SUTUN_ARALIGI * (SUTUN_SAYISI - 1))
    / SUTUN_SAYISI;
  // (393 - 16 - 16 - 12) / 2 = 349 / 2 = 174.5dp

  return (
    <FlatList
      data={urunler}
      numColumns={SUTUN_SAYISI}
      key={SUTUN_SAYISI}
      // ↑ ÖNEMLI: numColumns değiştiğinde FlatList'i yeniden başlatmak için
      // key değişmezse React Native "numColumns değiştiremem" hatası verir

      columnWrapperStyle={{ gap: SUTUN_ARALIGI, paddingHorizontal: SOL_PADDING }}

      renderItem={({ item }) => (
        <View style={{ width: kartGenisligi }}>
          <ProductCard {...item} onPress={() => {}} />
        </View>
      )}
    />
  );
}
```

---

## 7. Safe Area Sorunu Nedir?

iPhone X'ten itibaren ekranlar "tam ekran" oldu — ama içine kamera çentiği (notch), Dynamic Island ve altta home indicator girdi.

```
┌─────────────────────────────┐
│  ▄▄▄▄ Dynamic Island ▄▄▄▄  │  ← buraya içerik koyarsan altında kalır
├─────────────────────────────┤
│                             │
│   KULLANILABILIR ALAN       │  ← içeriğin burada olması gerekir
│   (safe area)               │
│                             │
├─────────────────────────────┤
│  ─────── Home Indicator ──  │  ← buraya içerik koyarsan altında kalır
└─────────────────────────────┘
```

Web'de bu sorun CSS ile çözülürdü:

```css
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
```

React Native'de `SafeAreaView` bu padding'i otomatik ekler.

---

## 8. `SafeAreaView` Kullanımı

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
// ⚠️ 'react-native' den değil 'react-native-safe-area-context' den import et!

export default function ProfilEkrani() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
      {/* İçerik notch'a ve home indicator'a girmez */}
      <Text>Profil</Text>
    </SafeAreaView>
  );
}
```

Çalışması için kök layout'ta `SafeAreaProvider` şart:

```tsx
// app/_layout.tsx
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/* SafeAreaProvider olmadan SafeAreaView ve useSafeAreaInsets çalışmaz */}
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
```

---

## 9. `SafeAreaView` Neye Padding Ekler?

Varsayılan olarak **dört kenara da** ekler. Çoğu zaman bu fazla — alt tab bar zaten safe area'ya uyuyor, soldaki ve sağdaki inset genellikle sıfır.

`edges` prop'u ile hangi kenarlara eklensin seçebilirsin:

```tsx
// Sadece üst kenara (en yaygın kullanım):
<SafeAreaView edges={['top']} style={{ flex: 1 }}>

// Üst ve yanlar (altta tab bar var, kendi yönetiyor):
<SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>

// Tüm kenarlar (varsayılan):
<SafeAreaView style={{ flex: 1 }}>
```

---

## 10. `useSafeAreaInsets` — Değerlere Doğrudan Eriş

`SafeAreaView` sarmak yerine padding değerini okumak istiyorsan:

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function OzelBaslik() {
  const insets = useSafeAreaInsets();

  // insets.top    → notch yüksekliği (iPhone 14 Pro'da ~59dp)
  // insets.bottom → home indicator yüksekliği (~34dp)
  // insets.left   → yatay modda sol boşluk
  // insets.right  → yatay modda sağ boşluk

  return (
    <View style={{
      paddingTop: insets.top + 12,
      // notch kadar + 12dp fazladan boşluk
      backgroundColor: '#3b82f6',
      paddingHorizontal: 16,
      paddingBottom: 12,
    }}>
      <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
        ShopApp
      </Text>
    </View>
  );
}
```

### Ne zaman `SafeAreaView`, ne zaman `useSafeAreaInsets`?

```
SafeAreaView → Tüm sayfa / layout bileşeni. Hızlı ve kolay.

useSafeAreaInsets → Belirli bir kenara veya özel hesaplama gerektiğinde:
  - Floating buton: bottom: insets.bottom + 16
  - Custom header: paddingTop: insets.top + 12
  - Bottom bar: paddingBottom: insets.bottom
```

---

## 11. Floating Buton Örneği

Sepete ekle butonu ekranın altında sabit dursun, home indicator'ın üstünde:

```tsx
function UrunDetay() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      {/* Sayfa içeriği */}
      <ScrollView>
        <Text>Ürün detayları...</Text>
      </ScrollView>

      {/* Altta sabit buton */}
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: insets.bottom + 12,
        // insets.bottom: home indicator yüksekliği (iPhone'da ~34, Android'de 0)
        // + 12dp fazladan nefes alanı
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
      }}>
        <Pressable style={{
          backgroundColor: '#3b82f6',
          borderRadius: 12,
          height: 52,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
            Sepete Ekle
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
```

Neden `insets.bottom + 12`? Android'de `insets.bottom` genellikle 0'dır — yine de `12dp` boşluk kalır. iPhone'da 34 + 12 = 46dp. Her cihazda düzgün durur.

---

## 12. `StyleSheet.hairlineWidth` — Gerçekten İnce Çizgi

Web'de `border: 1px` yazdığında tarayıcı gerçekten 1 fiziksel piksel çizerdi.

React Native'de `borderWidth: 1` → **1dp** → retina ekranda 2-3 fiziksel piksel. Gözle görülür kalın bir çizgi çıkar.

Gerçekten ince çizgi (ayırıcı) için:

```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  ayirici: {
    height: StyleSheet.hairlineWidth,
    // hairlineWidth = 1 / PixelRatio.get()
    // iPhone 14 Pro (@3x): 1/3 ≈ 0.33dp = tam 1 fiziksel piksel
    // @2x ekranda: 1/2 = 0.5dp = 1 fiziksel piksel
    backgroundColor: '#e2e8f0',
  },

  normalCizgi: {
    borderBottomWidth: 1,
    // 1dp → @3x'te 3 fiziksel piksel — kalın görünür
    borderBottomColor: '#e2e8f0',
  },
});
```

Kart altı, liste öğesi arası, bölüm ayırıcı gibi ince çizgilerde `hairlineWidth` kullan.

---

## 13. ShopApp: Hepsini Birleştir

```tsx
// app/(tabs)/index.tsx
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductCard } from '../../components/ProductCard';
import { COLORS, SPACING } from '../../constants/theme';

const URUNLER = [
  { id: '1', isim: 'Nike Air Max 270', fiyat: 2999, gorsel: 'https://picsum.photos/seed/nike/400/400', indirim: 20 },
  { id: '2', isim: 'Adidas Ultraboost', fiyat: 3499, gorsel: 'https://picsum.photos/seed/adidas/400/400' },
  { id: '3', isim: 'Puma RS-X', fiyat: 1899, gorsel: 'https://picsum.photos/seed/puma/400/400', indirim: 10 },
  { id: '4', isim: 'New Balance 574', fiyat: 2199, gorsel: 'https://picsum.photos/seed/nb/400/400' },
  { id: '5', isim: 'Converse Chuck Taylor', fiyat: 1599, gorsel: 'https://picsum.photos/seed/converse/400/400' },
  { id: '6', isim: 'Vans Old Skool', fiyat: 1799, gorsel: 'https://picsum.photos/seed/vans/400/400' },
];

export default function UrunlerTab() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Ekran genişliğine göre sütun sayısını belirle
  const sutunSayisi = width >= 768 ? 3 : 2;

  // Her kartın genişliğini hesapla
  // Formül: (ekranGenisligi - solPadding - sagPadding - sutunAraliklari) / sutunSayisi
  const kartGenisligi = (width - 16 * 2 - 12 * (sutunSayisi - 1)) / sutunSayisi;

  return (
    <FlatList
      data={URUNLER}
      keyExtractor={(item) => item.id}

      numColumns={sutunSayisi}
      key={sutunSayisi}
      // key şart: numColumns değişince FlatList baştan kurulur

      columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}

      contentContainerStyle={{
        paddingTop: 8,
        paddingBottom: insets.bottom + 16,
        // Ekranın altında içerik home indicator'ın altına girmez
      }}

      renderItem={({ item }) => (
        <View style={{ width: kartGenisligi }}>
          <ProductCard {...item} onPress={() => {}} />
        </View>
      )}

      ListHeaderComponent={() => (
        <Text style={styles.baslik}>Ürünler</Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  baslik: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
});
```

---

## 14. Web ile Karşılaştırma

| Web | React Native | Not |
|---|---|---|
| `@media (max-width: 768px)` | `width < 768 ? 2 : 3` | JS koşulu, hook içinde reaktif |
| `100vw` | `useWindowDimensions().width` | Hook — orientation'da güncellenir |
| `100vh` | `useWindowDimensions().height` | Aynı |
| `env(safe-area-inset-top)` | `useSafeAreaInsets().top` | dp cinsinden sayı döner |
| `env(safe-area-inset-bottom)` | `useSafeAreaInsets().bottom` | Home indicator yüksekliği |
| `border: 1px` | `StyleSheet.hairlineWidth` | Gerçekten 1 fiziksel piksel |

---

## 15. Kontrol Soruları

**1. `SafeAreaView` yerine `useSafeAreaInsets` ne zaman kullanırsın?**
> `SafeAreaView` bir sarmalayıcı bileşen — içeriğin güvenli alana girmesini otomatik engeller. Ama bazen yalnızca tek bir değer (örneğin `bottom`) lazım: floating buton, custom header, bottom bar. O durumlarda `useSafeAreaInsets` ile değeri okuyup kendi hesabında kullanırsın.

**2. Orientation change'de `Dimensions.get` neden güncel değer vermeyebilir?**
> `Dimensions.get` çağrıldığı andaki ekran boyutunu döndürür. Modül yüklenince veya StyleSheet oluşturulunca çalışır — tek seferlik. Cihaz döndürülse de o anki değer hafızada kalır, güncellenmez. `useWindowDimensions` ise bir event listener dinler; boyut değişince bileşeni yeniden render eder.

**3. FlatList'e `key={sutunSayisi}` neden ekliyoruz?**
> FlatList `numColumns` değiştiğinde mevcut layout'u yeniden düzenleyemez. `key` prop'u değişince React bileşeni baştan kurar — FlatList silinir, yeni `numColumns` ile yeniden oluşturulur. Olmadan "Cannot change numColumns on the fly" hatası alırsın.

---

## Bugün Ne Yaptık?

```
✅ Dimensions.get (tek seferlik) vs useWindowDimensions (reaktif) farkını anladık
✅ Telefon/tablet breakpoint mantığını JS ile yazdık
✅ Kart genişliği formülünü adım adım hesapladık
✅ Safe area sorununu ve nedenini anladık
✅ SafeAreaProvider kurulumunun neden kök layout'ta olması gerektiğini öğrendik
✅ SafeAreaView edges prop'u ile hangi kenara padding eklensin seçtik
✅ useSafeAreaInsets ile floating buton bottom pozisyonu hesapladık
✅ StyleSheet.hairlineWidth ile 1 fiziksel piksel çizgi çektik
✅ Hepsini ShopApp'te birleştirdik
```

---

## Sonraki Gün

**[Gün 12 → Modal, Alert ve ActionSheet](gun12_modal_alert.md)**

`Modal` bileşeni, bottom sheet, ActionSheet — web'deki dialog/drawer'ın mobil karşılıkları.
ShopApp'e ürün filtre bottom sheet'i ekliyoruz.

---

*← [Gün 10](gun10_platform_api.md) | [Müfredat](../reactNaitiveMufredat.md) | [Gün 12 →](gun12_modal_alert.md)*
