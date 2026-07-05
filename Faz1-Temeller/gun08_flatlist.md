# Gün 8 — FlatList: Virtual Scroll ve Performans

> **Faz:** 1 — Temeller | **Hafta:** 2 | **Gün:** 8 / 60
>
> **Bugünün Hedefi:** `FlatList`'in neden `ScrollView`'dan farklı olduğunu anlamak, virtualization'ı kavramak.
> ShopApp ürün listesini `ScrollView`'dan `FlatList`'e geçireceğiz, infinite scroll ekleyeceğiz.

---

## 1. Sorun: `ScrollView` Her Şeyi Baştan Render Eder

Gün 2'de kısaca bahsetmiştik. Şimdi tam olarak anlayalım:

```tsx
<ScrollView>
  {urunler.map(urun => <ProductCard key={urun.id} {...urun} />)}
</ScrollView>
```

100 ürün varsa ekranda **5 tanesi görünse bile 100 tanesi render edilir.**

```
ScrollView ile 100 ürün:
├─ [render] ProductCard #1   ← ekranda görünüyor
├─ [render] ProductCard #2   ← ekranda görünüyor
├─ [render] ProductCard #3   ← ekranda görünüyor
├─ [render] ProductCard #4   ← ekranda görünüyor
├─ [render] ProductCard #5   ← ekranda görünüyor
├─ [render] ProductCard #6   ← ekranda DEĞİL, ama render edildi
├─ [render] ProductCard #7   ← ekranda DEĞİL, ama render edildi
...
└─ [render] ProductCard #100 ← ekranda DEĞİL, ama render edildi
```

Sonuç: 100 native view, 100 JS objesi, 100 resim yükleme isteği — hepsi baştan.

---

## 2. Çözüm: `FlatList` Virtualization

`FlatList` sadece **ekranda görünen + yakın çevresindeki** item'ları render eder:

```
FlatList ile 100 ürün (ekranda 5 görünüyor):
├─ [render] ProductCard #1   ← ekranda
├─ [render] ProductCard #2   ← ekranda
├─ [render] ProductCard #3   ← ekranda
├─ [render] ProductCard #4   ← ekranda
├─ [render] ProductCard #5   ← ekranda
├─ [render] ProductCard #6   ← buffer (yakında görünecek)
├─ [render] ProductCard #7   ← buffer
├─ [placeholder] #8..#100    ← yer tutucu, render edilmedi
```

Kaydırınca görünmeyenler **unmount** edilir, görünecekler mount edilir:

```
Kullanıcı aşağı kaydırdı:
├─ [unmount] ProductCard #1  ← artık çok yukarıda
├─ [render]  ProductCard #8  ← görünür hale geldi
```

Web'deki `react-window` / `react-virtualized` ile aynı mantık. React Native bunu **built-in** olarak sağlıyor, ayrı kütüphane gereksiz.

---

## 3. Temel Kullanım

```tsx
import { FlatList } from 'react-native';

// ScrollView + map:
<ScrollView>
  {urunler.map(urun => (
    <ProductCard key={urun.id} {...urun} />
  ))}
</ScrollView>

// FlatList karşılığı:
<FlatList
  data={urunler}
  // data: render edilecek dizi

  keyExtractor={(item) => item.id}
  // keyExtractor: her item için unique string döndür
  // React'taki key prop'un FlatList karşılığı
  // Ama prop değil fonksiyon — item'a erişerek key üretebilirsin

  renderItem={({ item }) => (
    <ProductCard {...item} onPress={() => {}} />
  )}
  // renderItem: her item için JSX döndüren fonksiyon
  // { item } destructuring — ayrıca { index, separators } de var
/>
```

### `keyExtractor` vs React `key` prop farkı:

```tsx
// React'ta key prop:
urunler.map(urun => <ProductCard key={urun.id} />)
// key string veya number olabilir

// FlatList keyExtractor:
keyExtractor={(item) => item.id}
// Mutlaka string döndürmeli
// item'a erişerek dinamik key üretebilirsin:
keyExtractor={(item) => `urun-${item.id}-${item.kategori}`}
```

---

## 4. `renderItem` Detayları

```tsx
<FlatList
  data={urunler}
  keyExtractor={(item) => item.id}
  renderItem={({ item, index, separators }) => (
    // item: dizideki eleman
    // index: kaçıncı eleman (0'dan başlar)
    // separators: ayırıcı satır yönetimi (nadiren kullanılır)
    <ProductCard
      {...item}
      onPress={() => router.push(`/products/${item.id}`)}
    />
  )}
/>
```

**Önemli:** `renderItem`'ı bileşen dışında tanımla — her render'da yeni fonksiyon oluşturmamak için:

```tsx
// ❌ Her render'da yeni fonksiyon — FlatList her item'ı yeniden render eder
<FlatList
  renderItem={({ item }) => <ProductCard {...item} />}
/>

// ✅ Dışarıda tanımla veya useCallback kullan
const renderUrun = useCallback(
  ({ item }: { item: Urun }) => (
    <ProductCard {...item} onPress={() => router.push(`/products/${item.id}`)} />
  ),
  [router]  // bağımlılık: router değişirse fonksiyon yeniden oluşturulur
);

<FlatList
  data={urunler}
  keyExtractor={(item) => item.id}
  renderItem={renderUrun}
/>
```

---

## 5. Header, Footer, Boş Liste

```tsx
<FlatList
  data={urunler}
  keyExtractor={(item) => item.id}
  renderItem={renderUrun}

  ListHeaderComponent={() => (
    // Listenin en üstünde — scroll ile birlikte hareket eder
    // Sabit header için Stack/Tab Navigator header'ı kullan
    <View style={styles.header}>
      <Text style={styles.baslik}>Ürünler ({urunler.length})</Text>
    </View>
  )}

  ListFooterComponent={() => (
    // Listenin en altında — infinite scroll loading göstergesi için ideal
    yukleniyorMu ? (
      <ActivityIndicator size="large" color={COLORS.primary} style={{ margin: 24 }} />
    ) : null
  )}

  ListEmptyComponent={() => (
    // data boş dizi [] olduğunda gösterilir
    <View style={styles.bos}>
      <Text style={styles.bosYazi}>Ürün bulunamadı</Text>
    </View>
  )}
/>
```

---

## 6. Infinite Scroll: `onEndReached`

Web'de `IntersectionObserver` ile sayfanın sonuna gelindiğini algılardık. FlatList'te dahili olarak var:

```tsx
const [urunler, setUrunler] = useState(ILK_URUNLER);
const [sayfa, setSayfa] = useState(1);
const [yukleniyorMu, setYukleniyorMu] = useState(false);
const [hepsiYuklendi, setHepsiYuklendi] = useState(false);

const dahaFazlaYukle = useCallback(async () => {
  if (yukleniyorMu || hepsiYuklendi) return;

  setYukleniyorMu(true);
  const yeniUrunler = await api.getUrunler({ sayfa: sayfa + 1 });

  if (yeniUrunler.length === 0) {
    setHepsiYuklendi(true);
  } else {
    setUrunler(onceki => [...onceki, ...yeniUrunler]);
    setSayfa(onceki => onceki + 1);
  }

  setYukleniyorMu(false);
}, [yukleniyorMu, hepsiYuklendi, sayfa]);

<FlatList
  data={urunler}
  keyExtractor={(item) => item.id}
  renderItem={renderUrun}

  onEndReached={dahaFazlaYukle}
  // Liste sonuna yaklaşıldığında çağrılır

  onEndReachedThreshold={0.5}
  // 0.5 = listenin kalan %50'sine gelince tetikle
  // 0 = tam sona gelince
  // 1 = listeye girilince hemen (çok erken)
  // Genelde 0.3–0.5 arası iyi çalışır

  ListFooterComponent={() =>
    yukleniyorMu ? (
      <ActivityIndicator size="large" color={COLORS.primary} style={{ margin: 24 }} />
    ) : null
  }
/>
```

---

## 7. 2 Sütunlu Grid: `numColumns`

Gün 4'te Flexbox ile elle yaptığımız grid'i FlatList'in `numColumns` prop'u ile daha temiz yapabiliriz:

```tsx
<FlatList
  data={urunler}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <ProductCard {...item} onPress={() => {}} />
  )}
  numColumns={2}
  // Her satıra 2 item koy
  // renderItem içindeki View otomatik olarak 1/numColumns genişlik alır
  // AMA: tam kontrol için kendi genişliğini ver (aşağıda)

  columnWrapperStyle={styles.satirSarmalayici}
  // numColumns > 1 olduğunda her satıra uygulanan stil
  // Satırlar arası ve sütunlar arası boşluk için
/>

const styles = StyleSheet.create({
  satirSarmalayici: {
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
});
```

**Dikkat:** `numColumns` ile çalışırken `renderItem`'daki her item eşit genişlikte olmalı:

```tsx
const { width } = useWindowDimensions();
const SUTUN_SAYISI = 2;
const YATAY_PADDING = 16;
const SUTUN_BOSLUGU = 12;
const kartGenisligi =
  (width - YATAY_PADDING * 2 - SUTUN_BOSLUGU * (SUTUN_SAYISI - 1)) / SUTUN_SAYISI;

renderItem={({ item }) => (
  <View style={{ width: kartGenisligi }}>
    <ProductCard {...item} onPress={() => {}} />
  </View>
)}
```

---

## 8. `getItemLayout` — Sabit Yükseklik Optimizasyonu

