# Gün 35 — React Hook Form + Zod

## Web'deki Gibi, Ama Bir Fark Var

Web'de React Hook Form'u `register()` ile kullanıyordun:

```tsx
// Web
<input {...register('email')} />
```

React Native'de bu çalışmaz. `TextInput` ref tabanlı değil — `value` ve `onChangeText` prop'larıyla kontrol edilir. Bu yüzden `Controller` wrapper zorunlu.

```tsx
// React Native — Controller zorunlu
<Controller
  control={control}
  name="email"
  render={({ field: { onChange, onBlur, value } }) => (
    <TextInput
      value={value}
      onChangeText={onChange}   // onChange değil onChangeText!
      onBlur={onBlur}
    />
  )}
/>
```

**`onChangeText` neden `onChange` değil?**  
Web'de `onChange` bir `SyntheticEvent` döndürür, değeri `e.target.value` ile alırsın. React Native'de `onChangeText` doğrudan string döndürür — event objesi yok. RHF'nin `onChange` fonksiyonu event beklediği için, `onChangeText` ile bağlamak gerekiyor.

---

## Kurulum

```bash
npx expo install react-hook-form @hookform/resolvers zod
```

---

## Zod Schema: Tip Güvenceli Validasyon

```tsx
// schemas/odemeFormu.ts
import { z } from 'zod';

export const odemeFormSchema = z.object({
  adSoyad: z
    .string()
    .min(3, 'Ad soyad en az 3 karakter olmalı')
    .max(50, 'Ad soyad en fazla 50 karakter olabilir'),

  email: z
    .string()
    .email('Geçerli bir e-posta adresi girin'),

  telefon: z
    .string()
    .regex(/^(\+90|0)?[0-9]{10}$/, 'Geçerli bir telefon numarası girin'),

  adres: z.object({
    il: z.string().min(1, 'İl seçin'),
    ilce: z.string().min(1, 'İlçe seçin'),
    mahalle: z.string().min(5, 'Mahalle adresi çok kısa'),
    postaKodu: z
      .string()
      .length(5, 'Posta kodu 5 haneli olmalı')
      .regex(/^[0-9]+$/, 'Posta kodu sadece rakam içerebilir'),
  }),

  kartNumarasi: z
    .string()
    .replace(/\s/g, '') // boşlukları temizle
    .length(16, 'Kart numarası 16 haneli olmalı')
    .regex(/^[0-9]+$/, 'Sadece rakam girin'),

  sonKullanim: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'AA/YY formatında girin'),

  cvv: z
    .string()
    .min(3, 'CVV 3 veya 4 haneli olmalı')
    .max(4),
});

// Zod schema'dan TypeScript tipi — elle yazmak gerekmez
export type OdemeFormuTipi = z.infer<typeof odemeFormSchema>;
```

---

## Temel Form Yapısı

```tsx
// components/forms/OdemeFormu.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { odemeFormSchema, type OdemeFormuTipi } from '@/schemas/odemeFormu';
import { View, TextInput, Text, Pressable, Keyboard, StyleSheet } from 'react-native';

export function OdemeFormu({ onSubmit }: { onSubmit: (veri: OdemeFormuTipi) => void }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    watch,
    reset,
  } = useForm<OdemeFormuTipi>({
    resolver: zodResolver(odemeFormSchema),
    mode: 'onBlur',     // alan'dan çıkınca validate et
    defaultValues: {
      adSoyad: '',
      email: '',
      telefon: '',
      adres: { il: '', ilce: '', mahalle: '', postaKodu: '' },
      kartNumarasi: '',
      sonKullanim: '',
      cvv: '',
    },
  });

  function formGonder(veri: OdemeFormuTipi) {
    Keyboard.dismiss(); // klavyeyi kapat
    onSubmit(veri);
  }

  return (
    <View>
      {/* Ad Soyad */}
      <Controller
        control={control}
        name="adSoyad"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.alanKonteyner}>
            <Text style={styles.etiket}>Ad Soyad</Text>
            <TextInput
              style={[styles.giris, errors.adSoyad && styles.hataGiris]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Adınız ve soyadınız"
              autoCapitalize="words"
              returnKeyType="next"
              accessibilityLabel="Ad soyad"
              accessibilityHint="Adınızı ve soyadınızı girin"
            />
            {errors.adSoyad && (
              <Text style={styles.hataMetin}>{errors.adSoyad.message}</Text>
            )}
          </View>
        )}
      />

      {/* E-posta */}
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <View style={styles.alanKonteyner}>
            <Text style={styles.etiket}>E-posta</Text>
            <TextInput
              style={[styles.giris, errors.email && styles.hataGiris]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="ornek@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              accessibilityLabel="E-posta adresi"
            />
            {errors.email && (
              <Text style={styles.hataMetin}>{errors.email.message}</Text>
            )}
          </View>
        )}
      />

      {/* Gönder Butonu */}
      <Pressable
        style={[styles.buton, (!isValid || isSubmitting) && styles.pasifButon]}
        onPress={handleSubmit(formGonder)}
        disabled={isSubmitting}
        accessibilityLabel="Ödemeyi tamamla"
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
      >
        <Text style={styles.butonMetin}>
          {isSubmitting ? 'İşleniyor...' : 'Ödemeyi Tamamla'}
        </Text>
      </Pressable>
    </View>
  );
}
```

