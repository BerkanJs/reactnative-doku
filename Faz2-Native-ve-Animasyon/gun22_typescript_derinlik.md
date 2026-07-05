# Gün 22 — TypeScript Derinliği: Navigation Params, Generics, Utility Types

## Önce Şunu Anlayalım: TypeScript Neden React Native'de Daha Kritik?

Web'de TypeScript hata yaparsan ne olur? Konsola kırmızı hata düşer, sayfa açılmaya devam eder. Belki bazı şeyler çalışmaz ama kullanıcı sayfayı görür.

React Native'de TypeScript hata yaparsan ne olur? **Beyaz ekran.** Uygulama çöker. Kullanıcı 3 saniye bakar, kapatır, bir daha açmaz.

Bu yüzden Faz 2'nin ilk günü TypeScript. Devam etmeden önce "tip güvencesi nedir, neden önemli" konusunu iyice yerleştirelim.

---

## Generic Nedir? Neden Lazım?

### Önce generic olmadan bir problemi görelim

Diyelim ki bir fonksiyon yazıyorsun: AsyncStorage'dan veri oku.

```tsx
// Tipler belirsiz — her şey any
async function cachedenOku(anahtar: string) {
  const metin = await AsyncStorage.getItem(anahtar);
  if (!metin) return null;
  return JSON.parse(metin); // bu ne döner? any
}

// Kullanım:
const kullanici = await cachedenOku('@shopapp/kullanici');
kullanici.isim       // TypeScript: "isim var mı bilmiyorum, any"
kullanici.emailllll  // TypeScript: "tamam, hata yok" — ama bu alan YOK
```

`any` dönen fonksiyon tip güvencesi sağlamaz. `kullanici.emailllll` yazsan TypeScript susacak çünkü `any` üzerinde her şeye izin var. Hata runtime'da patlıyor.

### Şimdi generic ile çözelim

Generic'i şöyle düşün: **kalıp.** Kurabiye kalıbı gibi. Kalıbın şekli hep aynı — ama içine hangi hamuru koyduğunu sen söylüyorsun. Kalıp bilmiyor, sen söylüyorsun.

```tsx
// T: "bu fonksiyon hangi tip veri döndürecek?" sorusunun cevabı
// T'yi fonksiyonu ÇAĞIRIRKEN sen söylüyorsun
async function cachedenOku<T>(anahtar: string): Promise<T | null> {
  const metin = await AsyncStorage.getItem(anahtar);
  if (!metin) return null;
  return JSON.parse(metin) as T;
}
```

Yukarıdaki fonksiyonda `T` bir yer tutucu. "Buraya bir tip gelecek, ama hangisi olduğunu şimdi bilmiyorum, sen çağırırken söyle" demek.

```tsx
// Çağırırken T'yi söylüyoruz: Kullanici
const kullanici = await cachedenOku<Kullanici>('@shopapp/kullanici');
// Artık: kullanici → Kullanici | null

kullanici?.isim       // TypeScript: "evet, Kullanici'da isim var" ✅
kullanici?.emailllll  // TypeScript: "bu alan yok, hata!" ✅

// Başka tür veri için aynı fonksiyon:
const ayarlar = await cachedenOku<{ bildirimler: boolean; dil: string }>('@shopapp/ayarlar');
// ayarlar → { bildirimler: boolean; dil: string } | null
```

**Generic olmadan ne yapardın?**  
Ya her tip için ayrı fonksiyon yazardın:
```tsx
async function cachedenKullaniciOku() { ... }   // sadece Kullanici için
async function cachedenAyarlariOku() { ... }     // sadece ayarlar için
async function cachedenSepetOku() { ... }        // sadece sepet için
```
Aynı kod üç kere. Generic'in değeri: **bir kere yaz, her tiple çalış.**

---

## Navigation Params: Tiplemezsen Ne Olur?

Şu an ShopApp'te `products/[id].tsx` var. Kullanıcı bir ürüne tıkladığında `id` bu sayfaya geliyor.

### Tiplemeden kullanma:

```tsx
const { id } = useLocalSearchParams();
// id şu an: string | string[] | undefined
```

Neden `string[]`? URL'de aynı parametre birden fazla kez gelebilir:
`/products?id=1&id=2&id=3` → `id = ['1', '2', '3']`

