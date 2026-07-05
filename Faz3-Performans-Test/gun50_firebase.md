# Gün 50 — Firebase Analytics ve Crashlytics

> Sentry hatalar olduğunda seni haberdar eder. Firebase Analytics ise bir adım öncesini izler: hatadan önce kullanıcı ne yapıyor, hangi ekranda ne kadar kalıyor, ödeme sayfasına giren kaç kişi siparişi tamamlıyor. Bu farkı anlamak — hata izleme ile davranış izleme — iki aracın neden bir arada kullanıldığını açıklar.

---

## Firebase Nedir? — Ürün Ailesi

Firebase, Google'ın mobil ve web uygulamaları için sunduğu backend hizmetleri paketidir. Tek bir şey değil, onlarca servisten oluşur. Bugün kullanacaklarımız:

**Analytics:** Kullanıcıların uygulamada ne yaptığını ölçer. Hangi ekrana gittiler, hangi butona bastılar, hangi adımda çıktılar.

**Crashlytics:** Native crash raporları. Dün Sentry ile öğrendik; Crashlytics aynı işi Google ekosistemi içinde yapar.

**Remote Config:** Uygulama kodu değiştirmeden, App Store'a gitmeden, uygulamanın davranışını sunucudan değiştirme. Feature flag, A/B test için kullanılır.

---

## @react-native-firebase — Neden Ayrı Bir SDK?

Firebase'in resmi JavaScript SDK'sı (`firebase`) vardır ve web için tasarlanmıştır. React Native'de bu SDK çalışabilir ama native özellikleri kullanamaz. Örneğin, Analytics için tam cihaz bilgisi, uygulama yaşam döngüsü olayları, native crash detection — bunlar için gerçek native kod gerekir.

`@react-native-firebase` bu nedenle var: her Firebase hizmeti için hem JS hem native katmanı olan bir köprü. iOS'ta Swift/Objective-C, Android'de Kotlin ile yazılmış native Firebase SDK'larının üzerine JS arayüzü inşa edilmiş.

```bash
npx expo install @react-native-firebase/app
npx expo install @react-native-firebase/analytics
npx expo install @react-native-firebase/crashlytics
npx expo install @react-native-firebase/remote-config
```

`@react-native-firebase/app` her şeyin temelini oluşturur — diğerleri buna bağımlıdır.

---

## Expo ile Firebase Entegrasyonu — Native Kod Nasıl Eklenir?

`@react-native-firebase` native kod içerdiğinden Expo Go'da çalışmaz. Bu, dün öğrendiğimiz `developmentClient: true` durumunu gerektiren bir durumdur.

### Adım 1: Firebase Projesi Oluştur

Firebase Console'da (console.firebase.google.com) yeni bir proje oluştur. iOS için `GoogleService-Info.plist`, Android için `google-services.json` dosyalarını indir.

Bu dosyalar ne içerir? Firebase'in "hangi proje için çalışıyorsun?" sorusunun cevabı. API key'ler, proje ID'si, uygulama ID'si. Bunlar olmadan SDK hangi Firebase projesine bağlanacağını bilmez.

### Adım 2: app.json'a Ekle

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/analytics",
      "@react-native-firebase/crashlytics"
    ],
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

Bu plugin'ler EAS Build sırasında `GoogleService-Info.plist` ve `google-services.json` dosyalarını native proje içine doğru konuma kopyalar, gerekli native konfigürasyonları otomatik yapar. Sen Xcode veya Android Studio'ya elle müdahale etmek zorunda kalmazsın.

---

## Firebase Analytics — Davranış İzleme

### Ekran Takibi — Kullanıcı Nerede?

Analytics'in en temel kullanımı ekran geçişlerini kayıt altına almaktır. Hangi ekranın ne kadar görüntülendiğini bilmek ürün kararları için kritiktir.

Expo Router ile otomatik ekran takibi kurulabilir:

```tsx
// app/_layout.tsx
import analytics from '@react-native-firebase/analytics';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  const pathname = usePathname();

  useEffect(() => {
    // Her rota değişiminde Firebase'e bildir
    analytics().logScreenView({
      screen_name: pathname,
      screen_class: pathname,
    });
    // logScreenView: Firebase'in özel ekran takip metodu
    // Bu log Firebase Dashboard'da "Screen views" raporunda görünür
  }, [pathname]);

  return <Stack />;
}
```

Dashboard'da şunu görürsün: "Kullanıcıların %68'i ürün listesine giriyor, %31'i ürün detayına gidiyor, %12'si ödeme sayfasına ulaşıyor, %8'i siparişi tamamlıyor." Bu **dönüşüm hunisi (funnel)**dir — nerede kullanıcı kaybettiğini gösterir.

### Custom Event — Özel Olayları Kayıt Et

Firebase'in önceden tanımlı event'leri vardır (`logPurchase`, `logAddToCart`, `logSearch`). Ama kendi olaylarını da tanımlayabilirsin:

```tsx
import analytics from '@react-native-firebase/analytics';

// Sepete ekleme — Firebase'in standart e-ticaret event'i
async function sepeteEkle(urun: Urun, adet: number) {
  await analytics().logAddToCart({
    currency: 'TRY',
    value: urun.fiyat * adet,
    items: [{
      item_id: urun.id,
      item_name: urun.baslik,
      item_category: urun.kategori,
      price: urun.fiyat,
      quantity: adet,
    }],
  });
  // logAddToCart: Firebase'in e-ticaret şeması — Google Analytics ile de uyumlu
  // Standart event kullanmak önceden hazır raporlardan yararlanmanı sağlar

  cartStore.addItem(urun, adet);
}

// Arama — kullanıcı ne arıyor?
async function aramayaGit(aramaMetni: string) {
  await analytics().logSearch({ search_term: aramaMetni });
}

// Özel event — senin tanımladığın
async function filtreUygulandi(filtreTipi: string, deger: string) {
  await analytics().logEvent('filtre_uygulandi', {
    filtre_tipi: filtreTipi,   // 'kategori', 'fiyat', 'marka'
    deger: deger,               // 'elektronik', '0-500', 'apple'
    ekran: 'urun-listesi',
  });
  // logEvent: tamamen özel event
  // Dashboard'da 'filtre_uygulandi' event'i olarak görünür
  // Hangi filtrenin daha çok kullanıldığını anlarsın
}
```

### Analytics Neden Sentry'nin Yerini Almaz?

Analytics başarılı olayları kaydeder — sepete ekleme, satın alma, arama. Sentry ise başarısız olanları — crash, hata, exception. İkisi birbirini tamamlar: Analytics ile kullanıcıların %12'sinin ödeme sayfasında takıldığını görürsün, Sentry ile bu sayfada tam olarak ne hata olduğunu anlarsın.

---

## Firebase Crashlytics — Native Crash Raporları

Crashlytics kurulumu yapıldıktan sonra native crash'ler otomatik raporlanır, ekstra kod yazman gerekmez. Ama JS hatalarını da Crashlytics'e göndermek istersen:

```tsx
import crashlytics from '@react-native-firebase/crashlytics';

// Kullanıcı bilgisini Crashlytics'e ver
// Hata raporunda kimin yaşadığını görmek için
async function kullaniciGirisYapti(kullanici: Kullanici) {
  await crashlytics().setUserId(kullanici.id);
  await crashlytics().setAttribute('email', kullanici.email);
  await crashlytics().setAttribute('abonelik', kullanici.abonelikTipi);
}

// Hata raporla
async function siparisHatasiRaporla(error: Error, siparisId: string) {
  crashlytics().setAttribute('siparis_id', siparisId);
  // Attribute: bu hatanın bağlamı — hangi sipariş sırasında oldu?

  crashlytics().recordError(error);
  // recordError: JS hatasını Crashlytics'e gönder
  // Native crash'ler otomatik gönderilir, JS hataları manuel recordError ister
}

// Log: crash öncesi iz bırak (Sentry breadcrumb gibi)
function kritikAdimBasladi(adim: string) {
  crashlytics().log(`Kritik adım başladı: ${adim}`);
  // Crash olduğunda bu loglar raporda görünür
  // "Ödeme başladı → Kart doğrulandı → [CRASH]" gibi bir iz
}
```

---

## Remote Config — Kodu Değiştirmeden Davranışı Değiştir

Remote Config, Firebase'in en güçlü ama en az bilinen özelliklerinden biridir. Temel fikir şudur: uygulamanın bazı değerleri kod içinde sabit yazmak yerine Firebase sunucusundan çek. Böylece App Store'a gitmeden bu değerleri değiştirebilirsin.

### Ne İşe Yarar?

**Feature flag:** Yeni bir özelliği sadece belirli kullanıcılara aç. "Beta kullanıcılara yeni sepet arayüzünü göster, diğerlerine eski arayüzü göster." Özellik sorunluysa tek bir tıkla kapat — yeni build gerekmez.

**A/B test:** "Yeşil buton mu daha çok tıklanıyor, turuncu buton mu?" İki grubu farklı değerlerle test et, hangisi daha iyi dönüşüm veriyorsa onu seç.

**Dinamik içerik:** "Bugünkü kampanya başlığı ne olsun?" Pazarlama ekibi Firebase Console'dan değiştirir, geliştirici müdahalesi gerekmez.

### Nasıl Çalışır? — Mekanizma

