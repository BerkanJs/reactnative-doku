# Gün 44 — Image Caching ve Bundle Optimizasyonu

> Bugün iki ayrı ama aynı hedefli konu: **görsel yükleme hızı** ve **uygulama açılış hızı**. İkisi de kullanıcının uygulamayı açtığı ilk saniyelerle ilgili. İlk izlenim kötü olursa kullanıcı geri dönmez.

---

## Bölüm 1: Image Caching

### Önce Sorunu Anlayalım: Görsel Her Seferinde Neden İndirilir?

Web'de tarayıcı, bir görseli indirdiğinde bunu HTTP cache'e yazar. Aynı URL'e bir daha gidildiğinde `Cache-Control` header'ına bakarak "bu görseli diskte saklıyım, tekrar indirmeme gerek yok" kararı verir. Bunu tarayıcı otomatik yapar, sen bir şey yapmazsın.

React Native'in built-in `<Image>` component'i bu işi **yapmaz.** Her render'da, aynı URL olsa bile, işletim sisteminin ağ katmanına gider. iOS ve Android'in altındaki URL loading sistemleri kısmen cache yapar, ama bu tutarlı ve kontrol edilebilir değildir. Sonuç: ürün listesine her girişte tüm ürün görselleri yeniden ağdan çekilir. Bu hem veri kullanımı hem de görsel kayması (önce boş, sonra yüklenme) demektir.

### Cihazda Cache Nasıl Çalışır? — Mekanizma

Bir cache kütüphanesi görsel yüklediğinde şunu yapar:

1. URL'in bir hash'ini üretir. Örneğin `https://cdn.shopapp.com/urun/abc123.jpg` → `d4f8a2c1` gibi bir string.
2. Bu hash'i dosya adı olarak kullanarak görseli **cihazın diskine** yazar. iOS'ta bu `Library/Caches/` altında bir klasördür, Android'de `cache/` dizininde.
3. Bir sonraki istekte önce bu hash'e karşılık gelen dosya diskte var mı diye bakar. Varsa ağa hiç gitmez — doğrudan diskten okur.
4. Diskteki dosyanın belirli bir yaşı ya da boyut limiti aşılırsa silinir (eviction).

Bu süreçte **iki katmanlı cache** söz konusudur:

**Bellek (Memory) Cache:** Görsel çözülmüş bitmap hâlinde RAM'de tutulur. Diskten bile okumak gerekmez — direkt pikseller hazırdır. En hızlı seçenek. Ama uygulama kapatılınca ya da bellek basıncı oluşunca boşaltılır.

**Disk Cache:** Görsel ham veriyle (JPEG, PNG, WebP) cihazın depolama alanında tutulur. Bellek cache'i boşalsa bile diskte kalır. Uygulama yeniden açıldığında görseli ağa gitmeden diskten yükler. Bellekten yavaş ama ağdan çok hızlı.

---

### expo-image — Built-in Cache Desteği

`expo-image`, React Native'in built-in `<Image>` component'inin yerini alan, Expo tarafından geliştirilen gelişmiş bir kütüphanedir. iOS'ta **SDWebImage**, Android'de **Glide** native kütüphanelerini kullanır. Bu iki kütüphane mobil dünyasında yıllarca test edilmiş, olgun cache sistemleridir.

```bash
npx expo install expo-image
```

```tsx
import { Image } from 'expo-image';

<Image
  source={{ uri: 'https://cdn.shopapp.com/urun/abc123.jpg' }}
  style={{ width: 200, height: 200 }}
  cachePolicy="memory-disk"
  placeholder={{ blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' }}
  transition={300}
/>
```

---

### cachePolicy — Her Seçenek Ne Anlama Gelir?

#### `cachePolicy="none"`

Her istekte ağa gider. Cache kullanılmaz. Gerçek zamanlı değişen içerikler için — örneğin anlık stok durumu görseli gibi bir şey. Pratikte nadiren kullanılır.

#### `cachePolicy="memory"`

Görsel yalnızca RAM'de tutulur. Uygulama açıkken aynı görsel tekrar istenirse çok hızlı gelir. Ama uygulama kapatılınca sıfırlanır. Bir sonraki açılışta tekrar ağdan indirilir.

Ne zaman kullanılır? Kullanıcının oturumu boyunca sık tekrar edecek ama uygulama kapatılınca önemsiz olan görseller — örneğin kullanıcının kendi profil fotoğrafı, o oturumda defalarca görülecek ama bir sonraki açılışta zaten sunucudan güncel hâli çekilecek.

