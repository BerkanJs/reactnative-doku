# Gün 51 — CI/CD: GitHub Actions ile Otomatik Build

> Şimdiye kadar her şeyi elle yaptık: testleri çalıştır, lint'i kontrol et, EAS Build başlat. Bir ekipte çalışırken birisi bu adımları atlarsa bozuk kod production'a gider. CI/CD bu problemi çözer — her push'ta, her PR'da bu adımlar otomatik çalışır, insan unutkanlığına yer kalmaz. Bugün bu sistemin nasıl çalıştığını ve neden her adımın sırayla yapılması gerektiğini öğreneceğiz.

---

## CI/CD Nedir? — Kavramları Ayıralım

**CI (Continuous Integration — Sürekli Entegrasyon):** Ekipteki herkes kodu ortak dalda birleştirirken otomatik testler ve kontroller çalışır. "Bu değişiklik mevcut kodu bozmadı mı?" sorusunun otomatik cevabı.

**CD (Continuous Delivery — Sürekli Teslimat):** CI başarılıysa uygulama otomatik olarak bir ortama teslim edilir. Mobil geliştirmede bu genellikle "EAS Build başlat" ve "test grubuna dağıt" anlamına gelir.

Web'de CD oldukça doğrudan: testler geçtiyse Vercel otomatik deploy eder. Mobilde App Store review süreci olduğundan "otomatik production deploy" genellikle mümkün değil — ama build'i otomatik hazırlamak ve App Store'a göndermek mümkündür.

---

## GitHub Actions Nasıl Çalışır? — Mekanizma

GitHub Actions, GitHub'ın kendi CI/CD platformudur. `.github/workflows/` klasörüne YAML dosyası yazarsın, GitHub belirli olaylar (push, PR açılması, merge) gerçekleştiğinde bu dosyayı okur ve çalıştırır.

Her workflow dosyası şu yapıdan oluşur:

```
Tetikleyici (trigger): Ne olduğunda çalışsın?
     ↓
Job'lar: Paralel ya da sıralı çalışacak görev grupları
     ↓
Step'ler: Her job içindeki tek tek komutlar
```

Çalışma ortamı: GitHub'ın sunucuları (runner). `ubuntu-latest` yazan yerlerde Ubuntu Linux çalışır. Senin bilgisayarın değil — tamamen temiz bir sanal makine. Her çalışmada sıfırdan başlar.

---

## EXPO_TOKEN — Neden Gerekli?

EAS Build başlatmak için Expo hesabına giriş yapmak gerekir. Normal kullanımda terminalde `eas login` yaparsın — kullanıcı adı ve şifre girersin. CI ortamında interaktif giriş mümkün değil; kimse terminale bakıp şifre giremez.

Bunun çözümü token tabanlı kimlik doğrulamadır. Expo hesabından bir Personal Access Token üretirsin. Bu token "benim adıma işlem yap" iznini bir string olarak temsil eder.

```
expo.dev → Hesap Ayarları → Access Tokens → "Create Token"
```

Bu token'ı GitHub repository'sine **secret** olarak eklersin:

```
GitHub Repo → Settings → Secrets and variables → Actions → New repository secret
Name: EXPO_TOKEN
Value: expo_xxxxxxxxxxxx...
```

Secret olarak eklenince GitHub bu değeri logda göstermez, başka repo'lar erişemez. Workflow içinde `${{ secrets.EXPO_TOKEN }}` ile kullanırsın.

---

## --non-interactive — Neden CI'da Zorunlu?

`eas build` komutunu normal çalıştırdığında bazen soru sorar: "iOS sertifikasını otomatik oluşturayım mı?", "Mevcut keystore'u kullanayım mı?" Bunlar interaktif prompt'lardır — cevap bekler.

CI ortamında kimse bu soruları cevaplayamaz. Komut sonsuz bekler, timeout olur, workflow başarısız sayılır.

`--non-interactive` flag'i bu prompt'ların tamamını bastırır. EAS varsayılan cevapları kullanır ya da gerekli bilgileri `eas.json` ve ortam değişkenlerinden okur. CI'da bu flag olmadan hiçbir EAS komutu güvenilir çalışmaz.

---

