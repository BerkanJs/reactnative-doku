# Gün 1 — React Native Nedir? Nasıl Çalışır? Bridge mi JSI mi?

> **Faz:** 1 — Temeller | **Hafta:** 1 | **Gün:** 1 / 60
>
> **Bugünün Hedefi:** React Native'in içinde neler olduğunu gerçekten anlamak.
> Ortamı kurmak, ilk uygulamayı telefonda görmek.

---

## 1. Önce Şunu Anla: Telefon Uygulaması Nasıl Çalışır?

Bir iPhone uygulaması yazmak için normalde **Swift** veya **Objective-C** kullanırsın.
Bir Android uygulaması yazmak için normalde **Kotlin** veya **Java** kullanırsın.

Yani normalde **iki ayrı ekip, iki ayrı dil, iki ayrı kod tabanı** gerekir.

```
iOS App    →  Swift/Objective-C ile yazılır  →  App Store
Android App →  Kotlin/Java ile yazılır        →  Play Store
```

Bu çok pahalı ve zahmetlidir. Her özelliği iki kez yazmak gerekir.

**React Native'in çözdüğü problem tam olarak budur:**

```
Tek kod tabanı (JavaScript/TypeScript)
         │
         ├──▶  iOS uygulaması  →  App Store
         │
         └──▶  Android uygulaması  →  Play Store
```

Bir kez yazıyorsun, iki platformda çalışıyor. Ama **nasıl?**

---

## 2. "Tek Kod İki Platform" Nasıl Mümkün?

Şöyle düşün: sen bir restoran sahibisin ve menüde "burger" yazıyor.
- Türk müşteri gelir → garson Türkçe anlatır
- Japon müşteri gelir → garson Japonca anlatır

**Menü (JavaScript kodu) aynı. Ama müşteriye (platforma) göre dil değişiyor.**

React Native tam olarak böyle çalışıyor:

```
Sen şunu yazıyorsun:
<View style={{ backgroundColor: 'red' }}>
  <Text>Merhaba</Text>
</View>

iOS'ta bu şuna dönüşüyor:
UIView (backgroundColor: UIColor.red)
  └── UILabel (text: "Merhaba")
   [Apple'ın kendi native bileşenleri — Swift/ObjC]

Android'de bu şuna dönüşüyor:
android.view.View (backgroundColor: Color.RED)
  └── android.widget.TextView (text: "Merhaba")
   [Google'ın kendi native bileşenleri — Kotlin/Java]
```

**Kritik nokta:** React Native bir web view değil. Yani ekranında gizli bir tarayıcı çalışmıyor. Gerçek, native iOS ve Android bileşenleri oluşturuluyor. Bu yüzden React Native uygulamaları native uygulama gibi hissettiriyor.

> **Web View ne olurdu?** React Native yerine bir web view kullansaydın (Cordova / PhoneGap gibi), ekrana bir tarayıcı penceresi açılır ve web siteni gösterirdi. Hissiyat farklı olurdu, yavaş olurdu, native özellikler kısıtlı olurdu.

---

## 3. İçeride Neler Oluyor? — Thread Sistemi

Telefon uygulamaları tek bir şeyi aynı anda yapamaz — paralel çalışan **iş parçacıkları (thread)** vardır.

React Native'de **3 ana thread** var:

```
┌──────────────────────────────────────────────────────────────┐
│                     TELEFON                                  │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │   JS Thread     │  │   UI Thread      │  │  Native    │  │
│  │                 │  │  (Main Thread)   │  │  Modules   │  │
│  │  Senin yazdığın │  │                  │  │  Thread    │  │
│  │  JavaScript     │  │  Ekrana çizim    │  │            │  │
│  │  kodu burada    │  │  yapılır         │  │  Kamera,   │  │
│  │  çalışır        │  │  Animasyonlar    │  │  GPS, vb.  │  │
│  │                 │  │  burada olur     │  │  burada    │  │
│  └─────────────────┘  └──────────────────┘  └────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**JS Thread:** `useState`, `useEffect`, API çağrıları, iş mantığı — hepsi burada.

**UI Thread (Main Thread):** Ekrana bir şey çizmek, bir butonu göstermek, animasyonu oynatmak — bunlar burada olur. Bu thread **asla bloke edilemez.** Bloke edilirse uygulama donar.

**Native Modules Thread:** Kamera açmak, GPS konum almak, Bluetooth — bunlar ayrı bir thread'de.

---

## 4. Bridge Mimarisi — Eski Sistem (RN < 0.74)

JS Thread ile UI Thread birbirinden habersizdir. Birbirleriyle konuşmaları gerektiğinde bir "köprü" kullanıyorlardı.

### Gerçek Hayat Analojisi

Şöyle düşün: Sen Türkçe biliyorsun, karşındaki adam Japonca biliyor. Aranızda bir **çevirmen** var. Ama bu çevirmen çok yavaş çalışıyor:

1. Sen bir şey söylüyorsun → çevirmen not alıyor
2. Notu Japonca'ya çeviriyor (serialize)
3. Adama götürüyor
4. Adam cevap veriyor → çevirmen not alıyor
5. Türkçe'ye çeviriyor (deserialize)
6. Sana getiriyor

Bu süreç her iletişimde tekrar ediliyor.

**Bridge de tam olarak buydu:**

```
JS Thread                  Bridge                   UI Thread
    │                        │                          │
    │  "Bir buton oluştur"   │                          │
    │ ──────────────────────▶│                          │
    │                        │  JSON'a çevir            │
    │                        │  { type: "Button",       │
    │                        │    color: "red" }        │
    │                        │ ─────────────────────────▶│
    │                        │                          │ Butonu oluştur
    │                        │                          │
    │                        │  Kullanıcı bastı!        │
    │                        │◀─────────────────────────│
    │                        │  JSON'a çevir            │
    │                        │  { event: "press" }      │
    │◀───────────────────────│                          │
    │  onPress() çalıştır    │                          │
```

### Bridge'in Sorunu Neydi?

**1. JSON serialize/deserialize:**
Her mesaj JSON string'e çevrilmeli, gönderilmeli, karşı tarafta tekrar objeye dönüştürülmeli. Bu **işlemci gücü** ve **zaman** harcatır.

**2. Asenkron — senkron işlem imkansız:**
"Şu anda bu değer kaç?" diye soramazsın. Mesajı gönderirsin, cevabı beklersin. Bu yüzden bazı native bilgilere (kaydırma pozisyonu gibi) anlık erişim yoktu.

**3. Animasyonlarda sorun:**
60 FPS animasyon = saniyede 60 frame = her 16 milisaniyede bir güncelleme gerekiyor.
JS Thread meşgulse (API çağrısı, hesaplama) Bridge tıkanıyor → animasyon takılıyor.
Buna **jank** deniyor.

```
Normal: ████░████░████░████░████  → akıcı 60fps
Jank:   ████░████░████░░░░░░████  → boş kareler = takılma
```

---

## 5. JSI + Yeni Mimari — Modern Sistem (RN 0.74+)

### Analoji

Aynı Türkçe-Japonca senaryosu. Ama bu sefer ikisi de **ortak bir dil** öğreniyor: **C++**.

Artık çevirmen yok. Doğrudan konuşabiliyorlar.

**JSI (JavaScript Interface):** JS Thread ile Native arasına C++ katmanı yerleştiriyor. JSON yok, mesaj kuyruğu yok. JS doğrudan native fonksiyonu çağırabiliyor.

```
Eski (Bridge):
JS ─── JSON serialize ───▶ Bridge ───▶ Native
JS ◀─── JSON deserialize ─ Bridge ◀─── Native

