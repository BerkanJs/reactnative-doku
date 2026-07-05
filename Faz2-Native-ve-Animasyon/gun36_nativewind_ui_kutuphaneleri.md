# Gün 36 — NativeWind ve UI Kütüphaneleri

## Neden UI Kütüphanesi?

ShopApp'te her butonu, her kartı, her input'u sıfırdan yazmak zaman alır. UI kütüphaneleri hazır, test edilmiş, erişilebilirlik prop'ları yazılmış bileşenler sunar.

Üç ana seçenek:
- **NativeWind** — Tailwind CSS class'larını React Native'e getir
- **React Native Paper** — Material Design bileşen seti
- **Gluestack UI** — Cross-platform, NativeWind ile uyumlu

---

## NativeWind: Tailwind React Native'de

Web'de Tailwind kullandıysan NativeWind tanıdık gelecek. `className` prop'u ile Tailwind class'larını doğrudan React Native bileşenlerine yazıyorsun.

### Kurulum

```bash
npx expo install nativewind tailwindcss
npx tailwindcss init
```

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#007AFF',
        danger: '#FF3B30',
        shopapp: {
          bg: '#F2F2F7',
          kart: '#FFFFFF',
          metin: '#1C1C1E',
          ikincil: '#6C6C70',
        },
      },
    },
  },
  plugins: [],
};
```

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

```tsx
// global.css (yeni NativeWind v4)
@import 'tailwindcss';

// app/_layout.tsx
import '../global.css';
```

```tsx
// nativewind-env.d.ts — TypeScript için tip tanımı
/// <reference types="nativewind/types" />
```

### Temel Kullanım

```tsx
// ❌ Eski yol: StyleSheet
import { View, Text, Pressable, StyleSheet } from 'react-native';

export function UrunKart() {
  return (
    <Pressable style={styles.kart}>
      <Text style={styles.baslik}>Nike Air Max</Text>
      <Text style={styles.fiyat}>1.299 ₺</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  baslik: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  fiyat: { fontSize: 18, fontWeight: '700', color: '#007AFF', marginTop: 4 },
});

// ✅ NativeWind ile
export function UrunKart() {
  return (
    <Pressable className="bg-white rounded-xl p-4 mb-3">
      <Text className="text-base font-semibold text-gray-900">Nike Air Max</Text>
      <Text className="text-lg font-bold text-primary mt-1">1.299 ₺</Text>
    </Pressable>
  );
}
```

---

## NativeWind: ShopApp Bileşenleri

```tsx
// components/ProductCard.tsx
import { Pressable, Image, View, Text } from 'react-native';

type Props = {
  urun: Urun;
  onPress: () => void;
};

