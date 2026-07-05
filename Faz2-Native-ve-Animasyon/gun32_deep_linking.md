# Gün 32 — Deep Linking ve Evrensel Bağlantılar

## Deep Link Nedir?

Bir e-posta aldın: "Siparişini takip et." Linke tıklıyorsun — tarayıcı açılmıyor, doğrudan ShopApp açılıyor ve sipariş detay ekranı geliyor. Bu **deep link**.

Web'de URL her zaman doğrudan bir sayfaya götürür: `https://shopapp.com/orders/123` → sipariş sayfası. Mobilde benzer ama farklı iki yaklaşım var:

**Custom Scheme:** `shopapp://orders/123`
- Uygulama açıksa direkt gider
- Uygulama yüklü değilse hiçbir şey olmaz — hata mesajı
- Web'den gelen linklerle çalışmaz (`<a href>` custom scheme'i açamaz)

**Universal Link (iOS) / App Link (Android):** `https://shopapp.com/orders/123`
- Normal HTTPS URL — ama uygulama yüklüyse direkt açar
- Uygulama yüklü değilse web sitesini açar — graceful fallback
- Email, SMS, WhatsApp — her yerden çalışır

**ShopApp için hangisi?**  
İkisi birlikte. Custom scheme geliştirme ve push notification içi için, Universal Link production için.

---

## Expo Router ile Deep Link Yapılandırması

Expo Router'da deep link büyük ölçüde otomatik — dosya adı = route = deep link.

```json
// app.json
{
  "expo": {
    "scheme": "shopapp",
    "ios": {
      "bundleIdentifier": "com.sirketniz.shopapp",
      "associatedDomains": ["applinks:shopapp.com"]
    },
    "android": {
      "package": "com.sirketniz.shopapp",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "shopapp.com",
              "pathPrefix": "/"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

**`scheme: "shopapp"`** → `shopapp://` ile başlayan linkleri bu uygulama açar.

**`associatedDomains`** → iOS'ta `https://shopapp.com` linklerini uygulamanın açmasına izin verir. Bunun çalışması için web sunucusunda `/.well-known/apple-app-site-association` dosyası gerekir.

**`autoVerify: true`** → Android'de `https://shopapp.com` linklerini uygulamanın açmasını doğrular. Web sunucusunda `/.well-known/assetlinks.json` gerekir.

---

## Expo Router: Otomatik Deep Link

Expo Router'da dosya adı zaten URL — ayrıca bir şey yapman gerekmez:

```
app/
├── (tabs)/
│   ├── index.tsx          → shopapp:///  veya https://shopapp.com/
│   ├── cart.tsx           → shopapp:///cart
│   └── profile.tsx        → shopapp:///profile
├── product/
│   └── [id].tsx           → shopapp:///product/123
├── orders/
│   └── [orderId].tsx      → shopapp:///orders/ORD-456
└── category/
    └── [slug].tsx         → shopapp:///category/elektronik
```

```tsx
// app/product/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function ProductDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // shopapp:///product/123 ile açıldıysa → id = "123"
  // https://shopapp.com/product/123 ile açıldıysa → id = "123"
  // Push bildirimine tıklandıysa → id bildirim data'sından gelir
}
```

---

## `Linking` API: Manuel Kontrol

Expo Router her şeyi hallediyor ama bazen manuel kontrol gerekir.

### Uygulama Link ile Açıldıysa: `getInitialURL`

Kullanıcı uygulama **kapalıyken** bir linke tıklayıp uygulamayı açtı. Bu ilk URL'yi almak için:

```tsx
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Uygulama bu linkle açıldı mı?
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Uygulama şu linkle açıldı:', url);
        // Expo Router zaten hallediyor — ama özel analitik için kullanabilirsin
      }
    });
  }, []);
}
```

**Expo Router zaten `getInitialURL`'yi kendi hallediyor** — doğru sayfayı otomatik açıyor. Buna sadece analitik (hangi linkten geldi?) veya özel işlem gerekiyorsa ihtiyaç var.

### Uygulama Açıkken Link Gelirse: `addEventListener`

Kullanıcı uygulamayı kullanırken başka bir uygulamadan (WhatsApp, e-posta) bir deep link tıkladı:

```tsx
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    const abonelik = Linking.addEventListener('url', ({ url }) => {
      console.log('Uygulama açıkken link geldi:', url);
      // Expo Router bunu da hallediyor — özel işlem için kullan
    });

    return () => abonelik.remove(); // cleanup
  }, []);
}
```

**Gerçekte Expo Router bu iki senaryoyu zaten yönetiyor.** `Linking` API'yi doğrudan yalnızca Expo Router dışında bir şey yapman gerektiğinde kullan.

---

## ShopApp: Push Bildirim → Deep Link Entegrasyonu

Gün 31'de push bildirimlere `data` objesi ekledin. Şimdi o data'yı deep link'e dönüştürüyorsun:

```tsx
// app/_layout.tsx
import * as Notifications from 'expo-notifications';
import { useLastNotificationResponse } from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

// Bildirim data'sını route'a dönüştür
function bildirimdenRouteAl(data: Record<string, unknown>): string | null {
  if (data.ekran === 'urun' && data.urunId) {
    return `/product/${data.urunId}`;
  }
  if (data.ekran === 'siparis' && data.siparisId) {
    return `/orders/${data.siparisId}`;
  }
  if (data.ekran === 'sepet') {
    return '/(tabs)/cart';
  }
  if (data.ekran === 'kampanya' && data.kampanyaId) {
    return `/kampanya/${data.kampanyaId}`;
  }
  return null;
}

export default function RootLayout() {
  const router = useRouter();

  // Uygulama kapalıyken bildirime tıklanınca
  const sonBildirimYaniti = useLastNotificationResponse();
  useEffect(() => {
    if (!sonBildirimYaniti) return;

    const veri = sonBildirimYaniti.notification.request.content.data;
    const route = bildirimdenRouteAl(veri as Record<string, unknown>);
    if (route) router.push(route as never);
  }, [sonBildirimYaniti]);

  // Uygulama açıkken bildirime tıklanınca
  useEffect(() => {
    const abonelik = Notifications.addNotificationResponseReceivedListener((yanit) => {
      const veri = yanit.notification.request.content.data;
      const route = bildirimdenRouteAl(veri as Record<string, unknown>);
      if (route) router.push(route as never);
    });

    return () => abonelik.remove();
  }, []);
}
```

**`bildirimdenRouteAl` fonksiyonunu ayırmak neden iyi?**  
İki ayrı listener'da (kapalıyken + açıkken) aynı yönlendirme mantığı. Merkeze alınca tek yerden güncelleniyor.

---

## ShopApp: Dışarıdan Link Oluştur

Paylaşım, e-posta, SMS için uygulama linkleri üret:

```tsx
// utils/deeplink.ts
import * as Linking from 'expo-linking';

// Development: custom scheme
// Production: universal link (web sunucusu kuruluysa)
const BASE_URL = __DEV__
  ? Linking.createURL('/')           // → "shopapp:///"
  : 'https://shopapp.com/';

export const deeplinks = {
  urun: (id: string) => `${BASE_URL}product/${id}`,
  siparis: (id: string) => `${BASE_URL}orders/${id}`,
  kategori: (slug: string) => `${BASE_URL}category/${slug}`,
  davetKodu: (kod: string) => `${BASE_URL}referral?code=${kod}`,
};
```

```tsx
// components/ShareButton.tsx
import { Share } from 'react-native';
import { deeplinks } from '@/utils/deeplink';

export function ShareButton({ urunId, urunAdi }: Props) {
  async function paylasim() {
    await Share.share({
      title: urunAdi,
      message: `${urunAdi} — ShopApp'te incele: ${deeplinks.urun(urunId)}`,
      url: deeplinks.urun(urunId), // iOS'ta ayrı URL alanı
    });
  }

  return (
    <Pressable onPress={paylasim} accessibilityLabel="Ürünü paylaş" accessibilityRole="button">
      <Ionicons name="share-outline" size={24} />
    </Pressable>
  );
}
```

---

## Linkin Açılabilir Olup Olmadığını Kontrol Et

Custom scheme'i desteklemeyen cihazlar için kontrol:

```tsx
import * as Linking from 'expo-linking';

async function linkAcabilirMi(url: string): Promise<boolean> {
  return await Linking.canOpenURL(url);
}

