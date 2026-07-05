# Gün 6 — Stack ve Tab Navigator ile Gerçek Navigasyon

> **Faz:** 1 — Temeller | **Hafta:** 2 | **Gün:** 6 / 60
>
> **Bugünün Hedefi:** Mobile navigation'ın web'den farkını anlamak; Stack ve Tab Navigator'ı kurmak.
> ShopApp'e **alt tab bar** ekliyoruz: Ürünler, Sepet, Profil.

---

## 1. Web Navigasyonu vs Mobil Navigasyonu

Web'de navigasyon tarayıcının history API'si üzerine kuruluydu:

```
Web:
[AnaSayfa] → [Ürünler] → [Ürün Detayı]
    ↑ history stack — URL değişir, geri tuşu bir önceki URL'ye döner
```

Mobilde **iki farklı navigasyon paradigması** var:

```
Stack Navigator (dikey geçiş):
[AnaSayfa] → [Ürün Detayı] → [Ödeme]
                                  ← geri = pop (üstteki kaldır)

Tab Navigator (yatay geçiş):
[Ürünler] | [Sepet] | [Profil]
    ↑ Tab'lar arası geçiş stack'i sıfırlamaz
```

Gerçek uygulamalarda bu ikisi **iç içe** kullanılır:
- Dışta Tab Navigator (alt bar)
- Her tab içinde ayrı Stack Navigator

```
Tab: Ürünler          Tab: Sepet        Tab: Profil
  └─ Stack               └─ Stack          └─ Stack
      ├─ UrunListesi          ├─ Sepet          ├─ Profil
      └─ UrunDetay            └─ Odeme          └─ Ayarlar
```

---

## 2. Stack Navigator: Sayfalar Üst Üste Yığılır

```
Kullanıcı "Nike Air Max"'a tıklıyor:
Stack: [UrunListesi]
         ↓ push
Stack: [UrunListesi, UrunDetay]
         ↓ geri tuşu (pop)
Stack: [UrunListesi]
```

Web'de URL geçmişi tarayıcıda tutuluyordu. Mobil Stack, **uygulama içinde** tutuluyor — sekme kapat, uygulama kapat → stack sıfırlanır.

### Expo Router'da Stack:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        // Tüm ekranlar için varsayılan header ayarları
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        // headerTintColor: geri ok ikonu + başlık metni rengi
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="(tabs)"
        // "(tabs)" klasörü — kendi _layout.tsx'i var
        options={{ headerShown: false }}
        // Tab layout kendi header'ını yönetir — burada kapatıyoruz
      />
      <Stack.Screen
        name="products/[id]"
        options={{ title: 'Ürün Detayı' }}
      />
    </Stack>
  );
}
```

### Header özelleştirme:

```tsx
// Ekran içinden dinamik başlık:
import { Stack } from 'expo-router';

export default function UrunDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const urun = URUNLER[id];

  return (
    <>
      <Stack.Screen
        options={{
          title: urun?.isim ?? 'Ürün Detayı',
          // Dinamik başlık — ürün adı yüklendikten sonra güncellenir

          headerRight: () => (
            // Header'a sağ tarafa ikon ekle
            <Pressable onPress={() => console.log('Favorilere ekle')}>
              <Ionicons name="heart-outline" size={24} color={COLORS.white} />
            </Pressable>
          ),
        }}
      />
      {/* ...ekran içeriği */}
    </>
  );
}
```

---

## 3. Tab Navigator: Alt Sekme Çubuğu

Tab bar, mobil uygulamaların temel navigasyon elemanı. Web'deki navbar'ın mobil karşılığı — ama ekranın altında, native görünümde.

### Expo Router'da Tab Navigator:

`app/(tabs)/` klasörü oluştur:

```
app/
├── _layout.tsx           → Kök Stack layout
└── (tabs)/
    ├── _layout.tsx        → Tab Navigator
    ├── index.tsx           → "Ürünler" tab'ı
    ├── cart.tsx            → "Sepet" tab'ı
    └── profile.tsx         → "Profil" tab'ı
