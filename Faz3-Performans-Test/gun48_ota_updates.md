# Gün 48 — OTA Updates: App Store Beklemeden Güncelle

> Dün öğrendik ki App Store'a bir güncelleme göndermek 1-3 gün review süreci demek. Ama bir production bug'ı düzeltmen gerektiğinde 3 gün beklemek mümkün değil. OTA (Over-the-Air) Updates bu sorunu çözer — ama her şeyi değil. Bugün tam olarak neyin güncellenebileceğini, neyin güncellenemeyeceğini ve bu sistemin nasıl çalıştığını öğreneceğiz.

---

## OTA'nın Mümkün Olmasının Sebebi: Mimari

Bunu anlayabilmek için React Native uygulamasının içinde ne olduğunu hatırlayalım.

Bir APK veya IPA dosyasının içinde iki farklı katman bulunur:

**Native katman:** Swift/Objective-C (iOS) veya Kotlin/Java (Android) ile derlenen kod. Kamera, GPS, Bluetooth gibi native modüller. React Native'in kendi bridge/JSI altyapısı. Bu kod derleme sırasında makine koduna çevrilir — bir kez derlenirse değiştirilemez. Değiştirmek için yeni bir binary üretmek ve App Store'dan geçmek gerekir.

**JS katmanı:** Senin yazdığın React bileşenleri, iş mantığı, API çağrıları, navigasyon — bunların tamamı. Bu kod Hermes tarafından çalıştırılan bir dosyadır: `bundle.js` ya da Hermes ile derlenmiş `bundle.hbc`. Bu dosya değiştirilebilir.

OTA'nın yaptığı tam olarak şudur: bu JS dosyasını (bundle'ı) App Store'a gitmeden değiştirir. Uygulama açıldığında veya arka planda yeni bir bundle olup olmadığını kontrol eder, varsa indirir ve bir sonraki açılışta kullanır.

```
APK / IPA
├── Native kod (değiştirilemez — yeni App Store build gerekir)
│   ├── React Native runtime
│   ├── expo-camera native modülü
│   └── expo-location native modülü
└── JS bundle (OTA ile değiştirilebilir ✅)
    ├── UrunListesi.tsx
    ├── SepetEkrani.tsx
    └── store/cartStore.ts
```

---

## OTA Neyi Güncelleyebilir, Neyi Güncelleyemez?

Bu soruyu yanlış anlamak production'da ciddi sorunlara yol açar.

