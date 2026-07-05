# Gün 30 — Konum (Location)

## Neden Konum?

E-ticaret uygulamalarında konum birkaç kritik yerde kullanılıyor:

- **Teslimat adresi tespiti**: "Konumumu kullan" butonu — kullanıcı adres girmek yerine GPS'e bırakıyor
- **Yakındaki mağaza**: "Bana en yakın şube" listesi
- **Kargo takibi**: kurye nerede? haritada göster
- **Yerelleştirme**: şehre göre stok ve fiyat göster

`expo-location` bu işlemlerin tamamını kapsamlı bir API ile sunuyor.

---

## İzin Sistemi: Foreground vs Background

Dün kamera iznini gördün. Konum izninde ekstra bir katman var: **foreground** ve **background**.

**Foreground izni:** Uygulama açıkken konum al — standart, çoğu uygulama bu kadar istiyor.

**Background izni:** Uygulama arka planda veya kapalıyken konum al — kargo kurye takibi gibi kritik senaryolar.

**Analoji: Taksi sürücüsü**  
Foreground: takside oturuyorsun, sürücü nerede olduğunu biliyor.  
Background: taksiden indin, sürücü hâlâ seni takip ediyor.

İkincisi açıkça daha müdahaleci — iOS ve Android bu izni çok daha dikkatli veriyor, uygulama mağazaları da neden gerektiğini soruyor.

ShopApp için **sadece foreground** yeterli.

```tsx
import * as Location from 'expo-location';

async function konumIzniAl() {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      'Konum İzni Gerekli',
      'Teslimat adresi tespiti için konum erişimine izin verin.',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Ayarları Aç', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
  return true;
}
```

---

## `getCurrentPositionAsync`: Tek Seferlik Konum

```tsx
import * as Location from 'expo-location';

async function mevcutKonumuAl() {
  const izinVar = await konumIzniAl();
  if (!izinVar) return;

  const konum = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced, // hız ve doğruluk dengesi
  });

  console.log(konum.coords.latitude);   // enlem — örn. 41.0082
  console.log(konum.coords.longitude);  // boylam — örn. 28.9784
  console.log(konum.coords.accuracy);   // metre cinsinden hata payı
}
```

### Accuracy Seviyeleri

```tsx
Location.Accuracy.Lowest     // ~3km hata — pil dostu, neredeyse işe yaramaz
Location.Accuracy.Low        // ~1km hata
Location.Accuracy.Balanced   // ~100m hata — çoğu kullanım için yeterli
Location.Accuracy.High       // ~10m hata
Location.Accuracy.Highest    // ~1m hata — GPS tam güç, pil eriyebilir
Location.Accuracy.BestForNavigation // navigasyon uygulamaları için
```

**`Balanced` neden seçtik?**  
Teslimat adresi için 100 metre yeterince doğru — bina düzeyinde konum alınıyor. `Highest` seçseydin pil harcaması artardı, kullanıcı bekleme süresi uzardı. Trafikte navigasyon için `BestForNavigation` gerekir ama bizim kullanım durumu bu değil.

**Nasıl çalışır perde arkası?**  
- Düşük accuracy: WiFi ağlarına ve hücre kulesi sinyallerine bakıyor — hızlı ama kabaca
- Yüksek accuracy: GPS satelitlerini kullanıyor — doğru ama yavaş (soğukta veya kapalı alanda çok yavaş)

---

## Reverse Geocoding: Koordinatı Adrese Çevir

GPS koordinatları (`41.0082, 28.9784`) kullanıcıya gösterilemez. `reverseGeocodeAsync` bunu okunabilir adrese çeviriyor.

```tsx
async function koordinattenAdresAl(
  enlem: number,
  boylam: number
): Promise<string> {
  const sonuclar = await Location.reverseGeocodeAsync({
    latitude: enlem,
    longitude: boylam,
  });

  if (sonuclar.length === 0) return 'Adres bulunamadı';

  const adres = sonuclar[0];
  // adres.street, adres.district, adres.city, adres.country, adres.postalCode

  const parcalar = [
    adres.street,
    adres.streetNumber,
    adres.district,
    adres.city,
  ].filter(Boolean); // null/undefined olanları çıkar

  return parcalar.join(', ');
}

// Kullanım:
// koordinattenAdresAl(41.0082, 28.9784)
// → "İstiklal Caddesi, 1, Beyoğlu, İstanbul"
```

**Ağ bağlantısı gerektiriyor mu?**  
Evet. Reverse geocoding bir API çağrısı — Expo'nun arka planda kullandığı harita servisine sorgu gidiyor. Çevrimdışıyken çalışmıyor.

