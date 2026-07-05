# Gün 4 — Flexbox: Web ile Farklar

> **Faz:** 1 — Temeller | **Hafta:** 1 | **Gün:** 4 / 60
>
> **Bugünün Hedefi:** React Native Flexbox'ı web'den farkıyla anlamak.
> ShopApp'e **2 sütunlu ürün grid'i** ekleyeceğiz.

---

## 1. React Native'de Grid Yok, Float Yok — Sadece Flexbox

Web'de birden fazla layout sistemi vardı:

```css
/* Web'de seçenekler: */
display: block;    /* normal akış */
display: flex;     /* flexbox */
display: grid;     /* grid */
float: left;       /* eski yöntem */
position: absolute /* çıkarma */
```

React Native'de **sadece Flexbox.** Her `<View>` otomatik olarak flex container. `display: flex` yazmana gerek yok, `display: grid` seçeneği hiç yok.

```tsx
// Web'de flex kullanmak için:
<div style={{ display: 'flex' }}>

// React Native'de her View zaten flex:
<View>  {/* display: flex zaten var, yazmana gerek yok */}
```

---

## 2. En Büyük Fark: `flexDirection` Varsayılanı

Bu fark ilk günden kafayı karıştırır:

```
Web Flexbox varsayılanı:
┌─────────────────────┐
│ [A] [B] [C]         │  ← soldan sağa (row)
└─────────────────────┘

React Native Flexbox varsayılanı:
┌─────────────────────┐
│ [A]                 │
│ [B]                 │  ← yukarıdan aşağı (column)
│ [C]                 │
└─────────────────────┘
```

Neden? Mobil uygulamalarda içerik zaten büyük çoğunlukla dikey akıyor — ekranlar uzun, dar. Telefon arayüzü doğası gereği `column`. Web'de ise metin satır satır akıyor, `row` daha doğal başlangıç noktası.

```tsx
// Web'de varsayılan 'row' — yatay dizmek için bir şey yazmak gerekmez
<div style={{ display: 'flex' }}>
  <span>A</span>
  <span>B</span>
  {/* A ve B yan yana */}
</div>

// React Native'de varsayılan 'column' — yatay dizmek için açıkça yazılmalı
<View>
  <Text>A</Text>
  <Text>B</Text>
  {/* A üstte, B altında */}
</View>

<View style={{ flexDirection: 'row' }}>
  <Text>A</Text>
  <Text>B</Text>
  {/* A ve B yan yana */}
</View>
```

---

## 3. Flexbox Özellikleri — Web ile Karşılaştırma

### `justifyContent` — ana eksen (main axis) hizalama

`flexDirection: 'column'` (varsayılan) → ana eksen **dikey**
`flexDirection: 'row'` → ana eksen **yatay**

```tsx
// Dikey ortalama (column'da main axis = dikey):
<View style={{ flex: 1, justifyContent: 'center' }}>
  <Text>Ortada</Text>
</View>

// Yatay ortalama (row'da main axis = yatay):
<View style={{ flexDirection: 'row', justifyContent: 'center' }}>
  <Text>Ortada</Text>
</View>
```

| Değer | Açıklama |
|---|---|
| `'flex-start'` | Başa yasla (varsayılan) |
| `'flex-end'` | Sona yasla |
| `'center'` | Ortala |
| `'space-between'` | İlk ve son uçlarda, aralar eşit boşluk |
| `'space-around'` | Her elemanın iki yanında eşit boşluk |
| `'space-evenly'` | Tüm boşluklar eşit (elemanlar dahil) |

### `alignItems` — çapraz eksen (cross axis) hizalama

Çapraz eksen, ana eksenin tersidir.

```tsx
// column modunda cross axis = yatay → yatay ortalama:
<View style={{ flex: 1, alignItems: 'center' }}>
  <Text>Yatay ortada</Text>
</View>

// row modunda cross axis = dikey → dikey ortalama:
<View style={{ flexDirection: 'row', alignItems: 'center', height: 60 }}>
  <Text>Dikey ortada</Text>
</View>
```