export function ProductCard({ urun, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4 active:opacity-70"
      // active:opacity-70 — basılı tutunca yarı saydam
      accessibilityLabel={`${urun.ad}, ${urun.fiyat} lira`}
      accessibilityRole="button"
    >
      <Image
        source={{ uri: urun.gorselUrl }}
        className="w-full h-48"
        resizeMode="cover"
      />

      <View className="p-4">
        <Text className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          {urun.marka}
        </Text>
        <Text className="text-base font-semibold text-gray-900 mb-2" numberOfLines={2}>
          {urun.ad}
        </Text>

        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-primary">
            {urun.fiyat.toLocaleString('tr-TR')} ₺
          </Text>

          {urun.indirimYuzdesi && (
            <View className="bg-red-100 px-2 py-1 rounded-full">
              <Text className="text-red-600 text-xs font-bold">
                %{urun.indirimYuzdesi} İNDİRİM
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
```

```tsx
// components/SearchBar.tsx
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function SearchBar({ deger, onDegisim, onTemizle }: Props) {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mx-4 mb-4">
      <Ionicons name="search" size={18} color="#6C6C70" />
      <TextInput
        className="flex-1 ml-2 text-base text-gray-900"
        value={deger}
        onChangeText={onDegisim}
        placeholder="Ürün, marka ara..."
        placeholderTextColor="#6C6C70"
        returnKeyType="search"
        accessibilityLabel="Ürün arama kutusu"
        accessibilityRole="search"
      />
      {deger.length > 0 && (
        <Pressable onPress={onTemizle} className="p-1">
          <Ionicons name="close-circle" size={18} color="#6C6C70" />
        </Pressable>
      )}
    </View>
  );
}
```

---

## Dark Mode: NativeWind ile

```tsx
// tailwind.config.js
module.exports = {
  darkMode: 'class', // 'media' de kullanılabilir
  // ...
};
```

```tsx
// Gün 27'deki useTema hook'uyla entegrasyon
import { useTema } from '@/hooks/useTema';

export function App() {
  const { koyuMu } = useTema();

  return (
    // Root View'a dark class ekle — tüm alt bileşenler otomatik dark mode alır
    <View className={koyuMu ? 'dark flex-1' : 'flex-1'}>
      {/* ... */}
    </View>
  );
}

// Bileşende dark: prefix
<View className="bg-white dark:bg-gray-900">
  <Text className="text-gray-900 dark:text-white">Başlık</Text>
  <Text className="text-gray-500 dark:text-gray-400">Alt metin</Text>
</View>
```

---

## NativeWind'in Desteklemediği Class'lar

Web Tailwind'ten alıştıkların bazıları RN'de çalışmaz:

```tsx
// ❌ Çalışmaz
className="grid grid-cols-2"        // grid yok, Flexbox var
className="fixed bottom-0"          // position: fixed yok
className="overflow-auto"           // ScrollView kullan
className="hover:bg-blue-500"       // hover yok
className="focus:ring-2"            // focus ring yok
className="transition-all"          // CSS transition yok (Reanimated kullan)
className="w-[calc(100%-32px)]"    // calc() yok

// ✅ Bunları kullan
className="flex-row flex-wrap"      // grid yerine flexbox
className="absolute bottom-0"       // fixed yerine absolute
// ScrollView bileşeni                // overflow-auto yerine
className="active:bg-blue-500"      // hover yerine active:
className="ios:pt-12 android:pt-8"  // platform prefix!
```

**Platform prefix — NativeWind'e özgü:**
```tsx
<View className="ios:shadow-lg android:elevation-4">
  {/* iOS'ta shadow, Android'de elevation */}
</View>

<Text className="ios:font-semibold android:font-bold">
  {/* Platform'a göre farklı font weight */}
</Text>
```

---

## React Native Paper: Material Design

NativeWind sıfırdan stil yazarken React Native Paper hazır bileşenler sunar.

```bash
npx expo install react-native-paper react-native-safe-area-context
```

```tsx
// app/_layout.tsx
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { useTema } from '@/hooks/useTema';

export default function RootLayout() {
  const { koyuMu } = useTema();

  return (
    <PaperProvider theme={koyuMu ? MD3DarkTheme : MD3LightTheme}>
      <Stack />
    </PaperProvider>
  );
}
```

### Hazır Bileşenler

```tsx
import {
  Button,
  Card,
  TextInput,
  Chip,
  FAB,
  Snackbar,
  Badge,
  Divider,
  List,
} from 'react-native-paper';

// Buton — mode: 'contained' | 'outlined' | 'text' | 'elevated'
<Button mode="contained" onPress={sepeteEkle} loading={yukleniyor}>
  Sepete Ekle
</Button>

// Kart
<Card style={{ margin: 16 }}>
  <Card.Cover source={{ uri: urun.gorselUrl }} />
  <Card.Content>
    <Card.Title title={urun.ad} subtitle={urun.marka} />
  </Card.Content>
  <Card.Actions>
    <Button onPress={sepeteEkle}>Sepete Ekle</Button>
    <Button onPress={favoriye}>Favorile</Button>
  </Card.Actions>
</Card>

// Input — Material Design stil
<TextInput
  label="E-posta"
  value={email}
  onChangeText={setEmail}
  mode="outlined"  // 'flat' veya 'outlined'
  keyboardType="email-address"
  error={!!emailHatasi}
/>

// FAB (Floating Action Button) — sepet butonu
<FAB
  icon="cart"
  label={`${sepetAdet}`}
  onPress={() => router.push('/cart')}
  style={{ position: 'absolute', bottom: 16, right: 16 }}
/>

// Snackbar — alt toast bildirimi
<Snackbar
  visible={gosterSnackbar}
  onDismiss={() => setGosterSnackbar(false)}
  duration={3000}
  action={{ label: 'Görüntüle', onPress: () => router.push('/cart') }}
>
  Ürün sepete eklendi
</Snackbar>

// Chip — filtre seçimi
<Chip
  selected={seciliKategori === 'spor'}
  onPress={() => setSeciliKategori('spor')}
  showSelectedCheck
>
  Spor
</Chip>
```

### Theme Özelleştirme

```tsx
import { MD3LightTheme } from 'react-native-paper';

const shopappTema = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007AFF',
    secondary: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
  },
};
```

---

## Ne Zaman Ne Kullanmalı?

| Durum | Tercih | Neden |
|-------|--------|-------|
| Hızlı geliştirme, tam kontrol | **NativeWind** | Web'den bilinen syntax |
| Hazır bileşen, Material Design | **React Native Paper** | Az kod, çok bileşen |
| iOS-native hissi | **StyleSheet** | Tam kontrol |
| Cross-platform + NativeWind uyumu | **Gluestack UI** | Headless + styled |
| Küçük proje, prototip | **NativeWind** | Hız |
| Büyük proje, tasarım sistemi | **StyleSheet + token** | Tutarlılık |

**ShopApp önerisi:**  
NativeWind ile genel layout ve utility class'lar, kritik animasyonlu bileşenler için StyleSheet. React Native Paper'dan Snackbar ve FAB gibi hazır bileşenler al.

---

## Web ile Karşılaştırma

| Web | React Native | Fark |
|-----|-------------|------|
| Tailwind CSS | NativeWind | className syntax aynı ama bazı class'lar yok |
| shadcn/ui | Gluestack UI | Headless bileşen konsepti benzer |
| Material UI | React Native Paper | Material Design, RN için |
| `hover:` | `active:` | Hover yok, active var |
| `grid-cols-2` | `flex-row flex-wrap` | Grid yok, flexbox |
| `fixed` | `absolute` | position: fixed yok |
| CSS custom property | tailwind.config extend | Benzer |

---

## Kontrol Soruları

1. NativeWind ile `className="grid grid-cols-2"` neden çalışmaz? Alternatifi ne?

2. `active:opacity-70` ve `hover:opacity-70` arasındaki fark ne? Mobilde neden hover yok?

3. React Native Paper ile NativeWind aynı projede kullanılabilir mi? Bir çakışma olur mu?

4. `ios:shadow-lg android:elevation-4` gibi platform prefix neden gerekli? StyleSheet'te nasıl yapıyordun?

5. `MD3LightTheme` içindeki `colors` objesini değiştirince otomatik hangi bileşenler güncelleniyor?

---

## Özet

| Araç | Ne için | Avantaj |
|------|---------|---------|
| NativeWind | Tailwind class → RN StyleSheet | Hız, web'den tanıdık |
| React Native Paper | Material Design bileşenler | Hazır, test edilmiş |
| Gluestack UI | Headless + cross-platform | Özelleştirilebilir |
| `active:` prefix | Basılı durum stili | hover yerine |
| `ios:` / `android:` | Platform spesifik stil | NativeWind'e özgü |
| `dark:` prefix | Dark mode class | useTema ile entegre |

**Yarın (Gün 37):** Redux Toolkit — `createSlice`, `createAsyncThunk`, RTK Query, enterprise projelerde neden standart, Zustand ile fark.