Şimdi bununla ürün bulmaya çalışırsın:

```tsx
const urun = TUM_URUNLER.find(u => u.id === id);
// id = ['1', '2'] gelirse: '1' === ['1', '2'] → false
// Hiçbir ürün bulunamadı, ekran boş açıldı
// TypeScript: "sorun görmüyorum" (çünkü === string ve string[] arasında çalışır, false döner)
```

Hata runtime'da. TypeScript sessiz.

### Generic ile tipleyince:

```tsx
const { id } = useLocalSearchParams<{ id: string }>();
// id: string — kesin. string[] veya undefined dönmez
```

Artık `find` güvenli çalışır çünkü `id` kesinlikle `string`.

**Optional parametre de var mı?**

```tsx
// Kullanıcı farklı sekmeden geldi mi? tab parametresi gelebilir, gelmeyebilir
const { id, tab } = useLocalSearchParams<{
  id: string;
  tab?: 'yorumlar' | 'detaylar' | 'benzerler';
}>();
// tab?: → gelmeyebilir, undefined olabilir
// ama gelirse kesinlikle bu 3 değerden biri

tab === 'yorummmmlar' // TypeScript: "bu değer yok!" ✅
```

---

## Discriminated Union: "Trafik Lambası" Prensibi

### Problem

API'ye istek atıyorsun. Bazen başarılı döner, bazen hata döner. Bunu nasıl tiplersin?

**Kötü yaklaşım:**

```tsx
type ApiCevap = {
  data?: Urun[];
  message?: string;
  basarili?: boolean;
};

const cevap: ApiCevap = await urunleriGetir();

if (cevap.basarili) {
  cevap.data?.forEach(...);
  // data var mı? TypeScript bilmiyor
  // basarili === true olsa bile data undefined olabilir mi? TypeScript'e göre evet
  // Her yere ?. koymak zorundasın — bu "bilmiyorum" demek
}
```

### Discriminated Union ile çözüm

"Discriminated" Türkçesiyle "ayrımlanmış." Trafik lambası gibi düşün:

- Kırmızı → dur durumu. Bu durumda sadece **neden durduğun** var (`message`).
- Yeşil → git durumu. Bu durumda sadece **nereye gideceğin** var (`data`).

İkisini aynı anda düşünemezsin. Ya kırmızıdasın ya yeşil. Kırmızıda `data` diye bir şey yok.

```tsx
type ApiCevap<T> =
  | { status: 'ok';    data: T }        // yeşil ışık durumu
  | { status: 'error'; message: string } // kırmızı ışık durumu
```

```tsx
const cevap: ApiCevap<Urun[]> = await urunleriGetir();

if (cevap.status === 'ok') {
  // TypeScript burada: "status 'ok' ise data kesinlikle var, Urun[]"
  cevap.data.forEach(urun => console.log(urun.isim)); // ? yok, güvenli
} else {
  // TypeScript burada: "status 'ok' değilse, yani 'error', message kesinlikle var"
  console.error(cevap.message);
  cevap.data // TypeScript HATA: 'error' durumunda data yok!
}
```

**`status` olmadan ne yapardık?**

```tsx
type ApiCevap<T> = {
  data?: T;
  message?: string;
};
```

Bu tipte TypeScript `status === 'ok'` gibi bir kontrol olmadığı için hiçbir zaman "şu an hangi durumdayım" bilgisini çıkaramaz. Her zaman her iki alan da `undefined` olabilir. Her yere `?.` ve `??` zinciri.

---

## Utility Types: Var Olanı Dönüştür

Bu 5 araç, aynı tipi tekrar tekrar yazmaktan kurtarır. Hepsini ShopApp'teki gerçek bir senaryo üzerinden görelim.

### Temel tipimiz:

```tsx
type Urun = {
  id: string;
  isim: string;
  fiyat: number;
  gorsel: string;
  kategori: string;
  aciklama: string;
  indirim?: number;
  stok: number;
};
```

---

### `Pick<T, K>` — İstediğin alanları seç

**Senaryo:** `ProductCard` component'i tüm `Urun`'ü almak zorunda değil. Sadece listeyi gösteriyor — `aciklama` yok, `stok` yok, `kategori` yok.