| Değer | Açıklama |
|---|---|
| `'stretch'` | Çapraz ekseni doldur (varsayılan) |
| `'flex-start'` | Başa yasla |
| `'flex-end'` | Sona yasla |
| `'center'` | Ortala |
| `'baseline'` | Metin taban çizgisine göre hizala |

> **Web farkı:** Web'de `alignItems` varsayılanı `'stretch'`. React Native'de de `'stretch'` — aynı.

### Tam ortalama (dikey + yatay aynı anda):

```tsx
// Web:
<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>

// React Native — aynı mantık, sadece camelCase:
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
  <Text>Hem dikey hem yatay ortada</Text>
</View>
```

---

## 4. `flex: 1` — Mevcut Alanı Doldur

Web'de `flex: 1` aslında `flex: 1 1 0%` kısaltmasıydı (grow, shrink, basis).
React Native'de **`flex: 1` = mevcut alanı doldur** — bu kadar. Shrink ve basis yok.

```tsx
// ❌ flex: 1 çalışmıyor — parent'ın boyutu yok
<View>
  <View style={{ flex: 1, backgroundColor: 'red' }} />
  {/* flex: 1 neyin 1'i? Parent sıfır yükseklikte → child de sıfır */}
</View>

// ✅ Parent'ın da boyutu olmalı:
<View style={{ flex: 1 }}>              {/* ekranı doldur */}
  <View style={{ flex: 1, backgroundColor: 'red' }} />
  {/* şimdi parent'ın tamamını dolduruyor */}
</View>

// ✅ Sabit boyutlu parent da çalışır:
<View style={{ height: 200 }}>
  <View style={{ flex: 1, backgroundColor: 'red' }} />
  {/* 200dp yüksekliği doldurur */}
</View>
```

### Orantılı bölme:

```tsx
// Header + içerik + footer — 3 bölge:
<View style={{ flex: 1 }}>
  <View style={{ height: 60, backgroundColor: '#3b82f6' }}>
    {/* Header — sabit 60dp */}
  </View>

  <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
    {/* İçerik — kalan alanın tamamı */}
  </View>

  <View style={{ height: 80, backgroundColor: '#1e293b' }}>
    {/* Footer — sabit 80dp */}
  </View>
</View>

// İçerik alanını 1:2 oranında böl:
<View style={{ flex: 1 }}>
  <View style={{ flex: 1, backgroundColor: 'lightblue' }}>
    {/* 1/3 */}
  </View>
  <View style={{ flex: 2, backgroundColor: 'lightyellow' }}>
    {/* 2/3 */}
  </View>
</View>
```

---

## 5. `flex: 1` ile `width: '100%'` Farkı

```tsx
// width: '100%' — parent genişliğini al, yükseklik kendi içeriğine göre
<View style={{ width: '100%', backgroundColor: 'red' }}>
  <Text>İçerik kadar yüksek</Text>
</View>

// flex: 1 — hem genişlik hem yükseklik için parent'ı doldur
// AMA: parent'ın height'ı olmalı (flex: 1 veya sabit height)
<View style={{ flex: 1, backgroundColor: 'red' }}>
  {/* Parent ne kadar yüksekse o kadar */}
</View>
```

**Pratik kural:**
- Yatay dolgu istiyorsan → `width: '100%'` veya `alignSelf: 'stretch'`
- Hem yatay hem dikey dolgu (ekranı doldur) → `flex: 1`

---

## 6. `gap` — RN 0.71'den İtibaren

Web'de flexbox `gap` uzun süredir var. React Native'e **0.71 (Ocak 2023)** sürümünde eklendi.

