# Gün 38 — Accessibility (A11y): Ekran Okuyucu Desteği

## Kim Kullanıyor, Neden Önemli?

Görme engelli bir kullanıcı telefonu tamamen VoiceOver (iOS) veya TalkBack (Android) ile kullanıyor. Parmağını kaydırıyor, her dokunduğu öğe sesli okunuyor. "Sepete Ekle" butonunun üzerine gelince "Düğme — Sepete Ekle" diyor.

Ama ShopApp'teki favori butonunda sadece kalp ikonu var, metin yok. VoiceOver ne diyor? **"Görüntü."** Kullanıcı ne yapacağını bilemiyor.

**Sadece görme engelliler değil:**
- Motor engeli olanlar Switch Access ile tek düğmeyle geziniyor
- Yaşlı kullanıcılar büyük yazı boyutu kullanıyor
- Güneşli ortamda ekranı görmekte zorlanan herkes kontrast oranından yararlanıyor

**Hukuki boyut:** AB ve ABD'de kamu uygulamalarının WCAG standartlarını karşılaması zorunlu. App Store incelemelerinde de kontrol ediliyor.

**Kariyer boyutu:** Büyük şirket mülakatlarında mutlaka soruluyor.

---

## `accessibilityLabel`: "Bu Öğe Ne?"

Ekran okuyucunun sesli söylediği metin. Visual metin yoksa veya daha açıklayıcı bir şey gerekiyorsa:

```tsx
// ❌ Ekran okuyucu "Görüntü" diyor — anlamsız
<Pressable onPress={favoriye}>
  <Ionicons name="heart-outline" size={24} />
</Pressable>

// ✅ Ekran okuyucu "Favorilere Ekle" diyor
<Pressable
  onPress={favoriye}
  accessibilityLabel="Favorilere Ekle"
  accessibilityRole="button"
>
  <Ionicons name="heart-outline" size={24} accessible={false} />
  {/* accessible={false}: ikon ayrıca okunmasın, Pressable zaten labelı var */}
</Pressable>
```

---

## `accessibilityHint`: "Ne Yapıyor?"

Label ne olduğunu söyler, hint ne olacağını açıklar. Kısa ve öz:

```tsx
<Pressable
  accessibilityLabel="Nike Air Max"
  accessibilityRole="button"
  accessibilityHint="Ürün detayını açar"
>
  <Image source={...} accessible={false} />
  <Text>Nike Air Max</Text>
</Pressable>
```

iOS'ta: VoiceOver üzerine gelince label'ı okur, 1-2 saniye bekleyince hint'i okur.

---

## `accessibilityRole`: "Bu Ne Tür Öğe?"

Ekran okuyucu bileşenin davranışını bu prop'tan anlıyor:

```tsx
// Sık kullanılanlar
accessibilityRole="button"    // Pressable, TouchableOpacity
accessibilityRole="link"      // Başka sayfaya götüren öğe
accessibilityRole="header"    // Bölüm başlığı (h1, h2 gibi)
accessibilityRole="image"     // Görsel (dekoratif değilse)
accessibilityRole="search"    // Arama kutusu
accessibilityRole="text"      // Normal metin
accessibilityRole="none"      // Dekoratif, yoksay
accessibilityRole="combobox"  // Dropdown seçici
accessibilityRole="checkbox"  // Onay kutusu
accessibilityRole="switch"    // Açma/kapama
```

```tsx
// Bölüm başlıkları — VoiceOver kullanıcısı başlıklar arasında atlayabilir
<Text accessibilityRole="header" style={styles.bolumBasligi}>
  Öne Çıkan Ürünler
</Text>
// VoiceOver: "Öne Çıkan Ürünler, başlık"
```

---

## `accessibilityState`: Dinamik Durum

Öğenin anlık durumunu bildir:

```tsx
<Pressable
  accessibilityLabel="Sepete Ekle"
  accessibilityRole="button"
  accessibilityState={{
    disabled: stokYok,   // "Sepete Ekle, buton, soluk"
    selected: favoride,  // seçili durumu
    busy: yukleniyor,    // "meşgul" — yükleme sırasında
    checked: isaretli,   // checkbox için
    expanded: acik,      // accordion için
  }}
  disabled={stokYok}
>
  <Text>{stokYok ? 'Stok Yok' : 'Sepete Ekle'}</Text>
</Pressable>
```

---

## `accessible` ve Gruplandırma

Bir kart içinde: görsel, başlık, fiyat, marka. Ekran okuyucu her birini ayrı ayrı okursa 4 durak — kullanıcı yoruluyor.

`accessible={true}` ile grubu tek odak noktasına dönüştür:

```tsx
// ❌ Ekran okuyucu 4 ayrı öğe okuyor
<View>
  <Image source={...} />
  <Text>Nike Air Max</Text>
  <Text>Spor Ayakkabı</Text>
  <Text>1.299 ₺</Text>
</View>

// ✅ Tek öğe gibi okunuyor
<View
  accessible={true}
  accessibilityLabel="Nike Air Max, Spor Ayakkabı, bin iki yüz doksan dokuz lira"
  accessibilityRole="button"
  accessibilityHint="Ürün detayını açar"
>
  <Image source={...} importantForAccessibility="no-hide-descendants" />
  <Text>Nike Air Max</Text>
  <Text>Spor Ayakkabı</Text>
  <Text>1.299 ₺</Text>
</View>
```

**`importantForAccessibility="no-hide-descendants"`** (Android):  
Hem öğeyi hem tüm alt öğelerini ekran okuyucudan gizler. Dekoratif görseller için ideal.  
iOS'ta `accessible={false}` kullan.

---

## ShopApp: ProductCard Erişilebilir

```tsx
// components/ProductCard.tsx
type Props = { urun: Urun; onPress: () => void };

export function ProductCard({ urun, onPress }: Props) {
  // Ekran okuyucu için tam açıklama
  const a11yLabel = [
    urun.ad,
    urun.marka,
    `${urun.fiyat.toLocaleString('tr-TR')} lira`,
    urun.indirimYuzdesi ? `yüzde ${urun.indirimYuzdesi} indirimli` : null,
    urun.stok === 0 ? 'stok yok' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={urun.stok > 0 ? onPress : undefined}
      accessible={true}
      accessibilityLabel={a11yLabel}
      accessibilityRole="button"
      accessibilityHint="Ürün detayını görüntüler"
      accessibilityState={{ disabled: urun.stok === 0 }}
    >
      {/* Görsel — dekoratif, ekran okuyucu atlasın */}
      <Image
        source={{ uri: urun.gorselUrl }}
        style={styles.gorsel}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />

      <View style={styles.bilgi}>
        <Text style={styles.marka}>{urun.marka}</Text>
        <Text style={styles.ad} numberOfLines={2}>{urun.ad}</Text>

        <View style={styles.fiyatSatiri}>
          <Text style={styles.fiyat}>{urun.fiyat.toLocaleString('tr-TR')} ₺</Text>
          {urun.indirimYuzdesi && (
            <View style={styles.indirimBadge}>
              <Text style={styles.indirimMetin}>%{urun.indirimYuzdesi}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}
```

---

## ShopApp: Arama ve Filtreler

```tsx
// Arama kutusu
<TextInput
  value={aramaMetni}
  onChangeText={setAramaMetni}
  placeholder="Ürün, marka ara..."
  accessibilityLabel="Ürün arama kutusu"
  accessibilityHint="Ürün adı veya markası yazarak arayın"
  accessibilityRole="search"
  returnKeyType="search"
/>

// Filtre chip'leri
{kategoriler.map((kategori) => (
  <Pressable
    key={kategori.id}
    onPress={() => setSeciliKategori(kategori.id)}
    accessibilityLabel={kategori.ad}
    accessibilityRole="button"
    accessibilityState={{ selected: seciliKategori === kategori.id }}
    // VoiceOver: "Spor, seçili" veya "Spor, seçili değil"
  >
    <Text>{kategori.ad}</Text>
  </Pressable>
))}
```

