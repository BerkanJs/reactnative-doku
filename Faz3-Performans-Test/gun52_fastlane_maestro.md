# Gün 52 — Fastlane ve Maestro E2E

> Bu Faz 3'ün son teknik günü. İki ayrı ama tamamlayıcı konu: Fastlane ile deployment otomasyonu ve Maestro ile gerçek cihazda uçtan uca test. Faz 3 boyunca performansı, testi, build'i ve CI/CD'yi öğrendik — bugün bu zincirine son iki halka ekleniyor.

---

## Bölüm 1: Fastlane

### Fastlane Nedir? EAS Build'dan Farkı Ne?

Fastlane, iOS ve Android için deployment süreçlerini otomatize eden bir Ruby tabanlı araçtır. Mobil geliştirme dünyasında yıllardır kullanılır — büyük şirketlerin çoğunluğu Fastlane üzerine kurulu bir pipeline'a sahiptir.

EAS Build ile karşılaştırıldığında temel fark şudur:

**EAS Build:** Expo'nun cloud altyapısında çalışır. Sen kodu push'larsın, EAS bulutta derler. Expo Managed Workflow için idealdir çünkü native projeyi (Xcode, Android Studio) sen yönetmiyorsun — Expo yönetiyor. Konfigürasyon `eas.json` ile yapılır.

**Fastlane:** Local makinende veya CI sunucunda çalışır. Native projeye doğrudan erişir (Xcode project dosyaları, Gradle dosyaları). Bu nedenle **Bare Workflow** için daha uygundur — ya da native kodun üzerinde tam kontrol istediğin durumlarda. Konfigürasyon Ruby kodu (Fastfile) ile yapılır.

Hangisi daha iyi değil — hangi proje için hangisi uygun sorusu:

| Durum | Tercih |
|-------|--------|
| Expo Managed Workflow | EAS Build |
| Bare Workflow, native modül ağır | Fastlane |
| Takım sertifika yönetimi kritik | Fastlane match |
| Hızlı başlangıç, az konfigürasyon | EAS Build |
| Büyük şirket, mevcut pipeline | Fastlane (büyük ihtimalle zaten var) |

---

### Fastfile — Lane Nedir?

Fastlane'in kalbi `Fastfile` dosyasıdır. Her **lane** bir görev zinciridir — sırayla çalıştırılan adımlar topluluğu.

```ruby
# ios/fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "TestFlight'a gönder"
  lane :beta do
    # Bu lane şu sırayla çalışır:
    # 1. Sertifikaları al
    # 2. Build al
    # 3. TestFlight'a yükle

    match(type: "appstore")
    gym(scheme: "ShopApp", configuration: "Release")
    pilot(skip_waiting_for_build_processing: true)
  end

  desc "Sadece build al"
  lane :build_only do
    match(type: "appstore")
    gym(scheme: "ShopApp", configuration: "Release")
  end
end

platform :android do
  desc "Play Store'a gönder"
  lane :deploy do
    gradle(task: "bundle", build_type: "Release")
    supply(track: "internal")
  end
end
```

Lane'leri terminalden çalıştırırsın:

```bash
fastlane ios beta          # iOS TestFlight lane'ini çalıştır
fastlane android deploy    # Android deploy lane'ini çalıştır
```

---

### fastlane match — Takım Sertifika Yönetimi

iOS sertifikasyon sistemi, tek kişilik projede bile karmaşıktır. Birden fazla geliştirici olan bir takımda kaos olur:

- Her geliştirici kendi sertifikasını üretirse: sertifikalar uyuşmaz, build'ler çöker
- Sertifika bir makinede üretildiyse başka makinede build alınamaz
- Yeni birisi takıma katılırsa sertifikaları elle paylaşmak güvenli değil

`fastlane match` bunu çözer. Çalışma mantığı şudur:

1. Sertifikalar ve Provisioning Profile'lar **şifreli** olarak özel bir Git repo'sunda saklanır (ya da S3, Google Cloud)
2. Her geliştirici `fastlane match` çalıştırdığında bu repo'dan sertifikaları çeker
3. Sertifikalar tüm takımda aynıdır — herkes aynı sertifikayla build alır
4. Yeni geliştirici katılınca: `fastlane match` çalıştır, dakikalar içinde hazır

```bash
# İlk kurulum — sertifikaları üret ve repo'ya kaydet
fastlane match init
fastlane match appstore   # App Store dağıtımı için
fastlane match development # Geliştirme için

# Yeni geliştiricinin yapacağı — mevcut sertifikaları çek
fastlane match appstore --readonly
# --readonly: sadece oku, yeni sertifika üretme
```

Fastfile içinde:

```ruby
lane :beta do
  match(type: "appstore")
  # Bu satır: Git repo'dan sertifikaları çek, yerel makinene kur
  # Bunu yazmasaydık: her geliştirici kendi sertifikasını manuel kurması gerekirdi
  # CI'da: her build sanal makineye temiz kurulum — match olmadan imkansız
  gym(...)
  pilot(...)
end
```

---

### fastlane'in Araçları — Her Birinin Görevi

