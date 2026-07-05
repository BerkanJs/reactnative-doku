# Gün 49 — Sentry ile Error Tracking

> Production'a deploy ettikten sonra başlar asıl iş: kullanıcılar hata alıyor ama sen bilmiyorsun. Kimisi şikayet eder, kimisi uygulamayı siler gider. Sentry bu boşluğu kapatır — her hata, her crash, kim yaşadı, hangi cihazda, ne yaparken oldu, hepsini sana bildirir. Bugün bu sistemin nasıl çalıştığını ve neden source map olmadan hiçbir anlam ifade etmediğini öğreneceğiz.

---

## Sorun: Production'da Hata Göremezsin

Geliştirme sırasında terminal açık, hata mesajları gözünün önünde. Production'da ise:

- Kullanıcının ekranında ne göründüğünü bilmiyorsun
- Uygulama çöktüğünde JS stack trace cihazda kalıyor, sana ulaşmıyor
- Native crash log'ları iOS ve Android'de farklı yerlerde duruyor, okumak uzmanlık istiyor
- Hangi kullanıcının, hangi cihazda, hangi ekranda sorun yaşadığını bilmiyorsun

Sentry bu bilgilerin tamamını otomatik olarak toplar ve sana gönderir.

---

## Sentry Nasıl Çalışır? — Mekanizma

Sentry'yi uygulamanı başlattığında `Sentry.init()` çağrısı global bir hata yakalayıcı kurar. Bu yakalayıcı iki katmanda çalışır:

**JS katmanı:** React Native'in `ErrorUtils.setGlobalHandler()` API'sini kullanır. Uygulamada herhangi bir yerde yakalanmamış bir JavaScript hatası fırlatılırsa bu handler devreye girer. Hata mesajını, stack trace'i, o anda kullanıcının ne yaptığını (breadcrumbs) toplar ve Sentry sunucusuna gönderir.

**Native katman:** iOS'ta `Objective-C exception handler`, Android'de `UncaughtExceptionHandler` kurulur. Native bir crash (uygulamanın tamamen kapanması) olduğunda bu handler crash raporu yazar ve Sentry sunucusuna gönderir — uygulamanın bir sonraki açılışında, çünkü crash anında ağ bağlantısı çalışmıyor olabilir.

```
Hata oluşur
     ↓
Sentry global handler yakalar
     ↓
Hata + cihaz bilgisi + kullanıcı bağlamı + breadcrumbs paketlenir
     ↓
Sentry sunucusuna POST isteği
     ↓
Dashboard'da görüntüle, ekip üyelerini bilgilendir
```

---

## Kurulum ve Temel Yapılandırma

```bash
npx expo install @sentry/react-native
```

```tsx
// app/_layout.tsx — root layout, uygulama başlar başlamaz çalışır
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://xxxx@sentry.io/yyyy',
  // DSN: Sentry'nin sana verdiği benzersiz adres — bu adrese raporlar gönderilir
  // Onu kimseyle paylaşma ama gitignore'a da koymana gerek yok — read-only

  environment: __DEV__ ? 'development' : 'production',
  // __DEV__: Metro bundler tarafından set edilen global değişken
  // Development'ta gerçek hataları Sentry'ye gönderme — test kirliliği olur

  tracesSampleRate: 0.2,
  // Performance monitoring: isteklerin %20'sini izle
  // 1.0 yapsan tüm kullanıcıların tüm işlemleri izlenir — kota hızlı dolar
  // Production'da 0.1 - 0.3 arası makul

  enabled: !__DEV__,
  // Development'ta tamamen kapat — her kaydedişte Sentry'ye istek atılmasın
});
```

---

## JS Error vs Native Crash — Fark Nedir?

### JS Error (JavaScript Hatası)

Uygulamanın çalıştığı JavaScript kodunda fırlatılan hata. Uygulama kapanmayabilir — React'ın Error Boundary'si varsa sadece ilgili component çöker, rest of the app çalışmaya devam eder.

Örnekler:
- `undefined`'ın bir property'sine erişim: `user.name` ama `user` undefined
- Network isteğinde yakalanmamış hata
- `JSON.parse()` geçersiz string