FlatList normalde her item'ın yüksekliğini render ettikten sonra öğrenir. Item yükseklikleri sabitse bunu önceden söyleyebilirsin:

```tsx
const KART_YUKSEKLIGI = 280;  // px — sabit ise kullan

<FlatList
  data={urunler}
  getItemLayout={(data, index) => ({
    length: KART_YUKSEKLIGI,   // item yüksekliği
    offset: KART_YUKSEKLIGI * index,  // bu item'ın listede başladığı konum
    index,
  })}
  // Faydaları:
  // 1. scrollToIndex ile belirli bir item'a anında atla
  // 2. Büyük listede scroll performansı artar
  // 3. FlatList layout hesaplamasını atlar
/>
```

**Ne zaman kullan:** Item yükseklikleri değişmiyorsa (sabit kart, sabit satır). Dinamik yüksekliklerde bırak — yanlış değer vermek daha kötü.

---

## 9. `SectionList` — Gruplu Liste

Kategori bazlı ürün listesi gibi gruplu veriler için:

```tsx
import { SectionList } from 'react-native';

const BOLUMLER = [
  {
    title: 'Spor Ayakkabı',
    data: [
      { id: '1', isim: 'Nike Air Max', fiyat: 2999 },
      { id: '2', isim: 'Adidas Ultraboost', fiyat: 3499 },
    ],
  },
  {
    title: 'Günlük Ayakkabı',
    data: [
      { id: '3', isim: 'Converse Chuck Taylor', fiyat: 1599 },
      { id: '4', isim: 'Vans Old Skool', fiyat: 1799 },
    ],
  },
];

<SectionList
  sections={BOLUMLER}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ProductCard {...item} onPress={() => {}} />}
  renderSectionHeader={({ section }) => (
    // Her bölümün başlık satırı
    <View style={styles.bolumBaslik}>
      <Text style={styles.bolumBaslikYazi}>{section.title}</Text>
    </View>
  )}
  stickySectionHeadersEnabled={true}
  // Bölüm başlığı scroll ederken ekranın üstüne yapışır
  // Web'deki position: sticky gibi
/>
```

---

## 10. ShopApp: `ScrollView`'dan `FlatList`'e Geçiş

`app/(tabs)/index.tsx`'i güncelle:

```tsx
// app/(tabs)/index.tsx
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { ProductCard } from '../../components/ProductCard';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

type Urun = {
  id: string;
  isim: string;
  fiyat: number;
  gorsel: string;
  indirim?: number;
};

// Sahte sayfalı veri — gerçekte API'den gelecek (Gün 18)
const TUM_URUNLER: Urun[] = Array.from({ length: 40 }, (_, i) => ({
  id: String(i + 1),
  isim: `Ürün ${i + 1}`,
  fiyat: Math.floor(Math.random() * 3000) + 500,
  gorsel: `https://picsum.photos/seed/urun${i + 1}/400/400`,
  indirim: i % 3 === 0 ? 20 : undefined,
}));

const SAYFA_BOYUTU = 10;

