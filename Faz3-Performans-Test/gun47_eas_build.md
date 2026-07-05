# Gün 47 — EAS Build: App Store ve Play Store'a Hazırlık

> Web'de deploy etmek basittir: kodu push la, Vercel saniyeler içinde yayınlar. Mobilde bu süreç çok daha uzun ve karmaşık bir sistemdir. Bugün bu sistemi adım adım anlayacağız — hangi dosya ne işe yarar, iOS sertifikası neden bu kadar kritik, Android Keystore'u neden asla kaybetmemelisin.

---

## Önce Büyük Resim: Web Deploy ile Mobil Deploy Farkı

Web'de deploy ettiğinde şunlar olur: kod sunucuya gider, tarayıcı sunucudan HTML/JS/CSS çeker, her seferinde taze alır. Kullanıcı hiçbir şey yüklemez, sen güncelleme yapınca herkes anında güncellemeyi görür.

Mobilde bu tamamen farklıdır. Kullanıcı uygulamayı cihazına **yükler.** Yükleme bir kez olur. Güncelleme istiyorsan yeni bir versiyon hazırlayıp App Store'a gönderirsin, Apple/Google inceler (1-3 gün), onaylarsa kullanıcılara ulaşır. Kullanıcı da güncellemeyi manuel onaylamak zorunda kalabilir.

Bu döngü "build → sign → review → deploy" olarak özetlenir:

```
Kod yaz
  ↓
EAS Build (cloud'da derleme)
  ↓
İmzala (iOS: Certificate, Android: Keystore)
  ↓
App Store / Play Store'a gönder
  ↓
Review (Apple 1-3 gün, Google 1-2 gün)
  ↓
Kullanıcıya ulaşır
```

---

## EAS Nedir? — Expo Application Services

EAS, Expo'nun cloud tabanlı build, dağıtım ve güncelleme servisidir. Üç ana hizmeti vardır:

**EAS Build:** Uygulamayı cloud'da derler. Senin bilgisayarında Xcode veya Android Studio kurulu olmak zorunda değildir. "Ben React Native kodumu yazdım, geri kalanı siz yapın" diyebilirsin.

**EAS Submit:** Derlenen uygulamayı App Store Connect veya Play Console'a otomatik gönderir.

