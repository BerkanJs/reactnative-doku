# Gün 2 — Core Components: `<div>` Yok, `<View>` Var

> **Faz:** 1 — Temeller | **Hafta:** 1 | **Gün:** 2 / 60
>
> **Bugünün Hedefi:** HTML tag'larının React Native karşılıklarını öğrenmek.
> İlk gerçek bileşen: **ProductCard** — ürün görseli, isim, fiyat.

---

## 1. HTML Tag'ları React Native'de Yok

Web'de her şeyi HTML tag'larıyla yazıyorduk:

```html
<div>
  <h1>Nike Air Max</h1>
  <img src="..." />
  <p>1.299 TL</p>
  <button onClick={...}>Sepete Ekle</button>
</div>
```

React Native'de **tarayıcı yok, DOM yok, HTML yok.**
Her şeyin yerine **native component** var:

```tsx
<View>
  <Text>Nike Air Max</Text>
  <Image source={{ uri: '...' }} />
  <Text>1.299 TL</Text>
  <Pressable onPress={...}>
    <Text>Sepete Ekle</Text>
  </Pressable>
</View>
```

Görünüşe göre benzer ama altında tamamen farklı şeyler oluyor.
Her birini tek tek inceleyelim.

---

## 2. `<View>` — Web'deki `<div>`

`<View>` React Native'in en temel bileşeni. İçine başka bileşenler koyuyorsun, onları grupluyor.

### Web ile farkları:

**Fark 1 — Her View zaten flex container:**
```tsx
// Web'de flex kullanmak için yazmak gerekir:
<div style={{ display: 'flex' }}>

// React Native'de her View zaten flex — ayrıca yazmak gerekmez:
<View>  {/* zaten flex */}
```

**Fark 2 — flex yönü varsayılan olarak 'column':**
```tsx
// Web'de flex-direction varsayılan: row (soldan sağa)
// React Native'de flexDirection varsayılan: 'column' (yukarıdan aşağı)

<View>
  <Text>Birinci</Text>   {/* üstte */}
  <Text>İkinci</Text>    {/* altında */}
</View>
```

**Fark 3 — CSS class yok:**
```tsx
// Web:
<div className="card red-bg">

// React Native:
<View style={styles.card}>   {/* sadece inline veya StyleSheet */}
```

**Fark 4 — Metin doğrudan View içine yazılamaz:**
```tsx
// Web'de geçerli:
<div>Merhaba</div>

// React Native'de HATA:
<View>Merhaba</View>  ❌  // "Text strings must be rendered within a <Text> component"

// Doğrusu:
<View>
  <Text>Merhaba</Text>  ✅
</View>
```

---

## 3. `<Text>` — Web'deki `<p>`, `<span>`, `<h1>` Hepsi

Web'de farklı metin seviyeleri için farklı tag'lar kullanırdık:
```html
<h1>Başlık</h1>
<p>Paragraf</p>
<span>Satır içi metin</span>
```

React Native'de bunların hepsi sadece `<Text>`:
```tsx
<Text style={{ fontSize: 32, fontWeight: 'bold' }}>Başlık</Text>
<Text style={{ fontSize: 16 }}>Paragraf</Text>
<Text style={{ fontSize: 14, color: 'gray' }}>Küçük metin</Text>
```

Fark sadece style'da.

### Text'in önemli özellikleri:

```tsx
<Text
  numberOfLines={2}
  // Kaç satır gösterileceğini sınırla
  // Sığmayan kısım "..." ile kesilir
  // Web'deki: overflow: hidden + -webkit-line-clamp: 2

  ellipsizeMode="tail"
  // Nereye "..." koy: 'tail' (sona), 'head' (başa), 'middle' (ortaya)

  selectable={true}
  // Kullanıcı metni seçip kopyalayabilir mi?
  // Web'de varsayılan açık, RN'de varsayılan kapalı

  onPress={() => console.log('tıklandı')}
  // Text'e de tıklama ekleyebilirsin
>
  Bu metin çok uzunsa iki satırdan sonra kesilir...
</Text>
```

### Text içinde Text:

