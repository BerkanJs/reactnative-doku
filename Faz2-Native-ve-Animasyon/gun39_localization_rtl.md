# Gün 39 — Localization: i18n ve RTL Desteği

## Neden Localization?

ShopApp'i Türkiye pazarına açtın. Şimdi Almanya'ya, Suudi Arabistan'a açmak istiyorsun. Tüm metinleri kod içinde hardcode yazdıysan, her metni tek tek bulmak ve değiştirmek gerekecek. Üstelik Suudi Arabistan için layout'u da sağdan sola çevirmek zorundasın.

**Localization = i18n (internationalization) + l10n (localization)**
- i18n: uygulamayı birden fazla dil için hazır hale getirme
- l10n: belirli bir dil/kültüre uyarlama (tarih formatı, para birimi, yön)

---

## Kurulum: i18next

```bash
npx expo install i18next react-i18next expo-localization
```

**`expo-localization`:** Cihazın dilini ve locale'ini okur.  
**`i18next`:** Çeviri sistemi — web'de kullandıysanız React Native'de birebir aynı.  
**`react-i18next`:** React hook'ları (`useTranslation`).

---

## Çeviri Dosyaları

```
locales/
├── tr/
│   ├── common.json
│   ├── urun.json
│   └── sepet.json
└── en/
    ├── common.json
    ├── urun.json
    └── sepet.json
```

```json
// locales/tr/common.json
{
  "hosgeldin": "Hoş Geldin, {{ad}}!",
  "yukle": "Yükleniyor...",
  "hata": "Bir hata oluştu",
  "tekrar": "Tekrar Dene",
  "iptal": "İptal",
  "tamam": "Tamam",
  "ara": "Ara...",
  "filtrele": "Filtrele",
  "sirala": "Sırala"
}
```

```json
// locales/en/common.json
{
  "hosgeldin": "Welcome, {{ad}}!",
  "yukle": "Loading...",
  "hata": "Something went wrong",
  "tekrar": "Try Again",
  "iptal": "Cancel",
  "tamam": "OK",
  "ara": "Search...",
  "filtrele": "Filter",
  "sirala": "Sort"
}
```

```json
// locales/tr/urun.json
{
  "baslik": "Ürünler",
  "stokYok": "Stok Yok",
  "indirim": "%{{yuzde}} İndirim",
  "detay": "Ürün Detayı",
  "sepeteEkle": "Sepete Ekle",
  "favoriye": "Favorilere Ekle",
  "adet": "{{sayi}} adet",
  "adet_plural": "{{sayi}} adet",
  "bulunanUrun": "{{sayi}} ürün bulundu",
  "bulunanUrun_plural": "{{sayi}} ürün bulundu"
}
```

```json
// locales/en/urun.json
{
  "baslik": "Products",
  "stokYok": "Out of Stock",
  "indirim": "{{yuzde}}% Off",
  "detay": "Product Detail",
  "sepeteEkle": "Add to Cart",
  "favoriye": "Add to Favorites",
  "adet": "{{sayi}} item",
  "adet_plural": "{{sayi}} items",
  "bulunanUrun": "{{sayi}} product found",
  "bulunanUrun_plural": "{{sayi}} products found"
}
```

---

## i18next Yapılandırması

```tsx
// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import trCommon from '@/locales/tr/common.json';
import trUrun from '@/locales/tr/urun.json';
import trSepet from '@/locales/tr/sepet.json';
import enCommon from '@/locales/en/common.json';
import enUrun from '@/locales/en/urun.json';
import enSepet from '@/locales/en/sepet.json';

const kaynaklar = {
  tr: {
    common: trCommon,
    urun: trUrun,
    sepet: trSepet,
  },
  en: {
    common: enCommon,
    urun: enUrun,
    sepet: enSepet,
  },
};

// Cihaz dilini al — ['tr-TR', 'en-US'] gibi
const cihazDili = Localization.getLocales()[0]?.languageCode ?? 'tr';

// Desteklenen diller — desteklenmiyorsa fallback
const desteklenenDiller = ['tr', 'en'];
const baslangicDili = desteklenenDiller.includes(cihazDili) ? cihazDili : 'tr';

i18n
  .use(initReactI18next)
  .init({
    resources: kaynaklar,
    lng: baslangicDili,
    fallbackLng: 'tr',        // çeviri yoksa Türkçe kullan
    defaultNS: 'common',       // varsayılan namespace
    interpolation: {
      escapeValue: false,      // React Native'de XSS riski yok
    },
  });

export default i18n;
```

```tsx
// app/_layout.tsx
import '@/i18n'; // i18n'i başlat — en üstte import et
```

---

## Bileşende Kullanım

