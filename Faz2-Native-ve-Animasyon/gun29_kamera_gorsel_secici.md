# Gün 29 — Kamera ve Görsel Seçici

## Native Özellikler Neden Özel?

Web'de `<input type="file" accept="image/*" capture="camera">` yazmak yeterli. Tarayıcı gerisini hallediyor.

React Native'de kamera ve galeriye erişim direkt donanıma bağlanıyor — bu "native özellik." İki ayrı kütüphane var:

- **`expo-image-picker`**: galeriden görsel seç veya kamerayla fotoğraf çek — en kolay yol
- **`expo-camera`**: kamerayı doğrudan kontrol et — önizleme, zoom, flash, filtreleme

Fark ne? `expo-image-picker` işletim sistemi arayüzünü açıyor (iOS'un yerleşik picker'ı). `expo-camera` kamerayı bileşen olarak uygulamanın içine gömiyor — üzerine buton, filtre, overlay ekleyebiliyorsun.

**ShopApp için ne lazım?**  
Kullanıcı ürün değerlendirmesine fotoğraf eklesin — `expo-image-picker` yeterli. Barkod tarama veya özel kamera arayüzü isteseydin `expo-camera`.

---

## İzin Sistemi: Olmadan Hiçbir Şey Çalışmıyor

Kameraya veya galeriye erişmeden önce kullanıcıdan izin istemen zorunlu. iOS ve Android bunu zorluyor — izin olmadan sistem isteği reddediyor.

**Neden bu kadar katı?**  
Kullanıcı izni vermeden bir uygulama galerinizdeki fotoğraflara erişebilseydi, güvenlik ihlali olurdu. Sistem izin mekanizması bu kapıyı kapatıyor.

**İzin akışı:**
```
İzin var mı?
├── Evet → doğrudan kullan
├── Hayır, henüz sorulmadı → sor
│    ├── Kabul → kullan
│    └── Reddet → kullanıcıya açıklama göster
└── Kalıcı reddetme → ayarlara yönlendir
```

```tsx
import * as ImagePicker from 'expo-image-picker';

async function gorselSec() {
  // Galeri izni iste
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (status !== 'granted') {
    Alert.alert(
      'İzin Gerekli',
      'Görsel seçmek için galeri erişimine izin verin.',
      [
        { text: 'İptal' },
        {
          text: 'Ayarları Aç',
          onPress: () => Linking.openSettings(),
        },
      ]
    );
    return;
  }

  // İzin var — galeriyi aç
  const sonuc = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,    // kırpma arayüzü
    aspect: [4, 3],         // kırpma oranı
    quality: 0.8,            // 0-1 arası — dosya boyutu vs kalite
  });

  if (!sonuc.canceled) {
    const secilmisGorsel = sonuc.assets[0];
    console.log(secilmisGorsel.uri); // yerel dosya yolu
  }
}
```

**`quality: 0.8` neden?**  
Telefon kameraları artık 12MP+ çekiyor. Ham görsel 5-10MB. Bunu sunucuya yüklemek yavaş, depolamak pahalı. 0.8 kalite görsel kalitesini koruyor ama dosya boyutunu yarıya indiriyor.

---

## `expo-image-picker` ile Tam Uygulama

Galeriden görsel seçme ve kameradan çekme ikisi birlikte:

```tsx
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';

type GorselSecimSonucu = {
  uri: string;
  genislik: number;
  yukseklik: number;
};

async function izinKontrolVeAc(
  kaynak: 'galeri' | 'kamera'
): Promise<GorselSecimSonucu | null> {
  // 1. İzin iste
  const izinSonucu =
    kaynak === 'kamera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (izinSonucu.status !== 'granted') {
    const mesaj =
      kaynak === 'kamera'
        ? 'Fotoğraf çekmek için kamera iznine ihtiyaç var.'
        : 'Görsel seçmek için galeri iznine ihtiyaç var.';

    Alert.alert('İzin Gerekli', mesaj, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Ayarları Aç', onPress: () => Linking.openSettings() },
    ]);
    return null;
  }

  // 2. Arayüzü aç
  const sonuc =
    kaynak === 'kamera'
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1], // kare fotoğraf
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });

  if (sonuc.canceled) return null;

  const asset = sonuc.assets[0];
  return { uri: asset.uri, genislik: asset.width, yukseklik: asset.height };
}
```