Web'de `<span>` ile kısmi stil verirdik:
```html
<p>Fiyat: <span style="color:red">1.299 TL</span></p>
```

React Native'de `<Text>` içinde `<Text>`:
```tsx
<Text>
  Fiyat:{' '}
  <Text style={{ color: 'red', fontWeight: 'bold' }}>1.299 TL</Text>
</Text>
```

---

## 4. `<Image>` — Web'deki `<img>`

### Temel fark — genişlik ve yükseklik zorunlu:

```tsx
// Web'de:
<img src="https://..." />
// Tarayıcı resmi indirip kendi boyutunu buluyor

// React Native'de:
<Image source={{ uri: 'https://...' }} />
// ❌ Çalışmaz — boyut yok → ekranda görünmez

<Image source={{ uri: 'https://...' }} style={{ width: 200, height: 200 }} />
// ✅ Çalışır
```

**Neden?** Web'de tarayıcı resmi indiriyor, resmin kendi boyutlarını öğreniyor, sayfayı ona göre düzenliyor. React Native'de layout hesaplaması başlamadan önce yapılıyor. Resim henüz inmeden boyutu bilmesi gerekiyor.

### Kaynak türleri:

```tsx
// 1. Ağdan (URL)
<Image source={{ uri: 'https://example.com/urun.jpg' }} style={...} />

// 2. Lokalden (proje içindeki dosya)
<Image source={require('./assets/logo.png')} style={...} />
// require() — web'deki import gibi ama resimler için

// 3. Base64
<Image source={{ uri: 'data:image/png;base64,iVBOR...' }} style={...} />
```

### resizeMode — CSS'teki object-fit:

```tsx
<Image
  source={{ uri: '...' }}
  style={{ width: 200, height: 200 }}
  resizeMode="cover"
  // 'cover'   → alanı doldur, taş (CSS: object-fit: cover)
  // 'contain' → tamamını göster, boşluk kalabilir (CSS: object-fit: contain)
  // 'stretch' → tam yayarak doldur, bozulabilir
  // 'center'  → ortala, boyutlandırma yok
/>
```

---

## 5. `<Pressable>` ve `<TouchableOpacity>` — Web'deki `<button>`

Web'de tıklanabilir eleman için `<button>` veya `onClick` koyardık.
React Native'de **`onPress`** kullanılıyor ve sarmalayıcı bileşen gerekiyor.

```tsx
// Web:
<button onClick={() => console.log('tıklandı')}>Sepete Ekle</button>

// React Native:
<Pressable onPress={() => console.log('tıklandı')}>
  <Text>Sepete Ekle</Text>
</Pressable>
```

### Pressable vs TouchableOpacity

**TouchableOpacity** — eski yöntem, hâlâ çok yaygın:
```tsx
<TouchableOpacity
  onPress={...}
  activeOpacity={0.7}
  // Basıldığında opaklık 0.7'ye iner (görsel geri bildirim)
>
  <Text>Sepete Ekle</Text>
</TouchableOpacity>
```

**Pressable** — yeni ve daha güçlü:
```tsx
<Pressable
  onPress={...}
  onLongPress={...}        // uzun basış
  onPressIn={...}          // parmak değdi
  onPressOut={...}         // parmak kalktı

  style={({ pressed }) => [
    styles.buton,
    pressed && styles.butonBasili
    // pressed: true/false — basılı mı değil mi?
    // Web'deki :active pseudo-class gibi
  ]}
>
  <Text>Sepete Ekle</Text>
</Pressable>
```

> **Hangisini kullan?** Yeni projelerde `Pressable`. Mevcut kodlarda `TouchableOpacity` görüyorsan sorun yok, çalışmaya devam eder.

### Neden buton içinde Text zorunlu?

```tsx
// Web'de:
<button>Sepete Ekle</button>  // string doğrudan içine yazılabilir

// React Native'de:
<Pressable>Sepete Ekle</Pressable>  // ❌ HATA
<Pressable><Text>Sepete Ekle</Text></Pressable>  // ✅
```

Çünkü React Native'de metin her zaman `<Text>` içinde olmak zorunda. `<Pressable>` sadece dokunma işlemlerini yönetiyor, metin render etmiyor.