```

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // Tüm tab'lar için varsayılan ayarlar
        tabBarActiveTintColor: COLORS.primary,
        // Seçili tab ikon + yazı rengi
        tabBarInactiveTintColor: COLORS.textDisabled,
        // Seçili olmayan tab rengi
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          // iOS home bar için ekstra padding — SafeAreaView bunu otomatik yapar
          // Gün 11'de useSafeAreaInsets ile düzgün yapacağız
        },
        tabBarLabelStyle: {
          fontSize: FONT_SIZE.xs,
          fontWeight: '500',
        },
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ürünler',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              // focused: bu tab seçili mi?
              // Seçiliyken dolu ikon, değilken outline
              size={size}
              color={color}
              // color: tabBarActiveTintColor veya tabBarInactiveTintColor
              // otomatik gelir — elle yazma
            />
          ),
        }}
      />

      <Tabs.Screen
        name="cart"
        options={{
          title: 'Sepet',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'cart' : 'cart-outline'}
              size={size}
              color={color}
            />
          ),
          tabBarBadge: 3,
          // tabBarBadge: sepet sayacı — sayı veya string
          // Kırmızı badge otomatik görünür
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
```

### İkon kütüphanesi kurulumu:

```bash
npx expo install @expo/vector-icons
```

`@expo/vector-icons` zaten Expo SDK içinde gelir — ayrıca kurulum gerekmeyebilir. Kullanılabilir ikon setleri:

```tsx
import { Ionicons } from '@expo/vector-icons';       // iOS tarzı
import { MaterialIcons } from '@expo/vector-icons';  // Material Design
import { FontAwesome5 } from '@expo/vector-icons';   // FontAwesome
import { Feather } from '@expo/vector-icons';         // Minimal çizgi ikonlar
```

İkon araması: [icons.expo.fyi](https://icons.expo.fyi)

---

## 4. Tab Ekranları

```tsx
// app/(tabs)/index.tsx — Ürünler tab'ı
import { View, ScrollView, StyleSheet } from 'react-native';
import { ProductGrid } from '../../components/ProductGrid';
import { COLORS } from '../../constants/theme';

const URUNLER = [
  { id: '1', isim: 'Nike Air Max 270', fiyat: 2999, gorsel: 'https://picsum.photos/seed/nike/400/400', indirim: 20 },
  { id: '2', isim: 'Adidas Ultraboost 22', fiyat: 3499, gorsel: 'https://picsum.photos/seed/adidas/400/400' },
  { id: '3', isim: 'Puma RS-X', fiyat: 1899, gorsel: 'https://picsum.photos/seed/puma/400/400', indirim: 10 },
  { id: '4', isim: 'New Balance 574', fiyat: 2199, gorsel: 'https://picsum.photos/seed/nb/400/400' },
  { id: '5', isim: 'Converse Chuck Taylor', fiyat: 1599, gorsel: 'https://picsum.photos/seed/converse/400/400', indirim: 15 },
  { id: '6', isim: 'Vans Old Skool', fiyat: 1799, gorsel: 'https://picsum.photos/seed/vans/400/400' },
];

export default function UrunlerTab() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProductGrid urunler={URUNLER} onUrunPress={() => {}} />
      </ScrollView>
    </View>
  );
}
```

```tsx
// app/(tabs)/cart.tsx — Sepet tab'ı (şimdilik iskelet)
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

export default function SepetTab() {
  return (
    <View style={styles.bos}>
      <Text style={styles.emoji}>🛒</Text>
      <Text style={styles.yazi}>Sepetiniz boş</Text>
      <Text style={styles.altYazi}>
        Ürünler sekmesinden alışverişe başlayın
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bos: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 8,
  },
  emoji: { fontSize: 48 },
  yazi: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  altYazi: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
```

```tsx
// app/(tabs)/profile.tsx — Profil tab'ı (şimdilik iskelet)
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/theme';

export default function ProfilTab() {
  return (
    <View style={styles.sayfa}>
      <Image
        source={{ uri: 'https://picsum.photos/seed/avatar/200/200' }}
        style={styles.avatar}
      />
      <Text style={styles.isim}>Kullanıcı Adı</Text>
      <Text style={styles.email}>kullanici@example.com</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sayfa: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xxxl,
    backgroundColor: COLORS.background,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.lg,
  },
  isim: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  email: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
```

---

## 5. Tab'dan Stack'e Geçiş: İç İçe Navigasyon

Tab bar varken ürün detayına gittiğinde ne olur?

**İstenen davranış:** Ürüne tıkla → detay ekranı açılır, **tab bar kaybolur**, tam ekran.

Bu, Stack Navigator'ın Tab Navigator'ın **dışında** olması gerektiği anlamına gelir:

```
app/
├── _layout.tsx        → Stack (en dışta)
│   ├── (tabs)/        → Tab grup
│   │   ├── _layout.tsx  → Tabs
│   │   ├── index.tsx
│   │   ├── cart.tsx
│   │   └── profile.tsx
│   └── products/
│       └── [id].tsx   → Tab bar yok, tam ekran Stack
```

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="products/[id]"
        options={{
          title: 'Ürün Detayı',
          // Bu ekran Tab'ın dışında — tab bar görünmez
          presentation: 'card',
          // 'card': standart sağdan sola geçiş (iOS)
          // 'modal': alttan yukarı geçiş
          // 'fullScreenModal': tam ekran modal
        }}
      />
    </Stack>
  );
}
```

---

## 6. Tab'da Her Geçişte Yeniden Mount Olur mu?

```tsx
// Tab A'dasın → Tab B'ye geçtin → Tab A'ya döndün
// Tab A yeniden mount mu oldu?
```

**Varsayılan davranış:** Hayır. Tab'lar ilk açıldıktan sonra **mount durumunu korur** — unmount olmaz, state sıfırlanmaz.

```tsx
// Tab A'da bir counter varsa:
function TabA() {
  const [count, setCount] = useState(0);
  // Tab B'ye gidip gelince count sıfırlanmaz — state korunur
}
```

Bunu değiştirmek istersen (her geçişte sıfırla):

```tsx
<Tabs.Screen
  name="index"
  options={{ unmountOnBlur: true }}
  // Her tab değişiminde unmount et — state sıfırlanır
  // Genelde istenmiyor — her geçişte API çağrısı tekrarlanır