Fastlane'de her iş için ayrı bir "action" vardır. Bunlara **action** veya **tool** denir:

**`gym`** — iOS build alma (IPA üretme)

Xcode'un `xcodebuild` komutunun üzerinde bir soyutlama. Parametreleri otomatik ayarlar, hata mesajlarını daha anlaşılır gösterir.

```ruby
gym(
  scheme: "ShopApp",
  configuration: "Release",
  output_directory: "./build",
  output_name: "ShopApp.ipa"
)
```

**`pilot`** — iOS TestFlight'a yükleme

Apple'ın TestFlight API'sini kullanır. Üretilen IPA'yı alır, TestFlight'a yükler, isteğe göre test kullanıcılarını bilgilendirir.

```ruby
pilot(
  skip_waiting_for_build_processing: true,
  # Apple build'i işlerken beklemeden devam et
  # false yapsan: Apple işlemi bitene kadar (10-20 dk) terminal bekler
  changelog: "Yeni ödeme akışı eklendi"
)
```

**`supply`** — Android Play Store'a yükleme

Google Play API'sini kullanır. AAB dosyasını alır, belirtilen track'e (internal, alpha, beta, production) yükler.

```ruby
supply(
  track: "internal",         # internal → alpha → beta → production
  aab: "./app/build/outputs/bundle/release/app-release.aab"
)
```

**`deliver`** — iOS App Store metadata ile birlikte gönderme

Sadece binary değil, uygulama açıklaması, ekran görüntüleri, fiyatlandırma gibi metadata'yı da App Store Connect'e gönderir. Tam release yönetimi için kullanılır.

---

## Bölüm 2: Maestro E2E Test

### E2E Test Nedir ve Neden Gerekli?

Unit test: tek bir fonksiyonu test et.
Component test (RNTL): tek bir bileşeni test et.
E2E (End-to-End) test: uygulamanın tamamını, gerçek bir kullanıcı gibi test et.

E2E test şunu sorar: "Kullanıcı uygulamayı açar, email ve şifresini girer, Giriş Yap butonuna basar — gerçekten giriş yapabiliyor mu?" Bu soruyu unit test ya da component test cevaplayamaz çünkü her biri sadece kendi parçasını görür. E2E tüm zinciri çalıştırır: navigation, state management, API çağrısı, UI güncellemesi — hepsi birlikte.

### Maestro Neden Detox'tan Daha Kolay?

React Native'de uzun süre **Detox** E2E test için standart araçtı. Ama Detox'un ciddi bir problemi var: kurulumu ve bakımı çok ağır.

Detox'ta bir test yazmak için:
- iOS için Detox konfigürasyonu (Xcode entegrasyonu)
- Android için özel Gradle konfigürasyonu
- Test cihazı/simülatör yönetimi
- Özel element seçiciler (testID prop'ları her component'e eklenmeli)
- Kurulum süresi: 1-2 saat, bazen daha fazla

Aynı testi **Maestro** ile yazmak için:
- Kurulum: `brew install maestro` (Mac) ya da tek komut
- Test: YAML dosyası
- Element seçimi: ekranda görünen metin, accessibility label — testID gerekmez
- Kurulum süresi: 5 dakika

Maestro'nun "flaky test" (bazen geçen bazen geçmeyen test) problemi de daha azdır. Bunun sebebi şudur: Maestro görsel element'i ekranda görene kadar bekler. Detox'ta zamanlama sorunları nedeniyle element henüz render olmadan assertion yapılabilir.

---

### Maestro Test Yaz — YAML Syntax

Maestro testleri YAML formatında yazılır. Her komut ekranda bir şey yapar ya da kontrol eder.

```yaml
# e2e/login_flow.yaml
appId: com.sirketadi.shopapp
# appId: hangi uygulamayı test edeceksin — bundleIdentifier ile aynı
---
# Uygulamayı başlat
- launchApp

# Email alanına tıkla
# tapOn: ekranda bu metni içeren ya da bu label'a sahip elementi bul ve dokun
- tapOn: "Email"

# Klavyeden metin gir
- inputText: "test@shopapp.com"

# Şifre alanına geç
- tapOn: "Şifre"
- inputText: "test123"

# Giriş butonuna bas
- tapOn: "Giriş Yap"

# Sonucu doğrula — bu element görünüyor mu?
- assertVisible: "Anasayfa"
# assertVisible: bu metin ya da bu label ekranda görünmüyorsa test başarısız

# Giriş formu artık görünmemeli
- assertNotVisible: "Giriş Yap"
# assertNotVisible: bu hâlâ ekrandaysa test başarısız
```

Test çalıştırmak:

```bash
maestro test e2e/login_flow.yaml
```

Maestro bağlı cihazı veya simülatörü/emülatörü bulur, uygulamayı başlatır, adımları çalıştırır.

---

### Daha Karmaşık Akış: Sepete Ürün Ekle