---

## `accessibilityLiveRegion`: Dinamik İçerik

Kullanıcı bir eylem yaptı, içerik değişti — ama ekran okuyucu sayfayı yeniden taramıyor. `accessibilityLiveRegion` değişikliği otomatik duyuruyor:

```tsx
// Sepet sayısı değişince ekran okuyucu duyursun
<View
  accessibilityLiveRegion="polite"
  // "polite" → mevcut konuşmayı bitirince duyur
  // "assertive" → hemen kes, şimdi duyur (kritik hatalar için)
>
  <Text>{`Sepette ${sepetAdet} ürün`}</Text>
</View>

// Sonuç sayısı değişince duyur
<View accessibilityLiveRegion="polite">
  <Text>{`${filtrelenmisUrunler.length} ürün bulundu`}</Text>
</View>
```

**Görünmez bildirim — sadece ekran okuyucu duyar:**

```tsx
const [sonEklenen, setSonEklenen] = useState<string | null>(null);

function sepeteEkle(urunAdi: string) {
  // ürünü ekle...
  setSonEklenen(urunAdi);
  setTimeout(() => setSonEklenen(null), 3000);
}

{sonEklenen && (
  <View
    accessibilityLiveRegion="polite"
    accessibilityLabel={`${sonEklenen} sepete eklendi`}
    style={styles.gizliDuyuru}
  />
)}

const styles = StyleSheet.create({
  gizliDuyuru: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    // ÖNEMLİ: opacity:0 veya display:'none' ekran okuyucuyu da gizler
    // 1x1 piksel yaklaşımı hem görsel hem de ekran okuyucu için doğru çalışır
  },
});
```

---

## Minimum Dokunma Alanı

Apple: min 44×44pt. Google: min 48×48dp. İkon butonlar genellikle küçük:

```tsx
// ❌ 24px ikon — çok küçük
<Pressable onPress={favoriye}>
  <Ionicons name="heart" size={24} />
</Pressable>

// ✅ padding ile büyüt
<Pressable
  onPress={favoriye}
  style={{ padding: 10 }} // 24 + 20 = 44px
  accessibilityLabel="Favorilere Ekle"
  accessibilityRole="button"
>
  <Ionicons name="heart" size={24} />
</Pressable>

// ✅ hitSlop alternatifi — görsel boyutu değiştirmeden
<Pressable
  onPress={favoriye}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  accessibilityLabel="Favorilere Ekle"
  accessibilityRole="button"
>
  <Ionicons name="heart" size={24} />
</Pressable>
```

**`hitSlop` vs `padding` farkı:**  
`padding` hem görsel alanı hem dokunma alanını büyütür. `hitSlop` sadece dokunma alanını büyütür — görsel değişmez. İkon butonun etrafında fazla boşluk istemiyorsan `hitSlop` kullan.

---

## Kontrast Oranı

WCAG AA: normal metin için 4.5:1, büyük metin için 3:1.

```tsx
// ❌ Düşük kontrast — gri metin açık gri üzerinde
<Text style={{ color: '#AAAAAA', backgroundColor: '#EEEEEE' }}>1.299 ₺</Text>
// Kontrast: 1.6:1 — çok düşük

// ✅ Yeterli kontrast
<Text style={{ color: '#6C6C70', backgroundColor: '#FFFFFF' }}>1.299 ₺</Text>
// Kontrast: 4.6:1 — WCAG AA geçer

// Gün 27'deki tema sistemin zaten bunu gözetiyordu:
// yaziIkincil: '#6C6C70' beyaz üzerinde 4.6:1
```