/>
```

---

## 7. Drawer Navigator: Yan Menü

Tab bar kadar sık kullanılmaz ama özellikle admin panel, ayarlar gibi ekranlarda görürsün:

```tsx
// Expo Router ile Drawer — ayrı paket gerekir:
// npx expo install @react-navigation/drawer react-native-gesture-handler react-native-reanimated

import { Drawer } from 'expo-router/drawer';

export default function DrawerLayout() {
  return (
    <Drawer>
      <Drawer.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Drawer.Screen name="orders" options={{ title: 'Siparişlerim' }} />
      <Drawer.Screen name="settings" options={{ title: 'Ayarlar' }} />
    </Drawer>
  );
}
// Soldan kaydırma veya hamburger menü ile açılır
```

ShopApp'te şimdilik kullanmıyoruz — Gün 6 için bilgi amaçlı.

---

## 8. `goBack()` vs Web `history.back()`

```tsx
import { useRouter } from 'expo-router';

const router = useRouter();

// Geri git:
router.back();
// Stack'ten bir ekran pop eder
// Web'deki history.back() gibi — ama tarayıcı geçmişi değil uygulama stack'i

// Geri gidilebilir mi kontrol et:
import { useNavigation } from 'expo-router';
const navigation = useNavigation();

if (navigation.canGoBack()) {
  router.back();
} else {
  // Stack'in en altındayız, geri gidecek yer yok
  router.replace('/');
}
```

**Web'den fark:** Tarayıcıda `history.back()` önceki URL'ye götürürdü. Mobilde `back()` stack'teki önceki **ekrana** döner — URL kavramı yok, uygulama içi stack.

---

## 9. Deep Link: URL ile Doğrudan Ekrana Git

Expo Router file-based yapısı sayesinde deep link **otomatik** çalışır:

```
shopapp://products/1  →  app/products/[id].tsx açılır, id = "1"
shopapp://cart        →  app/(tabs)/cart.tsx açılır
```

`app.json`'a scheme ekle:

```json
{
  "expo": {
    "scheme": "shopapp"
  }
}
```

Bu kadar. React Navigation'da manuel `linking` konfigürasyonu gerekirdi. Expo Router'da dosya yapısı = URL yapısı, otomatik bağlanır.

---

## 10. Tam Dosya Yapısı

Bugünün sonunda ShopApp'in dosya yapısı:

```
ShopApp/
├── app/
│   ├── _layout.tsx              → Kök Stack
│   ├── (tabs)/
│   │   ├── _layout.tsx          → Tab Navigator (3 tab)
│   │   ├── index.tsx            → Ürünler
│   │   ├── cart.tsx             → Sepet
│   │   └── profile.tsx          → Profil
│   └── products/
│       └── [id].tsx             → Ürün Detayı (tab bar yok)
├── components/
│   ├── ProductCard.tsx
│   └── ProductGrid.tsx
└── constants/
    └── theme.ts
