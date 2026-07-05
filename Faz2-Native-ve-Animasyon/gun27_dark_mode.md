# Gün 27 — Dark Mode ve Tema Sistemi

## Neden Dark Mode?

Üç somut nedeni var:

1. **Göz yorgunluğu:** Karanlık ortamda parlak ekran göz yorar. Dark mode kontrast farkını azaltır.
2. **Pil tasarrufu:** OLED ekranlarda siyah piksel kapalı demek — karanlık tema gerçekten pil tasarrufu sağlar.
3. **Kullanıcı tercihi:** iOS ve Android sistem teması artık bir standart. Uygulamanın buna uymayı bekliyorlar.

Ama daha önemli bir neden: sistematik bir tema yapısı kurmak zorunda kalıyorsun. Dark mode'u eklemek "her yerde `#fff` yerine `#000` koy" değil — düzgün yapılırsa tüm uygulamanın renk yönetimi bir merkezden kontrol edilir.

---

## `useColorScheme`: Sistem Temasını Oku

```tsx
import { useColorScheme } from 'react-native';

function Buton() {
  const tema = useColorScheme(); // 'light' | 'dark' | null

  return (
    <View style={{ backgroundColor: tema === 'dark' ? '#1C1C1E' : '#FFFFFF' }}>
      <Text style={{ color: tema === 'dark' ? '#FFFFFF' : '#000000' }}>
        Tıkla
      </Text>
    </View>
  );
}
```

**Sorun ne?**  
Her bileşende aynı kontrolü yapıyorsun. `tema === 'dark' ? '#1C1C1E' : '#FFFFFF'` satırı her yerde tekrar ediyor. Rengi değiştirmek istediğinde 50 dosyayı düzeltmen gerekiyor.

**Çözüm: Tema sistemi** — renkleri bir yerden yönet, her bileşen oradan alsın.

---

## Tema Objesi: Token Sistemi

Renkleri doğrudan kullanmak yerine "token" dediğimiz isimlendirilmiş sabitler kullanıyoruz.

**Analoji: Boya şablonu**

Bir fabrikada her ürünü tek tek boyayan boya ustası yerine, ürünler bir şablona bakıyor: "arka plan rengi = şablon-001, başlık rengi = şablon-002." Şablonu değiştirince tüm ürünler otomatik değişiyor.

Token sistemi de bu: `colors.background` = şablon-001. Light modda beyaz, dark modda koyu gri. Bileşenler `#FFFFFF` yazmıyor, `colors.background` yazıyor.

```tsx
// constants/tema.ts
export const acikTema = {
  colors: {
    arka: '#F2F2F7',          // sayfa arka planı
    kart: '#FFFFFF',           // kart arka planı
    yaziBaslik: '#000000',
    yaziIkincil: '#6C6C70',
    sinir: '#E5E5EA',
    birincil: '#007AFF',       // mavi — butonlar, linkler
    tehlike: '#FF3B30',        // kırmızı — sil, hata
    basari: '#34C759',         // yeşil — onay
    iskelet: '#E8E8E8',        // skeleton placeholder
  },
  araliklar: {
    xs: 4, s: 8, m: 12, l: 16, xl: 24,
  },
  yaziStilleri: {
    h1: { fontSize: 28, fontWeight: '700' as const },
    h2: { fontSize: 22, fontWeight: '600' as const },
    govde: { fontSize: 16, fontWeight: '400' as const },
    kucuk: { fontSize: 13, fontWeight: '400' as const },
  },
} as const;

export const koyuTema = {
  ...acikTema,
  colors: {
    arka: '#000000',
    kart: '#1C1C1E',
    yaziBaslik: '#FFFFFF',
    yaziIkincil: '#8E8E93',
    sinir: '#38383A',
    birincil: '#0A84FF',       // dark modda biraz daha parlak mavi
    tehlike: '#FF453A',
    basari: '#30D158',
    iskelet: '#2C2C2E',
  },
  araliklar: acikTema.araliklar,   // aynı
  yaziStilleri: acikTema.yaziStilleri, // aynı
} as const;

export type Tema = typeof acikTema;
```

