# Gün 43 — FlatList Optimizasyonu

> Dün JS Thread'in nasıl çalıştığını öğrendik. Bugün bu bilgiyi doğrudan uyguladığımız yer: FlatList. Uzun listeler React Native'in en yaygın performans problemini yaşadığı yerdir. Ama FlatList'in doğru ayarlanmış hali, 10.000 item'ı bile terleyerek kaydırmayan bir liste sunabilir.

---

## FlatList Zaten Virtual Scroll — O Zaman Sorun Nerede?

FlatList, ekranda görünen item'ları render eder — 1000 item varsa hepsini aynı anda DOM'a koymaz. Bunu biliyorsun. Ama "sanal" render olması sorunun bittiği anlamına gelmez.

Şu iki soru hâlâ yanıtsız:

1. FlatList bir item'ın ne kadar yer kapladığını **nasıl biliyor?** Başlangıçta bilmiyor. Kaydırırken her item'ı render edip ölçüyor. Bu ölçüm pahalı.
2. Ekranın dışındaki item'ları bellekte tutuyor mu? Evet — ve bu varsayılan davranış büyük listelerde bellek sorununa yol açar.

Bu iki soruyu çözmek FlatList optimizasyonunun özüdür.

---

## getItemLayout — "Ölçüm Yapma, Ben Söylüyorum"

### Sorun: FlatList Item Yüksekliğini Tahmin Edemez

Bir kullanıcı ürün listesinde aşağı kaydırdığında FlatList "sıradaki item nerede?" sorusunu sormak zorundadır. Eğer `getItemLayout` yoksa şunu yapar:

1. Item'ı render et
2. Native tarafta ölç (layout hesapla)
3. Nereye koyacağını bul
4. Ekrana çiz

Her yeni item için bu döngü çalışır. 500 item'lı bir listede hızlı kaydırma yapılırsa yüzlerce ölçüm arka arkaya tetiklenir — JS Thread meşgul kalır, UI donuklaşır.

### Çözüm: Her Item Aynı Yükseklikte ise Söyle

```tsx
const ITEM_YUKSEKLIGI = 80; // sabit yükseklik — tasarımdan belirlenmiş

<FlatList
  data={urunler}
  getItemLayout={(data, index) => ({
    length: ITEM_YUKSEKLIGI,   // bu item kaç pixel yüksek?
    offset: ITEM_YUKSEKLIGI * index, // bu item listenin başından kaç pixel uzakta?
    index,                     // bu item'ın sırası
  })}
/>
```

`getItemLayout` verince FlatList hiç ölçüm yapmaz. "80. index'teki item 80 * 80 = 6400 pixel uzakta ve 80 pixel yüksek" bilgisini hesaplamayla bulur, render etmeden. Bu hem kaydırmayı hızlandırır, hem de `scrollToIndex` metodunu çalışır kılar.

### scrollToIndex Neden getItemLayout Olmadan Çalışmaz?

```tsx
const listRef = useRef<FlatList>(null);

// Kullanıcı arama yaptı, 250. ürüne atla
listRef.current?.scrollToIndex({ index: 250 });
```

`getItemLayout` yoksa FlatList 250. item'ın nerede olduğunu bilmez. Oraya ulaşmak için 0'dan 250'ye kadar olan tüm item'ları render edip ölçmesi gerekir. Bu birkaç saniyelik donma demektir. `getItemLayout` ile hesap anında yapılır, direkt oraya atlar.

**Kısıt:** `getItemLayout` sadece tüm item'lar **aynı yükseklikteyse** güvenli kullanılır. Item'lar farklı yükseklikteyse (örn. ürün açıklaması kimi kısa kimi uzun) bu fonksiyonu yazmamalısın — yanlış offset hesaplayıp scroll pozisyonunu bozarsın.

---

## initialNumToRender — İlk Açılışta Kaç Item?

```tsx
<FlatList
  initialNumToRender={10}
/>
```

Bu değer, liste ilk açıldığında kaç item render edileceğini belirler. Varsayılan değer `10`'dur.

### Neden Önemli?

Diyelim ki listeye girdiğinde Expo Router bir geçiş animasyonu oynatıyor (dün `InteractionManager` ile bunu geciktirmeyi öğrendik). Animasyon devam ederken FlatList arka planda render yapmaya başlar. `initialNumToRender={10}` ise 10 item render edilir — animasyon biter bitmez liste hazır görünür.

`initialNumToRender={100}` yapsan ne olur? İlk render'da 100 item JS Thread'de hesaplanır, geçiş animasyonu sırasında büyük bir iş patlar, animasyon takılır. Daha fazla her zaman daha iyi değil.

**Ne seçmeli?** Ekranda görünen item sayısını + 2-3 fazlasını. Çoğu telefonda ekrana 8-10 item sığıyorsa `initialNumToRender={12}` yeterlidir.