```

---

## 11. Yaygın Hatalar

**Hata 1: Tab bar ürün detayında da görünüyor**
```
❌ Yanlış yapı:
app/(tabs)/
├── _layout.tsx  → Tabs
├── index.tsx
└── products/
    └── [id].tsx  → Tab içinde — tab bar görünür

✅ Doğru yapı:
app/
├── _layout.tsx          → Stack (dışarıda)
├── (tabs)/
│   └── index.tsx
└── products/
    └── [id].tsx          → Stack içinde ama Tabs dışında
```

**Hata 2: `@expo/vector-icons` import hatası**
```tsx
// ❌ Yanlış:
import Ionicons from '@expo/vector-icons/Ionicons';

// ✅ Doğru:
import { Ionicons } from '@expo/vector-icons';
```

**Hata 3: Tab badge sayısı güncellemiyor**
```tsx
// tabBarBadge sabit sayı — state'e bağlamak için:
<Tabs.Screen
  name="cart"
  options={{
    tabBarBadge: sepetSayisi > 0 ? sepetSayisi : undefined,
    // undefined → badge gösterme
    // 0 yazdırma — görsel olarak kötü durur
  }}
/>
// sepetSayisi state yönetiminden gelecek — Gün 14'te
```

**Hata 4: Header iki kez görünüyor**
```tsx
// Stack + Tabs iç içe olduğunda her ikisi de header gösterebilir
// ✅ Tab layout içinde Stack.Screen'e headerShown: false:
<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
// Tabs kendi header'ını yönetsin
```

---

## 12. Kontrol Soruları

**1. Stack Navigator'da "geri" nasıl çalışır? Web history ile fark ne?**
> Web'de geri = tarayıcı history URL geçmişi, sekmeyi kapatsan da URL hatırlanır. Mobil Stack, uygulama içi bellek — uygulama kapanınca sıfır. Geri = stack'ten pop (üstteki ekranı kaldır). Web'de "ileri" de var; mobilde genelde yok.

**2. Tab Navigator'da bir tab'a her geçişte component yeniden mount mu olur?**
> Hayır, varsayılan olarak mount durumu korunur. Bir kez mount olduktan sonra tab değişimlerinde unmount olmaz, state yaşar. `unmountOnBlur: true` ile kapatılabilir ama genelde istenmiyor — her geçişte API çağrısı tekrarlanır.

**3. Web'de URL ile sayfalar arası parametre taşıdık — mobilde en iyi yol ne?**
> Basit değerler (ID, slug): `href="/products/1"` — `useLocalSearchParams` ile al. Karmaşık objeler (form verisi, filtreler): state yönetimi (Context, Zustand, RTK) — Gün 13-14. Geçici veri: `router.push({ pathname: '...', params: { ... } })`.

---

## Bugün Ne Yaptık?

```
✅ Web navigasyonu vs Stack/Tab paradigmasını anladık
✅ Stack Navigator — push/pop, ekranlar üst üste yığılır
✅ Tab Navigator — alt bar, 3 tab (Ürünler, Sepet, Profil)
✅ @expo/vector-icons ile tab ikonlarını ekledik
✅ tabBarBadge ile sepet sayacı ekledik
✅ Tab dışına Stack koyarak detay ekranında tab bar kaybettirdik
✅ Tab'larda mount durumunun korunduğunu anladık
✅ Deep link'in Expo Router'da otomatik çalıştığını gördük
✅ goBack() ve canGoBack() öğrendik
```

---

## Sonraki Gün

**[Gün 7 → Hafta 1 Özeti & Mini Proje](gun07_hafta1_ozet_mini_proje.md)**

Haftanın tüm konularını birleştiren mini proje:
Tab bar + Stack + FlatList + kart bileşeni + detay ekranı — tek çalışan uygulama.

---

*← [Gün 5](gun05_expo_router.md) | [Müfredat](../reactNaitiveMufredat.md) | [Gün 7 →](gun07_hafta1_ozet_mini_proje.md)*