---

## Klavye Yönetimi: Input'tan Input'a Geç

Mobilde klavye "İleri" tuşuyla bir sonraki alana geçmek standart UX. `ref` ile bunu sağlarsın:

```tsx
import { useRef } from 'react';
import { TextInput } from 'react-native';

export function AdresFormu() {
  // Her input için ref
  const ilceRef = useRef<TextInput>(null);
  const mahalleRef = useRef<TextInput>(null);
  const postaKoduRef = useRef<TextInput>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<AdresFormuTipi>({
    resolver: zodResolver(adresFormSchema),
  });

  return (
    <>
      <Controller
        control={control}
        name="adres.il"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="İl"
            returnKeyType="next"
            onSubmitEditing={() => ilceRef.current?.focus()} // sonraki alana geç
            blurOnSubmit={false} // klavye kapanmasın
          />
        )}
      />

      <Controller
        control={control}
        name="adres.ilce"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            ref={ilceRef}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="İlçe"
            returnKeyType="next"
            onSubmitEditing={() => mahalleRef.current?.focus()}
            blurOnSubmit={false}
          />
        )}
      />

      <Controller
        control={control}
        name="adres.mahalle"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            ref={mahalleRef}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="Mahalle, cadde, sokak"
            returnKeyType="next"
            onSubmitEditing={() => postaKoduRef.current?.focus()}
            blurOnSubmit={false}
            multiline={false}
          />
        )}
      />

      <Controller
        control={control}
        name="adres.postaKodu"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            ref={postaKoduRef}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            placeholder="34000"
            keyboardType="numeric"
            maxLength={5}
            returnKeyType="done"           // son alan — "Tamam"
            onSubmitEditing={() => {
              Keyboard.dismiss();
              handleSubmit(formGonder)();  // klavye kapanırken formu gönder
            }}
          />
        )}
      />
    </>
  );
}
```

**`blurOnSubmit={false}` neden?**  
Varsayılan olarak `returnKey`'e basınca klavye kapanır. `false` yapınca kapanmaz — bir sonraki input'a geçince de klavye açık kalır.

---

## Kart Numarası: Otomatik Formatlama

```tsx
// Kart numarasını 4'lü gruplar halinde formatla: 1234 5678 9012 3456
function kartNumarasiFormatla(deger: string): string {
  const sadeceSayi = deger.replace(/\D/g, ''); // rakam dışını sil
  const gruplar = sadeceSayi.match(/.{1,4}/g) ?? []; // 4'lü gruplara böl
  return gruplar.join(' ').substring(0, 19); // max 16 rakam + 3 boşluk
}

<Controller
  control={control}
  name="kartNumarasi"
  render={({ field: { onChange, onBlur, value } }) => (
    <TextInput
      value={value}
      onChangeText={(metin) => {
        const formatli = kartNumarasiFormatla(metin);
        onChange(formatli);
      }}
      onBlur={onBlur}
      placeholder="1234 5678 9012 3456"
      keyboardType="numeric"
      maxLength={19}
    />
  )}
/>
```