#### `cachePolicy="disk"`

Görsel yalnızca diske yazılır, RAM'e alınmaz. Uygulamayı kapatıp açsan da diskten gelir. Ama her gösterimde diskten okunması gerektiği için bellek cache'inden biraz yavaştır.

Ne zaman kullanılır? Büyük boyutlu ve nadiren değişen varlıklar. Örneğin kategori banner görselleri — haftalarca aynı kalır, RAM'de tutmak israf olur ama her açılışta ağdan çekmek de gereksizdir.

#### `cachePolicy="memory-disk"` — Önerilen

İki katmanlı cache çalışır. İlk yüklemede ağdan indirir, hem RAM'e hem diske yazar. Sonraki isteklerde önce RAM'e bakar (en hızlı), RAM'de yoksa diske bakar (hızlı), diskte de yoksa ağa gider. Bu, çoğu uygulama için doğru seçenektir.

ShopApp'teki ürün listesi için: kullanıcı bir ürün listesini açar, görseller yüklenir. Geri gidip tekrar geldiğinde hepsi anında gelir — RAM'de. Uygulamayı kapatıp tekrar açtığında diskten yüklenir, ağa gitme gecikmesi olmaz.

---

### blurhash — Görsel Yüklenmeden Önce Neyi Göster?

Ağdan görsel gelene kadar ekranda ne göstereceğin önemli bir UX kararıdır.

**Seçenek 1: Hiçbir şey gösterme.** Görsel gelene kadar boşluk. Kötü — kullanıcı listenin "bozuk" olduğunu düşünür.

**Seçenek 2: Spinner.** Her görselin üzerinde dönen bir ikon. İyi ama kalabalık görünür.

**Seçenek 3: Skeleton.** Gri placeholder kutu. Kabul edilebilir.

**Seçenek 4: blurhash.** Görselin renk dağılımını temsil eden, matematiksel olarak kodlanmış ~30 karakterlik bir string. Görsel yüklenmeden önce bu string'den gerçek görsele yakın bir "bulanık önizleme" üretilir.

```
LKO2?U%2Tw=w]~RBVZRi};RPxuwH
```

Bu string, 200x200 pixel bir görselin renk dağılımını temsil eder. `expo-image` bu string'i decode edip gerçek görsel gelene kadar gösterir. Kullanıcı görselin "şeklini" ve renk tonunu görür — beyaz boşluk yerine.

**Nasıl üretilir?** Backend üretmeli ve API response'una eklemeli:

```json
{
  "id": "abc123",
  "baslik": "Wireless Kulaklık",
  "gorsel_url": "https://cdn.shopapp.com/urun/abc123.jpg",
  "gorsel_blur": "LKO2?U%2Tw=w]~RBVZRi};RPxuwH"
}
```

Backend'de `sharp` (Node.js) veya `blurhash` kütüphanesiyle üretilir. Bir kez üretilir, veritabanında saklanır.

---

### transition — Görsel Yüklenince Nasıl Gelsin?

```tsx
<Image
  transition={300}
/>
```

`transition={300}` demek: görsel yüklenince 300ms'lik bir fade-in animasyonuyla belirsin. Böyle olmazsa görsel aniden "patlayarak" gelir — özellikle blurhash'ten gerçek görsele geçiş sert görünür. Yavaş bir cross-fade geçişi, kullanıcının geçişi fark etmeden devam etmesini sağlar.

---

### expo-image vs Built-in Image — Özet Fark

Built-in `<Image>` React Native'in kendi component'idir. Basit kullanım için yeterlidir ama:
- Cache mekanizması tutarsızdır ve platforma göre farklı davranır
- blurhash desteği yoktur
- transition (geçiş animasyonu) yoktur
- Büyük listelerde bellek optimizasyonu zayıftır

`expo-image` ise SDWebImage (iOS) ve Glide (Android) üzerine inşa edilmiştir. Bu kütüphaneler Instagram, Twitter gibi uygulamaların kullandığı, yıllar içinde olgunlaşmış native kütüphanelerdir. Tutarlı cache, blurhash, transition ve bellek yönetimi built-in gelir.

ShopApp gibi görsel ağırlıklı bir e-ticaret uygulamasında built-in `<Image>` yerine `expo-image` kullanmak doğru seçimdir.

---

## Bölüm 2: Bundle Optimizasyonu