## Temel Workflow: Test → Lint → Build

```yaml
# .github/workflows/ci.yml
name: CI

# Ne zaman çalışsın?
on:
  push:
    branches: [main, develop]   # main veya develop'a push gelince
  pull_request:
    branches: [main]            # main'e PR açılınca

jobs:
  test:
    name: Test ve Lint
    runs-on: ubuntu-latest      # Ubuntu Linux sanal makinesi

    steps:
      # 1. Repo kodunu sanal makineye indir
      - name: Kodu İndir
        uses: actions/checkout@v4
        # 'uses': GitHub'ın hazır action'ları — tekerleği yeniden icat etme

      # 2. Node.js kur
      - name: Node.js Kur
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          # cache: 'npm' → node_modules'ü cache'le, her seferinde npm install yapma
          # Bu olmadan: her çalışmada 500+ paket indirilir, 2-3 dakika kaybedilir

      # 3. Bağımlılıkları yükle
      - name: Bağımlılıkları Yükle
        run: npm ci
        # npm ci vs npm install:
        # npm install: package.json'a göre günceller
        # npm ci: package-lock.json'ı birebir yükler — CI'da deterministik olması şart
        # Deterministik: bugün çalıştırdığında ne yüklüyorsa yarın da aynısı

      # 4. TypeScript tip kontrolü
      - name: TypeScript Kontrol
        run: npx tsc --noEmit
        # --noEmit: tip kontrol et ama dosya üretme
        # Eğer tip hatası varsa bu adım başarısız olur, workflow durur

      # 5. ESLint
      - name: Lint
        run: npm run lint
        # Kod stili ve olası hatalar — tanımlanmamış değişken, unused import vb.

      # 6. Testler
      - name: Testler
        run: npm test -- --watchAll=false --passWithNoTests
        # --watchAll=false: CI'da watch mode istemiyoruz, bir kez çalış çık
        # --passWithNoTests: henüz test yazılmamışsa başarısız sayılmasın
```

---

## Production Build Workflow — main'e Merge Sonrası

Test ve lint ayrı bir workflow'da çalışır. Build ise sadece `main`'e merge sonrasında tetiklenir — her PR'da build çalıştırmak pahalı ve gereksizdir.

```yaml
# .github/workflows/build.yml
name: EAS Build

on:
  push:
    branches: [main]    # Sadece main'e push gelince — PR merge'i bunu tetikler

jobs:
  build:
    name: EAS Production Build
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      # Expo'nun resmi GitHub Action'ı — EAS CLI'ı kurar ve auth yapar
      - name: Expo Kurulum
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
          # EXPO_TOKEN: az önce eklediğimiz secret
          # Bu action EXPO_TOKEN ile EAS CLI'ı authenticate eder
          # Bundan sonra 'eas' komutları sanki 'eas login' yapılmış gibi çalışır

      # EAS Build başlat
      - name: EAS Build
        run: eas build --platform all --profile production --non-interactive
        # --platform all: iOS ve Android aynı anda
        # --profile production: eas.json'daki production profili
        # --non-interactive: CI'da prompt yok
        # Bu komut build'i kuyruğa sokar ve takip eder
        # Build EAS cloud'da çalışır — bu workflow biter ama build devam eder
```

---

## Branch Stratejisi — Hangi Branch Neyi Tetikler?

Gerçek projelerde farklı branch'ler farklı eylemleri tetikler:

```yaml
on:
  push:
    branches:
      - main        # Production build
      - develop     # Staging build
  pull_request:
    branches:
      - main        # Sadece test + lint, build yok
```

```yaml
jobs:
  build:
    steps:
      - name: Branch Profiline Göre Build
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            eas build --profile production --non-interactive
          else
            eas build --profile preview --non-interactive
          fi
          # main → production profili (App Store binary)
          # develop → preview profili (QA ekibine dağıtım)
```

Bu yapı şunu sağlar:
- Her PR'da: testler ve lint çalışır, PR açıkken bu kontroller geçmeden merge edilemez
- `develop`'a merge: preview build oluşur, QA ekibine gönderilir
- `main`'e merge: production build oluşur, App Store'a gönderilmeye hazır

---