---

## `useWatch`: Diğer Alanı İzle

Bir alanın değerine göre başka bir alanı değiştir:

```tsx
import { useWatch } from 'react-hook-form';

// İl değişince ilçe listesini güncelle
function IlceSecici({ control }: { control: Control<AdresFormuTipi> }) {
  const secilenIl = useWatch({ control, name: 'adres.il' });
  const ilceler = IL_ILCE_VERITABANI[secilenIl] ?? [];

  return (
    <Controller
      control={control}
      name="adres.ilce"
      render={({ field: { onChange, value } }) => (
        <Picker selectedValue={value} onValueChange={onChange}>
          {ilceler.map((ilce) => (
            <Picker.Item key={ilce} label={ilce} value={ilce} />
          ))}
        </Picker>
      )}
    />
  );
}
```

---

## `KeyboardAvoidingView`: Form Klavye Çakışması

Klavye açılınca alttaki inputlar görünmez olabilir:

```tsx
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

export function OdemeEkrani() {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // iOS: içeriği yukarı iter (padding ekler)
      // Android: view yüksekliğini küçültür
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        // "handled": input dışına tıklanınca klavye kapanır
        // Bunu yazmasaydık: kaydırma sırasında klavye kapanırdı
      >
        <OdemeFormu onSubmit={odemeYap} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

---

## Hata Durumu Stil Sistemi

```tsx
const styles = StyleSheet.create({
  alanKonteyner: {
    marginBottom: 16,
  },
  etiket: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  giris: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1C1C1E',
  },
  hataGiris: {
    borderColor: '#FF3B30', // kırmızı kenarlık
    backgroundColor: '#FFF5F5',
  },
  hataMetin: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  buton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  pasifButon: {
    backgroundColor: '#C7C7CC',
  },
  butonMetin: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
```

---

## Web ile Karşılaştırma

| React (Web) RHF | React Native RHF | Fark |
|-----------------|-----------------|------|
| `register('email')` | `<Controller>` wrapper | Native input'lar ref kullanmaz |
| `<input {...register}>` | `<TextInput value onChangeText>` | Prop isimleri farklı |
| `onChange: e => e.target.value` | `onChangeText: text => text` | Direkt string |
| Klavye yönetimi: `Tab` tuşu | `returnKeyType` + `ref.focus()` | Manuel yönetim |
| `onSubmit` | `handleSubmit(fn)` + `Keyboard.dismiss()` | Klavyeyi kapat |
| Zod: tam aynı | Zod: tam aynı | Web ile birebir |

---

## Kontrol Soruları

1. Web'de `register('email')` yeterliyken neden RN'de `Controller` zorunlu? React Hook Form'un ref sistemi neden çalışmıyor?

2. `onChangeText={onChange}` yerine `onChange={onChange}` yazsaydın ne tip hatası alırdın?

3. `mode: 'onBlur'` ile `mode: 'onChange'` farkı ne? UX açısından hangisi ne zaman daha iyi?

4. `blurOnSubmit={false}` olmadan klavye yönetimi nasıl bozulur?

5. Zod schema'da `z.infer<typeof schema>` neden kullanıyoruz? Tipi elle yazsaydık dezavantajı ne olurdu?

---

## Özet

| Konu | Çözüm |
|------|-------|
| Native input bağlama | `Controller` + `onChangeText={onChange}` |
| Schema validasyon | `z.object()` + `zodResolver` |
| Tip üretme | `z.infer<typeof schema>` |
| Hata gösterme | `errors.alan?.message` |
| Sonraki input | `ref` + `onSubmitEditing` + `blurOnSubmit={false}` |
| Submit'te klavye | `Keyboard.dismiss()` |
| Klavye çakışması | `KeyboardAvoidingView` + `ScrollView` |
| Bir alanı izle | `useWatch` |
| Form reset | `reset()` |

**Yarın (Gün 36):** NativeWind ve UI Kütüphaneleri — Tailwind class'larını React Native'de kullan, React Native Paper ile hazır bileşenler, ne zaman hangisi.