---

## 6. `<ScrollView>` — Kaydırılabilir Alan

Web'de bir div'in kaydırılabilir olması için:
```css
.container { overflow: scroll; }
```

React Native'de ayrı bir bileşen:
```tsx
<ScrollView>
  <ProductCard />
  <ProductCard />
  <ProductCard />
  {/* ...devam eder */}
</ScrollView>
```

### Önemli fark — tüm children bir anda render edilir:

`<ScrollView>` içindeki tüm bileşenler, ekranda görünmese bile **baştan render edilir.**

```
ScrollView içinde 100 ürün:
[Render 1] [Render 2] [Render 3] ... [Render 100]
↑ hepsi başta render edildi, ekranda sadece 5 tanesi görünüyor
```

Bu 20-30 item'da sorun yaratmaz. Ama 100, 500, 1000 item'da uygulama yavaşlar.
O zaman `<FlatList>` kullanılır (Gün 8'de öğreneceğiz).

**Kural:**
- Az item, sabit içerik → `<ScrollView>`
- Uzun liste, dinamik veri → `<FlatList>`

### Yatay kaydırma:
```tsx
<ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
  {/* Kategoriler, ürün resimleri vb. yatay kaydırma için */}
</ScrollView>
```

---

## 7. `<SafeAreaView>` — Notch ve Home Bar

Web'de telefon çentiği (notch) veya alt çubuk (home bar) yoktu. Sayfan her zaman tüm ekrana uzanırdı.

Mobilde bu bölgeler var:

```
┌─────────────────────────────┐
│  ████ notch / Dynamic Island│  ← Buraya içerik girmemeli
│─────────────────────────────│
│                             │
│    İçerik alanı             │
│    (güvenli bölge)          │
│                             │
│─────────────────────────────│
│  ████ home bar              │  ← Buraya da girmemeli
└─────────────────────────────┘
```

`<SafeAreaView>` bu güvenli bölgeyi otomatik hesaplıyor:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
// veya React Native'in kendi paketi:
import { SafeAreaView } from 'react-native';

export default function AnaSayfa() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* İçerik notch ve home bar'a çarpmaz */}
    </SafeAreaView>
  );
}
```

> **Şimdilik:** Gün 11'de derinlemesine işleyeceğiz. Bugün şunu bil: en dış View yerine SafeAreaView kullan.

---

## 8. Genel Karşılaştırma Tablosu

| HTML (Web) | React Native | Kritik Fark |
|---|---|---|
| `<div>` | `<View>` | Her View zaten flex; flexDirection: 'column' (web'de 'row') |
| `<p>`, `<h1>`, `<span>` | `<Text>` | Metin SADECE Text içinde olabilir |
| `<img src="">` | `<Image source={{ uri: "" }}>` | Width + height ZORUNLU |
| `<button>` | `<Pressable>` | onClick değil onPress; Text ayrı yazılmalı |
| `<input>` | `<TextInput>` | Gün 9'da işleyeceğiz |
| `<ul><li>` | `<FlatList>` | Gün 8'de işleyeceğiz |
| `overflow: scroll` | `<ScrollView>` | Ayrı bileşen |
| `padding-top: env(safe-area)` | `<SafeAreaView>` | Notch/home bar için |
| `onClick` | `onPress` | — |
| `className` | `style` | CSS class yok, sadece JS objesi |

---

## 9. İlk Gerçek Component: ProductCard

Şimdi öğrendiğimiz her şeyi birleştirip `ProductCard` yazıyoruz.

Proje klasöründe `components/` klasörü oluştur, içine `ProductCard.tsx` dosyası ekle:

```tsx
// components/ProductCard.tsx
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';

// TypeScript tip tanımı — component'e hangi veriler gelecek?
type Props = {
  id: string;
  isim: string;         // ürün adı
  fiyat: number;        // fiyat (sayı — formatlayacağız)
  gorsel: string;       // resim URL'si
  indirim?: number;     // indirim yüzdesi (opsiyonel, ? işareti)
  onPress: () => void;  // karta tıklandığında ne olacak?
};