```tsx
import { useTranslation } from 'react-i18next';

export function UrunListesi() {
  const { t } = useTranslation('urun'); // 'urun' namespace'i kullan
  const { t: tCommon } = useTranslation('common'); // birden fazla namespace

  return (
    <View>
      <Text style={styles.baslik}>{t('baslik')}</Text>
      {/* → "Ürünler" veya "Products" */}

      <Text>{tCommon('ara')}</Text>
      {/* → "Ara..." veya "Search..." */}
    </View>
  );
}

// Değişkenli çeviri
<Text>{t('indirim', { yuzde: 30 })}</Text>
// → "%30 İndirim" veya "30% Off"

// Çoğullama (pluralization)
<Text>{t('bulunanUrun', { sayi: urunSayisi, count: urunSayisi })}</Text>
// → "5 ürün bulundu" / "1 ürün bulundu"
// count: i18next'in pluralization için kullandığı özel key
```

---

## Dil Değiştirme

```tsx
// store/dilStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';
import { I18nManager } from 'react-native';
import * as Updates from 'expo-updates';

type DilStore = {
  dilKodu: string;
  dilDegistir: (yeniDil: string) => Promise<void>;
};

export const useDilStore = create<DilStore>()(
  persist(
    (set) => ({
      dilKodu: i18n.language,
      dilDegistir: async (yeniDil: string) => {
        await i18n.changeLanguage(yeniDil);
        set({ dilKodu: yeniDil });

        // RTL dilleri için layout yönünü değiştir
        const rtlDiller = ['ar', 'he', 'fa', 'ur'];
        const rtlMi = rtlDiller.includes(yeniDil);

        if (I18nManager.isRTL !== rtlMi) {
          I18nManager.forceRTL(rtlMi);
          // Layout yönü değişince uygulama yeniden başlatılmalı
          await Updates.reloadAsync();
        }
      },
    }),
    {
      name: '@shopapp/dil',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

```tsx
// components/DilSecici.tsx
import { useTranslation } from 'react-i18next';
import { useDilStore } from '@/store/dilStore';

const DILLER = [
  { kod: 'tr', ad: 'Türkçe', bayrak: '🇹🇷' },
  { kod: 'en', ad: 'English', bayrak: '🇬🇧' },
  { kod: 'de', ad: 'Deutsch', bayrak: '🇩🇪' },
  { kod: 'ar', ad: 'العربية', bayrak: '🇸🇦' },
];

export function DilSecici() {
  const { dilKodu, dilDegistir } = useDilStore();
  const { t } = useTranslation('common');

  return (
    <View>
      <Text style={styles.baslik}>{t('dil_sec')}</Text>
      {DILLER.map((dil) => (
        <Pressable
          key={dil.kod}
          onPress={() => dilDegistir(dil.kod)}
          style={[styles.dilSatiri, dilKodu === dil.kod && styles.seciliDil]}
          accessibilityLabel={dil.ad}
          accessibilityRole="button"
          accessibilityState={{ selected: dilKodu === dil.kod }}
        >
          <Text style={styles.bayrak}>{dil.bayrak}</Text>
          <Text style={styles.dilAdi}>{dil.ad}</Text>
          {dilKodu === dil.kod && (
            <Ionicons name="checkmark" size={20} color="#007AFF" />
          )}
        </Pressable>
      ))}
    </View>
  );
}
```

---

## RTL: Sağdan Sola Layout

Arapça, İbranice, Farsça, Urduca sağdan sola okunur. Layout'un da aynı yönde olması gerekiyor.

**Sorun:** `left`, `right` kullanan tüm stiller RTL'de bozulur.

```tsx
// ❌ RTL'de sol/sağ ters kalır
<View style={{ flexDirection: 'row', paddingLeft: 16 }}>
  <Image style={{ marginRight: 12 }} />
  <Text style={{ textAlign: 'left' }}>Ürün adı</Text>
</View>

// ✅ start/end kullan — RTL'de otomatik ayna görüntüsü
<View style={{ flexDirection: 'row', paddingStart: 16 }}>
  <Image style={{ marginEnd: 12 }} />
  <Text style={{ textAlign: 'auto' }}>Ürün adı</Text>
  {/* textAlign:'auto' → LTR'de left, RTL'de right */}
</View>
```

**LTR → RTL değişimi:**

| LTR style | RTL karşılığı | RN property |
|-----------|--------------|-------------|
| `paddingLeft` | `paddingRight` | `paddingStart` |
| `paddingRight` | `paddingLeft` | `paddingEnd` |
| `marginLeft` | `marginRight` | `marginStart` |
| `marginRight` | `marginLeft` | `marginEnd` |
| `left: 0` | `right: 0` | `start: 0` |
| `right: 0` | `left: 0` | `end: 0` |
| `textAlign: 'left'` | `textAlign: 'right'` | `textAlign: 'auto'` |
| `borderLeftWidth` | `borderRightWidth` | `borderStartWidth` |

---

## RTL Aware Bileşen

```tsx
// components/UrunSatiri.tsx
import { I18nManager } from 'react-native';