```tsx
// Eski yöntem (hâlâ geçerli):
<View style={{ flexDirection: 'row' }}>
  <View style={{ marginRight: 8 }} />
  <View style={{ marginRight: 8 }} />
  <View />  {/* son elemana margin yok — koşullu mantık gerekir */}
</View>

// Yeni yöntem (0.71+):
<View style={{ flexDirection: 'row', gap: 8 }}>
  <View />
  <View />
  <View />  {/* gap her araya eşit boşluk — son elemana uygulanmaz */}
</View>

// rowGap ve columnGap ayrı da ayarlanabilir:
<View style={{ flexWrap: 'wrap', rowGap: 12, columnGap: 8 }}>
```

> **Eski Expo projelerinde** `gap` çalışmıyorsa React Native sürümü 0.71 altındadır. `margin` ile yapılmalı.

---

## 7. `position: 'absolute'` — En Yakın View'a Göre

Web'de `position: absolute` elementi, `position: relative` olan en yakın ataya göre konumlandırırdı. Hiçbiri yoksa `document`'a göre.

React Native'de **her `View` implicit olarak `position: 'relative'`**. Yani `absolute` bir element, her zaman en yakın `View` parent'ına göre konumlanır.

```tsx
// İndirim etiketi — görselin üstüne yerleştirme:
<View style={{ position: 'relative' }}>
  {/* position: relative — aslında zaten böyle, yazmak şart değil */}

  <Image source={{ uri: '...' }} style={{ width: '100%', height: 200 }} />

  <View style={{
    position: 'absolute',
    top: 12,
    left: 12,
    // Koordinatlar: en yakın View parent'ına göre (Image değil, dış View)
  }}>
    <Text>%20</Text>
  </View>
</View>
```

### `position: 'absolute'` ile tam kaplama:

```tsx
// Bir View'ı parent'ın tamamını kaplamasını sağla:
<View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
  {/* Parent'ı tamamen kaplar */}
</View>

// StyleSheet kısayolu — aynı sonuç:
<View style={StyleSheet.absoluteFillObject}>

// veya:
<View style={{ ...StyleSheet.absoluteFillObject }}>
```

---

## 8. `flexWrap` — Taşınca Alt Satıra Geç

Varsayılan olarak flex children tek satırda sıkışır ve taşmaz:

```tsx
// flexWrap: 'nowrap' (varsayılan) — taşsa bile tek satır
<View style={{ flexDirection: 'row' }}>
  {/* 10 tane View varsa hepsi yan yana — dışarı taşar */}
</View>

// flexWrap: 'wrap' — satır dolunca alta geç
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  {/* 10 tane View — satır dolunca alt satıra geçer */}
</View>
```

---

## 9. ShopApp: 2 Sütunlu Ürün Grid'i

Flexbox bilgimizi kullanarak ürün listesini 2 sütuna bölelim.

`components/ProductGrid.tsx` oluştur:

```tsx
// components/ProductGrid.tsx
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOW } from '../constants/theme';

type Urun = {
  id: string;
  isim: string;
  fiyat: number;
  gorsel: string;
  indirim?: number;
};

type Props = {
  urunler: Urun[];
  onUrunPress: (id: string) => void;
};

export function ProductGrid({ urunler, onUrunPress }: Props) {
  const { width } = useWindowDimensions();

  // 2 sütun, her iki yanda ve aralarında boşluk
  // Toplam yatay boşluk: sol padding + sağ padding + sütunlar arası = 16 + 16 + 12 = 44
  const kartGenisligi = (width - 44) / 2;

  return (
    <View style={styles.grid}>
      {urunler.map((urun) => (
        <Pressable
          key={urun.id}
          onPress={() => onUrunPress(urun.id)}
          style={({ pressed }) => [
            styles.kart,
            { width: kartGenisligi },
            // kartGenisligi dinamik — StyleSheet içine koyamayız
            // Bu yüzden width'i inline veriyoruz
            pressed && { opacity: 0.85 },
          ]}
        >
          {/* GÖRSEL */}
          <View style={styles.gorselKapsayici}>
            <Image
              source={{ uri: urun.gorsel }}
              style={styles.gorsel}
              resizeMode="cover"
            />
            {urun.indirim && (
              <View style={styles.indirimEtiketi}>
                <Text style={styles.indirimYazi}>%{urun.indirim}</Text>
              </View>
            )}
          </View>

          {/* BİLGİ */}
          <View style={styles.bilgi}>
            <Text style={styles.isim} numberOfLines={2}>{urun.isim}</Text>

            {urun.indirim ? (
              <View style={styles.fiyatSatiri}>
                <Text style={styles.eskiFiyat}>
                  {urun.fiyat.toLocaleString('tr-TR')} TL
                </Text>
                <Text style={styles.yeniFiyat}>
                  {(urun.fiyat * (1 - urun.indirim / 100))
                    .toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                </Text>
              </View>
            ) : (
              <Text style={styles.fiyat}>
                {urun.fiyat.toLocaleString('tr-TR')} TL
              </Text>
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    // Varsayılan 'column' — biz 'row' yapıyoruz
    flexWrap: 'wrap',
    // Satır dolunca alt satıra geç
    gap: SPACING.md,
    // Sütunlar ve satırlar arası boşluk
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  kart: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
    // width: dışarıdan dinamik olarak geliyor (kartGenisligi)
  },

  gorselKapsayici: {
    position: 'relative',
    // absolute child olan indirimEtiketi bu View'a göre konumlanacak
  },

  gorsel: {
    width: '100%',
    aspectRatio: 1,
    // aspectRatio: genişlik/yükseklik oranı
    // width: '100%' + aspectRatio: 1 → kare görsel
    // Sabit height yerine orantılı — tüm kart genişliklerinde çalışır
  },

  indirimEtiketi: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },

  indirimYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },

  bilgi: {
    padding: SPACING.sm,
  },

  isim: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
    // lineHeight: Web'deki line-height ile aynı mantık — dp cinsinden
  },

  fiyatSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    // row → ana eksen yatay → justifyContent yatayı, alignItems dikeyi hizalar
    gap: SPACING.xs,
    flexWrap: 'wrap',
    // Fiyatlar sığmazsa alta geç
  },

  eskiFiyat: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDisabled,
    textDecorationLine: 'line-through',
  },

  yeniFiyat: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
  },

  fiyat: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});
```

### App.tsx'i güncelle:

```tsx
// App.tsx
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ProductGrid } from './components/ProductGrid';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from './constants/theme';

const URUNLER = [
  {
    id: '1',
    isim: 'Nike Air Max 270',
    fiyat: 2999,
    gorsel: 'https://picsum.photos/seed/nike/400/400',
    indirim: 20,
  },
  {
    id: '2',
    isim: 'Adidas Ultraboost 22',
    fiyat: 3499,
    gorsel: 'https://picsum.photos/seed/adidas/400/400',
  },
  {
    id: '3',
    isim: 'Puma RS-X',
    fiyat: 1899,
    gorsel: 'https://picsum.photos/seed/puma/400/400',
    indirim: 10,
  },
  {
    id: '4',
    isim: 'New Balance 574',
    fiyat: 2199,
    gorsel: 'https://picsum.photos/seed/nb/400/400',
  },
  {
    id: '5',
    isim: 'Converse Chuck Taylor',
    fiyat: 1599,
    gorsel: 'https://picsum.photos/seed/converse/400/400',
    indirim: 15,
  },
  {
    id: '6',
    isim: 'Vans Old Skool',
    fiyat: 1799,
    gorsel: 'https://picsum.photos/seed/vans/400/400',
  },
];

export default function App() {
  return (
    <View style={styles.sayfa}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.baslik}>ShopApp</Text>
        <Text style={styles.altBaslik}>{URUNLER.length} ürün</Text>
      </View>

      {/* ÜRÜN GRİD */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <ProductGrid
          urunler={URUNLER}
          onUrunPress={(id) => console.log('Ürün seçildi:', id)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sayfa: {
    flex: 1,
    // flex: 1 → ekranı doldur (parent = ekranın kendisi)
    backgroundColor: COLORS.background,
    paddingTop: 56,
  },

  header: {
    flexDirection: 'row',
    // row: başlık ve ürün sayısı yan yana
    justifyContent: 'space-between',
    // space-between: başlık sola, ürün sayısı sağa
    alignItems: 'center',
    // center: dikey ortalama (row modunda cross axis = dikey)
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },

  baslik: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  altBaslik: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
});
```