export function ProductCard({ isim, fiyat, gorsel, indirim, onPress }: Props) {

  // İndirimli fiyat hesapla (indirim varsa)
  const indirimliKFiyat = indirim ? fiyat * (1 - indirim / 100) : null;

  return (
    <Pressable
      onPress={onPress}
      // style prop'u fonksiyon olarak alabilir → pressed durumuna göre stil değiştir
      style={({ pressed }) => [
        styles.kart,
        pressed && styles.kartBasili
        // pressed && styles.kartBasili:
        // pressed true ise kartBasili stilini de ekle (opacity düşür)
        // pressed false ise sadece styles.kart geçerli
        // Web'deki :active pseudo-class'ın React Native karşılığı
      ]}
    >
      {/* GÖRSEL */}
      <Image
        source={{ uri: gorsel }}
        style={styles.gorsel}
        resizeMode="cover"
        // cover: alanı doldur, taşan kısmı kes (CSS: object-fit: cover)
      />

      {/* İNDİRİM ETIKETI — sadece indirim varsa göster */}
      {indirim && (
        <View style={styles.indirimEtiketi}>
          {/* Bu View mutlak konumlandırılmış — görselin üstünde duruyor */}
          <Text style={styles.indirimYazi}>%{indirim}</Text>
        </View>
      )}

      {/* KART ALT BİLGİ ALANI */}
      <View style={styles.bilgi}>

        {/* ÜRÜN İSMİ */}
        <Text style={styles.isim} numberOfLines={2}>
          {isim}
          {/* numberOfLines={2}: 2 satırdan uzunsa "..." ile kesilir */}
          {/* Web'deki: overflow: hidden + -webkit-line-clamp: 2 */}
        </Text>

        {/* FİYAT ALANI */}
        <View style={styles.fiyatAlani}>
          {indirimliKFiyat ? (
            // İndirim varsa: üstü çizili eski fiyat + yeni fiyat
            <>
              <Text style={styles.eskiFiyat}>
                {fiyat.toLocaleString('tr-TR')} TL
                {/* toLocaleString: 1299 → "1.299" */}
              </Text>
              <Text style={styles.yeniFiyat}>
                {indirimliKFiyat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
              </Text>
            </>
          ) : (
            // İndirim yoksa: normal fiyat
            <Text style={styles.fiyat}>
              {fiyat.toLocaleString('tr-TR')} TL
            </Text>
          )}
        </View>

        {/* SEPETE EKLE BUTONU */}
        <Pressable style={styles.buton} onPress={onPress}>
          {/* onPress: parent Pressable ile aynı fonksiyon
              Gerçek uygulamada farklı olabilir:
              Kart = detaya git, buton = sepete ekle */}
          <Text style={styles.butonYazi}>Sepete Ekle</Text>
        </Pressable>

      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    // borderRadius: px yok, sayı doğrudan dp cinsinden
    marginBottom: 16,
    // Web'de margin-bottom: 16px yazardık
    overflow: 'hidden',
    // Görselin köşelerini borderRadius'a göre kesmek için
    // Web'de de overflow: hidden kullanırdık, aynı mantık

    // Android gölge: elevation
    elevation: 3,
    // iOS gölge: shadow özellikleri (elevation iOS'ta çalışmaz)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Web'de: box-shadow: 0 2px 4px rgba(0,0,0,0.1)
    // RN'de iOS ve Android'de farklı özellikler kullanmak gerekiyor
  },

  kartBasili: {
    opacity: 0.9,
    // Kart basıldığında hafif soluklaşır
    // Web'deki :active { opacity: 0.9 } gibi
  },

  gorsel: {
    width: '100%',
    // '100%': parent View'ın genişliğini doldur
    height: 200,
    // Sabit yükseklik — ağ görselinde zorunlu
    // Bunu yazmasaydık: height: 0 → görsel görünmezdi
  },

  indirimEtiketi: {
    position: 'absolute',
    // absolute: en yakın parent View'a göre konumlanır
    // Web'de position: absolute en yakın position: relative parent'a göre
    // RN'de position: relative olan parent yok — en yakın View'a göre
    top: 12,
    left: 12,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 8,
    // paddingHorizontal = paddingLeft + paddingRight (kısayol)
    paddingVertical: 4,
    // paddingVertical = paddingTop + paddingBottom (kısayol)
    // Web'de: padding: 4px 8px yazardık
  },

  indirimYazi: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  bilgi: {
    padding: 12,
    // padding: dört taraf eşit — web ile aynı
  },

  isim: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },

  fiyatAlani: {
    flexDirection: 'row',
    // flexDirection: 'row' → children yatay dizilir
    // Varsayılan 'column' idi, burada 'row' yapıyoruz
    // Eski fiyat ve yeni fiyat yan yana olsun diye
    alignItems: 'center',
    gap: 8,
    // gap: flexbox child'ları arasındaki boşluk
    // Web'deki gap ile aynı (RN 0.71+ destekler)
    marginBottom: 10,
  },

  eskiFiyat: {
    fontSize: 13,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    // Web'de: text-decoration: line-through
    // RN'de: textDecorationLine (camelCase)
  },

  yeniFiyat: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
  },

  fiyat: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },

  buton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    // alignItems: 'center' → Text'i yatay ortalar
    // flexDirection: 'column' (varsayılan) olduğu için
    // yatay = alignItems, dikey = justifyContent
  },

  butonYazi: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