---

## ShopApp: Ürün Değerlendirmesine Fotoğraf Ekle

Kullanıcı ürün detay sayfasında değerlendirme yazıp fotoğraf ekleyebilsin:

```tsx
// components/DegerlendirmeFormu.tsx
import { useState } from 'react';
import { View, TextInput, Image, Pressable, Text, StyleSheet, Alert, ActionSheetIOS, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

type Props = { urunId: string; onGonder: (yorum: string, gorselUri?: string) => void };

export function DegerlendirmeFormu({ urunId, onGonder }: Props) {
  const [yorum, setYorum] = useState('');
  const [gorselUri, setGorselUri] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gorselEkle() {
    // iOS: ActionSheet ile kaynak seç
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['İptal', 'Fotoğraf Çek', 'Galeriden Seç'],
          cancelButtonIndex: 0,
        },
        async (butonIndex) => {
          if (butonIndex === 1) await gorselSec('kamera');
          if (butonIndex === 2) await gorselSec('galeri');
        }
      );
    } else {
      // Android: Alert ile kaynak seç
      Alert.alert('Görsel Ekle', 'Kaynağı seçin:', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Fotoğraf Çek', onPress: () => gorselSec('kamera') },
        { text: 'Galeriden Seç', onPress: () => gorselSec('galeri') },
      ]);
    }
  }

  async function gorselSec(kaynak: 'kamera' | 'galeri') {
    const izinSonucu =
      kaynak === 'kamera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (izinSonucu.status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Lütfen ayarlardan izin verin.', [
        { text: 'Tamam' },
        { text: 'Ayarlar', onPress: () => Linking.openSettings() },
      ]);
      return;
    }

    const sonuc =
      kaynak === 'kamera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });

    if (!sonuc.canceled) {
      setGorselUri(sonuc.assets[0].uri);
    }
  }

  async function gonder() {
    if (!yorum.trim()) {
      Alert.alert('Hata', 'Lütfen bir yorum yazın.');
      return;
    }
    setYukleniyor(true);
    try {
      await onGonder(yorum, gorselUri ?? undefined);
      setYorum('');
      setGorselUri(null);
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <View style={styles.konteyner}>
      <TextInput
        value={yorum}
        onChangeText={setYorum}
        placeholder="Ürün hakkında ne düşünüyorsunuz?"
        multiline
        numberOfLines={4}
        style={styles.girdi}
      />

      {/* Görsel önizleme */}
      {gorselUri && (
        <View style={styles.onizlemeKonteyner}>
          <Image source={{ uri: gorselUri }} style={styles.onizleme} />
          <Pressable
            onPress={() => setGorselUri(null)}
            style={styles.kaldir}
          >
            <Ionicons name="close-circle" size={24} color="white" />
          </Pressable>
        </View>
      )}

      <View style={styles.altSatir}>
        {/* Fotoğraf ekle butonu */}
        <Pressable onPress={gorselEkle} style={styles.gorselButon}>
          <Ionicons name="camera-outline" size={20} color="#007AFF" />
          <Text style={styles.gorselButonYazi}>
            {gorselUri ? 'Değiştir' : 'Fotoğraf Ekle'}
          </Text>
        </Pressable>

        {/* Gönder butonu */}
        <Pressable
          onPress={gonder}
          disabled={yukleniyor}
          style={[styles.gonderButon, yukleniyor && styles.devreDisi]}
        >
          <Text style={styles.gonderYazi}>
            {yukleniyor ? 'Gönderiliyor...' : 'Gönder'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  konteyner: { padding: 16, backgroundColor: 'white', borderRadius: 12 },
  girdi: {
    borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8,
    padding: 12, minHeight: 100, textAlignVertical: 'top',
  },
  onizlemeKonteyner: { marginTop: 8, position: 'relative', alignSelf: 'flex-start' },
  onizleme: { width: 120, height: 90, borderRadius: 8 },
  kaldir: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
  },
  altSatir: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  gorselButon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gorselButonYazi: { color: '#007AFF', fontSize: 15 },
  gonderButon: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  devreDisi: { opacity: 0.5 },
  gonderYazi: { color: 'white', fontWeight: '600' },
});
```