Stack trace genellikle okunabilir bir JS dosya adı ve satır numarası içerir. Ama minified (sıkıştırılmış) production bundle'ında değil — buna sonra geleceğiz.

### Native Crash (Uygulama Çöküşü)

Uygulamanın tamamen kapandığı durum. Kullanıcı ana ekrana atılır. Native kod tarafından fırlatılır.

Örnekler:
- Bellek yetersizliği (OutOfMemoryError)
- Null pointer exception (native tarafta)
- Stack overflow
- Desteklenmeyen bir native API'ye erişim

Stack trace genellikle Swift/Objective-C veya Kotlin/Java kod satırları içerir. Okumak için platforma hakim olmak gerekir. Sentry bunu da yakalar ve yorumlanabilir hale getirir.

**Sentry ikisini de yakalar.** Ama ikisinin raporlanma mekanizması farklıdır: JS hatası anında gönderilir, native crash bir sonraki uygulama açılışında gönderilir.

---

## Source Map — Olmadan Hiçbir Şey Anlamlı Değil

Bu konuyu anlamadan Sentry kullanmak neredeyse işe yaramaz.

### Minification Nedir?

Production bundle'ı hazırlarken Metro tüm kodu sıkıştırır (minify eder). Değişken isimleri kısaltılır, boşluklar kaldırılır, birden fazla dosya tek satıra sıkıştırılır. Boyutu küçültmek için.

```js
// Senin yazdığın kod:
function sepeteUrunEkle(urunId, adet) {
  if (adet <= 0) throw new Error('Adet sıfırdan büyük olmalı');
  cartStore.addItem(urunId, adet);
}

// Minified production bundle:
function a(b,c){if(c<=0)throw new Error('Adet sıfırdan büyük olmalı');d.e(b,c)}
```

Sentry bu hatayı yakalarsa stack trace şunu gösterir:

```
Error: Adet sıfırdan büyük olmalı
  at a (bundle.js:1:2847)
  at f (bundle.js:1:9231)
  at g (bundle.js:1:15443)
```

`bundle.js:1:2847` — tüm kod tek satırda, 2847. karakter. Bu sana hiçbir şey söylemez. Hangi fonksiyon, hangi dosya, hiçbir fikrin yok.

### Source Map Nedir?

Source map, minified kod ile orijinal kod arasındaki haritadır. "bundle.js:1:2847 aslında UrunStore.ts dosyasının 34. satırı, `sepeteUrunEkle` fonksiyonu içi" bilgisini içerir.

Source map Sentry'ye yüklendiğinde aynı hata şöyle görünür:

```
Error: Adet sıfırdan büyük olmalı
  at sepeteUrunEkle (store/urunStore.ts:34)
  at SepetButonu.onPress (components/SepetButonu.tsx:18)
  at handleTouch (node_modules/react-native/...)
```

Artık tam olarak nereye bakman gerektiğini biliyorsun.

### Source Map'i Otomatik Yükle

EAS Build ile `@sentry/react-native` birlikte kullanılırsa source map upload'u otomatik yapılandırılabilir:

```bash
# app.json'a Sentry plugin ekle
```

```json
{
  "expo": {
    "plugins": [
      [
        "@sentry/react-native/expo",
        {
          "organization": "sirket-adi",
          "project": "shopapp"
        }
      ]
    ]
  }
}
```

Bu plugin, her EAS Build sonrasında source map'i otomatik olarak Sentry'ye gönderir. Fazladan bir şey yapman gerekmez.

---

## Hata Yakalama — Manuel Kullanım

Sentry'nin global handler'ı her şeyi yakalar ama bazen belirli bir hatayı daha fazla bağlamla göndermek isteyebilirsin.

### captureException — Bilinen Hataları Raporla

```tsx
import * as Sentry from '@sentry/react-native';

async function siparisOlustur(sepet: Sepet) {
  try {
    await api.post('/orders', sepet);
  } catch (error) {
    // Bu hatayı sessizce yut ama Sentry'ye bildir
    Sentry.captureException(error, {
      // Extra bağlam: bu bilgiler Sentry dashboard'unda hatanın yanında görünür
      extra: {
        sepetId: sepet.id,
        urunSayisi: sepet.urunler.length,
        toplam: sepet.toplam,
      },
      tags: {
        ekran: 'odeme',
        islem: 'siparis-olustur',
      },
    });

    // Kullanıcıya hata mesajı göster
    Alert.alert('Sipariş oluşturulamadı', 'Lütfen tekrar deneyin.');
  }
}
```