```tsx
import remoteConfig from '@react-native-firebase/remote-config';

async function remoteConfigYukle() {
  const config = remoteConfig();

  // Varsayılan değerler: Firebase'e ulaşılamazsa bunlar kullanılır
  // Bu çok önemli — offline kullanıcı veya yavaş ağ için güvenlik ağı
  await config.setDefaults({
    yeni_sepet_aktif: false,         // varsayılan: eski sepet
    anasayfa_banner_metni: 'Hoş Geldiniz',
    maksimum_sepet_adedi: 10,
  });

  // Minimum fetch interval: kaç saniyede bir Firebase'den çek?
  // Production'da 3600 (1 saat) makul — her açılışta sunucuya gitme
  // Development'ta 0 yaparsın — her seferinde taze veri
  await config.setConfigSettings({
    minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000,
  });

  // fetchAndActivate: sunucudan çek VE hemen aktive et
  // Sadece fetch etseydin: indirilir ama bir sonraki açılışa kadar beklerdi
  await config.fetchAndActivate();
}

// Değerleri kullan
function AnaSayfa() {
  const config = remoteConfig();

  // getValue: Remote Config değerini oku
  // asBoolean(), asString(), asNumber() — tip dönüşümü
  const yeniSepetAktif = config.getValue('yeni_sepet_aktif').asBoolean();
  const bannerMetni = config.getValue('anasayfa_banner_metni').asString();

  return (
    <View>
      <Text>{bannerMetni}</Text>
      {yeniSepetAktif ? <YeniSepet /> : <EskiSepet />}
    </View>
  );
}
```

### Remote Config ile Feature Flag — Gerçek Senaryo

ShopApp'e yeni bir "hızlı ödeme" özelliği ekledin. Herkese birden açmak riskli — önce küçük bir grupta test etmek istiyorsun.

Firebase Console'da:
1. `hizli_odeme_aktif` parametresi oluştur, varsayılan: `false`
2. "Koşullar" ekle: "kullanıcıların %10'u" → `true`

Artık kullanıcıların %10'u yeni özelliği görür, %90'ı eski deneyimle devam eder. Analytics'ten dönüşüm oranlarını karşılaştırırsın. İyi sonuç veriyorsa `%10 → %100` yaparsın, sorunluysa `false` değiştirir kapatırsın.

---

## Expo Managed Workflow ile Firebase Sınırlamaları

`@react-native-firebase` native kod içerdiğinden Expo Managed Workflow ile doğrudan çalışmaz — EAS Build gerektirir.

Alternatif: Firebase'in web SDK'sı (`firebase/app`, `firebase/analytics`). Bu SDK pure JavaScript olduğundan Expo Go'da çalışır, EAS Build gerekmez. Ama native özellikler (Crashlytics, tam Analytics) eksik kalır.

**Pratik karar:**
- Prototip aşaması, hız öncelikli → web SDK
- Production uygulaması, tam özellik → `@react-native-firebase` + EAS Build

---

## Screen Tracking — Expo Router ile Otomatik

Expo Router her rota değişiminde bir event fırlatır. Bunu Analytics'e bağlamak için tek bir yer yeterlidir:

```tsx
// app/_layout.tsx
import analytics from '@react-native-firebase/analytics';
import { useSegments, usePathname } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    // Segment'leri kullanarak anlamlı ekran adı oluştur
    // pathname: '/urun/abc123' yerine segments: ['urun', '[id]']
    // '[id]' daha anlamlı — her ürün ayrı satır olmaz, tek 'urun/[id]' satırı olur
    const ekranAdi = segments.join('/') || 'anasayfa';

    analytics().logScreenView({
      screen_name: ekranAdi,
      screen_class: ekranAdi,
    });
  }, [pathname]);

  return <Stack />;
}
```

Neden `segments` kullanmak daha iyi? Eğer `pathname` kullanırsan her ürün (`/urun/abc123`, `/urun/xyz456`, `/urun/def789`) ayrı bir ekran olarak sayılır. Firebase'de yüzlerce farklı ekran adı görürsün. `segments` ile `urun/[id]` tek bir ekran adı olur — tüm ürün detay ziyaretleri tek bir satırda toplanır.

---

## Özet

| Firebase Servisi | Ne Yapar | Sentry ile Farkı |
|-----------------|----------|-----------------|
| Analytics | Kullanıcı davranışı, ekran ziyaretleri, event | Sentry hataları izler, Analytics başarılı akışları |
| Crashlytics | Native crash raporları | Sentry JS hatalarında daha güçlü |
| Remote Config | Sunucudan değer çek, feature flag, A/B test | Sentry'de bu özellik yok |

---

## Kontrol Soruları

1. `logScreenView`'da `pathname` yerine `segments` kullanmak neden daha iyi Analytics verisi verir?
2. Remote Config'de `setDefaults` neden zorunludur? Firebase'e ulaşılamazsa ne olur?
3. `fetchAndActivate` ile sadece `fetch` arasındaki fark nedir? Neden ikisi ayrı işlem?
4. Feature flag ile A/B test arasındaki fark nedir? Ikisini Remote Config ile nasıl uygularsın?
5. Crashlytics native crash'leri otomatik yakaladığı hâlde neden `recordError` metodu vardır?

---

## Sonraki Gün

**Gün 51 → GitHub Actions ile CI/CD:** Her push'ta testler çalışsın, her merge'de EAS Build başlasın. `EXPO_TOKEN` nedir ve neden gereklidir, `--non-interactive` neden CI'da zorunludur, farklı branch'ler için farklı build profilleri nasıl yapılandırılır.
