# Gün 10 — Platform API: iOS vs Android Farkları

> **Faz:** 1 — Temeller | **Hafta:** 2 | **Gün:** 10 / 60
>
> **Bugünün Hedefi:** iOS ve Android'in farklı davrandığı yerleri tanımak, platforma göre doğru kodu yazmak.

---

## 1. Neden İki Platform Farklı Davranır?

Web'de tek bir ortam vardı: tarayıcı. Kodu bir kez yazıyordun, Chrome'da da Firefox'ta da aynı çalışıyordu.

React Native'de iki farklı native ortam var:

```
iOS                          Android
─────────────────────        ─────────────────────
Apple UIKit                  Android SDK
Swift / Objective-C          Java / Kotlin
Apple Human Interface        Material Design
Guidelines (HIG)             
iPhone, iPad                 Samsung, Pixel, Xiaomi...
```

React Native tek kod yazıyor ama her iki platforma da farklı native bileşenler gönderiyor. Bu yüzden bazı şeyler platforma göre farklı görünür veya davranır. `Platform` API bu farkları yönetmek için var.

---

## 2. `Platform.OS` — Hangi Platformdasın?

```tsx
import { Platform } from 'react-native';

console.log(Platform.OS);
// iPhone'da: 'ios'
// Android'de: 'android'
// Tarayıcıda (React Native Web): 'web'
```

Koşullu kod yazmak için:

```tsx
if (Platform.OS === 'ios') {
  // Sadece iPhone/iPad'de çalışır
}

if (Platform.OS === 'android') {
  // Sadece Android'de çalışır
}
```

Stil içinde:

```tsx
const styles = StyleSheet.create({
  baslik: {
    fontSize: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    // iPhone'da status bar daha uzun → daha fazla padding
  },
});
```

---

## 3. `Platform.select` — Birden Fazla Platform için Temiz Yazım

`Platform.OS === 'ios' ? ... : ...` ternary'si iki platform için yeterli. Ama üç platform (ios, android, web) veya style objesi yazacaksan `Platform.select` daha temiz:

```tsx
// Basit değer seçimi:
const paddingTop = Platform.select({
  ios: 50,
  android: 30,
  default: 0,   // web veya bilinmeyen platform için fallback
});

// Style objesi içinde kullanım:
const styles = StyleSheet.create({
  kart: {
    borderRadius: 12,

    // iOS gölgesi:
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      // Android gölgesi:
      android: {
        elevation: 4,
      },
    }),
    // Her platform kendi bloğunu alır, diğerini görmezden gelir
  },
});
```

### Hangi durumda hangisi?

```
Tek fark, tek satır     → Platform.OS ===
  paddingTop: Platform.OS === 'ios' ? 50 : 30

Birden fazla stil veya değer, birden fazla platform
                        → Platform.select
  ...Platform.select({ ios: {...}, android: {...} })
```

---

## 4. Platform-Specific Dosyalar

Bazen iki platform için fark o kadar büyük olur ki tek dosyada tutmak çirkinleşir. O zaman **iki ayrı dosya** yazarsın:

```
components/
├── Secenek.ios.tsx       ← iPhone'da bu dosya yüklenir
└── Secenek.android.tsx   ← Android'de bu dosya yüklenir
```

Her iki dosyada da **aynı isimle export** yaparsın:

```tsx
// Secenek.ios.tsx
// iOS'ta native ActionSheet var — Apple'ın kendi bileşeni
import { ActionSheetIOS } from 'react-native';

export function SeceknekMenusu({ secenekler, onSec }: Props) {
  ActionSheetIOS.showActionSheetWithOptions(
    { options: secenekler },
    (index) => onSec(index)
  );
  return null;  // görsel bileşen yok, doğrudan native açar
}
```

```tsx
// Secenek.android.tsx
// Android'de ActionSheetIOS yok — kendin yaparsın
export function SeceknekMenusu({ secenekler, onSec }: Props) {
  return <ModalTabanliMenu secenekler={secenekler} onSec={onSec} />;
}
```

```tsx
// Kullanan yer — hangi dosyanın yükleneceğini bilmez, bilmesi gerekmez:
import { SeceknekMenusu } from '../components/Secenek';
// Metro bundler cihaza göre doğru dosyayı otomatik alır
```

**Ne zaman kullanmalısın?** İki platform için kod çok farklılaşınca. Küçük stil farkları için `Platform.select` yeterli — dosya ayırmak gerekmez.

---

## 5. `StatusBar` — Ekranın Üst Çubuğu

Ekranın en üstündeki saat, batarya, sinyal çubuğu. iOS ve Android'de rengi farklı yönetilir.

```tsx
import { StatusBar } from 'expo-status-bar';
// React Native'in kendi StatusBar'ı yerine expo-status-bar kullan
// Expo'nunki daha kolay, her iki platformda tutarlı çalışır

export default function AnaSayfa() {
  return (
    <>
      <StatusBar
        style="dark"
        // 'dark'  → siyah ikonlar (beyaz arka plan üstünde)
        // 'light' → beyaz ikonlar (koyu arka plan üstünde)
      />
      {/* sayfa içeriği */}
    </>
  );
}
```