---

## 10. ProductCard'ı Kullan

`App.tsx` dosyasını güncelle:

```tsx
// App.tsx
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { ProductCard } from './components/ProductCard';

// Sahte ürün verisi — gerçekte API'den gelecek (Gün 18-19)
const URUNLER = [
  {
    id: '1',
    isim: 'Nike Air Max 270',
    fiyat: 2999,
    gorsel: 'https://picsum.photos/seed/nike/400/300',
    indirim: 20,
  },
  {
    id: '2',
    isim: 'Adidas Ultraboost 22 Koşu Ayakkabısı',
    fiyat: 3499,
    gorsel: 'https://picsum.photos/seed/adidas/400/300',
    indirim: undefined,
  },
  {
    id: '3',
    isim: 'Puma RS-X',
    fiyat: 1899,
    gorsel: 'https://picsum.photos/seed/puma/400/300',
    indirim: 10,
  },
];

export default function App() {
  return (
    <View style={styles.sayfa}>
      {/* BAŞLIK */}
      <Text style={styles.baslik}>Ürünler</Text>

      {/* ÜRÜN LİSTESİ — şimdilik ScrollView, Gün 8'de FlatList'e geçeceğiz */}
      <ScrollView
        style={styles.liste}
        showsVerticalScrollIndicator={false}
        // showsVerticalScrollIndicator: sağdaki kaydırma çubuğunu gizle
        // Web'de: ::-webkit-scrollbar { display: none }
      >
        {URUNLER.map((urun) => (
          <ProductCard
            key={urun.id}
            // key: React'taki key prop ile aynı — unique olmalı
            {...urun}
            onPress={() => console.log(`${urun.isim} tıklandı`)}
            // onPress: şimdilik log — Gün 5'te navigasyon ekleyeceğiz
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sayfa: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingTop: 56,
    // SafeAreaView henüz kullanmıyoruz — Gün 11'de ekleyeceğiz
    // Şimdilik elle paddingTop ile notch'ı geçiyoruz
  },
  baslik: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  liste: {
    paddingHorizontal: 16,
  },
});
```

Kaydet. Telefonda 3 ürün kartı görmelisin.

---

## 11. Yaygın Hatalar ve Çözümleri

**Hata 1: "Text strings must be rendered within a `<Text>` component"**
```tsx
// ❌ Hata
<View>Merhaba</View>
<Pressable>Sepete Ekle</Pressable>

// ✅ Doğru
<View><Text>Merhaba</Text></View>
<Pressable><Text>Sepete Ekle</Text></Pressable>
```

**Hata 2: Görsel görünmüyor**
```tsx
// ❌ Boyut yok → görsel render edilmez
<Image source={{ uri: '...' }} />

// ✅ Boyut zorunlu
<Image source={{ uri: '...' }} style={{ width: 200, height: 200 }} />
// veya width: '100%' + height sabit
```