```tsx
// Kötü: tüm Urun'ü geçiriyorsun ama çoğu kullanılmıyor
type ProductCardProps = {
  urun: Urun;
  onPress: () => void;
};

// İyi: sadece lazım olanlar
type UrunKart = Pick<Urun, 'id' | 'isim' | 'fiyat' | 'gorsel' | 'indirim'>;

type ProductCardProps = UrunKart & { onPress: () => void };
```

`Pick<Urun, 'id' | 'isim' | 'fiyat' | 'gorsel' | 'indirim'>` şunu yapar: `Urun` tipinden sadece bu 5 alanı al, geri kalanı bırak. Yeni tip oluştur.

**Olmasa ne olurdu?** ProductCard'a `aciklama`, `stok`, `kategori` de geçirmek zorunda kalırdın. Gereksiz veri taşınır.

---

### `Omit<T, K>` — İstemediğini çıkar

**Senaryo:** Profil güncelleme formu. Kullanıcı `id`'sini değiştirememeli. Diğer her şey değiştirilebilir.

```tsx
type Kullanici = {
  id: string;
  isim: string;
  email: string;
  avatar: string;
};

// id hariç her şey — ama hepsini optional da yapmıyoruz, hepsi zorunlu
type ProfilGuncelle = Omit<Kullanici, 'id'>;
// = { isim: string; email: string; avatar: string }

// id'yi göndermeye çalışırsan:
const guncellemeler: ProfilGuncelle = { id: 'xyz', isim: 'Ahmet' };
// TypeScript: "'id' bu tipte yok!" ✅
```

**`Pick` ile farkı ne?** `Pick` "şunları AL" der. `Omit` "şunlar HARİÇ hepsini al" der. 3 alanı almak istiyorsan `Pick` kolay, 1 alanı çıkarmak istiyorsan `Omit` kolay.

---

### `Partial<T>` — Hepsini optional yap

**Senaryo:** PATCH isteği — sadece değişen alanları gönder. Kullanıcı sadece fiyatı güncelledi, neden tüm ürünü gönderesin?

```tsx
// Tam ürün güncelleme tipi
type UrunGuncelleme = Partial<Omit<Urun, 'id'>>;
// Adım adım:
// 1. Omit ile id çıkar: { isim, fiyat, gorsel, kategori, aciklama, indirim?, stok }
// 2. Partial ile hepsini optional yap: { isim?, fiyat?, gorsel?, ... }

async function urunGuncelle(id: string, degisiklikler: UrunGuncelleme) {
  await apiClient.patch(`/urunler/${id}`, degisiklikler);
}

// Sadece fiyat değişti — TypeScript hata vermez
urunGuncelle('u1', { fiyat: 299 });

// Hem fiyat hem indirim değişti — TypeScript hata vermez
urunGuncelle('u1', { fiyat: 299, indirim: 15 });

// id değiştirmeye çalışırsın:
urunGuncelle('u1', { id: 'baska-id', fiyat: 299 }); // TypeScript HATA ✅
```

---

### `ReturnType<F>` — Fonksiyonun ne döndürdüğünü tip olarak al

**Senaryo:** `useUrunler` hook'unun dönüş tipini başka bir yerde kullanmak istiyorsun. Ama her TanStack Query güncellemesinde bunu manuel güncellememek istiyorsun.

```tsx
// hooks/useUrunler.ts
export function useUrunler() {
  return useQuery({
    queryKey: ['urunler'],
    queryFn: tumUrunlerGetir,
    staleTime: 5 * 60 * 1000,
  });
}

// Başka bir dosyada: bu hook'un dönüş tipini almak istiyorum
type UrunlerSonucu = ReturnType<typeof useUrunler>;
// = { data: Urun[] | undefined, isLoading: boolean, isError: boolean, refetch: () => void, ... }

// Bunu yazmak yerine ReturnType kullanıyorsun
// Çünkü hook değişirse ReturnType otomatik güncellenir
// Manuel yazarsan güncellemeyi unutabilirsin
```

---

### `Awaited<T>` — Promise içinden tipi çıkar

**Senaryo:** Async bir fonksiyonun sonucunu tip olarak almak istiyorsun.