// Başka bir uygulamayı açmak istiyorsun
async function haritadaGoster(adres: string) {
  const googleMaps = `comgooglemaps://?q=${encodeURIComponent(adres)}`;
  const appleMaps = `maps://?q=${encodeURIComponent(adres)}`;

  if (await Linking.canOpenURL(googleMaps)) {
    await Linking.openURL(googleMaps);
  } else if (await Linking.canOpenURL(appleMaps)) {
    await Linking.openURL(appleMaps);
  } else {
    // Harita uygulaması yoksa web'i aç
    await Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(adres)}`);
  }
}
```

---

## Deep Link Test Etme

### Geliştirme Ortamında Test

```bash
# Custom scheme ile test (terminal)
npx uri-scheme open "shopapp:///product/123" --ios
npx uri-scheme open "shopapp:///product/123" --android

# Veya doğrudan
xcrun simctl openurl booted "shopapp:///orders/ORD-456"
adb shell am start -W -a android.intent.action.VIEW -d "shopapp:///cart" com.sirketniz.shopapp
```

```tsx
// Dev menüsünden test için komponent
function DeepLinkTester() {
  if (!__DEV__) return null;

  const testLinks = [
    { label: 'Ürün Detay', url: 'shopapp:///product/1' },
    { label: 'Sipariş', url: 'shopapp:///orders/ORD-123' },
    { label: 'Sepet', url: 'shopapp:///cart' },
  ];

  return (
    <View>
      {testLinks.map(({ label, url }) => (
        <Pressable key={url} onPress={() => Linking.openURL(url)}>
          <Text>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
```

---

## Universal Link İçin Sunucu Tarafı

Universal Link çalışması için web sunucunda iki dosya gerekiyor:

**iOS — `/.well-known/apple-app-site-association`:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.sirketniz.shopapp",
        "paths": ["/product/*", "/orders/*", "/category/*"]
      }
    ]
  }
}
```

**Android — `/.well-known/assetlinks.json`:**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.sirketniz.shopapp",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```

Bu dosyalar `Content-Type: application/json` ile servis edilmeli ve HTTPS zorunlu.

---

## Web ile Karşılaştırma

| Web | React Native | Fark |
|-----|-------------|------|
| URL her zaman doğrudan sayfa | Custom scheme veya Universal Link | İki yol var |
| `window.location.href` | `Linking.openURL()` | Benzer ama async |
| `useSearchParams()` | `useLocalSearchParams()` | Neredeyse aynı |
| `history.pushState()` | `router.push()` | Aynı mantık |
| Tüm URL'ler tarayıcıda | Custom scheme sadece uygulama | Farklı alan |
| PWA deep link: manifest scope | Universal Link: AASA dosyası | Benzer konsept |

---

## Kontrol Soruları

1. Custom scheme (`shopapp://`) ile Universal Link (`https://`) arasındaki kritik fark ne? Biri çalışmazken diğeri neden çalışır?

2. `Linking.getInitialURL()` neden Expo Router'da genellikle gerekmez? Ne zaman gerekir?

3. Push bildirimden deep link açarken `useLastNotificationResponse` ile `addNotificationResponseReceivedListener` hangi senaryoyu kapsıyor? İkisi birlikte neden gerekli?

4. `Share.share()` içinde `message` ve `url` ayrı alanlar — iOS'ta neden her ikisi var?

5. Universal Link için sunucuda hangi dosyalar neden gerekiyor? Bu dosyalar olmadan ne olur?

---

## Özet

| Konu | Özet |
|------|------|
| Custom scheme | `shopapp://` — sadece uygulama yüklüyse çalışır |
| Universal Link / App Link | `https://` — fallback web, production için |
| `app.json scheme` | Custom scheme tanımı |
| `associatedDomains` | iOS Universal Link için |
| `intentFilters` | Android App Link için |
| Expo Router | Dosya adı = route = deep link — otomatik |
| `Linking.getInitialURL()` | Uygulama link ile açıldıysa ilk URL |
| `Linking.addEventListener` | Uygulama açıkken gelen linkler |
| `bildirimdenRouteAl` | Push data → route dönüşümü |
| `Share.share()` | Ürün linkini paylaş |
| `canOpenURL()` | Link açılabilir mi kontrol |

**Yarın (Gün 33):** Offline First ve NetInfo — internet bağlantısı kesilince ne olur? `@react-native-community/netinfo`, TanStack Query offline cache, optimistic update, sync queue.