### Metro Bundle Nedir?

Web'de React projeni `npm run build` yaptığında Webpack (ya da Vite, Turbopack) tüm JS dosyalarını birleştirip sıkıştırır. Bu işe "bundling" denir. Çıktı: `main.js`, `vendor.js` gibi dosyalar.

React Native'de bu görevi **Metro** yapar. Metro, Facebook'un React Native için geliştirdiği bundler'dır. Temel görevi: senin yazdığın `import` ifadelerini takip edip her şeyi tek bir büyük JS dosyasına paketlemek.

Bu paketlenmiş dosyaya **bundle** denir. Uygulama başladığında Hermes bu bundle'ı okur ve çalıştırır.

---

### Webpack'te Chunk Splitting Vardı, Metro'da Neden Yok?

Web'de büyük bir Next.js uygulamasında `/dashboard` sayfasına gittiğinde tarayıcı yalnızca o sayfa için gereken JS'i indirir. Çünkü Webpack sayfaları otomatik olarak farklı "chunk"lara (parçalara) böler. Ana bundle küçük kalır, ihtiyaç duyulan parçalar lazy olarak yüklenir.

Metro bu işi **yapamaz.** Neden?

Web'de tarayıcı bir chunk'a ihtiyaç duyduğunda ağdan çeker — `https://site.com/_next/static/chunks/dashboard.js`. Bunu yapmak için çalışan bir ağ bağlantısı ve bir HTTP server yeterlidir.

React Native'de uygulama bir App Store paketi olarak cihaza yüklenir. Kullanıcı uygulamayı açtığında internet olmayabilir. Uygulama çalışmak için gereken her şey cihazda olmalıdır. Bu nedenle Metro tüm JS'i tek bir bundle'a koyar ve bu bundle APK/IPA içinde yer alır.

Tek bundle'ın bedeli: uygulama açılışında Hermes tüm bundle'ı okur. Bundle ne kadar büyükse açılış o kadar uzun sürer.

---

### Expo Router Code Splitting — Sihrin Arkası

Expo Router aslında bu sorunu kısmen çözer, ama farklı bir yolla.

Expo Router, her `app/` klasöründeki sayfayı **lazy load** eder. Bunu Metro'nun dinamik `import()` desteğiyle yapar.

```tsx
// Expo Router içinde şunu yapar — sen yazmasan da:
const UrunDetay = lazy(() => import('./screens/UrunDetay'));
```

Bu ne anlama gelir? Bundle hâlâ tek bir dosyadır — yani her şey pakette mevcuttur. Ama Hermes bundle'ı ilk açılışta **tamamen parse etmez.** `lazy()` ile işaretlenmiş modüller, o ekrana ilk kez gidildiğinde parse edilir.

Yani uygulama açıldığında Hermes yalnızca `app/_layout.tsx` ve başlangıç ekranını parse eder. `UrunDetay` ekranı ilk kez açıldığında o kod parse edilir. Bu açılış süresini kısaltır çünkü Hermes başlangıçta daha az iş yapar.

**Önemli fark:** Dosya boyutu küçülmez — tüm kod pakette. Ama parse süresi bölünür — hepsi başlangıçta değil, ihtiyaç anında.

---

### Bundle Boyutunu Büyüten Nedir?

Uygulama yavaş açılıyorsa ya da App Store'a yüklerken boyut uyarısı alıyorsan şu kaynakları incele:

**1. Kullanılmayan kütüphaneler**

`package.json`'da kurulu ama belki tek bir özellik için yüklenmiş büyük kütüphaneler. `moment.js` bunun klasik örneğidir — 67KB gzip, çoğu özelliği kullanılmaz. Alternatif: `date-fns` ya da native `Intl` API.

**2. Tüm icon setini import etmek**

```tsx
// Kötü: tüm MaterialIcons setini bundle'a alır (~500KB)
import { MaterialIcons } from '@expo/vector-icons';

// İyi: sadece kullandığın ikonu al
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
```

İkinci import sadece kullandığın ikonu alır, geri kalan binlerce ikonu bundle'a koymaz.

**3. Görselleri JS içine gömmek**

Base64 görsel string'lerini JS dosyasına koymak bundle'ı şişirir. Görseller `assets/` klasöründe durmalı, `require()` ile referans edilmeli. Metro bunları bundle dışında ayrı dosyalar olarak paketler.

---

### SVG'ler — Neden Özel Dikkat Gerekir?