**Ücretli mi?**  
Expo Go'da ve geliştirme modunda ücretsiz. Production build'de belirli bir kota var, aşarsan ücretlendirme başlıyor. Alternatif: Google Maps Geocoding API'sini kendin çağırabilirsin — daha güvenilir, kotayı kendin kontrol edersin.

---

## ShopApp: Teslimat Adresi Tespiti

Ödeme sayfasında "Konumumu Kullan" butonu:

```tsx
// components/TeslimatAdresi.tsx
import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

type Adres = {
  tam: string;
  enlem: number;
  boylam: number;
};

type Props = {
  onAdresSecildi: (adres: Adres) => void;
};

export function TeslimatAdresi({ onAdresSecildi }: Props) {
  const [yukleniyor, setYukleniyor] = useState(false);
  const [adres, setAdres] = useState<string | null>(null);

  async function konumKullan() {
    setYukleniyor(true);

    try {
      // 1. İzin kontrolü
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Konum İzni',
          'Konumunuzu kullanmak için izin verin.',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Ayarlar', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // 2. Konum al
      const konum = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 3. Adrese çevir
      const sonuclar = await Location.reverseGeocodeAsync({
        latitude: konum.coords.latitude,
        longitude: konum.coords.longitude,
      });

      if (sonuclar.length === 0) {
        Alert.alert('Hata', 'Adres bilgisi alınamadı.');
        return;
      }

      const a = sonuclar[0];
      const tamAdres = [a.street, a.streetNumber, a.district, a.city, a.postalCode]
        .filter(Boolean)
        .join(', ');

      setAdres(tamAdres);
      onAdresSecildi({
        tam: tamAdres,
        enlem: konum.coords.latitude,
        boylam: konum.coords.longitude,
      });
    } catch (hata) {
      Alert.alert('Hata', 'Konum alınamadı. GPS açık mı?');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <View style={styles.konteyner}>
      <Text style={styles.etiket}>Teslimat Adresi</Text>

      {adres ? (
        <View style={styles.adresKutu}>
          <Ionicons name="location" size={18} color="#34C759" />
          <Text style={styles.adresYazi}>{adres}</Text>
          <Pressable onPress={() => setAdres(null)} style={styles.degistir}>
            <Text style={styles.degistirYazi}>Değiştir</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={konumKullan}
          disabled={yukleniyor}
          style={styles.konumButon}
        >
          {yukleniyor ? (
            <ActivityIndicator color="#007AFF" size="small" />
          ) : (
            <Ionicons name="locate-outline" size={20} color="#007AFF" />
          )}
          <Text style={styles.konumButonYazi}>
            {yukleniyor ? 'Konum alınıyor...' : 'Konumumu Kullan'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  konteyner: { padding: 16 },
  etiket: { fontSize: 13, color: '#6C6C70', marginBottom: 8 },
  adresKutu: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F2FFF5', padding: 12, borderRadius: 10,
  },
  adresYazi: { flex: 1, fontSize: 15, color: '#1C1C1E', lineHeight: 20 },
  degistir: { padding: 4 },
  degistirYazi: { color: '#007AFF', fontSize: 13 },
  konumButon: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#007AFF', borderRadius: 10,
    padding: 14, justifyContent: 'center',
  },
  konumButonYazi: { color: '#007AFF', fontSize: 15, fontWeight: '500' },
});
```

---

## `watchPositionAsync`: Sürekli Konum Takibi

Tek seferlik konum yetmiyorsa — canlı kurye takibi gibi — `watchPositionAsync` kullanıyorsun. Parmak değdikçe değil, konum her değiştiğinde otomatik çağrılıyor.

```tsx
import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

function CanlıKonumTakibi({ onKonumGuncellendi }: { onKonumGuncellendi: (k: Location.LocationObject) => void }) {
  const abonelikRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let aktif = true;

    async function baslat() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !aktif) return;

      // Aboneliği başlat — her 10 metrede bir veya her 5 saniyede bir güncelle
      abonelikRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,   // metre — en az 10m hareket edince güncelle
          timeInterval: 5000,     // ms — en az 5 saniyede bir güncelle
        },
        (konum) => {
          onKonumGuncellendi(konum);
        }
      );
    }

    baslat();

    return () => {
      aktif = false;
      abonelikRef.current?.remove(); // component unmount olunca dur
    };
  }, []);

  return null; // görsel yok, sadece veri
}
```

**`abonelikRef.current?.remove()` neden önemli?**  
`watchPositionAsync` arka planda çalışmaya devam eder — component ekrandan kalktıktan sonra bile. Temizlemezsen GPS pili boşaltıyor ve muhtemelen hata aldın. Cleanup fonksiyonunda `.remove()` çağırmak zorunlu.

**`distanceInterval` vs `timeInterval`:**  
İkisi OR ilişkisi — hangisi önce gerçekleşirse güncelle. Kullanıcı sabit duruyorsa 5 saniyede bir güncelleme gereksiz pil harcar. Sadece `distanceInterval` kullanabilirsin.