export function UrunSatiri({ urun }: { urun: Urun }) {
  const rtlMi = I18nManager.isRTL;

  return (
    <View style={styles.konteyner}>
      {/* RTL'de resim sağda, LTR'de solda */}
      <Image
        source={{ uri: urun.gorselUrl }}
        style={[styles.gorsel, rtlMi && styles.gorselRTL]}
      />

      <View style={styles.bilgi}>
        {/* textAlign: 'auto' RTL/LTR'yi otomatik halleder */}
        <Text style={styles.ad}>{urun.ad}</Text>
        <Text style={styles.fiyat}>{urun.fiyat} ₺</Text>
      </View>

      {/* Ok ikonu — RTL'de ters yön */}
      <Ionicons
        name={rtlMi ? 'chevron-back' : 'chevron-forward'}
        size={20}
        color="#C7C7CC"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  konteyner: {
    flexDirection: 'row',        // RTL'de otomatik row-reverse gibi davranır
    alignItems: 'center',
    paddingHorizontal: 16,       // paddingLeft + paddingRight — her ikisi de
    paddingVertical: 12,
  },
  gorsel: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginEnd: 12,               // LTR: marginRight, RTL: marginLeft
  },
  gorselRTL: {
    // RTL'ye özgü ek stil
  },
  bilgi: {
    flex: 1,
  },
  ad: {
    fontSize: 16,
    textAlign: 'auto',           // RTL/LTR'ye göre otomatik hizala
  },
  fiyat: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'auto',
  },
});
```

---

## Tarih, Saat ve Para Birimi Formatı

```tsx
import * as Localization from 'expo-localization';

const locale = Localization.getLocales()[0]?.languageTag ?? 'tr-TR';
// → 'tr-TR', 'en-US', 'ar-SA' gibi

// Para birimi
const paraBirimi = new Intl.NumberFormat(locale, {
  style: 'currency',
  currency: 'TRY',
}).format(1299);
// tr-TR → "₺1.299,00"
// en-US → "TRY 1,299.00"

// Tarih
const tarih = new Intl.DateTimeFormat(locale, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}).format(new Date());
// tr-TR → "30 Haziran 2025"
// en-US → "June 30, 2025"
// ar-SA → "٣٠ يونيو ٢٠٢٥"

// Utility hook
export function useFormat() {
  const locale = Localization.getLocales()[0]?.languageTag ?? 'tr-TR';

  return {
    fiyat: (tutar: number, para = 'TRY') =>
      new Intl.NumberFormat(locale, { style: 'currency', currency: para }).format(tutar),
    tarih: (tarih: Date) =>
      new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(tarih),
    sayi: (sayi: number) =>
      new Intl.NumberFormat(locale).format(sayi),
  };
}

// Kullanım
const { fiyat, tarih } = useFormat();
<Text>{fiyat(1299)}</Text>             // "₺1.299,00"
<Text>{tarih(siparis.tarih)}</Text>    // "30 Haziran 2025"
```

---

## Web ile Karşılaştırma

| Web (next-i18next) | React Native (i18next) | Fark |
|-------------------|----------------------|------|
| `useTranslation()` | `useTranslation()` | Aynı! |
| `t('anahtar')` | `t('anahtar')` | Aynı! |
| `i18n.changeLanguage()` | `i18n.changeLanguage()` | Aynı! |
| CSS: `dir="rtl"` | `I18nManager.forceRTL(true)` | Farklı |
| RTL: `margin-inline-start` | `marginStart` | Benzer konsept |
| `text-align: start` | `textAlign: 'auto'` | Benzer |
| Reload gerekmez | RTL için reload gerekir | RN kısıtı |
| SSR + hydration | Yok | RN'de SSR yok |

---

## Kontrol Soruları

1. `i18next` web'dekiyle aynı kurulumu mu kullanıyor RN'de? `useTranslation` hook'u neden çalışıyor?

2. RTL layout için neden `left`/`right` yerine `start`/`end` kullanılmalı? `paddingLeft: 16` RTL'de ne olur?

3. `I18nManager.forceRTL()` sonrası neden uygulama yeniden başlatılmalı? Bu kısıt ne anlama geliyor UX açısından?

4. `textAlign: 'auto'` ile `textAlign: 'left'` farkı ne? Arapça metin için hangisi?

5. `Intl.NumberFormat` React Native'de nasıl çalışıyor? Hermes engine desteği var mı?

---

## Özet

| Konu | Araç/Yöntem |
|------|------------|
| Çeviri sistemi | `i18next` + `react-i18next` |
| Cihaz dili | `expo-localization` → `getLocales()[0]` |
| Çeviri dosyaları | `locales/tr/`, `locales/en/` JSON |
| Değişkenli çeviri | `t('anahtar', { degisken: 'deger' })` |
| Çoğullama | `count` parametresi + `_plural` suffix |
| Dil değiştirme | `i18n.changeLanguage()` |
| RTL aktifleştirme | `I18nManager.forceRTL(true)` + reload |
| RTL-safe padding | `paddingStart`, `paddingEnd` |
| RTL-safe metin | `textAlign: 'auto'` |
| Tarih/para formatı | `Intl.DateTimeFormat`, `Intl.NumberFormat` |

**Yarın (Gün 40):** GraphQL ve Apollo Client — tek endpoint, istediğin field'ı iste, `useQuery`/`useMutation`, `InMemoryCache`, `graphql-codegen` ile otomatik TypeScript tipi.