**Hata 3: flex: 1 çalışmıyor, içerik görünmüyor**
```tsx
// ❌ Parent'ın boyutu yok → child flex: 1 neyin 1'i olduğunu bilmiyor
<View>                   {/* boyutsuz */}
  <View style={{ flex: 1 }}>  {/* neyin 1'i? */}

// ✅ Parent'ın da flex: 1 veya sabit boyutu olmalı
<View style={{ flex: 1 }}>   {/* ekranı doldur */}
  <View style={{ flex: 1 }}>  {/* parent'ın tamamı */}
```

**Hata 4: Gölge sadece iOS'ta çalışıyor**
```tsx
// iOS'ta çalışır, Android'de çalışmaz:
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 4,

// Android'de çalışır, iOS'ta çalışmaz:
elevation: 3,

// ✅ Her ikisini de yaz — her platform kendininkini kullanır
```

---

## 12. Kontrol Soruları

**1. `<View>` içine neden doğrudan string yazamıyorsun?**
> React Native web DOM değil. Tarayıcı string'i otomatik text node'a çevirmiyor. Native tarafta metin render etmek için özel bir native bileşen (`UILabel` / `TextView`) gerekiyor — bu React Native tarafında `<Text>`.

**2. `<Image>` için neden width ve height zorunlu?**
> React Native layout'u resimden önce hesaplıyor. Resmi indirmeden boyutunu bilemiyor. Boyut belirtilmezse 0x0 alan ayrılıyor, resim geldiğinde yer yok → görünmez.

**3. `StyleSheet.create` ile inline `style={{ }}` performans farkı ne?**
> `StyleSheet.create`: obje bir kez oluşturulur, freeze edilir, native tarafa ID olarak gönderilir. Inline `style={{ }}`: her render'da yeni bir obje oluşturulur → garbage collector daha çok çalışır. Büyük listelerde fark hissedilir.

**4. `ScrollView` ile `FlatList` farkı nedir? Ne zaman hangisini kullanırsın?**
> `ScrollView`: tüm children baştan render edilir. 50 ürün varsa hepsi render edilir, sadece 5 tanesi görünür. `FlatList`: sadece ekranda görünen item'lar render edilir (virtualization). 50 ürün = 5-10 render. Kural: 20+ item → FlatList.

**5. `Pressable`'ın `style` prop'u neden fonksiyon alıyor?**
> `style={({ pressed }) => [...]}` — `pressed` boolean'ı ile basılı durumda farklı stil uygulayabiliyorsun. Web'deki `:active` pseudo-class'ının React Native karşılığı. `TouchableOpacity` bunu `activeOpacity` ile sabit şekilde yapıyordu, `Pressable` daha esnekleşti.

**6. iOS'ta `elevation` neden gölge yaratmıyor?**
> `elevation` Android'e özgü bir özellik (Material Design). iOS'ta Apple'ın kendi gölge sistemi var: `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`. Her ikisini de yazarsan her platform kendine aiti kullanır.

---

## Bugün Ne Yaptık?

```
✅ <View>, <Text>, <Image>, <Pressable>, <ScrollView> öğrendik
✅ HTML tag'larıyla farkları anladık
✅ Yaygın hataları (metin View'da, boyutsuz Image) öğrendik
✅ StyleSheet.create ile inline style farkını anladık
✅ ProductCard component'i yazdık
✅ İndirim etiketi, fiyat hesaplama, basılı durum efekti ekledik
✅ ScrollView içinde ürün listesi oluşturduk
```

---

## Sonraki Gün

**[Gün 3 → StyleSheet API: CSS Yok, Ama Flexbox Var](gun03_stylesheet_api.md)**

`StyleSheet.create`'i derinlemesine öğreniyoruz.
Birimler, platform-specific stil, shadow, renk sistemi.
ShopApp'e genel tema sistemi kuruyoruz.

---

*← [Gün 1](gun01_rn_nedir_expo_mimari.md) | [Müfredat](../reactNaitiveMufredat.md) | [Gün 3 →](gun03_stylesheet_api.md)*