---

## 10. Sık Kullanılan Flexbox Şablonları

Bunları ezberlemek yerine ihtiyaç duyduğunda bak:

```tsx
// 1. Tam ekran doldurma
<View style={{ flex: 1 }}>

// 2. Hem dikey hem yatay ortalama
<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>

// 3. Yatay sıralama, dikey ortalama (satır öğesi)
<View style={{ flexDirection: 'row', alignItems: 'center' }}>

// 4. Sola + sağa yapıştır (header: başlık sol, ikon sağ)
<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>

// 5. 2 sütunlu grid
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
  {items.map(item => (
    <View style={{ width: '48%' }}>  {/* veya hesaplanmış px değeri */}
  ))}
</View>

// 6. Alt kısma yapıştır
<View style={{ flex: 1, justifyContent: 'flex-end' }}>
  <View style={{ height: 80 }}>  {/* bottom bar */}

// 7. Eleman bir diğerini iter (Spacer pattern)
<View style={{ flexDirection: 'row' }}>
  <Text>Sol içerik</Text>
  <View style={{ flex: 1 }} />  {/* Spacer — boş alan yutucusu */}
  <Text>Sağ içerik</Text>
</View>
```

---

## 11. Web Flexbox ile Tam Karşılaştırma

| Web Flexbox | RN Flexbox | Fark |
|---|---|---|
| `display: flex` gerekir | Her View zaten flex | Yazmak gerekmez |
| `flex-direction: row` (varsayılan) | `flexDirection: 'column'` (varsayılan) | **En önemli fark** |
| `flex: 1 1 0%` (grow, shrink, basis) | `flex: 1` (sadece grow) | Daha basit |
| `gap: 8px` (uzun süredir desteklenir) | `gap: 8` (RN 0.71+) | Eski sürümlerde margin kullan |
| `position: fixed` var | Yok | Navigation kullan |
| `position: absolute` → positioned ancestor'a göre | Mutlaka en yakın View'a göre | Tüm View'lar implicit relative |
| `align-items: stretch` (varsayılan) | `alignItems: 'stretch'` (varsayılan) | Aynı |
| `justify-content: flex-start` (varsayılan) | `justifyContent: 'flex-start'` (varsayılan) | Aynı |
| `flex-wrap: nowrap` (varsayılan) | `flexWrap: 'nowrap'` (varsayılan) | Aynı |
| `order` özelliği var | Yok | DOM sırası = görsel sıra |

---

## 12. Yaygın Hatalar

**Hata 1: `flex: 1` çalışmıyor, ekran boş**
```tsx
// ❌ Parent boyutsuz
<View>
  <View style={{ flex: 1, backgroundColor: 'red' }} />
</View>

// ✅ Parent da flex: 1 veya sabit boyut
<View style={{ flex: 1 }}>
  <View style={{ flex: 1, backgroundColor: 'red' }} />
</View>
```

**Hata 2: Yan yana dizmek istiyorum ama alt alta diziliyor**
```tsx
// ❌ Varsayılan column — alt alta
<View>
  <Text>A</Text>
  <Text>B</Text>
</View>

// ✅ row — yan yana
<View style={{ flexDirection: 'row' }}>
  <Text>A</Text>
  <Text>B</Text>
</View>
```