**`as const` neden?** TypeScript tema objelerinin string literal tiplerini korusun — `'#007AFF'` tipini `string`'e genişletmesin.

---

## Zustand ile Tema Yönetimi

`useColorScheme` sistemi okur ama yazamaz. Kullanıcı kendi seçimini yapmak istiyorsa — "benim koyu modu her zaman açık olsun, sisteme bakma" — bunu Zustand'da saklamak gerekiyor.

```tsx
// stores/temaStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type TemaSecim = 'acik' | 'koyu' | 'sistem'; // sistem = useColorScheme'ye uy

type TemaStore = {
  secim: TemaSecim;
  setSecim: (secim: TemaSecim) => void;
};

export const useTemaStore = create<TemaStore>()(
  persist(
    (set) => ({
      secim: 'sistem', // varsayılan: sisteme uy
      setSecim: (secim) => set({ secim }),
    }),
    {
      name: 'tema-secimi',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### Aktif temayı döndüren hook

```tsx
// hooks/useTema.ts
import { useColorScheme } from 'react-native';
import { useTemaStore } from '@/stores/temaStore';
import { acikTema, koyuTema } from '@/constants/tema';

export function useTema() {
  const sistemTema = useColorScheme(); // 'light' | 'dark' | null
  const { secim } = useTemaStore();

  const aktifMod =
    secim === 'sistem'
      ? (sistemTema ?? 'light') // null gelirse varsayılan açık
      : secim === 'koyu'
        ? 'dark'
        : 'light';

  return {
    tema: aktifMod === 'dark' ? koyuTema : acikTema,
    mod: aktifMod,
    koyuMu: aktifMod === 'dark',
  };
}
```

Artık her bileşende:

```tsx
const { tema } = useTema();

<View style={{ backgroundColor: tema.colors.arka }}>
  <Text style={{ color: tema.colors.yaziBaslik }}>
    Merhaba
  </Text>
</View>
```

---

## ShopApp: Tema Toggle Ekranı

Ayarlar sayfasında kullanıcı tema seçebilsin:

```tsx
// app/(tabs)/profile.tsx — ya da settings
import { useTema } from '@/hooks/useTema';
import { useTemaStore } from '@/stores/temaStore';