### OTA ile GÜNCELLENEBİLİR:
- Ekran tasarımı ve layout değişiklikleri
- Iş mantığı ve hesaplama değişiklikleri
- API endpoint'leri veya istek formatı
- Hata düzeltmeleri (JS katmanında)
- Metin değişiklikleri, renk değişiklikleri
- Yeni bir ekran eklemek (navigasyon JS'de yönetiliyorsa)
- Zustand/RTK store değişiklikleri

### OTA ile GÜNCELLENEMEZ:
- Yeni bir native kütüphane eklemek (`expo-camera` yokken eklemek)
- Mevcut native kütüphanenin major versiyonunu güncellemek
- `app.json`'daki `bundleIdentifier`, icon, splash screen değişiklikleri
- iOS izinleri (`Info.plist` değişiklikleri)
- Android Manifest değişiklikleri

**Kural şu:** `npm install` ile kurduğun bir şey native kod içeriyorsa OTA çalışmaz. Pure JS kütüphaneleri (utility fonksiyonlar, state yönetimi) OTA ile güncellenebilir.

---

## expo-updates Nasıl Çalışır? — Mekanizma

Uygulama açıldığında `expo-updates` arka planda Expo CDN'e bir istek atar: "Bu uygulamanın bu kanalında yeni bir update var mı?"

```
Uygulama açılır
       ↓
Mevcut bundle ile hızlıca çalışmaya başlar (kullanıcı beklemez)
       ↓ (arka planda)
Expo CDN'e sorgu: "yeni update var mı?"
       ↓
Varsa: indir, diske yaz
       ↓
Bir sonraki uygulama açılışında yeni bundle kullanılır
```

Bu "background fetch" davranışı varsayılandır. Kullanıcı güncellemeyi hemen görmez — bir sonraki açılışta görür. Bu çoğu durum için uygundur.

### Anlık Güncelleme — Kullanıcıya Şimdi Yükle

Kritik bir bug düzeltmesi ise bir sonraki açılışı beklemek istemeyebilirsin. Bu durumda manuel kontrol yapabilirsin:

```tsx
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert } from 'react-native';

export function UpdateKontrol() {
  useEffect(() => {
    async function guncellemeKontrolEt() {
      // Development modunda update kontrolü çalışmaz — sadece production'da
      if (__DEV__) return;

      try {
        const update = await Updates.checkForUpdateAsync();
        // checkForUpdateAsync: Expo CDN'e bak, yeni bundle var mı?

        if (update.isAvailable) {
          // Yeni bundle indir — bu birkaç saniye alabilir
          await Updates.fetchUpdateAsync();

          // Kullanıcıya sor: hemen yeniden başlasın mı?
          Alert.alert(
            'Güncelleme Hazır',
            'Yeni bir versiyon yüklendi. Şimdi uygulamak ister misin?',
            [
              { text: 'Daha Sonra', style: 'cancel' },
              {
                text: 'Yeniden Başlat',
                onPress: async () => {
                  // reloadAsync: uygulamayı yeniden başlatır, yeni bundle yüklenir
                  // Bunu yazmasaydık: bundle indirilir ama bir sonraki açılışa kadar bekler
                  await Updates.reloadAsync();
                },
              },
            ]
          );
        }
      } catch (error) {
        // CDN'e ulaşılamazsa (offline) sessizce geç — crash ettirme
        console.log('Update kontrolü yapılamadı:', error);
      }
    }

    guncellemeKontrolEt();
  }, []);

  return null;
}
```

Bu component'i root layout'a koy — uygulama her açıldığında çalışır.

---

## Zorunlu Güncelleme — Kullanıcı Reddedemez

Bazen "Daha Sonra" seçeneği sunmak istemezsin. Kritik güvenlik açığı, ödeme sistemindeki bir bug gibi durumlarda kullanıcının eski sürümde kalmasına izin veremezsin.

```tsx
if (update.isAvailable) {
  await Updates.fetchUpdateAsync();

  Alert.alert(
    'Zorunlu Güncelleme',
    'Bu güncelleme uygulamanın düzgün çalışması için gereklidir.',
    [
      {
        text: 'Güncelle',
        onPress: () => Updates.reloadAsync(),
      }
      // "İptal" butonu yok — kullanıcı kapatamaz
    ],
    { cancelable: false } // Android'de dışarı tıklayarak kapatma
  );
}
```

`cancelable: false` demek, Android'de Alert'in dışına tıklayarak kapatılamaz. Tek seçenek "Güncelle" butonu.

---

## eas update — Bundle'ı CDN'e Gönder

Yeni JS kodu yazdın ve production'a göndermek istiyorsun:

```bash
eas update --channel production --message "Sepet bug düzeltmesi"
```

Bu komut şunları yapar:
1. Projeyi bundle'a derler (Metro çalışır)
2. Bundle'ı Expo CDN'e yükler
3. "production" kanalındaki cihazlara "yeni update var" bilgisi verilir
4. Cihazlar bir sonraki açılışta (veya kontrol sırasında) bu bundle'ı indirir

`--message` parametresi, sonradan hangi update'in ne işe yaradığını anlamak için. Dashboard'da göreceksin.

---

## Channel Sistemi — Ortamları Ayır

Kanal (channel) sistemi, farklı kullanıcı gruplarına farklı bundle göndermeni sağlar.

```
production channel  → App Store'daki gerçek kullanıcılar
staging channel     → QA ekibi, iç test
preview channel     → Beta kullanıcılar, erken erişim
```

`eas.json`'da her build profili bir channel'a bağlanır:

```json
{
  "build": {
    "production": {
      "channel": "production"
    },
    "preview": {
      "channel": "staging",
      "distribution": "internal"
    }
  }
}
```

Bu ne sağlar? QA ekibine gönderdiğin preview build, "staging" kanalını dinler. `eas update --channel staging` yaptığında sadece QA'nın cihazları güncellenir, gerçek kullanıcılar etkilenmez. Test geçti, `eas update --channel production` yap — gerçek kullanıcılar güncellenir.

---

## Rollback — Kötü Güncellemeyi Geri Al

Bir update gönderdinden bir süre sonra kullanıcı şikayetleri gelmeye başladı. OTA güncellemesinde bir bug vardı. Ne yaparsın?

**Seçenek 1: Düzelt ve yeni update gönder**

```bash
# Hatayı düzelt
eas update --channel production --message "Acil düzeltme"
```

Kullanıcılar bir sonraki açılışta yeni bundle'ı alır.

**Seçenek 2: Önceki bir update'e dön**

Expo dashboard'da (expo.dev) tüm update geçmişini görürsün. İstediğin bir önceki update'i "production" kanalına geri atayabilirsin. Bu, bozuk update'i hiç göndermemiş gibi davranmakla aynıdır.

```bash
eas update --channel production --message "Rollback" --republish --group <onceki-update-id>
```

---

## CodePush — Expo Yerine Alternatif

Microsoft'un geliştirdiği **CodePush**, Expo kullanmayan (React Native CLI) projelerde aynı işi yapar. Kullandığın altyapı farklıdır ama kavram birebir aynıdır: JS bundle'ı uygulama store'una gitmeden güncelle.

İş ilanlarında sıklıkla CodePush da görürsün. Expo projelerinde `eas update`, bare React Native projelerinde CodePush yaygındır.

---

## Özet

| Konu | Detay |
|------|-------|
| OTA ne günceller | JS bundle — tüm React kodu, iş mantığı |
| OTA ne güncelleyemez | Native modüller, app.json değişiklikleri |
| Varsayılan davranış | Arka planda indir, bir sonraki açılışta uygula |
| Anlık güncelleme | `fetchUpdateAsync()` + `reloadAsync()` |
| Zorunlu güncelleme | `cancelable: false` Alert |
| Ortam ayırma | Channel sistemi: production / staging / preview |
| Rollback | Dashboard'dan önceki update'i republish et |

---

## Kontrol Soruları

1. Kullanıcı uygulamayı hiç kapatmadan gün boyu açık tutuyor. OTA güncellemesini ne zaman alır?
2. `expo-camera` kütüphanesini güncelledin — bu OTA ile gönderilebilir mi? Neden?
3. "staging" kanalına update gönderdin ama "production" kanalındaki kullanıcılar etkilendi. Bu neden olur? Nasıl önlenir?
4. Kullanıcının interneti yoksa `checkForUpdateAsync()` ne yapar? Uygulama çöker mi?
5. Aynı bug için hem OTA hem App Store güncellemesi gönderdin. Kullanıcı hangisini alır? Neden?

---

## Sonraki Gün

**Gün 49 → Sentry ile Error Tracking:** Production'da kullanıcı bir hata alıyor ama sen bilmiyorsun. Sentry bunu nasıl yakalar, native crash ile JS error farkı nedir, source map olmadan stack trace neden anlamsızdır.
