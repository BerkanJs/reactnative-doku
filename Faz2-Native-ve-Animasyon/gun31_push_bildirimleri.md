# Gün 31 — Push Bildirimleri

## İki Farklı Bildirim Türü

Başlamadan önce kritik bir ayrım:

**Yerel bildirim** — cihazın kendi içinde. Uygulaman bir alarm kuruyorsun: "30 dakika sonra bu bildirimi göster." Sunucuya bağlantı gerekmez, internet yoksa da çalışır.

**Push bildirim** — sunucudan geliyor. Sipariş kargoya verildi → sunucun Expo'nun altyapısına gönderiyor → Expo Apple/Google'ın sistemlerinden geçiriyor → cihaza ulaşıyor. İnternet zorunlu.

**Analoji:**

Yerel bildirim = uyarı saat. Sen kuruyorsun, telefon kendisi çalıyor.

Push bildirim = kapı zili. Biri dışarıdan kapına geliyor, mektup bırakıyor.

**ShopApp için ikisi de lazım:**
- Yerel: "Sepetinde ürün bıraktın, hâlâ orada seni bekliyor" — kullanıcı uygulamayı kapatınca 2 saat sonra hatırlat
- Push: "Siparişin kargoya verildi" — sunucudan gerçek zamanlı bildirim

---

## İzin: Bir Kez Alınır, Unutulmaz

Bildirim göndermek için kullanıcı iznini istemen zorunlu. **Bu izin yalnızca bir kez sorulabilir.** Reddederse ayarlardan açması gerekiyor.

```tsx
import * as Notifications from 'expo-notifications';

async function bildirimIzniAl(): Promise<boolean> {
  const { status: mevcutDurum } = await Notifications.getPermissionsAsync();

  // Zaten izin verilmişse sorma
  if (mevcutDurum === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
```

**iOS'ta çok önemli:** İlk soru çok kritik. Kullanıcı "İzin Verme" derse bir daha soramazsın. Bu yüzden izni erken değil, **değerini kanıtladıktan sonra** isteyin — ilk sipariş tamamlandıktan sonra sormak, ilk açılışta sormaktan çok daha etkili.

---

## Ön Yük Ayarı: Uygulama Açıkken Bildirimler

Varsayılan olarak uygulama ön plandayken (açıkken) bildirimler ekranda görünmüyor. Bunu değiştirmek için:

```tsx
// app/_layout.tsx — uygulamanın en başında ayarla
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // açıkken de göster
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

Bu ayarı yapmadan sadece uygulama kapalıyken bildirimler görünür.

---

## Yerel Bildirim Gönder

```tsx
import * as Notifications from 'expo-notifications';

async function yerelBildirimGonder() {
  const izinVar = await bildirimIzniAl();
  if (!izinVar) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sepetini Unutma! 🛒',
      body: 'Sepetinde 3 ürün var, hâlâ seni bekliyor.',
      data: { ekran: 'sepet' }, // bildirime tıklayınca bu veriyi alacaksın
      sound: true,
    },
    trigger: null, // null = hemen gönder
  });
}
```

### Zamanlı Bildirim: Sepet Hatırlatıcısı

```tsx
async function sepetHatirlaticiKur(saniyeSonra: number) {
  const izinVar = await bildirimIzniAl();
  if (!izinVar) return;

  // Önceki hatırlatıcıyı iptal et (eski bildirim varsa)
  await Notifications.cancelAllScheduledNotificationsAsync();

  const bildirimId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sepetini Hatırlıyor musun?',
      body: 'Sepetindeki ürünler seni bekliyor. Fırsatları kaçırma!',
      data: { ekran: 'sepet' },
    },
    trigger: {
      seconds: saniyeSonra, // kaç saniye sonra tetiklensin
      repeats: false,
    },
  });

  return bildirimId; // iptal etmek için sakla
}

// Kullanıcı sepete ürün ekleyince 2 saat sonra hatırlat
// Kullanım yerinde:
useEffect(() => {
  if (sepetAdet > 0) {
    sepetHatirlaticiKur(2 * 60 * 60); // 2 saat = 7200 saniye
  } else {
    Notifications.cancelAllScheduledNotificationsAsync(); // sepet boşaldı, iptal et
  }
}, [sepetAdet]);
```

**`cancelAllScheduledNotificationsAsync` neden?**  
Kullanıcı ürün ekledikçe her seferinde yeni bildirim zamanlanmasın. Önce hepsini iptal et, sonra yeni zamanı kur.

---

## Push Token: Sunucunun Cihazı Bulması

Sunucundan push bildirim göndermek için sunucunun cihazı tanıması lazım. Bu "push token" ile sağlanıyor.

**Analoji: Posta kutusu numarası**  
Her cihazın benzersiz bir posta kutusu numarası var. Sunucu bu numaraya posta gönderiyor, Expo'nun altyapısı teslim ediyor.

```tsx
import Constants from 'expo-constants';