```tsx
// api/urunler.ts
async function tumUrunlerGetir(): Promise<Urun[]> { ... }

// Bu fonksiyon Promise<Urun[]> döndürüyor
// Promise'i resolve ettiğinde Urun[] elde ediyorsun
// Bunu tip olarak almak için:

type SonucTipi = Awaited<ReturnType<typeof tumUrunlerGetir>>;
// Adım adım:
// 1. ReturnType<typeof tumUrunlerGetir> → Promise<Urun[]>
// 2. Awaited<Promise<Urun[]>> → Urun[]

// SonucTipi = Urun[]
```

**Ne zaman lazım?** Başka bir fonksiyon bu async fonksiyonun sonucunu parametre olarak alıyorsa:

```tsx
function urundleriGoster(urunler: Awaited<ReturnType<typeof tumUrunlerGetir>>) {
  // urunler: Urun[]
}
```

---

## `as const`: "Bu Değer Değişmez, Tam Olarak Budur"

### Problem: string listesi ama güvensiz

```tsx
const KATEGORILER = ['elektronik', 'giyim', 'kitap', 'mutfak'];
// TypeScript bu tipi görüyor: string[]
// "içinde string'ler var" — hangisi olduğu önemli değil
```

Şimdi bir filtre fonksiyonu yaz:

```tsx
function filtreUygula(kategori: string) { ... }

filtreUygula('elektronik');     // TypeScript: tamam
filtreUygula('YANLIŞ_YAZİM'); // TypeScript: tamam — ama bu yanlış!
filtreUygula('giyi');           // TypeScript: tamam — ama bu typo!
```

TypeScript `string` gördüğünde hiçbir şey kontrol etmez. Her string geçer.

### `as const` ile çözüm

```tsx
const KATEGORILER = ['elektronik', 'giyim', 'kitap', 'mutfak'] as const;
// TypeScript bu tipi görüyor: readonly ['elektronik', 'giyim', 'kitap', 'mutfak']
// Tam olarak bu 4 değer. Başkası yok.

type Kategori = (typeof KATEGORILER)[number];
// = 'elektronik' | 'giyim' | 'kitap' | 'mutfak'

function filtreUygula(kategori: Kategori) { ... }

filtreUygula('elektronik');     // TypeScript: tamam ✅
filtreUygula('YANLIŞ_YAZİM'); // TypeScript: HATA ✅
filtreUygula('giyi');           // TypeScript: HATA — typo yakalandı ✅
```

**`[number]` ne demek?** Dizinin her elemanının tipini birleştir. `['a', 'b', 'c'][number]` = `'a' | 'b' | 'c'`. "0, 1, 2 numaralı index'lerdeki tiplerin birliği" demek.

### ShopApp'te kullanım:

```tsx
// constants/mockData.ts
export const SIRALAMA_TIPLERI = [
  'varsayilan',
  'ucuzdan-pahaliya',
  'pahalidan-ucuza',
  'sadece-indirimli',
] as const;

export type SiralamaKey = (typeof SIRALAMA_TIPLERI)[number];
// = 'varsayilan' | 'ucuzdan-pahaliya' | 'pahalidan-ucuza' | 'sadece-indirimli'

// app/(tabs)/index.tsx — type'ı burada tekrar yazmak yerine import ediyoruz
import type { SiralamaKey } from '@/constants/mockData';

// Şimdi 'ucuzdan-pahaliyya' gibi typo yazarsan TypeScript anında yakalar
const [siralama, setSiralama] = useState<SiralamaKey>('varsayilan');
```

---

## Zod: TypeScript Seni Runtime'da Korumaz, Zod Korur

Bu önemli bir kavram. TypeScript sadece **yazarken** kontrol eder. Kod çalışırken (runtime) TypeScript yoktur.

```tsx
// Tehlikeli: TypeScript mutlu ama runtime'da ne olur?
const cevap = await apiClient.get<Urun[]>('/urunler');
// apiClient.get<Urun[]> TypeScript'e "bu Urun[] döner" diyor
// Ama API döndüğü veri gerçekten Urun[] mi? TypeScript bilmez.
// Backend yarın schema değiştirsе, `fiyat` yerine `price` yazsa:
// TypeScript: "sorun yok"
// Runtime: cevap.data[0].fiyat → undefined → app crash
```

### Zod nedir?