**Hata 3: `justifyContent: 'center'` dikey ortalamıyor**
```tsx
// ❌ View'ın yüksekliği yok — ortalamanın referansı sıfır
<View style={{ justifyContent: 'center' }}>
  <Text>Metin</Text>
</View>

// ✅ Yükseklik ver
<View style={{ flex: 1, justifyContent: 'center' }}>
  <Text>Metin</Text>
</View>
```

**Hata 4: 2 sütunlu grid bozuluyor, son eleman tam genişlikte**
```tsx
// ❌ width: '50%' ile gap birlikte taşma yaratır
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
  <View style={{ width: '50%' }}>  {/* 50% + gap = taşma */}

// ✅ Hesaplanmış pixel değeri kullan
const { width } = useWindowDimensions();
const kartGenisligi = (width - 44) / 2;  // padding + gap hesapla
<View style={{ width: kartGenisligi }}>
```

---

## 13. Kontrol Soruları

**1. `flexDirection` varsayılanı neden 'column'? Mobil layout paradigması ne?**
> Mobil ekranlar dikey ve dardır. İçerik doğal olarak yukarıdan aşağı akar — ekranlar kaydırılır. Web'deki gibi yatay metin akışı yok. Bu yüzden React Native ekibi mobil paradigmaya uyan `column` varsayılanını seçti.

**2. `flex: 1` çalışmıyor — parent'a ne eklemelisin?**
> Parent'ın da bir boyutu olmalı: ya `flex: 1` ya da sabit `height`. `flex: 1` "parent'ın ne kadarı?" diye soruyor — parent sıfır yükseklikte ise cevap sıfır.

**3. 2 sütunlu grid'i Flexbox ile nasıl yaparsın?**
> `flexDirection: 'row'` + `flexWrap: 'wrap'`. Her kart için genişliği `(screenWidth - yatayBoşluklar) / 2` hesapla. `width: '50%'` + `gap` birlikte taşmaya neden olur — hesaplanmış dp değeri kullan.

**4. Spacer pattern nedir, ne zaman kullanılır?**
> `<View style={{ flex: 1 }} />` — boş bir View. İki eleman arasına koyulduğunda aralarındaki tüm boş alanı yutar. Header'da başlık sol + ikon sağ gibi `space-between` olmadan da aynı etkiyi verir. Araya başka bir eleman eklendiğinde daha esnektir.

**5. `aspectRatio` ne işe yarar?**
> `width` sabit veya `'100%'` iken `height`'ı otomatik hesaplar. `aspectRatio: 1` → kare. `aspectRatio: 16/9` → geniş ekran. Görsel boyutu bilinmiyorken veya responsive olması gerektiğinde sabit `height` yerine kullan.

---

## Bugün Ne Yaptık?

```
✅ RN'de sadece Flexbox olduğunu anladık (grid, float yok)
✅ flexDirection: 'column' varsayılanını web'den farkıyla öğrendik
✅ justifyContent ve alignItems'ın ana/çapraz eksen mantığını kavradık
✅ flex: 1'in neden parent boyutu gerektirdiğini anladık
✅ gap (RN 0.71+) ve flexWrap öğrendik
✅ position: 'absolute'ın web'den farkını gördük
✅ useWindowDimensions ile responsive kart genişliği hesapladık
✅ ProductGrid — 2 sütunlu ürün grid'i yazdık
✅ Spacer pattern ve aspectRatio öğrendik
```

---

## Sonraki Gün

**[Gün 5 → Expo Router: Next.js'ten Tanıdık File-based Routing](gun05_expo_router.md)**

`app/index.tsx` = ana sayfa, `app/product/[id].tsx` = ürün detayı.
Next.js `app/` directory'den tanıdık gelecek — farklar küçük ama önemli.

---

*← [Gün 3](gun03_stylesheet_api.md) | [Müfredat](../reactNaitiveMufredat.md) | [Gün 5 →](gun05_expo_router.md)*