---

## maxToRenderPerBatch — Kaydırırken Kaçar Kaçar?

```tsx
<FlatList
  maxToRenderPerBatch={5}
/>
```

Kullanıcı kaydırdıkça FlatList yeni item'lar render etmek zorundadır. Her "batch" (parti) kaç item render edeceğini `maxToRenderPerBatch` belirler. Varsayılan değer `10`'dur.

### Ne Anlama Geliyor?

Varsayılan 10 ile hızlı kaydırmada FlatList her frame'de 10 yeni item render etmeye çalışır. 10 item'ın JS hesabı 16ms'yi (bir frame) geçerse ekran takılır.

`maxToRenderPerBatch={5}` yapınca her seferinde daha az iş yapılır — her batch daha hafif olur. Ama bunun bir bedeli var: çok hızlı kaydırırken ekranda beyaz boşluklar (henüz render edilmemiş alanlar) görebilirsin. Bu bir trade-off'tur.

**Pratik kural:** Karmaşık item'larda (çok resim, çok metin) düşür: `3-5`. Basit item'larda varsayılan bırak.

---

## windowSize — Bellekte Kaç Ekran Tutulur?

```tsx
<FlatList
  windowSize={5}
/>
```

`windowSize` değeri, şu anda görünen ekranın kaç katı item'ın bellekte tutulacağını belirler. Varsayılan değer `21`'dir — yani görünen ekranın 10 katı üstünde ve 10 katı altındaki item'lar bellekte tutulur.

### Neden 21 Gibi Büyük Bir Varsayılan?

Kaydırma deneyimi pürüzsüz olsun diye. Kullanıcı hızlı kaydırınca yakın item'lar zaten bellekte hazır olsun, sıfırdan render etmek zorunda kalınmasın.

### Sorun: Büyük Liste + windowSize={21} = Bellek Patlaması

1000 ürünlü bir liste düşün. Her ürün kartında bir resim, birkaç metin var. `windowSize={21}` ile liste ortasındayken ekranın 10 katı aşağı ve 10 katı yukarı bellekte tutulur. Bu yüzlerce component demektir — düşük bellekli cihazlarda uygulama çöker.

`windowSize={5}` yapınca: görünen ekranın 2 katı üstü ve 2 katı altı bellekte tutulur. Bellek kullanımı ciddi ölçüde düşer. Ama çok hızlı kaydırırsan FlatList yeni item'ları yetiştiremez, beyaz boşluklar görünür.

**Pratik kural:** Görselli, karmaşık item'larda `windowSize={5}` veya `windowSize={7}`. Basit metin listesinde varsayılan bırakabilirsin.

---

## removeClippedSubviews — Görünmeyeni Bellekten At

```tsx
<FlatList
  removeClippedSubviews={true}
/>
```

Bu prop, ekranın tamamen dışında kalan view'ların native taraftaki belleğini serbest bırakır. JS tarafında component hâlâ var (unmount olmaz), ama native view silinir.

### Ne Zaman Açmalısın?

Uzun listeler, özellikle çok resim içeren listelerde faydalıdır. Her item'ın native view'ı bellek tuttuğundan, ekrana hiç girmeyen yüzlerce item'ın native view'ı boşuna bellekte oturur.

### Ne Zaman Kapatmalısın?

Android'de bazen görsel glitch'lere yol açar — item ekrana girdiğinde bir frame için boş görünebilir. Eğer listede bu tür bir titreme görürsen `removeClippedSubviews={false}` yap.

iOS'ta genellikle güvenlidir.

---

## keyExtractor — Neden Stabil Olması Şart?

```tsx
// Kötü: index kullanmak
<FlatList keyExtractor={(item, index) => index.toString()} />

// İyi: benzersiz ve stabil ID
<FlatList keyExtractor={(item) => item.id} />
```

`keyExtractor` React'ın `key` prop'unun FlatList versiyonudur. React bunu, listede hangi item'ın değiştiğini, hangi item'ın aynı kaldığını anlamak için kullanır.

**Index neden kötü?** Listenin başına yeni bir item eklense tüm index'ler kayar. React "0. item değişti, 1. item değişti, 2. item değişti..." diye tüm listeyi yeniden render eder. Oysa sadece başa eklenen item gerçekten yeni — diğerleri aynı. Stabil ID ile React bunu fark eder, sadece yeni item'ı render eder.

---

## React.memo ile renderItem — İkisi Birlikte Anlam Kazanır

Dün `React.memo`'yu öğrendik. FlatList'te neden özellikle önemlidir?

FlatList, `windowSize` içindeki her görünür item'ı kaydırma sırasında potansiyel olarak yeniden render edebilir. Eğer parent component (sayfa) herhangi bir sebepten re-render olursa, FlatList'e geçilen `renderItem` fonksiyonu yeni bir referans alır ve FlatList tüm görünür item'ları yeniden render eder.