---

## VoiceOver / TalkBack Test

**iOS Simulator:**
```
Xcode Simulator → Device → Toggle Accessibility Inspector
veya
Gerçek cihaz: Ayarlar → Erişilebilirlik → VoiceOver → Aç
```

**Android Emulator:**
```
Ayarlar → Erişilebilirlik → TalkBack → Aç
```

**Hızlı test kısayolu (iOS):**
```
Ayarlar → Erişilebilirlik → Kısayol → VoiceOver seç
→ Üç kez Home tuşu ile aç/kapat
```

**Test akışı:**
1. VoiceOver/TalkBack açık — parmağı kaydır, her öğenin seslendirilmesini dinle
2. Çift tıkla = onPress / Üç parmakla kaydır = scroll
3. Kontrol et:
   - Tüm butonlar `accessibilityLabel` var mı?
   - İkon butonlar anlamlı label'a sahip mi?
   - Kart bileşenleri `accessible={true}` ile gruplanmış mı?
   - Formlar `accessibilityLabel` + `accessibilityHint` içeriyor mu?
   - Stok yok, yükleniyor gibi durumlar `accessibilityState` ile bildiriliyor mu?

---

## Web ile Karşılaştırma

| Web (ARIA) | React Native | Fark |
|-----------|-------------|------|
| `<img alt="...">` | `accessibilityLabel` | prop adı farklı |
| `aria-label="Sil"` | `accessibilityLabel="Sil"` | Benzer |
| `aria-describedby` | `accessibilityHint` | Açıklama prop'u |
| `role="button"` | `accessibilityRole="button"` | role yerine accessibilityRole |
| `role="heading"` | `accessibilityRole="header"` | "heading" değil "header" |
| `aria-disabled={true}` | `accessibilityState={{ disabled: true }}` | Object içinde |
| `aria-live="polite"` | `accessibilityLiveRegion="polite"` | Birebir aynı kavram |
| `aria-hidden="true"` | `accessible={false}` | iOS için |
| `aria-hidden="true"` | `importantForAccessibility="no-hide-descendants"` | Android için |
| `tabIndex` | `accessible={true}` + ref | Farklı mekanizma |

---

## Kontrol Soruları

1. `accessibilityLabel` ile `accessibilityHint` arasındaki fark ne? Her ikisi ne zaman birlikte kullanılmalı?

2. Kart içindeki her metin kendi `accessibilityLabel`'ını verse ne olur? `accessible={true}` ile gruplamak neden daha iyi?

3. `accessible={false}` ile `importantForAccessibility="no-hide-descendants"` farkı ne? Hangisi ne zaman?

4. `accessibilityLiveRegion="assertive"` ne zaman kullanılmalı? Sepete eklendi bildirimi için "polite" mi "assertive" mi?

5. `opacity: 0` ile gizlenmiş bir öğe ekran okuyucu tarafından okunur mu? 1×1 piksel yaklaşımı neden çalışıyor?

---

## Özet

| Prop | Ne yapar |
|------|----------|
| `accessibilityLabel` | Seslendirilecek metin |
| `accessibilityHint` | Ne olacağını açıklar — label'dan sonra |
| `accessibilityRole` | Öğenin türü (button, header, image...) |
| `accessibilityState` | Dinamik durum (disabled, selected, busy...) |
| `accessible={true}` | Grubu tek odak noktasına dönüştür |
| `accessible={false}` | Ekran okuyucudan gizle (iOS) |
| `importantForAccessibility` | Android gizleme kontrolü |
| `accessibilityLiveRegion` | Dinamik içerik değişimini duyur |
| `hitSlop` | Görsel değiştirmeden dokunma alanını büyüt |

**Yarın (Gün 39):** Localization ve RTL — `i18next` ile Türkçe/İngilizce dil desteği, `expo-localization`, Arapça/İbranice için RTL layout, `I18nManager`.