**`ActionSheetIOS` neden kullanıyoruz?**  
iOS'ta seçenek sunmanın standart yolu ActionSheet — alttan kayarak çıkan menü. Android'de bu yerleşik bileşen yok, `Alert` ile simüle ediyoruz. `Platform.OS === 'ios'` kontrolüyle ikisini ayırıyoruz.

---

## `expo-camera`: Kamerayı Bileşen Olarak Göm

`expo-image-picker` OS arayüzünü açıyordu. `expo-camera` ise kamerayı senin ekranına gömiyor — üzerine istediğin şeyi koyabiliyorsun.

**Ne zaman `expo-camera` kullanırsın?**
- Barkod / QR kod tarama — anlık tarama gerekiyor
- Özel kamera arayüzü — kendi butonların, filtrelerin
- Canlı kamera önizlemesi — çekilmeden önce göster

```tsx
// ShopApp: Barkod ile ürün ara
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';

export function BarcodTarayici({ onTarandi }: { onTarandi: (barkod: string) => void }) {
  const [izin, izinIste] = useCameraPermissions();
  const [tarandiMi, setTarandiMi] = useState(false);

  if (!izin) return null; // henüz yüklenmedi

  if (!izin.granted) {
    return (
      <View style={styles.izinEkran}>
        <Text>Barkod taramak için kamera iznine ihtiyaç var.</Text>
        <Button title="İzin Ver" onPress={izinIste} />
      </View>
    );
  }

  return (
    <View style={styles.konteyner}>
      <CameraView
        style={styles.kamera}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr'] }}
        onBarcodeScanned={({ data }) => {
          if (tarandiMi) return; // bir kez tara, sürekli tetiklenmesin
          setTarandiMi(true);
          onTarandi(data);
        }}
      />

      {/* Tarama çerçevesi — sadece görsel, işlevsel değil */}
      <View style={styles.cerceve} />

      <Text style={styles.ipucu}>Barkodu çerçeve içine alın</Text>
    </View>
  );
}
```

**`tarandiMi` neden gerekli?**  
`onBarcodeScanned` kamera her kareyi analiz ettiği için saniyede birçok kez tetikleniyor. Bayrak olmadan `onTarandi` saniyede 30 kez çağrılırdı.

---

## Görsel Yükleme: FormData ile Sunucuya Gönder

Yerel `uri` aldıktan sonra bunu sunucuya göndermen gerekiyor. React Native'de dosya yükleme `FormData` ile yapılıyor:

```tsx
async function gorselYukle(uri: string, urunId: string): Promise<string> {
  const formData = new FormData();

  // ⚠️ React Native'de FormData dosya ekleme web'den farklı
  formData.append('gorsel', {
    uri,                    // yerel dosya yolu
    type: 'image/jpeg',     // MIME tipi
    name: `urun-${urunId}.jpg`, // sunucudaki dosya adı
  } as any); // TypeScript bilmiyor, `as any` gerekli

  formData.append('urunId', urunId);

  const yanit = await apiClient.post('/degerlendirmeler/gorsel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // JSON değil, form data
    },
  });

  return yanit.data.gorselUrl; // sunucunun döndürdüğü URL
}
```