Yeni (JSI):
JS ─── doğrudan C++ çağrısı ───▶ Native
JS ◀─── doğrudan C++ cevabı ─── Native
```

### Yeni Mimarinin Bileşenleri

**JSI (JavaScript Interface):**
- JS'nin C++ objelere erişmesini sağlayan köprü. Ama Bridge'den farklı: **senkron** çalışabilir, **serialize yok**.

**Fabric (Yeni Renderer):**
- Ekrana ne çizileceğini hesaplayan sistem. Eski sistemde bu hesaplama sadece JS Thread'de oluyordu. Fabric'te hem JS hem UI Thread bunu birlikte yapabiliyor → daha hızlı, daha az gecikme.

**TurboModules:**
- Eski sistemde uygulama açılırken TÜM native modüller yükleniyordu (kamera, GPS, Bluetooth, hepsi). Uygulama kamerayı kullanmasa bile yükleniyor, başlangıç yavaşlıyordu.
- TurboModules: Lazy loading. Kamera modülü sadece kamera açıldığında yükleniyor.

```
Eski: Uygulama açıldı → [Kamera ✓] [GPS ✓] [Bluetooth ✓] [Mikrofon ✓] ... → Ana sayfa
Yeni: Uygulama açıldı → Ana sayfa | Kamera sayfası açıldı → [Kamera ✓]
```

### Karşılaştırma Tablosu

| | Bridge (Eski) | JSI + Fabric (Yeni) |
|--|--|--|
| İletişim yöntemi | JSON mesaj kuyruğu | C++ doğrudan çağrı |
| Senkron erişim | ❌ İmkansız | ✅ Mümkün |
| Animasyon | JS Thread tıkandı = jank | Native Thread'de akar |
| Modül yükleme | Tümü başlangıçta | Lazy (ihtiyaçta) |
| Başlangıç hızı | Yavaş | Hızlı |
| RN sürümü | < 0.74 | **0.74+ varsayılan** |

> **Sen ne kullanacaksın?** Yeni mimari (JSI + Fabric). Expo SDK 52+ ile proje oluşturduğunda otomatik geliyor. Herhangi bir ayar yapman gerekmiyor.

---

## 6. Expo Nedir? — "React Native Üstüne Eklenen Kolaylıklar"

React Native kurmak zor olabilir. Xcode, Android Studio, sertifikalar, gradle... Expo bütün bu karmaşıklığı ortadan kaldırıyor.

### Expo Olmadan React Native:

```
Sen:  "Merhaba dünya" uygulaması yapmak istiyorum
RN:   Tamam. Önce Xcode kur, sonra iOS Developer hesabı aç,
      sonra Android Studio kur, sonra Java SDK ayarla,
      sonra CocoaPods kur, sonra gradle ayarla...
Sen:  😰
```

### Expo ile:

```
Sen:  "Merhaba dünya" uygulaması yapmak istiyorum
Expo: npx create-expo-app ShopApp
      npx expo start
      QR kodu tara.