```tsx
// Kötü: her render'da yeni renderItem referansı
export function UrunListesi() {
  const { data: urunler } = useQuery(...);
  
  // Bu fonksiyon parent her render'da yeniden oluşturuluyor.
  // FlatList bunu "renderItem değişti" olarak algılar.
  return (
    <FlatList
      renderItem={({ item }) => <UrunKart urun={item} />}
    />
  );
}

// İyi: useCallback + React.memo kombinasyonu
const UrunKart = React.memo(function UrunKart({ urun }: { urun: Urun }) {
  return (
    <Pressable>
      <Text>{urun.baslik}</Text>
    </Pressable>
  );
});

export function UrunListesi() {
  const { data: urunler } = useQuery(...);

  // useCallback: fonksiyon referansı sabit kalır
  const renderUrun = useCallback(
    ({ item }: { item: Urun }) => <UrunKart urun={item} />,
    [] // bağımlılık yok, hiç değişmez
  );

  return (
    <FlatList
      renderItem={renderUrun}
    />
  );
}
```

`useCallback` olmadan `React.memo` işe yaramaz. `React.memo` olmadan `useCallback`'in bu bağlamda anlamı yoktur. İkisi birlikte çalışır.

---

## Hepsini Birleştirmek: ShopApp Ürün Listesi

```tsx
import { FlatList, ActivityIndicator } from 'react-native';
import { useCallback, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';

const ITEM_YUKSEKLIGI = 88;

// Sadece urun.id veya urun.fiyat değişince render olur
const UrunKart = memo(function UrunKart({ urun }: { urun: Urun }) {
  return (
    <Pressable
      style={{ height: ITEM_YUKSEKLIGI }}
      accessibilityRole="button"
      accessibilityLabel={`${urun.baslik}, ${urun.fiyat} TL`}
    >
      <Text>{urun.baslik}</Text>
      <Text>{urun.fiyat} ₺</Text>
    </Pressable>
  );
});

export function UrunlerEkrani() {
  const { data: urunler = [], isLoading } = useQuery({
    queryKey: ['urunler'],
    queryFn: fetchUrunler,
  });

  const siralamisUrunler = useMemo(
    () => [...urunler].sort((a, b) => a.fiyat - b.fiyat),
    [urunler]
  );

  const renderUrun = useCallback(
    ({ item }: { item: Urun }) => <UrunKart urun={item} />,
    []
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: ITEM_YUKSEKLIGI,
      offset: ITEM_YUKSEKLIGI * index,
      index,
    }),
    []
  );

  if (isLoading) return <ActivityIndicator />;

  return (
    <FlatList
      data={siralamisUrunler}
      keyExtractor={(item) => item.id}
      renderItem={renderUrun}
      getItemLayout={getItemLayout}
      initialNumToRender={12}
      maxToRenderPerBatch={5}
      windowSize={7}
      removeClippedSubviews={true}
    />
  );
}
```

---

## Parametre Seçim Rehberi

| Parametre | Varsayılan | Karmaşık Liste | Basit Liste |
|-----------|-----------|---------------|-------------|
| `initialNumToRender` | 10 | 8-10 | 15-20 |
| `maxToRenderPerBatch` | 10 | 3-5 | 10 |
| `windowSize` | 21 | 5-7 | 10-15 |
| `removeClippedSubviews` | false | true | true |
| `getItemLayout` | — | Sabit yükseklikte mutlaka | Sabit yükseklikte mutlaka |

---

## Kontrol Soruları

1. `getItemLayout` fonksiyonu `offset` değerini nasıl hesaplıyor? Item'lar farklı yüksekliklerde olsaydı bu hesabı nasıl yapardın?
2. `windowSize={3}` ile `windowSize={21}` arasındaki bellek farkını somut düşün: her item 50KB yer tutuyorsa ve listede 500 item varsa, bu iki değer için bellekte kaç KB tutulur?
3. Kullanıcı 300. item'a `scrollToIndex` ile atlamak istiyor ama `getItemLayout` yok. FlatList ne yapar? Neden bu kötüdür?
4. `keyExtractor` için item index'ini kullansaydın, listenin başına yeni bir item eklendiğinde React tam olarak ne yapardı?
5. `removeClippedSubviews={true}` Android'de görsel glitch'e neden olabiliyor? Native view silinince ekrana girdiğinde ne oluyor?

---

## Sonraki Gün

**Gün 44 → Image Caching ve Bundle Optimizasyonu:** `expo-image`'ın cache mekanizması nasıl çalışır, `cachePolicy` seçenekleri ne zaman hangisi, Metro bundle'ı neden Webpack gibi chunk'a bölemiyor ve Expo Router bunu nasıl çözüyor.