## Test + Lint Geçmeden Merge Edilemesin — Branch Protection

Workflow yazmak yeterli değil. Geliştiriciler bunu bypass edebilir. GitHub'da "branch protection rule" ile bunu zorunlu hale getirirsin:

```
GitHub Repo → Settings → Branches → Add branch protection rule
Branch name pattern: main
✅ Require status checks to pass before merging
  → Status checks: "Test ve Lint" (workflow job adı)
✅ Require branches to be up to date before merging
```

Artık CI başarısız olan bir PR merge edilemez — GitHub butonu kilitler.

---

## Ortam Değişkenleri — API Key'leri Güvenli Tut

Testlerde gerçek API URL'leri veya key'ler gerekiyorsa bunları da secret olarak eklersin:

```yaml
- name: Testler
  run: npm test -- --watchAll=false
  env:
    API_URL: ${{ secrets.API_URL }}
    SENTRY_DSN: ${{ secrets.SENTRY_DSN }}
    # Bu değerler test süresince ortam değişkeni olarak erişilebilir
    # Logda asla görünmez
```

`app.config.js`'de (EAS Build için):

```js
export default {
  expo: {
    extra: {
      apiUrl: process.env.API_URL,
      sentryDsn: process.env.SENTRY_DSN,
    },
  },
};
```

---

## Önbellek Stratejisi — Workflow'ları Hızlandır

Her çalışmada `npm ci` yüzlerce paketi indirir. Cache kullanmak bunu 2-3 dakikadan 20-30 saniyeye indirir:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'
    # cache: 'npm' → package-lock.json hash'ini anahtar olarak kullanır
    # package-lock.json değişmemişse node_modules cache'den gelir
    # package-lock.json değişmişse (yeni paket eklenince) cache atlanır, yeniden yüklenir
```

Bu cache satırı olmadan:
- Her workflow çalışması: ~3 dakika sadece npm install için
- Günde 20 push: 60 dakika boşa harcanan süre

---

## Tam Resim — ShopApp CI/CD Akışı

```
Geliştirici feature branch'de çalışır
         ↓
PR açar → main'e
         ↓
GitHub Actions tetiklenir:
  ✅ TypeScript tip kontrolü
  ✅ ESLint
  ✅ Jest testleri
         ↓
Hepsi geçtiyse: Merge butonu aktif
         ↓
main'e merge
         ↓
GitHub Actions tetiklenir:
  ✅ Test + Lint (tekrar — güvence için)
  ✅ EAS Build (production profili)
         ↓
Build tamamlanınca:
  → iOS IPA: App Store Connect'e gönder
  → Android AAB: Play Console'a gönder
         ↓
App Store review (1-3 gün)
         ↓
Kullanıcılara ulaşır
```

---

## Özet

| Kavram | Açıklama |
|--------|----------|
| CI | Her push/PR'da otomatik test + lint |
| CD | Başarılı CI sonrası otomatik build + dağıtım |
| EXPO_TOKEN | EAS CLI kimlik doğrulaması için secret token |
| --non-interactive | CI'da interaktif prompt'ları bastır |
| npm ci | package-lock.json'ı birebir yükle — deterministik |
| Branch protection | CI geçmeden merge edilemesin kuralı |
| cache: 'npm' | node_modules'ü cache'le — hız |

---

## Kontrol Soruları

1. `npm install` yerine `npm ci` kullanmanın CI'da neden kritik olduğunu açıkla. "Deterministik" ne anlama geliyor?
2. `EXPO_TOKEN` neden kod içinde değil, GitHub Secret'ta saklanır? Koda yazılsaydı ne olurdu?
3. `--non-interactive` olmadan EAS Build CI'da neden sonsuz bekler?
4. Branch protection rule olmazsa ne olur? Workflow yazmak tek başına yeterli midir?
5. PR'da build çalıştırmak yerine sadece test + lint çalıştırmak neden daha mantıklı?

---

## Sonraki Gün

**Gün 52 → Fastlane ve Maestro E2E:** Fastlane nedir, EAS Build'dan farkı nedir, `match` ile takım sertifika yönetimi nasıl çalışır. Maestro ile gerçek cihazda E2E test — kullanıcı akışını script ile çalıştır.