Sen:  😊
```

### Expo Ekosistemi

```
┌───────────────────────────────────────────────────────────┐
│                        EXPO                               │
│                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  Expo SDK   │  │ Expo Router │  │    EAS           │  │
│  │             │  │             │  │                  │  │
│  │  Hazır      │  │  Dosya adı  │  │  Build: binary   │  │
│  │  kütüphane  │  │  = route    │  │  Submit: mağaza  │  │
│  │  paketi     │  │  Next.js    │  │  Update: OTA     │  │
│  │  (kamera,   │  │  gibi       │  │                  │  │
│  │  GPS, vb.)  │  │             │  │                  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
│                                                           │
│                    React Native                           │
└───────────────────────────────────────────────────────────┘
```

**Expo SDK:** Kamera, konum, bildirim gibi native özellikleri `expo-camera`, `expo-location` gibi hazır paketlerle sunuyor. Sıfırdan native kod yazmana gerek kalmıyor.

**Expo Router:** Next.js'teki `app/` klasörü gibi. Dosya adı = route. `app/product/[id].tsx` dosyası otomatik olarak `/product/123` rotasını oluşturuyor.

**EAS (Expo Application Services):**
- `EAS Build`: Uygulamanı bulutta derliyor. Sen `.ipa` (iOS) veya `.apk` (Android) dosyası üretmek için Xcode veya Android Studio'ya ihtiyaç duymuyorsun.
- `EAS Submit`: Üretilen binary'yi App Store veya Play Store'a gönderiyor.
- `EAS Update`: JS kodunu güncelliyorsun, kullanıcılar App Store'dan yeni sürüm indirmeden güncelleniyor.

### Managed Workflow vs Bare Workflow

| | Managed Workflow | Bare Workflow |
|--|--|--|
| `ios/` ve `android/` klasörü | ❌ Expo yönetiyor | ✅ Sende var |
| Native kod yazabilir misin? | ❌ | ✅ |
| Expo Go ile test | ✅ | ❌ (custom dev client) |
| Kurulum kolaylığı | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Ne zaman kullan? | Başlangıç için ideal | Custom native modül gerekince |

> **ShopApp için:** Managed Workflow ile başlıyoruz. İlerleyen günlerde native özellik gerekirse (Gün 29: kamera, Gün 30: konum) `expo-*` paketleri Managed Workflow'da sorunsuz çalışıyor.

### Expo Go Nedir?

Expo Go, **telefonuna indirdiğin bir uygulama.** Uygulamanı derlemeden, binary üretmeden test etmeni sağlıyor.

```
Klasik geliştirme:
Kod yaz → Derle (10-15 dak) → Emülatöre yükle → Gör

Expo Go ile:
Kod yaz → QR tara → Anında gör (Fast Refresh: kaydet = 1 saniyede güncelle)
```

**Kısıt:** Custom native modül içeriyorsa Expo Go çalışmaz. Örneğin Stripe'ın native SDK'sını eklersen Expo Go bunu bilmiyor. O zaman `expo-dev-client` ile özel bir geliştirici uygulaması oluşturursun.

---

## 7. Metro Bundler — "Webpack'in Mobil Karşılığı"

Metro, React Native'in **kod derleyicisi ve paketleyicisi.**

Sen `npx expo start` dediğinde Metro şunları yapıyor:
1. TypeScript → JavaScript'e çeviriyor (transpile)
2. Tüm dosyaları tek bir `bundle.js`'e birleştiriyor
3. Değişiklik olduğunda sadece değişen kısmı yeniden hesaplıyor (Fast Refresh)
4. Telefona gönderiyor

| | Webpack (Web) | Metro (React Native) |
|--|--|--|
| Kullanım amacı | Web uygulaması | React Native uygulaması |
| Kod bölme (chunks) | ✅ Otomatik | ❌ Tek bundle (Expo Router ekler) |
| Platform-specific | ❌ | ✅ `.ios.tsx`, `.android.tsx` |
| Config | `webpack.config.js` | `metro.config.js` |
| Hot Reload | ✅ Fast Refresh | ✅ Fast Refresh (aynı deneyim) |

**Platform-specific dosyalar ne demek?**

```
Button.tsx          → her platform
Button.ios.tsx      → sadece iOS
Button.android.tsx  → sadece Android
```

Metro, iOS'ta çalıştırırken `Button.ios.tsx` dosyasını, Android'de `Button.android.tsx` dosyasını otomatik seçiyor. Küçük platform farklarını böyle yönetiyorsun.

---

## 8. Ortam Kurulumu

### Adım 1: Node.js Kur

```
https://nodejs.org → LTS sürümünü indir ve kur
```

Kontrol:
```bash
node --version   # v20.x.x görmeli
npm --version    # 10.x.x görmeli
```

### Adım 2: Telefona Expo Go İndir

- **iPhone:** App Store → "Expo Go" → İndir
- **Android:** Play Store → "Expo Go" → İndir

### Adım 3: Projeyi Oluştur

```bash
# ShopApp projesini oluştur (TypeScript şablonu)
npx create-expo-app@latest ShopApp --template blank-typescript