**EAS Update:** App Store'a gitmeden JS bundle'ını günceller (bunu yarın Gün 48'de göreceğiz).

```bash
npm install -g eas-cli
eas login        # Expo hesabınla giriş yap
eas build --platform ios      # iOS için build başlat
eas build --platform android  # Android için build başlat
eas build --platform all      # İkisi aynı anda
```

---

## app.json — Uygulamanın Kimliği

`app.json`, uygulamanın tüm metadata'sını içerir. Bunu yanlış ayarlamak ciddi sonuçlar doğurabilir — bazı değerler bir kez set edilince **değiştirilemez.**

```json
{
  "expo": {
    "name": "ShopApp",
    "slug": "shopapp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "com.sirketadi.shopapp",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.sirketadi.shopapp",
      "versionCode": 1
    }
  }
}
```

### bundleIdentifier ve package — Neden Değiştirilemez?

`bundleIdentifier` (iOS) ve `package` (Android), App Store ve Play Store'un uygulamayı tanıdığı **benzersiz kimliğidir.** Genellikle `com.sirketadi.uygulamaadi` formatında reverse domain notation kullanılır.

Neden değiştirilemez? Çünkü App Store'da bu ID'ye bağlı veriler var: kullanıcı yorumları, indirme sayıları, in-app purchase'lar, push notification token'ları. ID değiştirilirse App Store bunu tamamen farklı bir uygulama olarak görür — mevcut kullanıcılar güncelleme alamaz, tüm geçmiş sıfırlanır.

Bu yüzden `com.berkan.testapp` gibi geçici isimler kullanma. Baştan doğru belirle.

### version vs buildNumber / versionCode — Fark Nedir?

**`version`** ("1.0.0"): Kullanıcının App Store'da gördüğü versiyon numarası. Semantic versioning: major.minor.patch.

**`buildNumber`** (iOS) / `versionCode`** (Android)**: Her upload'da artan sayı. Kullanıcı görmez, App Store/Play Store görür. Aynı version numarasında birden fazla build upload edebilmek için vardır. Örneğin "1.0.0" versiyonunu App Store'a gönderdinde bir sorun buldun, düzelttip tekrar göndermek istiyorsun — version aynı kalır ama buildNumber artırılır.

---

## eas.json — Build Profilleri

`eas.json` farklı amaçlar için farklı build konfigürasyonları tanımlar.

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### development profili — Geliştirme Sırasında

`developmentClient: true` demek, bu build içine Expo Go yerine kendi geliştirme client'ını koy. Neden? Expo Go, önceden derlenmiş native modüllerin sınırlı bir setiyle gelir — kendi native modülünü eklediğinde Expo Go içinde çalışmaz. `developmentClient: true` ile tam kontrolün sende olan bir dev uygulaması oluşturulur.

`distribution: internal` demek, bu build'i App Store'a değil, doğrudan test cihazlarına dağıt.

### preview profili — Test Dağıtımı

Müşteriye ya da ekibe test ettirmek için. App Store'a değil — URL üzerinden direkt yüklenebilir (iOS'ta TestFlight, Android'de APK).

`ios: { simulator: true }` ile gerçek telefon yerine Mac'teki iOS Simulator'da çalıştırılabilecek bir build üretilir. Gerçek cihaz yoksa test için kullanışlı.

### production profili — Son Kullanıcıya

`autoIncrement: true` demek, her production build'de `buildNumber` / `versionCode`'u otomatik artır. Manuel unutma riski ortadan kalkar.

---

## iOS Sertifikası — Neden Bu Kadar Karmaşık?

iOS'ta uygulamanı cihazda çalıştırabilmek için Apple'ın imzalaması gerekir. Bu Apple'ın güvenlik modeli — imzasız hiçbir uygulama çalışmaz. İmzalama iki parçadan oluşur:

### Signing Certificate (İmzalama Sertifikası)

Bu, "bu kodu ben yazdım ve güvenilir bir geliştirici olduğumu Apple onayladı" demektir. Apple Developer hesabından üretilir ($99/yıl). Özel anahtarı (private key) yalnızca sende vardır — kaybedersen yenisini üretmek zorundasın ama mevcut uygulamaların güncellenmesi riske girebilir.

### Provisioning Profile (Hazırlık Profili)

"Bu sertifikaya sahip geliştirici, bu bundle ID'ye sahip uygulamayı, bu cihazlarda çalıştırabilir" bilgisini içerir. Development, Ad Hoc ve App Store olmak üzere üç tipi vardır.

EAS Build, bu iki şeyi senin yerine yönetebilir:

```bash
eas credentials
```

Bu komut: "Apple Developer hesabına bağlanayım, gerekli sertifika ve profilleri otomatik oluşturayım mı?" diye sorar. "Evet" dersen EAS her şeyi halleder. Büyük şirketlerde güvenlik politikaları nedeniyle bu yapılmayabilir — `eas credentials` ile manuel yönetim de mümkündür.

---

## Android Keystore — Bir Kez Üret, Ömür Boyu Sakla

Android'de imzalama iOS'tan daha basit görünür ama daha kritik bir noktası vardır: **Keystore.**

Keystore, uygulamayı imzalamak için kullanılan şifreli bir dosyadır. Play Store, uygulamanın her güncellemesinin aynı Keystore ile imzalandığını doğrular. Farklı Keystore ile imzalanan bir güncelleme reddedilir.

**Keystore'u kaybedersen:** Play Store'a yeni güncelleme gönderemezsin. Mevcut kullanıcılar çıkmaza girer — yeni sürüm alamazlar. Uygulamayı tamamen silip yeni bir ID ile sıfırdan yayınlamak zorundasın — tüm yorumlar, indirmeler sıfırlanır.

EAS Build Keystore'u otomatik oluşturur ve güvenli şekilde saklar. Ama bir kopyasını kendin de indirip şifresiyle birlikte güvenli bir yerde (şifreli bir depolama, şirket password manager'ı) saklamalısın.