Farklı ekranlarda farklı status bar:

```tsx
// Ürün detay ekranı — koyu hero görsel var, beyaz ikonlar gerekli:
<StatusBar style="light" />

// Ana sayfa — açık arka plan var, koyu ikonlar:
<StatusBar style="dark" />
```

---

## 6. `SafeAreaView` — Notch ve Home Bar Sorunu

iPhone X'ten itibaren ekranın üstünde notch (veya Dynamic Island), altında home indicator var. İçeriğin bu alanlara girmemesi gerekir.

```
┌─────────────────────────────┐
│  ▄▄▄ Dynamic Island ▄▄▄▄▄  │  ← buraya içerik girerse görünmez
├─────────────────────────────┤
│                             │
│   SAFE AREA (güvenli alan)  │
│                             │
├─────────────────────────────┤
│  ──── Home Indicator ────── │  ← buraya içerik girerse tıklanamaz
└─────────────────────────────┘
```

`SafeAreaView` bu padding'i otomatik hesaplar:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
// ⚠️ 'react-native' den değil 'react-native-safe-area-context' den import et

export default function AnaSayfa() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* İçerik notch'a ve home bar'a çarpmaz */}
    </SafeAreaView>
  );
}
```

Gün 11'de `SafeAreaView` ve `useSafeAreaInsets` derinlemesine işlenecek. Şimdilik şunu bil: **en dış View yerine SafeAreaView kullan.**

---

## 7. `Alert` — Native Dialog

Web'de `window.confirm()` vardı. React Native'de native görünümlü dialog:

```tsx
import { Alert } from 'react-native';

// Basit bilgi mesajı:
Alert.alert('Başarılı', 'Ürün sepete eklendi.');

// Onay diyaloğu:
Alert.alert(
  'Sepeti Temizle',               // başlık
  'Tüm ürünler silinecek. Emin misin?',  // mesaj
  [
    {
      text: 'Vazgeç',
      style: 'cancel',
      // 'cancel' → iOS'ta solda gösterir, kalın yazmaz
    },
    {
      text: 'Temizle',
      style: 'destructive',
      // 'destructive' → iOS'ta kırmızı renk; yıkıcı işlemler için
      onPress: () => sepetiBosalt(),
    },
  ]
);
```

iOS ve Android'de görünümü farklıdır ama kod aynı — her platform kendi native stilini uygular.

---

## 8. Haptic Feedback — Dokunsal Geri Bildirim

iOS'ta butona basınca hafif titreşim hissedilir. Bu "haptic feedback." Kullanıcı arayüzünü daha gerçek hissettiriyor.

```bash
npx expo install expo-haptics
```

```tsx
import * as Haptics from 'expo-haptics';

// Buton pressleri için hafif titreşim:
const butonPress = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // Light → çok hafif
  // Medium → orta
  // Heavy → güçlü
};

// Ödeme tamamlandı, başarı mesajı:
const odemeBasarili = async () => {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // Success | Warning | Error
};

// Picker veya toggle değişimi:
const secimDegisti = async () => {
  await Haptics.selectionAsync();
};
```

ShopApp'te sepete ekleme anı için:

```tsx
const sepeteEkle = async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  // Kullanıcı hemen hisseder — sonuç beklemiyor
  urunuSepeteEkle(urun);
};
```

**Android'de** haptic daha sınırlı çalışır. iOS kadar zengin değil ama `expo-haptics` her iki platformda da çalışır.

---

## 9. Android Geri Tuşu — `BackHandler`

Android telefonlarda fiziksel veya gesture tabanlı geri tuşu var. Expo Router bunu otomatik yönetir — çoğu zaman dokunman gerekmez.

Ama özel durumlarda (form doldurulurken, ödeme sürecinde) geri tuşuna basılınca "emin misin?" sormak isteyebilirsin:

```tsx
import { BackHandler } from 'react-native';
import { useEffect } from 'react';

function OdemeEkrani() {
  useEffect(() => {
    const abonelik = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Bu fonksiyon geri tuşuna her basıldığında çalışır

        // true döndürürsen: "ben hallettim, sistem geri gitme"
        // false döndürürsen: "sistem normal davranışını yapsın (geri git)"

        Alert.alert(
          'Ödemeyi İptal Et',
          'Sayfadan çıkmak istediğine emin misin?',
          [
            { text: 'Hayır', style: 'cancel' },
            { text: 'Evet, çık', onPress: () => router.back() },
          ]
        );

        return true;  // geri tuşunu biz hallettik, sistem geri gitmesin
      }
    );

    // Bileşen kapanınca listener'ı temizle — bellek sızıntısı olmasın
    return () => abonelik.remove();
  }, []);
}
```

---

## 10. İzinler — iOS ve Android Farkı

Kamera, konum, bildirim gibi özellikler için kullanıcıdan izin istenir. İki platform farklı davranır:

```
iOS:
  1. İzin iste → kullanıcı "İzin Ver" veya "Reddet" der
  2. "Reddet" dedikten sonra → uygulama bir daha soramaz
  3. Tek yol → kullanıcı Ayarlar'a gidip elle açmalı