---

## Geocoding: Adres → Koordinat

Reverse'in tersi: kullanıcı adres yazdı, koordinata çevir. Haritada göstermek veya mesafe hesaplamak için.

```tsx
async function adresTenKordinatAl(adresMetni: string) {
  const sonuclar = await Location.geocodeAsync(adresMetni);

  if (sonuclar.length === 0) {
    throw new Error('Adres bulunamadı');
  }

  return {
    enlem: sonuclar[0].latitude,
    boylam: sonuclar[0].longitude,
  };
}

// Kullanım:
// adresTenKordinatAl("Taksim Meydanı, İstanbul")
// → { enlem: 41.0370, boylam: 28.9850 }
```

---

## İki Nokta Arasındaki Mesafe

Kullanıcının konumu ile mağaza arasındaki mesafeyi hesaplamak için Haversine formülü kullanılıyor. `expo-location` bunu doğrudan sunmuyor ama basit bir util yazılabilir:

```tsx
// utils/mesafe.ts
export function metreCinsindenMesafe(
  enlem1: number, boylam1: number,
  enlem2: number, boylam2: number
): number {
  const R = 6371000; // dünya yarıçapı (metre)
  const φ1 = (enlem1 * Math.PI) / 180;
  const φ2 = (enlem2 * Math.PI) / 180;
  const Δφ = ((enlem2 - enlem1) * Math.PI) / 180;
  const Δλ = ((boylam2 - boylam1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Kullanım:
// metreCinsindenMesafe(41.01, 28.97, 41.04, 28.99) → ~3500 (metre)
// Kilometre için: / 1000
```

### ShopApp: En Yakın Mağazayı Bul

```tsx
const magazalar = [
  { id: '1', ad: 'Kadıköy', enlem: 40.9902, boylam: 29.0233 },
  { id: '2', ad: 'Beşiktaş', enlem: 41.0435, boylam: 29.0040 },
  { id: '3', ad: 'Şişli', enlem: 41.0602, boylam: 28.9877 },
];

function enYakinMagazaBul(kullaniciEnlem: number, kullaniciBboylam: number) {
  return [...magazalar].sort((a, b) => {
    const mesafeA = metreCinsindenMesafe(kullaniciEnlem, kullaniciBboylam, a.enlem, a.boylam);
    const mesafeB = metreCinsindenMesafe(kullaniciEnlem, kullaniciBboylam, b.enlem, b.boylam);
    return mesafeA - mesafeB;
  })[0]; // en yakın
}
```

---

## Web ile Karşılaştırma

| Web | React Native | Fark |
|-----|-------------|------|
| `navigator.geolocation.getCurrentPosition()` | `Location.getCurrentPositionAsync()` | Benzer, Promise tabanlı |
| `navigator.geolocation.watchPosition()` | `Location.watchPositionAsync()` | Subscription nesne döner (remove() ile kapat) |
| Reverse geocoding: yok (harici API lazım) | `Location.reverseGeocodeAsync()` | Expo hazır sunuyor |
| İzin: tarayıcı pop-up | Foreground/Background ayrımı | Native daha detaylı |
| Background tracking: yok | `Background Location` özel izin | Native avantajı |

---

## Kontrol Soruları

1. Foreground ve background konum izni arasındaki fark ne? ShopApp için hangisi gerekli, neden?

2. `Accuracy.Balanced` vs `Accuracy.Highest` trade-off'u ne? Teslimat adresi için hangisi yeterli?

3. `watchPositionAsync` kullandıktan sonra `remove()` çağırmazsak ne olur?

4. Reverse geocoding çevrimdışı çalışıyor mu? Neden?

5. `distanceInterval: 10` ve `timeInterval: 5000` birlikte ayarlanmış. Kullanıcı 20 dakika yerinden kımıldamazsa kaç kez güncelleme gelir?

---

## Özet

| API | Ne yapar |
|-----|----------|
| `requestForegroundPermissionsAsync()` | Uygulama açıkken konum izni ister |
| `getCurrentPositionAsync()` | Tek seferlik anlık konum |
| `watchPositionAsync()` | Sürekli konum takibi — güncelleme gelince callback |
| `reverseGeocodeAsync()` | Koordinat → okunabilir adres |
| `geocodeAsync()` | Adres metni → koordinat |
| `Location.Accuracy.*` | GPS doğruluğu — pil vs hassasiyet dengesi |
| `.remove()` | watchPosition aboneliğini sonlandır |

**Yarın (Gün 31):** Push Bildirimleri — `expo-notifications`, izin alma, yerel bildirim gönderme, bildirime tıklanınca deep link, ShopApp'te sipariş güncelleme bildirimi.