Web'de SVG'yi direkt `<img src="icon.svg" />` olarak kullanırsın. React Native'de SVG dosyaları doğrudan kullanılamaz — RN'nin renderer'ı SVG formatını anlamaz.

İki seçenek var:

**Seçenek 1: react-native-svg ile SVG'yi component'e dönüştür**

```tsx
import { Svg, Path } from 'react-native-svg';

function ArrowIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path d="M5 12h14M12 5l7 7-7 7" stroke="black" strokeWidth={2} />
    </Svg>
  );
}
```

Avantajı: renk, boyut gibi özellikleri prop ile kontrol edebilirsin.

**Seçenek 2: metro-react-native-svg-transformer ile .svg dosyasını direkt import et**

```tsx
import ArrowIcon from '@/assets/icons/arrow.svg';
<ArrowIcon width={24} height={24} fill="black" />
```

Bu seçenekte Metro config'e bir transformer eklenir. SVG dosyası build sırasında otomatik olarak `react-native-svg` component'ine dönüştürülür. Büyük icon kütüphanelerinde çok sayıda SVG dosyasını bu yolla kolayca kullanabilirsin.

---

## ShopApp'e Uygulama

```tsx
// components/UrunKart.tsx
import { Image } from 'expo-image';
import { Pressable, Text, StyleSheet } from 'react-native';

type Urun = {
  id: string;
  baslik: string;
  fiyat: number;
  gorsel_url: string;
  gorsel_blur: string;
};

export function UrunKart({ urun }: { urun: Urun }) {
  return (
    <Pressable style={styles.kart}>
      <Image
        source={{ uri: urun.gorsel_url }}
        style={styles.gorsel}
        cachePolicy="memory-disk"        // RAM + disk: en iyi kullanıcı deneyimi
        placeholder={{ blurhash: urun.gorsel_blur }}  // görsel gelene kadar renk tonu
        transition={250}                 // 250ms fade-in — ani geçişi yumuşat
        contentFit="cover"               // CSS object-fit: cover karşılığı
        accessibilityLabel={urun.baslik}
      />
      <Text style={styles.baslik}>{urun.baslik}</Text>
      <Text style={styles.fiyat}>{urun.fiyat} ₺</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kart: { marginBottom: 12 },
  gorsel: { width: '100%', height: 200, borderRadius: 8 },
  baslik: { fontSize: 16, marginTop: 8 },
  fiyat: { fontSize: 14, color: '#666' },
});
```

---

## Özet

| Konu | Sorun | Çözüm |
|------|-------|-------|
| Görsel her seferinde ağdan geliyor | Built-in `<Image>` güvenilir cache yapmıyor | `expo-image` + `cachePolicy="memory-disk"` |
| Görsel gelene kadar boşluk var | Kullanıcı deneyimi bozuk | `blurhash` + `transition` |
| Uygulama açılışı yavaş | Metro tek bundle, Hermes hepsini parse ediyor | Expo Router lazy loading, gereksiz import'ları temizle |
| Bundle boyutu büyük | Tüm icon seti, kullanılmayan kütüphaneler | Tree shaking, bireysel import, `date-fns` gibi hafif alternatifler |
| SVG kullanamıyorum | RN renderer SVG anlamıyor | `react-native-svg` veya `svg-transformer` |

---

## Kontrol Soruları

1. `cachePolicy="memory"` ile `cachePolicy="disk"` arasındaki fark nedir? Uygulamayı kapatıp açınca ikisinde ne farklı olur?
2. blurhash string'ini kim üretmeli — frontend mi backend mi? Neden?
3. Metro neden Webpack gibi chunk splitting yapamıyor? Mobil ile web arasındaki temel fark nedir?
4. Expo Router lazy loading yaptığını söyledik ama bundle boyutu değişmez dedik. O zaman lazy loading'in faydası tam olarak nedir?
5. `import { MaterialIcons } from '@expo/vector-icons'` yerine `import MaterialIcons from '@expo/vector-icons/MaterialIcons'` kullanmak bundle boyutunu nasıl etkiler? Mekanizma nedir?

---

## Sonraki Gün

**Gün 45 → React Native Testing Library:** Web'deki RTL ile neredeyse aynı API — ama `fireEvent.click` yok, `fireEvent.press` var. Native modülleri nasıl mock'larsın, `act()` ne zaman gerekir, `waitFor` ile async test nasıl yazılır.