export default function Profil() {
  const { tema, mod } = useTema();
  const { secim, setSecim } = useTemaStore();

  const seçenekler = [
    { label: 'Açık', deger: 'acik' as const, ikon: 'sunny-outline' },
    { label: 'Koyu', deger: 'koyu' as const, ikon: 'moon-outline' },
    { label: 'Sistem', deger: 'sistem' as const, ikon: 'phone-portrait-outline' },
  ];

  return (
    <ScrollView style={{ backgroundColor: tema.colors.arka }}>
      <View style={[styles.bolum, { backgroundColor: tema.colors.kart }]}>
        <Text style={[styles.bolumBaslik, { color: tema.colors.yaziIkincil }]}>
          GÖRÜNÜM
        </Text>

        {seçenekler.map((opt) => (
          <Pressable
            key={opt.deger}
            onPress={() => setSecim(opt.deger)}
            style={[styles.satir, { borderBottomColor: tema.colors.sinir }]}
          >
            <View style={styles.satirSol}>
              <Ionicons name={opt.ikon} size={22} color={tema.colors.birincil} />
              <Text style={{ color: tema.colors.yaziBaslik }}>{opt.label}</Text>
            </View>
            {secim === opt.deger && (
              <Ionicons name="checkmark" size={20} color={tema.colors.birincil} />
            )}
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
```

---

## Tema Farkında `StyleSheet` Kullanımı

`StyleSheet.create` statik — tema değişince güncellenmez. Bunu çözmek için birkaç yol var:

### Yol 1: Inline stil (basit durumlar için)

```tsx
const { tema } = useTema();

<View style={{ backgroundColor: tema.colors.kart, padding: tema.araliklar.l }}>
```

Performans: React Native inline stilleri her render'da yeniden hesaplar. Küçük bileşenler için sorun değil.

### Yol 2: `useMemo` ile hesaplanan StyleSheet (daha performanslı)

```tsx
const { tema } = useTema();

const styles = useMemo(() => StyleSheet.create({
  kart: {
    backgroundColor: tema.colors.kart,
    borderRadius: 12,
    padding: tema.araliklar.m,
  },
  baslik: {
    color: tema.colors.yaziBaslik,
    ...tema.yaziStilleri.h2,
  },
}), [tema]); // tema değişince yeniden hesapla
```

Tema değişince `styles` nesnesi yeniden oluşturuluyor — ama her render'da değil.

### Yol 3: Tema bağımsız + değişken renkler (en sık kullanılan)

```tsx
// Statik değerleri StyleSheet.create ile
const staticStyles = StyleSheet.create({
  kart: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

// Renkler inline
const { tema } = useTema();

<View style={[staticStyles.kart, { backgroundColor: tema.colors.kart }]}>
```

Tema bağımsız stiller `StyleSheet.create` ile bir kez oluşturulur — tekrar hesaplanmaz. Renkler inline gelir.

---

## `Appearance` API: Programatik Erişim

`useColorScheme` hook, component içinde sistemi izler. Hook dışında sistem temasını okumak için `Appearance` kullanıyorsun:

```tsx
import { Appearance } from 'react-native';

// Anlık sistem temasını oku (hook değil, fonksiyon)
const sistemMod = Appearance.getColorScheme(); // 'light' | 'dark' | null

// Değişiklikleri dinle (component dışında, store başlatırken vs.)
const dinleyici = Appearance.addChangeListener(({ colorScheme }) => {
  console.log('Sistem teması değişti:', colorScheme);
});

// Temizlik
dinleyici.remove();
```

Zustand store'unda sistem temasını takip etmek için:

```tsx
// stores/temaStore.ts — store başlatılırken
import { Appearance } from 'react-native';

// Store dışında sistem temasını takip et
Appearance.addChangeListener(({ colorScheme }) => {
  // Eğer kullanıcı 'sistem' seçtiyse, store'u güncelle
  const { secim } = useTemaStore.getState();
  if (secim === 'sistem') {
    // Bileşenler zaten useColorScheme ile dinlediği için
    // genellikle buraya müdahale etmek gerekmez
  }
});
```

Çoğu durumda `useColorScheme` hook'u ve `useTema` kancası yeterli — `Appearance` nadiren direkt kullanılıyor.

---

## Renk Geçiş Animasyonu

Tema değişince renkler aniden değil yavaşça geçsin. Reanimated ile:

```tsx
// hooks/useTemaRengi.ts
import { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

// ⚠️ Reanimated interpolate string değerlerle (renk) direkt çalışmıyor
// Geçici çözüm: opacity ile geçiş
export function useTemaGecisSkatman() {
  const opacity = useSharedValue(1);

  function temaGecis(callback: () => void) {
    // Önce soldur
    opacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(callback)(); // tema değiştir
    });
    // Sonra görünür yap
    opacity.value = withTiming(1, { duration: 150 });
  }

  const gecisStil = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return { gecisStil, temaGecis };
}
```

```tsx
// Kullanım
const { gecisStil, temaGecis } = useTemaGecisSkatman();
const { setSecim } = useTemaStore();

<Animated.View style={[{ flex: 1 }, gecisStil]}>
  {/* tüm sayfa içeriği */}
</Animated.View>

<Pressable onPress={() => temaGecis(() => setSecim('koyu'))}>
  <Text>Koyu Moda Geç</Text>
</Pressable>
```

---

## ShopApp Bileşenlerini Tema Farkında Yap

Pratik örnek — ProductCard bileşeni:

```tsx
// components/ProductCard.tsx
import { useTema } from '@/hooks/useTema';

export function ProductCard({ urun, onPress }: Props) {
  const { tema } = useTema();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.kart, { backgroundColor: tema.colors.kart }]}
    >
      <Image source={{ uri: urun.gorselUrl }} style={styles.gorsel} />

      <View style={styles.bilgi}>
        <Text style={[styles.ad, { color: tema.colors.yaziBaslik }]}>
          {urun.ad}
        </Text>
        <Text style={[styles.marka, { color: tema.colors.yaziIkincil }]}>
          {urun.marka}
        </Text>

        <View style={styles.fiyatSatir}>
          <Text style={[styles.fiyat, { color: tema.colors.yaziBaslik }]}>
            {urun.fiyat} ₺
          </Text>
          {urun.indirimYuzdesi && (
            <View style={[styles.rozet, { backgroundColor: tema.colors.tehlike }]}>
              <Text style={styles.rozetYazi}>%{urun.indirimYuzdesi}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    // Gölge her zaman aynı — tema bağımsız
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  gorsel: { width: '100%', height: 180 },
  bilgi: { padding: 12 },
  ad: { fontSize: 16, fontWeight: '600' },
  marka: { fontSize: 13, marginTop: 2 },
  fiyatSatir: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  fiyat: { fontSize: 18, fontWeight: '700' },
  rozet: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rozetYazi: { color: 'white', fontSize: 12, fontWeight: '600' },
});
```

**Dikkat et:** `shadowColor`, `elevation`, `overflow`, `borderRadius` — bunlar tema bağımsız, statik `StyleSheet.create` ile. `backgroundColor`, `color` — bunlar tema bağımlı, inline.

---

## Web ile Karşılaştırma

| Web | React Native | Fark |
|-----|-------------|------|
| `prefers-color-scheme` media query | `useColorScheme()` | Aynı mantık |
| CSS variables (`--color-bg: #fff`) | Tema objesi (`tema.colors.arka`) | CSS var'ı otomatik güncellenirdi, RN'de manuel |
| `document.documentElement.classList.toggle('dark')` | `useTemaStore.setSecim('koyu')` | Store güncelleme → re-render |
| Tailwind `dark:` prefix | — | RN'de yoktur, her bileşende if/else |
| Renk geçiş: `transition: background-color 0.3s` | Reanimated ile fade | CSS daha kolay |

En büyük fark: Web'de CSS değişkenleri tüm DOM'u anlık günceller, React re-render gerekmez. React Native'de tema değişimi tüm bileşenleri yeniden render ettirir — performansa dikkat.

---

## Kontrol Soruları

1. `useColorScheme` ile sistem temasını okuyabiliyorsun. Peki kullanıcı "her zaman koyu" demek istiyorsa, neden `useColorScheme` yeterli değil? Ne kullanıyorsun?

2. Tema sistemi olmadan `backgroundColor: tema === 'dark' ? '#1C1C1E' : '#FFFFFF'` her bileşende yazıldığında ne sorun çıkar? Token sistemi bunu nasıl çözüyor?

3. `StyleSheet.create` ve inline stil farkı nedir? Dark mode için hangisini ne zaman kullanırsın?

4. Zustand store'una `persist` ekliyoruz — neden? Olmasa ne olur?

5. Web'de CSS variables tema değişiminde re-render gerektirmiyor. React Native'de neden re-render gerekiyor ve bu performansı nasıl etkiler?

---

## Özet

| Kavram | Açıklama |
|--------|----------|
| `useColorScheme()` | Sistem temasını okur — `'light'`, `'dark'`, `null` |
| `Appearance` API | Hook dışında sistem temasına erişim |
| Tema objesi | Renkleri token olarak sakla — `colors.arka`, `colors.kart` |
| `useTema()` | Store + sistem temasını birleştirip aktif temayı döndürür |
| `useTemaStore` | Kullanıcının manuel seçimini AsyncStorage'a persist eder |
| Statik + inline | `StyleSheet.create` geometri için, inline renkler için |

**Yarın (Gün 28):** Hafta 4 Özeti — Gün 22-27 arası konuları gözden geçir, ShopApp'e TypeScript sıkılaştırması, tüm animation'ları entegre et.