async function pushTokenAl(): Promise<string | null> {
  const izinVar = await bildirimIzniAl();
  if (!izinVar) return null;

  // Fiziksel cihaz veya EAS Build gerekiyor — Expo Go'da çalışmaz
  if (!Constants.isDevice) {
    console.warn('Push token sadece fiziksel cihazda çalışır');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data; // "ExponentPushToken[xxxxx...]" formatında
}

// Login başarılıysa token'ı sunucuya gönder
async function loginSonrasiTokenKaydet(kullaniciId: string) {
  const token = await pushTokenAl();
  if (!token) return;

  // Sunucuna kaydet — artık bu kullanıcıya push gönderebilirsin
  await apiClient.post('/kullanicilar/push-token', { kullaniciId, token });
}
```

**`Constants.isDevice` neden?**  
Push token için APNs (Apple) veya FCM (Google) ile iletişim kurmak gerekiyor. Simulator ve Expo Go bu bağlantıyı kuramıyor — sadece gerçek cihaz veya EAS Build'de çalışır.

---

## Bildirime Tıklanınca: Deep Link

Kullanıcı bildirimi tıklayınca uygulamanın doğru sayfasını açması gerekiyor. Buna "deep link" deniyor.

```tsx
// app/_layout.tsx — root layout'ta dinleyici kur
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Bildirime tıklanınca çağrılır (uygulama açık veya arka planda)
    const abonelik = Notifications.addNotificationResponseReceivedListener((yanit) => {
      const veri = yanit.notification.request.content.data;

      // data içindeki ekran bilgisine göre yönlendir
      if (veri.ekran === 'sepet') {
        router.push('/(tabs)/cart');
      } else if (veri.ekran === 'siparis' && veri.siparisId) {
        router.push(`/orders/${veri.siparisId}`);
      } else if (veri.ekran === 'urun' && veri.urunId) {
        router.push(`/product/${veri.urunId}`);
      }
    });

    return () => abonelik.remove();
  }, []);

  // ...
}
```

**`addNotificationResponseReceivedListener` vs `addNotificationReceivedListener` farkı:**
- `addNotificationReceivedListener`: bildirim **geldiğinde** çağrılır (kullanıcı görmeden, uygulama açıkken)
- `addNotificationResponseReceivedListener`: kullanıcı bildirimi **tıkladığında** çağrılır

Deep link için ikincisi lazım.

---

## ShopApp: Sipariş Durumu Bildirimi

Gerçek uygulamada push bildirimler sunucudan geliyor. Geliştirme sırasında Expo'nun test aracıyla simüle edebilirsin:

```tsx
// Geliştirme ortamında test bildirimi gönder — gerçek push gibi davranır
async function testBildirimiGonder(siparisId: string) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Siparişin Yola Çıktı! 🚚',
      body: 'Bugün 18:00-20:00 arasında teslim edilecek.',
      data: {
        ekran: 'siparis',
        siparisId,
      },
    },
    trigger: null,
  });
}
```

Gerçek sunucu entegrasyonunda sunucu Expo Push API'yi çağırır:

```
POST https://exp.host/--/api/v2/push/send
{
  "to": "ExponentPushToken[...]",
  "title": "Siparişin Yola Çıktı! 🚚",
  "body": "Bugün 18:00-20:00 arasında teslim edilecek.",
  "data": { "ekran": "siparis", "siparisId": "ORD-123" }
}
```

---

## Android: Bildirim Kanalları

Android 8.0+'da bildirimler "kanal" (channel) altında toplanıyor. Kullanıcı her kanalı ayrı ayrı açıp kapatabiliyor.

```tsx
// app/_layout.tsx veya başlatma dosyasında
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('siparisler', {
    name: 'Sipariş Bildirimleri',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#007AFF',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('kampanyalar', {
    name: 'Kampanya ve İndirimler',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}
```

Bildirim gönderirken hangi kanalı kullanacağını belirt:

```tsx
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Büyük İndirim!',
    body: '%50 indirim bugün sona eriyor.',
    android: { channelId: 'kampanyalar' }, // bu kanalda göster
  },
  trigger: null,
});
```

**Neden kanallar önemli?**  
Kullanıcı sipariş bildirimlerini isteyip kampanya bildirimlerini istemeyebilir. Kanallar sayesinde telefon ayarlarından seçici olabiliyor. iOS'ta bu yok — tüm bildirimler uygulama bazında açık/kapalı.

---

## Badge: Uygulama İkonundaki Sayı

```tsx
// Okunmamış bildirim sayısını ikon üzerinde göster
await Notifications.setBadgeCountAsync(3); // ikon üstünde "3" görünür