# Klasöre gir
cd ShopApp

# Başlat
npx expo start
```

Terminalde bir QR kodu görünecek:
- **iPhone:** Kamera uygulamasını aç → QR kodu tara → Expo Go otomatik açılır
- **Android:** Expo Go uygulamasını aç → "Scan QR code" → tara

### Adım 4: İlk Kodu Yaz

`App.tsx` dosyasını aç, içeriği sil ve şunu yaz:

```tsx
// App.tsx — ShopApp giriş noktası
import { View, Text, StyleSheet } from 'react-native';
//         ↑          ↑               ↑
//        <div>      <p>/<span>    CSS değil, JS objesi

export default function App() {
  return (
    <View style={styles.container}>
      {/*
        View = <div>
        Ama fark: her View zaten flex container (display:flex yazmak gerekmez)
        Ve flex yönü varsayılan olarak 'column' (web'de 'row'du)
      */}
      <Text style={styles.baslik}>🛒 ShopApp</Text>
      {/*
        Text = <p> veya <span> veya <h1> — hepsi Text
        ÖNEMLİ: React Native'de metin SADECE Text içinde olabilir
        <View>Merhaba</View> → HATA verir
      */}
      <Text style={styles.altyazi}>E-Ticaret Uygulaması</Text>
      <Text style={styles.gun}>Gün 1 / 60 ✅</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // StyleSheet.create ne yapar?
  // 1. Objeyi dondurur (freeze) → kazara değiştirilemez
  // 2. Native tarafta optimize eder → inline style'dan daha hızlı
  // Bunu yazmasaydık: style={{ ... }} gibi inline kullanırdık
  // Sorun: Her render'da yeni bir obje oluşturulur → gereksiz bellek kullanımı

  container: {
    flex: 1,
    // flex: 1 = mevcut tüm alanı doldur
    // Web'deki height: 100vh + width: 100% gibi düşün
    // Ama DİKKAT: flex: 1 çalışması için parent'ın da flex olması gerekir
    // Burada parent = telefon ekranı (zaten flex)

    alignItems: 'center',
    // flexDirection varsayılan: 'column' (yukarıdan aşağı)
    // alignItems 'column' yönünde = yatay ortalama
    // Web'de row yönü varsayılandı, orası farklı

    justifyContent: 'center',
    // Ana eksen boyunca ortalama = dikey ortalama (column olduğu için)

    backgroundColor: '#0f172a',
  },
  baslik: {
    fontSize: 36,
    // Birim YOK. Sayılar dp (density-independent pixels) cinsinden.
    // 16dp = küçük ekranda 16px, büyük ekranda daha fazla px
    // Web'deki rem/em gibi ama otomatik

    fontWeight: 'bold',
    // CSS'te fontWeight: 700 yazardık, burada string: 'bold' veya '700'

    color: '#f8fafc',
    marginBottom: 8,
    // px yazmıyoruz, sadece sayı
  },
  altyazi: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 24,
  },
  gun: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
});
```

Kaydet. Telefonda **1 saniye içinde** güncellenir.

---

## 9. ShopApp — Ne İnşa Edeceğiz?

60 günün sonunda ortaya çıkacak uygulama:

```
┌─────────────────────────────────┐
│          ShopApp                │
│                                 │
│  ┌──────────────────────────┐   │
│  │  🏠 Ana Sayfa            │   │
│  │  Ürün listesi            │   │
│  │  Kategori filtreleme     │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │  📦 Ürün Detay           │   │
│  │  Fotoğraflar, fiyat,     │   │
│  │  stok durumu, yorumlar   │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │  🛒 Sepet                │   │
│  │  Ürünler, toplam fiyat   │   │
│  │  Miktar güncelleme       │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │  💳 Ödeme                │   │
│  │  Adres, kart bilgisi     │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │  📋 Siparişlerim         │   │
│  │  Sipariş takibi          │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │  👤 Profil               │   │
│  │  Adres, dark mode, çıkış │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Kullanılacak teknolojiler** (ileride her birini öğreneceğiz):