export default function UrunlerTab() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [urunler, setUrunler] = useState<Urun[]>(TUM_URUNLER.slice(0, SAYFA_BOYUTU));
  const [sayfa, setSayfa] = useState(1);
  const [yukleniyorMu, setYukleniyorMu] = useState(false);

  const kartGenisligi = (width - SPACING.lg * 2 - SPACING.md) / 2;

  const dahaFazlaYukle = useCallback(() => {
    if (yukleniyorMu) return;

    const baslangic = sayfa * SAYFA_BOYUTU;
    if (baslangic >= TUM_URUNLER.length) return;

    setYukleniyorMu(true);
    // Sahte gecikme — gerçekte API çağrısı olacak
    setTimeout(() => {
      const yeniUrunler = TUM_URUNLER.slice(baslangic, baslangic + SAYFA_BOYUTU);
      setUrunler(onceki => [...onceki, ...yeniUrunler]);
      setSayfa(onceki => onceki + 1);
      setYukleniyorMu(false);
    }, 800);
  }, [yukleniyorMu, sayfa]);

  const renderUrun = useCallback(
    ({ item }: { item: Urun }) => (
      <View style={{ width: kartGenisligi }}>
        <ProductCard
          {...item}
          onPress={() => router.push(`/products/${item.id}`)}
        />
      </View>
    ),
    [kartGenisligi, router]
  );

  return (
    <FlatList
      data={urunler}
      keyExtractor={(item) => item.id}
      renderItem={renderUrun}
      numColumns={2}
      columnWrapperStyle={styles.satirSarmalayici}
      contentContainerStyle={styles.liste}
      // contentContainerStyle: FlatList'in iç alanına uygulanan stil
      // style: FlatList'in kendisi (dış kapsayıcı)
      showsVerticalScrollIndicator={false}

      ListHeaderComponent={() => (
        <Text style={styles.baslik}>Ürünler</Text>
      )}

      ListEmptyComponent={() => (
        <View style={styles.bos}>
          <Text style={styles.bosYazi}>Ürün bulunamadı</Text>
        </View>
      )}

      ListFooterComponent={() =>
        yukleniyorMu ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={styles.yukleniyorGostergesi}
          />
        ) : null
      }

      onEndReached={dahaFazlaYukle}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  liste: {
    paddingBottom: SPACING.xl,
    backgroundColor: COLORS.background,
  },

  baslik: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  satirSarmalayici: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },

  bos: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xxxl,
  },

  bosYazi: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textSecondary,
  },

  yukleniyorGostergesi: {
    marginVertical: SPACING.xl,
  },
});
```

---

## 11. `style` vs `contentContainerStyle`

FlatList'te iki farklı stil prop'u var — kafayı karıştırır:

```
┌─────────────────────────────┐  ← style (FlatList'in kendisi)
│  ┌───────────────────────┐  │  ← contentContainerStyle (iç alan)
│  │  [Header]             │  │
│  │  [Item 1]             │  │
│  │  [Item 2]             │  │
│  │  [Footer]             │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

```tsx
<FlatList
  style={{ flex: 1, backgroundColor: 'red' }}
  // FlatList kapsayıcısının stili — genelde flex: 1

  contentContainerStyle={{ padding: 16, backgroundColor: 'blue' }}
  // İçeriğin (header + items + footer) stili
  // padding burada verilmeli — style'da verilirse item'lara uygulanmaz

  // ❌ Yaygın hata:
  style={{ padding: 16 }}
  // Sadece dış kapsayıcıya uygulanır, item'lar etkilenmez
/>
```

---

## 12. Web ile Karşılaştırma

| Web | React Native | Fark |
|---|---|---|
| `items.map(item => <div>)` | `<FlatList data renderItem>` | FlatList virtualize eder |
| `react-window` / `react-virtualized` | `FlatList` (built-in) | Ayrı kütüphane gereksiz |
| `key={item.id}` | `keyExtractor={(item) => item.id}` | Prop değil fonksiyon |
| `IntersectionObserver` | `onEndReached` | Daha basit API |
| CSS `position: sticky` (section header) | `stickySectionHeadersEnabled` | SectionList prop'u |
| `react-query` infinite scroll | `onEndReached` + state | Benzer mantık |

---

## 13. Kontrol Soruları

**1. 1000 item için `ScrollView` vs `FlatList` — fark ne?**
> `ScrollView`: 1000 item baştan render edilir — 1000 native view, JS heap dolar, ilk açılış yavaş, kaydırma takılır. `FlatList`: ekranda görünen ~10 item + buffer ~20 item render edilir. Geri kalanlar placeholder. Kaydırınca görünmeyenler unmount, görünecekler mount olur. Bellek sabit kalır.

**2. `keyExtractor` React'taki `key` prop'undan nasıl farklı?**
> React `key` prop'u JSX elementine direkt verilir, string veya number olabilir. `keyExtractor` bir **fonksiyon** — item nesnesine erişerek key üretir, mutlaka string döndürmeli. FlatList bunu virtualization sırasında hangi component'i yeniden kullanacağını belirlemek için kullanır.

**3. `onEndReachedThreshold={0.5}` ne anlama gelir?**
> Listenin görünmeyen kalan kısmının %50'si ekrana sığdığında tetiklenir. Yani liste 1000px uzunluğundaysa ve 800px'i görünüyorsa, kalan 200px'in %50'si = 100px daha kaydırılınca `onEndReached` çağrılır. 0 = en sona gelince, 1 = listeye girilince hemen.

---

## Bugün Ne Yaptık?

```
✅ ScrollView vs FlatList farkını ve virtualization'ı anladık
✅ keyExtractor, renderItem, data prop'larını öğrendik
✅ ListHeaderComponent, ListFooterComponent, ListEmptyComponent kullandık
✅ onEndReached + onEndReachedThreshold ile infinite scroll yazdık
✅ numColumns + columnWrapperStyle ile 2 sütunlu grid yaptık
✅ getItemLayout ile performans optimizasyonunu anladık
✅ SectionList ile gruplu liste gördük
✅ style vs contentContainerStyle farkını anladık
✅ ScrollView → FlatList geçişini ShopApp'te uyguladık
```

---

## Sonraki Gün

**[Gün 9 → TextInput ve Form Yönetimi](gun09_textinput_form.md)**

`TextInput`, klavye davranışı, `KeyboardAvoidingView`, kontrolsüz vs kontrollü input.
ShopApp'e arama çubuğu + login formu ekliyoruz.

---

*← [Gün 6](gun06_stack_tab_navigator.md) | [Müfredat](../reactNaitiveMufredat.md) | [Gün 9 →](gun09_textinput_form.md)*