// Temizle
await Notifications.setBadgeCountAsync(0);

// Mevcut sayıyı oku
const sayi = await Notifications.getBadgeCountAsync();
```

```tsx
// ShopApp: Okunmamış sipariş güncellemesi varsa badge göster
const okunmamisSiparis = siparisler.filter(s => !s.okundu).length;
useEffect(() => {
  Notifications.setBadgeCountAsync(okunmamisSiparis);
}, [okunmamisSiparis]);
```

---

## `useLastNotificationResponse`: Uygulama Kapalıyken Tıklama

Kullanıcı bildirime tıklayınca uygulamayı açtıysa, `addNotificationResponseReceivedListener` o anda henüz bağlı olmayabilir. `useLastNotificationResponse` hook'u bu senaryoyu kapsıyor:

```tsx
import { useLastNotificationResponse } from 'expo-notifications';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();
  const sonBildirimYaniti = useLastNotificationResponse();

  useEffect(() => {
    if (!sonBildirimYaniti) return;

    const veri = sonBildirimYaniti.notification.request.content.data;
    if (veri?.ekran === 'siparis' && veri?.siparisId) {
      router.push(`/orders/${veri.siparisId}`);
    }
  }, [sonBildirimYaniti]);

  // ...
}
```

**Neden ikisi birlikte?**

| Senaryo | Çözüm |
|---------|-------|
| Uygulama açıkken bildirime tıklama | `addNotificationResponseReceivedListener` |
| Uygulama kapalıyken bildirime tıklayıp açma | `useLastNotificationResponse` |
| Her ikisini de kapsamak | İkisini birlikte kullan |

---

## Web ile Karşılaştırma

| Web | React Native | Fark |
|-----|-------------|------|
| Web Push API (`ServiceWorker`) | `expo-notifications` | RN çok daha basit |
| `Notification.requestPermission()` | `requestPermissionsAsync()` | Benzer |
| Push token: VAPID key | Expo Push Token | Expo altyapısı detayları gizliyor |
| Background: Service Worker | Expo'nun altyapısı | RN'de çok daha güvenilir |
| Deep link: URL hash | `data` objesi + router.push | RN daha esnek |
| Kanallar: yok | Android channel | Native avantaj |

---

## Kontrol Soruları

1. Yerel bildirim ile push bildirim arasındaki fark ne? ShopApp'te hangisi hangi senaryo için kullanılıyor?

2. Push token neden "posta kutusu numarası" gibi? Neden fiziksel cihazda çalışıyor, simülatörde çalışmıyor?

3. `addNotificationReceivedListener` ve `addNotificationResponseReceivedListener` farkı ne? Deep link için hangisi?

4. `setNotificationHandler` ile `shouldShowAlert: true` ayarlamazsak ne olur?

5. Kullanıcı uygulamayı kapatıp bildirimi tıklayarak açıyorsa `addNotificationResponseReceivedListener` yeterli mi? Neden?

---

## Özet

| API | Ne yapar |
|-----|----------|
| `requestPermissionsAsync()` | Bildirim izni ister — bir kez, kalıcı |
| `setNotificationHandler()` | Ön planda bildirim görüntüleme davranışı |
| `scheduleNotificationAsync()` | Yerel bildirim gönder (hemen veya zamanlı) |
| `cancelAllScheduledNotificationsAsync()` | Tüm zamanlanmış bildirimleri iptal et |
| `getExpoPushTokenAsync()` | Sunucunun cihazı bulmak için kullandığı token |
| `addNotificationResponseReceivedListener()` | Kullanıcı tıkladığında — deep link için |
| `addNotificationReceivedListener()` | Bildirim geldiğinde (tıklanmadan) |
| `useLastNotificationResponse()` | Uygulama kapalıyken tıklamaları yakala |
| `setBadgeCountAsync()` | Uygulama ikonu üzerindeki sayı |
| `setNotificationChannelAsync()` | Android bildirim kanalı oluştur |

**Yarın (Gün 32):** Haptics ve Sensörler — `expo-haptics` ile dokunsal geri bildirim, `expo-sensors` ile ivmeölçer ve jiroskop, ShopApp'te pull-to-refresh haptic.