Android:
  1. İzin iste → "İzin Ver", "Reddet" veya "Bir Daha Sorma"
  2. Sadece "Reddet" dediyse → tekrar sorabilirsin
  3. "Bir Daha Sorma" seçtiyse → Ayarlar'a yönlendir
```

Pratikte her iki durumu da handle etmek gerekir:

```tsx
import * as ImagePicker from 'expo-image-picker';
import { Linking, Alert } from 'react-native';

async function fotografSec() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status === 'granted') {
    // İzin var, devam et
    const sonuc = await ImagePicker.launchImageLibraryAsync();
    if (!sonuc.canceled) {
      setGorsel(sonuc.assets[0].uri);
    }

  } else {
    // İzin yok — Ayarlar'a yönlendir
    Alert.alert(
      'Galeri İzni Gerekli',
      'Fotoğraf seçmek için galeri iznini Ayarlar\'dan açmanız gerekiyor.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ayarları Aç',
          onPress: () => Linking.openSettings(),
          // Linking.openSettings(): uygulamanın Ayarlar sayfasını açar
        },
      ]
    );
  }
}
```

---

## 11. ShopApp: Platforma Göre Geri Butonu İkonu

iOS'ta geri butonu chevron (`<`), Android'de ok (`←`). Her platform kendi standardını bekler:

```tsx
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function GeriButonu({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ padding: 8 }}>
      <Ionicons
        name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
        size={24}
        color="#fff"
      />
    </Pressable>
  );
}
```

Basit ama somut bir örnek. Kullanıcı kendi platformunda alışkın olduğu ikonu görür.

---

## 12. Web ile Karşılaştırma

| Web | React Native | Not |
|---|---|---|
| `navigator.userAgent` ile tarayıcı tespiti | `Platform.OS` | 'ios' / 'android' — kesin ve basit |
| CSS media query, tarayıcı vendor prefix | `Platform.select` | JS objesi, derleme zamanı değil runtime |
| `window.confirm()` | `Alert.alert()` | Native görünümlü, butonlar özelleştirilebilir |
| Browser vibrate API | `expo-haptics` | iOS'ta çok daha zengin |
| Browser back button (history API) | `BackHandler` (Android) | iOS'ta swipe gesture |
| `<input accept="image/*">` | `expo-image-picker` + izin | İzin alınması zorunlu |

---

## 13. Kontrol Soruları

**1. `Platform.select` vs `Platform.OS === 'ios'` — ne zaman hangisi?**
> Tek satır, tek değer → `Platform.OS ===` yeterli: `paddingTop: Platform.OS === 'ios' ? 50 : 30`. Birden fazla özellik veya üç platform varsa `Platform.select` daha temiz: `...Platform.select({ ios: {...}, android: {...} })`.

**2. Platform-specific dosya ne zaman kullanmalısın?**
> İki platform için kod çok farklılaşınca — `if (Platform.OS === 'ios')` bloğu büyük JSX içeriyorsa. Küçük stil farkları veya tek satır koşullar için dosya ayırmak fazla — `Platform.select` yeterli.

**3. Android back button — web'deki browser back ile aynı mı davranır?**
> Benzer ama aynı değil. Web'de browser back URL geçmişinde geri gider, uygulama bunu engelleyemez. Android'de `BackHandler` ile geri tuşunu "yakalar" ve kendi kodunu çalıştırırsın — sistem davranışını iptal edebilirsin. Expo Router varsayılan olarak navigation stack'i yönetir, `BackHandler` sadece özel durumlar için gerekir.

---

## Bugün Ne Yaptık?

```
✅ iOS ve Android'in neden farklı davrandığını anladık
✅ Platform.OS ile platforma göre koşullu kod yazdık
✅ Platform.select ile birden fazla platform için temiz yazım öğrendik
✅ .ios.tsx / .android.tsx dosya yapısını gördük
✅ StatusBar — dark/light style kullandık
✅ SafeAreaView'a giriş yaptık (Gün 11'de derinlemesine)
✅ Alert.alert ile native dialog yazdık
✅ expo-haptics ile dokunsal geri bildirim ekledik
✅ BackHandler ile Android geri tuşunu özelleştirdik
✅ İzin akışını iOS vs Android için handle ettik
```

---

## Sonraki Gün

**[Gün 11 → SafeAreaView, Dimensions ve Responsive Layout](gun11_safearea_dimensions.md)**

`useSafeAreaInsets` derinlemesine, `useWindowDimensions`, tablet/telefon ayrımı.
ShopApp'te tam responsive layout.

---

*← [Gün 9](gun09_textinput_form.md) | [Müfredat](../reactNaitiveMufredat.md) | [Gün 11 →](gun11_safearea_dimensions.md)*