| Ne | Teknoloji | Gün |
|--|--|--|
| Routing | Expo Router | 5 |
| Ürün listesi | FlatList | 8 |
| Sepet state | Zustand + MMKV | 17 |
| API çağrıları | TanStack Query + Axios | 18-19 |
| Form (login, ödeme) | React Hook Form + Zod | 35 |
| Animasyonlar | Reanimated 3 | 24 |
| Token saklama | SecureStore | 20 |
| Build | EAS Build | 46 |

---

## 10. Kontrol Soruları

Her günün sonunda bu sorular var. Cevaplamaya çalış, takıldığın yerde tekrar ilgili bölümü oku.

**1. React Native bir web view kullanıyor mu? Uygulama açıldığında tarayıcı mı çalışıyor?**

> Hayır. React Native `<View>` yazdığında iOS'ta gerçek `UIView`, Android'de gerçek `android.view.View` oluşuyor. Hiç tarayıcı yok.

**2. Aynı JavaScript kodu iOS'ta ve Android'de nasıl çalışıyor?**

> JavaScript kodu Hermes engine'de çalışıyor. React Native her platform için ayrı "native adapter" içeriyor. `<Text>` yazdığında iOS'ta `UILabel`, Android'de `TextView` oluşturuluyor. Kod aynı, altındaki native bileşen platform'a göre değişiyor.

**3. Bridge'de animasyonlar neden takılıyordu?**

> 60fps animasyon = 16ms'de bir frame. Her frame'de JS Thread'den UI Thread'e mesaj gitmesi gerekiyor. JS Thread başka bir iş yapıyorsa (API isteği gibi) mesaj gecikiyor → frame atlanıyor → takılma (jank).

**4. JSI Bridge'den ne farkı var? Senkron ne anlama geliyor?**

> Bridge: mesaj kuyruğu, JSON serialize, asenkron. JSI: C++ katmanı, doğrudan çağrı, senkron mümkün. Senkron = "şu anda bu değer ne?" diye sorabilmek, cevabı beklemek zorunda kalmamak.

**5. Expo Go'yu kullanınca uygulamamı derlemem gerekmiyor — peki ne oluyor?**

> Expo Go zaten derlenmiş bir uygulamadır ve içinde Expo SDK'sı var. Senin JavaScript kodun Metro tarafından paketleniyor ve Expo Go bu bundle'ı alıp çalıştırıyor. Yani binary derleme yok, sadece JS gönderiliyor.

**6. `StyleSheet.create` neden kullanılıyor, `style={{ }}` olmaz mı?**

> Olur ama `StyleSheet.create` daha iyi: objeyi freeze eder, native tarafta ID ile referans edilir (objenin kendisi değil), her render'da yeni obje oluşturulmaz.

---

## Bugün Ne Yaptık?

```
✅ React Native'in ne olduğunu ve web view olmadığını anladık
✅ Tek kodun iki platformda nasıl çalıştığını anladık
✅ 3 thread sistemini (JS, UI, Native) öğrendik
✅ Bridge mimarisini ve sorunlarını kavradık
✅ JSI + Fabric + TurboModules'u anladık
✅ Expo ekosistemini (SDK, Router, EAS, Go) öğrendik
✅ Metro bundler'ın ne yaptığını anladık
✅ Ortamı kurduk, ShopApp'i başlattık, telefonda gördük
```

---

## Sonraki Gün

**[Gün 2 → Core Components: `<div>` Yok, `<View>` Var](gun02_core_components.md)**

`<View>`, `<Text>`, `<Image>`, `<Pressable>`, `<ScrollView>` öğreniyoruz.
İlk gerçek component: **ProductCard** — ürün görseli, isim, fiyat.

---

*← [Müfredat Ana Sayfası](../reactNaitiveMufredat.md)*