`captureException` hatayı Sentry'ye gönderir ama uygulamayı durdurmaz. Kullanıcıya hata mesajı gösterirken arka planda hata raporlanmış olur.

### captureMessage — Hata Değil, Uyarı Gönder

Bazen bir exception fırlatılmaz ama beklenmedik bir durum oluşur. Bunu da raporlayabilirsin:

```tsx
if (urunStok === 0 && kullanicıSepeteEklemeyeCalistiSayi > 3) {
  // Hata yok, ama bu anormallik incelenmeli
  Sentry.captureMessage('Stokta olmayan ürüne defalarca ekleme denemesi', {
    level: 'warning',
    extra: { urunId, deneme: kullanicıSepeteEklemeyeCalistiSayi },
  });
}
```

Severity seviyeleri: `'fatal'`, `'error'`, `'warning'`, `'info'`, `'debug'`

---

## Breadcrumbs — Hatadan Önce Ne Oldu?

Bir hatanın neden oluştuğunu anlamak için "hata anına kadar kullanıcı ne yaptı?" sorusu kritiktir. Buna **breadcrumb** denir — ekmek kırıntıları, yani iz.

Sentry navigation, network istekleri ve console.log'larını otomatik olarak breadcrumb olarak kaydeder. Ama kendi önemli aksiyonlarını da ekleyebilirsin:

```tsx
import * as Sentry from '@sentry/react-native';

function urunDetayaGit(urunId: string) {
  Sentry.addBreadcrumb({
    category: 'navigasyon',
    message: `Ürün detayına gidildi: ${urunId}`,
    level: 'info',
  });

  router.push(`/urun/${urunId}`);
}

function sepeteEkle(urunId: string, adet: number) {
  Sentry.addBreadcrumb({
    category: 'kullanici-aksiyonu',
    message: 'Sepete ekleme butonu tıklandı',
    data: { urunId, adet },
    level: 'info',
  });

  // ... ekleme işlemi
}
```

Şimdi bir hata olduğunda Sentry dashboard'unda şunu görürsün:

```
[navigasyon]       Ürün detayına gidildi: abc123
[kullanici]        Sepete ekleme butonu tıklandı  {urunId: abc123, adet: 1}
[network]          POST /orders → 500 Internal Server Error
[hata]             ❌ Uncaught Error: Cannot read property 'id' of undefined
```

Artık hatanın neden oluştuğunu çok daha hızlı anlıyorsun.

---

## User Context — Kim Yaşıyor?

Hata raporu geldiğinde "bu hatayı kim yaşadı?" sorusu çok değerlidir. Kullanıcıya ulaşıp özür dileyebilir, durumunu inceleyebilirsin.

```tsx
// Kullanıcı giriş yaptıktan sonra Sentry'ye kullanıcı bilgisini ver
function kullanicıGirisYapti(kullanici: Kullanici) {
  Sentry.setUser({
    id: kullanici.id,
    email: kullanici.email,
    username: kullanici.ad,
    // GDPR dikkat: şifre, kredi kartı gibi hassas bilgileri asla koyma
  });
}

// Kullanıcı çıkış yaptığında temizle
function kullanicıCikisYapti() {
  Sentry.setUser(null);
}
```

Artık Sentry'de "bu hata 47 kullanıcıyı etkiledi" yerine "bu hata şu email adresindeki kullanıcıları etkiledi" bilgisini görebilirsin.

---

## Performance Monitoring — Yavaş İşlemleri Bul

Sentry sadece hata değil, yavaş işlemleri de izler. Her "transaction" (işlem) bir başlangıç ve bitiş noktası içerir.