Zod hem bir **tip tanımlama aracı** hem de **runtime validator**. Şemayı bir kez yaz, hem TypeScript tipi üretir hem de gelen veriyi gerçekten kontrol eder.

```tsx
import { z } from 'zod';

// Şema: "bu veri nasıl görünmeli?"
const UrunSemasi = z.object({
  id: z.string(),
  isim: z.string(),
  fiyat: z.number().positive(),       // sadece pozitif sayı
  gorsel: z.string().url(),           // geçerli URL olmalı
  indirim: z.number().min(0).max(100).optional(),
  stok: z.number().int().min(0),
});

// Tip otomatik çıkarılır — ayrı yazmak gerekmez
type Urun = z.infer<typeof UrunSemasi>;
// = { id: string; isim: string; fiyat: number; gorsel: string; indirim?: number; stok: number }
```

### Runtime'da kullanım:

```tsx
const cevapVerisi = await apiClient.get('/urunler').then(r => r.data);

const sonuc = z.array(UrunSemasi).safeParse(cevapVerisi);

if (sonuc.success) {
  // sonuc.data: Urun[] — gerçekten doğrulandı, TypeScript VE runtime güvenli
  return sonuc.data;
} else {
  // Hangi alan yanlış, neden? Detaylı hata:
  console.error('API şeması bozuk:', sonuc.error.issues);
  // Örnek çıktı: [{ path: ['fiyat'], message: 'Expected number, received string' }]
  throw new Error('Geçersiz API yanıtı');
}
```

### `safeParse` mi, `parse` mi?

```tsx
// parse: hata varsa exception fırlatır, try/catch zorunlu
try {
  const urun = UrunSemasi.parse(gelenVeri);
} catch (hata) {
  console.error(hata);
}

// safeParse: hata olsa da exception atmaz, { success, data/error } döner
const sonuc = UrunSemasi.safeParse(gelenVeri);
if (sonuc.success) {
  // sonuc.data
} else {
  // sonuc.error
}
```

**Ne zaman hangisi?** Form doğrulamada `safeParse` — hata mesajlarını kullanıcıya göstermek için exception yerine object almak daha kolay. API yanıtında da `safeParse` daha temiz.

---

## Karşılaştırma Tablosu

| Kavram | Şöyle düşün | Olmasa ne olur? |
|--------|------------|-----------------|
| **Generic `<T>`** | Kalıp — şekli aynı, içi değişir | Her tip için ayrı fonksiyon |
| **Discriminated Union** | Trafik lambası — renk durumu belirler | Her alan optional, güvensiz |
| **`Pick`** | "Sadece bunları ver" | Tüm objeyi taşırsın, gereksiz |
| **`Omit`** | "Şunu hariç hepsini ver" | id de değiştirilebilir olur |
| **`Partial`** | "Hepsini isteğe bağlı yap" | PATCH'te tüm alanlar zorunlu |
| **`ReturnType`** | Fonksiyon ne döner → tip al | Manuel güncelleme, unutma riski |
| **`Awaited`** | Promise içini aç → tipi al | Promise tipini taşırsın |
| **`as const`** | "Bu değerler kesinlikle bunlar" | Typo geçer, string kabul eder |
| **Zod** | Runtime polis | API değişse sessizce crash |

---

## Kontrol Soruları

1. `Pick` ile `Omit` arasındaki fark ne? 10 alanlı bir tipten 9'unu almak istiyorsan hangisi daha mantıklı, neden?

2. `as const` yazmasaydık `KATEGORILER[number]` neden `string` dönüyor, `'elektronik' | 'giyim'` dönmüyor?

3. Discriminated union'da `status` alanını kaldırıp sadece `data?` ve `message?` yazsaydık, TypeScript hangi bilgiyi kaybetmiş olurdu?

4. TypeScript seni compile time'da koruyor, Zod runtime'da koruyor. İkisi olmadan ne tür senaryolarda crash yaşarsın?

5. Generic `<T>` olmadan `cachedenOku` fonksiyonunu nasıl yazardın? Kaç tane fonksiyon gerekir?

---

**Yarın (Gün 23):** Animated API — fade in, slide, spring. JavaScript thread üzerinde animasyon nasıl çalışır, `useNativeDriver` neden önemli?