**`as any` neden?**  
TypeScript'in `FormData.append` tipi dosya nesnesini `{ uri, type, name }` şeklinde kabul etmiyor — Web standardına göre tip tanımlı. React Native bunu desteklese de TypeScript bilmiyor. Bu bilinen bir quirk.

---

## `usePermissions` Hook: İzin Durumunu İzle

`expo-image-picker` ve `expo-camera` her ikisi de `usePermissions` hook'u sunuyor:

```tsx
import { useCameraPermissions, useMediaLibraryPermissions } from 'expo-image-picker';

function Component() {
  const [kameraIzin, kameraIzinIste] = useCameraPermissions();
  const [galeriIzin, galeriIzinIste] = useMediaLibraryPermissions();

  // kameraIzin: null (yükleniyor) | { granted: bool, canAskAgain: bool, status: string }

  if (!kameraIzin?.granted && !kameraIzin?.canAskAgain) {
    // Kalıcı reddetme — artık sorma, ayarlara yönlendir
    return <AyarlariAcButon />;
  }

  if (!kameraIzin?.granted) {
    // Henüz sormadı veya bir kere reddetti — tekrar sorabilir
    return <IzinButon onPress={kameraIzinIste} />;
  }

  return <KameraArayuzu />;
}
```

**`canAskAgain` önemli:**  
Kullanıcı bir kez reddetti → tekrar sorabilirsin (`canAskAgain: true`).
Kullanıcı "bir daha sorma" seçti veya iki kez reddetti → artık soramazsın (`canAskAgain: false`). Ayarlara yönlendirmek zorundasın.

---

## Web ile Karşılaştırma

| Web | React Native | Fark |
|-----|-------------|------|
| `<input type="file" accept="image/*">` | `expo-image-picker` | OS arayüzü açılıyor |
| `<input capture="camera">` | `launchCameraAsync()` | Aynı — OS kamera |
| `getUserMedia()` | `expo-camera` | Kamerayı bileşen olarak göm |
| İzin: tarayıcı pop-up | İzin: OS sistem iletişim kutusu | Native daha kalıcı — "bir daha sorma" |
| `FileReader.readAsDataURL()` | Yerel `uri` — `file://...` | Farklı yaklaşım |
| `FormData` aynı | `FormData` + `{ uri, type, name }` | RN'de dosya alanı farklı |

---

## Kontrol Soruları

1. `expo-image-picker` ile `expo-camera` arasındaki fark ne? ShopApp için hangisini kullanırsın, neden?

2. Kullanıcı galeri iznini reddetti. `canAskAgain: true` ve `canAskAgain: false` arasındaki fark ne? Her birinde ne yaparsın?

3. `onBarcodeScanned` saniyede neden çok kez tetikleniyor? Bunu önlemek için ne yapıyoruz?

4. Sunucuya görsel göndermek için `FormData` kullanıyoruz. Web'deki `FormData`'dan ne farkı var?

5. `quality: 0.8` neden seçtik? 1.0 kullansaydık ne olurdu?

---

## Özet

| API | Ne yapar |
|-----|----------|
| `launchImageLibraryAsync()` | Galeriyi açar, kullanıcı görsel seçer |
| `launchCameraAsync()` | Kamerayı açar, fotoğraf çeker |
| `requestMediaLibraryPermissionsAsync()` | Galeri izni ister |
| `requestCameraPermissionsAsync()` | Kamera izni ister |
| `useCameraPermissions()` | İzin durumunu hook olarak izler |
| `canAskAgain` | Tekrar izin isteyebilir miyiz? |
| `CameraView` | Kamerayı bileşen olarak ekrana göm |
| `onBarcodeScanned` | Barkod/QR tespit edilince çağrılır |
| `FormData` | Görsel sunucuya yükleme |

**Yarın (Gün 30):** Konum (Location) — `expo-location`, GPS koordinatları, adres dönüştürme (reverse geocoding), ShopApp'te teslimat adresi tespiti.