```tsx
async function urunListesiYukle(kategori: string) {
  const transaction = Sentry.startTransaction({
    name: 'urun-listesi-yukle',
    op: 'api',
  });

  try {
    const span = transaction.startChild({
      op: 'http.client',
      description: `GET /urunler?kategori=${kategori}`,
    });

    const urunler = await api.get(`/urunler?kategori=${kategori}`);
    span.finish();

    const renderSpan = transaction.startChild({
      op: 'ui.render',
      description: 'Ürün listesi render',
    });
    // render işlemi...
    renderSpan.finish();

    return urunler;
  } finally {
    transaction.finish();
  }
}
```

Dashboard'da "urun-listesi-yukle işlemi ortalama 1.2 saniye sürüyor, en yavaş %10'u 4+ saniye" gibi bilgileri görürsün. Performans probleminin nerede olduğunu ölçümle bulursun.

---

## Sentry vs Firebase Crashlytics

İş ilanlarında her ikisi de görünür. Farkları:

| | Sentry | Firebase Crashlytics |
|--|--------|----------------------|
| JS hataları | ✅ Tam destek | ⚠️ Sınırlı |
| Native crash | ✅ | ✅ |
| Source map | ✅ Otomatik (EAS ile) | ⚠️ Manuel setup |
| Breadcrumbs | ✅ | ❌ |
| Performance | ✅ | Firebase Performance (ayrı) |
| Fiyat | Ücretsiz plan kısıtlı | Ücretsiz plan cömert |
| Kullanım kolaylığı | Daha fazla konfigürasyon | Firebase ekosistemi içinde basit |

**Ne zaman hangisi?**

Eğer zaten Firebase kullanıyorsan (Analytics, Firestore, Push Notification) Crashlytics eklemek mantıklı — tek ekosistem. Ama JS hata takibi ve breadcrumb desteği istiyorsan Sentry daha güçlüdür. Büyük projelerde ikisi bir arada kullanılabilir: Crashlytics native crash için, Sentry JS hatalar için.

---

## React Error Boundary + Sentry

Error Boundary, React bileşen ağacında oluşan hataları yakalar ve uygulamanın tamamen çökmesini önler — sadece sorunlu bileşeni devre dışı bırakır.

Sentry'nin hazır Error Boundary'si bunu otomatik raporlamaya bağlar:

```tsx
import * as Sentry from '@sentry/react-native';

export default function RootLayout() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        // Kullanıcıya gösterilen hata ekranı
        <View>
          <Text>Bir sorun oluştu.</Text>
          <Pressable onPress={resetError}>
            <Text>Tekrar Dene</Text>
          </Pressable>
        </View>
      )}
      onError={(error) => {
        // Hata yakalandı, Sentry otomatik raporlar
        // Buraya ek loglama ekleyebilirsin
      }}
    >
      <Stack />
    </Sentry.ErrorBoundary>
  );
}
```

---

## Özet

| Konu | Detay |
|------|-------|
| JS hata yakalama | Global handler — otomatik |
| Native crash | Bir sonraki açılışta raporlanır |
| Source map olmadan | Stack trace anlamsız — minified kod |
| Source map ile | Tam dosya adı ve satır numarası |
| captureException | Belirli hatayı bağlamla raporla |
| breadcrumbs | Hatadan önceki kullanıcı yolculuğu |
| user context | Hangi kullanıcının yaşadığını bil |
| performance | İşlemlerin ne kadar sürdüğünü izle |

---

## Kontrol Soruları

1. Source map olmadan Sentry'den gelen stack trace neden anlamsızdır? Minification tam olarak ne yapar?
2. Native crash anında Sentry neden hemen rapor gönderemez? Bir sonraki açılışta göndermesinin nedeni ne?
3. `captureException` ile global hata handler arasındaki fark nedir? İkisi aynı hatayı iki kez raporlar mı?
4. Breadcrumb ne işe yarar? Olmadan bir hatayı debug etmek neden daha zor?
5. `Sentry.setUser(null)` neden önemli? Çıkış yapan kullanıcının bilgisini temizlemezsen ne olur?

---

## Sonraki Gün

**Gün 50 → Firebase Analytics ve Crashlytics:** Kullanıcılar uygulamada ne yapıyor, hangi ekranda ne kadar kalıyor, hangi butona daha çok basıyor — analytics bu soruları yanıtlar. Firebase ile ekran takibi, custom event ve Remote Config ile feature flag nasıl kurulur.