```bash
eas credentials --platform android
# Mevcut keystore'u indir, yeni oluştur, bilgilerini gör
```

---

## Info.plist ve AndroidManifest.xml — İzin Açıklamaları

Kamera, konum, mikrofon gibi native özellikleri kullanıyorsan bunları önceden beyan etmek zorundasın. iOS ve Android farklı dosyalarda yapılır.

iOS'ta `Info.plist` içine açıklama yazılır. EAS Build bunu `app.json` üzerinden ayarlayabilirsin:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Profil fotoğrafı çekmek için kameraya erişim gerekiyor.",
        "NSPhotoLibraryUsageDescription": "Galeriden fotoğraf seçmek için erişim gerekiyor.",
        "NSLocationWhenInUseUsageDescription": "Yakınımdaki mağazaları görmek için konum gerekiyor."
      }
    }
  }
}
```

Bu açıklamalar kullanıcıya izin sorulduğunda gösterilir. Genel "Bu uygulama kameraya erişmek istiyor" yerine somut bir neden yazmak zorundasın — Apple bu açıklamaları review sırasında inceler ve yetersiz bulursa uygulamayı reddedebilir.

Android'de `AndroidManifest.xml` içine izinler eklenir. `expo-camera`, `expo-location` gibi kütüphaneler bunu genellikle otomatik ekler, ama kontrol etmek gerekebilir.

---

## İlk Build — Adım Adım

```bash
# 1. EAS CLI'ı kur
npm install -g eas-cli

# 2. Expo hesabına giriş yap
eas login

# 3. Projeyi EAS'a bağla (eas.json oluşturur)
eas build:configure

# 4. Android için production build
eas build --platform android --profile production

# 5. iOS için production build
eas build --platform ios --profile production
```

Build başladığında EAS cloud'da bir kuyruk oluşturur. Bekleme süresine göre (ücretsiz planda kuyruk uzun olabilir) 10-30 dakika sürer. Bitince dashboard'dan veya terminale gelen URL'den APK/IPA dosyasını indirebilirsin.

```bash
# Tamamlanan build'i mağazaya gönder
eas submit --platform android --latest
eas submit --platform ios --latest
```

---

## Özet: Web Deploy vs Mobil Deploy

| | Web (Vercel) | Mobil (EAS) |
|--|-------------|-------------|
| Süre | Saniyeler | Saatler (build) + günler (review) |
| Sertifika | HTTPS otomatik | iOS: Certificate + Profile, Android: Keystore |
| Versiyon | İstediğin zaman | Her sürüm App Store'da kayıt altında |
| Geri alma | Anlık rollback | OTA ile JS (yarın), native değişiklik için yeni build |
| Kimlik | Domain adı | bundleIdentifier — değiştirilemez |

---

## Kontrol Soruları

1. `bundleIdentifier` neden değiştirilemez? Değiştirmeye çalışırsan ne olur?
2. Android Keystore'u kaybedersen uygulamanı nasıl kurtarabilirsin? Kurtarabilir misin?
3. `version: "1.0.0"` ile `buildNumber: "3"` arasındaki fark ne? İkisi hangi durumda değiştirilir?
4. `developmentClient: true` neden gerekli? Expo Go yeterli değil mi?
5. iOS'ta `NSCameraUsageDescription` yazmadan kamera kullanmaya kalkarsan ne olur — Apple mi reddeder, kullanıcı mı görür, uygulama mı çöker?

---

## Sonraki Gün

**Gün 48 → OTA Updates:** JS bundle'ını App Store'a gitmeden güncellemek mümkündür — ama her şey değil. OTA tam olarak neyi değiştirebilir neyi değiştiremez, zorunlu güncelleme nasıl uygulanır, kanal (channel) sistemi nasıl çalışır.