```yaml
# e2e/sepet_flow.yaml
appId: com.sirketadi.shopapp
---
- launchApp

# Önce giriş yap (önceki flow gibi)
- tapOn: "Email"
- inputText: "test@shopapp.com"
- tapOn: "Şifre"
- inputText: "test123"
- tapOn: "Giriş Yap"
- assertVisible: "Anasayfa"

# İlk ürüne tıkla
- tapOn:
    id: "urun-listesi-item-0"
    # id: accessibilityLabel ya da testID ile eşleşir
    # Metin yerine ID kullanmak: ürün ismi değişse test bozulmaz

# Ürün detay sayfasında "Sepete Ekle" butonuna bas
- tapOn: "Sepete Ekle"

# Başarı mesajı görünmeli
- assertVisible: "Ürün sepete eklendi"

# Sepet ikonuna git
- tapOn:
    id: "sepet-tab"

# Sepette ürün var mı?
- assertVisible: "1 ürün"
```

---

### runFlow ile Ortak Adımları Tekrar Kullanma

Her testte login adımlarını tekrar yazmak yerine ayrı bir flow dosyası oluşturabilir ve çağırabilirsin:

```yaml
# e2e/helpers/login.yaml
- tapOn: "Email"
- inputText: "test@shopapp.com"
- tapOn: "Şifre"
- inputText: "test123"
- tapOn: "Giriş Yap"
- assertVisible: "Anasayfa"
```

```yaml
# e2e/sepet_flow.yaml
appId: com.sirketadi.shopapp
---
- launchApp
- runFlow: helpers/login.yaml
  # runFlow: başka bir flow dosyasını bu noktaya dahil et
  # Bunu yazmasaydık: login adımlarını her test dosyasında tekrar yazardık

- tapOn: "Sepete Ekle"
- assertVisible: "Ürün sepete eklendi"
```

---

### CI'da Maestro — Simulator Kullan

E2E testleri CI'da çalıştırmak için fiziksel cihaz gerekmez — iOS Simulator veya Android Emulator yeterlidir.

GitHub Actions'da:

```yaml
jobs:
  e2e:
    runs-on: macos-latest   # iOS Simulator için macOS gerekli
    steps:
      - uses: actions/checkout@v4

      - name: Maestro Kur
        run: curl -Ls "https://get.maestro.mobile.dev" | bash

      - name: iOS Simulator Başlat
        run: |
          xcrun simctl boot "iPhone 15"
          open -a Simulator

      - name: Uygulamayı Simulator'a Yükle
        run: |
          # Preview build ya da debug build simulator'a yüklenir
          xcrun simctl install booted ./build/ShopApp.app

      - name: E2E Testleri Çalıştır
        run: ~/.maestro/bin/maestro test e2e/login_flow.yaml
```

Android emülatör için: `runs-on: ubuntu-latest` yeterlidir, Android emülatör Linux'ta çalışır. iOS Simulator ise sadece macOS'ta çalışır — bu nedenle iOS E2E testleri `macos-latest` runner gerektirir ve daha pahalıdır.

---

### Maestro vs Detox — Özet Karşılaştırma

| | Maestro | Detox |
|--|---------|-------|
| Kurulum süresi | ~5 dakika | 1-2 saat |
| Test dili | YAML | JavaScript |
| Element seçimi | Görünen metin, label | testID (her component'e eklenmeli) |
| Flaky test | Az | Daha fazla (zamanlama sorunları) |
| CI entegrasyonu | Kolay | Karmaşık |
| Öğrenme eğrisi | Düz | Dik |
| Esneklik | Orta | Yüksek |
| Kullanım alanı | Login flow, kritik akışlar | Kapsamlı test süitleri |

---

## Özet

| Konu | Detay |
|------|-------|
| Fastlane | Deployment otomasyon aracı, Ruby tabanlı, Bare Workflow için ideal |
| `fastlane match` | Takım sertifikalarını Git'te şifreli saklar, herkes aynı sertifikayla çalışır |
| `gym` | iOS IPA build |
| `pilot` | TestFlight'a yükleme |
| `supply` | Android Play Store'a yükleme |
| Maestro | YAML tabanlı E2E test, Detox'tan çok daha kolay kurulum |
| `assertVisible` | Bu element ekranda görünmeli, yoksa test başarısız |
| `runFlow` | Ortak adımları ayrı dosyada tut, tekrar kullan |

---

## Kontrol Soruları

1. `fastlane match` olmadan takımda sertifika yönetimi nasıl yapılır? Sorunları neler?
2. Maestro'nun element bulmak için testID gerektirmemesi pratikte ne fark yaratır? Dezavantajı var mı?
3. E2E testlerinde "flaky" test neden oluşur? Maestro bunu neden Detox'tan daha iyi çözer?
4. `runFlow` ile ortak adımları ayırmak neden önemli? Bunu yapmadan bakım nasıl zorlaşır?
5. iOS E2E testleri CI'da `macos-latest` runner gerektiriyor. Bu neden önemli ve maliyeti nasıl etkiler?

---

## Sonraki Gün

**Gün 53 — Hafta 8 Özeti** (atlanabilir) — ardından **Faz 4 başlıyor:** ShopApp'in tamamı, uçtan uca, tüm öğrenilenlerin uygulandığı final proje.
