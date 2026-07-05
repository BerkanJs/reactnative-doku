# Gün 9 — TextInput ve Form Yönetimi

> **Faz:** 1 — Temeller | **Hafta:** 2 | **Gün:** 9 / 60
>
> **Bugünün Hedefi:** `TextInput` ile controlled input yazmak, klavye sorunlarını çözmek.
> ShopApp'e **arama çubuğu** ve **login formu** ekliyoruz.

---

## 1. HTML `<input>` vs `<TextInput>`

Web'de her input türü `type` attribute'u ile ayrılırdı:

```html
<input type="text" />
<input type="email" />
<input type="password" />
<input type="number" />
```

React Native'de tek bileşen var: `<TextInput>`. Tür, prop'larla belirlenir:

```tsx
import { TextInput } from 'react-native';

<TextInput />                                    // type="text"
<TextInput keyboardType="email-address" />       // type="email"
<TextInput secureTextEntry={true} />             // type="password"
<TextInput keyboardType="numeric" />             // type="number"
<TextInput keyboardType="phone-pad" />           // type="tel"
```

---

## 2. `onChangeText` — Event Objesi Yok

Web'de `onChange` bir event objesi verirdi:

```tsx
// Web (React):
<input onChange={(e) => setValue(e.target.value)} />
// e.target.value ile string'e ulaşıyorduk

// React Native:
<TextInput onChangeText={(text) => setValue(text)} />
// Direkt string gelir — event objesi yok, .target.value yok

// Daha kısa:
<TextInput onChangeText={setValue} />
// setValue fonksiyonu direkt geçilebilir
```

Neden? Mobilde native text değişim event'leri farklı çalışır; React Native sadece değişen string'i expose eder. `e.target`, `e.nativeEvent.text` gibi düşük seviyeli erişim gerekirse `onChange` prop'u var ama nadiren kullanılır.

---

## 3. Controlled Input

Web'deki controlled input mantığı aynı — `value` + `onChangeText`:

```tsx
import { useState } from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';

function AramaFormu() {
  const [aramaMetni, setAramaMetni] = useState('');

  return (
    <View>
      <TextInput
        value={aramaMetni}
        onChangeText={setAramaMetni}
        // value + onChangeText = controlled input
        // Web'deki value + onChange ile aynı mantık

        placeholder="Ürün ara..."
        placeholderTextColor="#94a3b8"
        // placeholderTextColor: Web'de CSS ::placeholder ile yapılırdı
        // RN'de doğrudan prop

        style={styles.input}
      />
      <Text>Aranan: {aramaMetni}</Text>
    </View>
  );
}
```

---

## 4. `TextInput` Prop'ları

### Klavye tipi (`keyboardType`)

```tsx
<TextInput keyboardType="default" />        // Standart klavye
<TextInput keyboardType="email-address" />  // @ ve . ön planda
<TextInput keyboardType="numeric" />        // Sadece rakam
<TextInput keyboardType="phone-pad" />      // Telefon tuş takımı
<TextInput keyboardType="decimal-pad" />    // Ondalık sayı (virgüllü fiyat için)
<TextInput keyboardType="url" />            // / ve . ön planda
```

### Return tuşu (`returnKeyType`)

Klavyenin sağ alt köşesindeki tuşun görünümü:

```tsx
<TextInput returnKeyType="done" />      // "Bitti" — son input için
<TextInput returnKeyType="next" />      // "Sonraki" — bir sonraki input'a geç
<TextInput returnKeyType="search" />    // "Ara" — arama input'u için
<TextInput returnKeyType="go" />        // "Git"
<TextInput returnKeyType="send" />      // "Gönder"
```

### Şifre alanı

```tsx
<TextInput
  secureTextEntry={true}
  // Karakterleri gizler (••••)
  // iOS: klavye önerileri ve otomatik doldurmayı devre dışı bırakır
/>
```

### Çok satırlı

```tsx
<TextInput
  multiline={true}
  numberOfLines={4}
  // numberOfLines: Android'de başlangıç yüksekliği
  // iOS'ta etkisi farklı — min height CSS ile verilmeli
  style={{ minHeight: 100, textAlignVertical: 'top' }}
  // textAlignVertical: 'top' — metni yukarıdan başlat
  // Web'deki resize: vertical; padding-top ile aynı etki
  // iOS'ta bu prop'un etkisi yok — zaten yukarıdan başlar
/>
```

### Otomatik büyük harf ve düzeltme

```tsx
<TextInput
  autoCapitalize="none"
  // 'none': büyük harf yok (email, şifre için)
  // 'sentences': cümle başları büyük (varsayılan)
  // 'words': her kelimenin ilk harfi büyük
  // 'characters': her şey büyük

  autoCorrect={false}
  // Otomatik düzeltmeyi kapat (kullanıcı adı, şifre için)

  spellCheck={false}
  // Yazım denetimini kapat
/>
```

---

## 5. `KeyboardAvoidingView` — Klavye Layout Sorunu

Web'de klavye diye bir sorun yoktu. Mobilde **yumuşak klavye (soft keyboard)** ekranın alt yarısını kaplar ve içeriğin üstüne biner:

```
Klavye açıkken:
┌─────────────────────────────┐
│  [Input alanı]              │  ← kullanıcı buraya yazıyor
│                             │
│                             │
│─────────────────────────────│
│  K L A V Y E               │  ← içeriğin üstüne bindi
│  A S D F G H               │
│  Z X C V B N               │
└─────────────────────────────┘

Input artık klavyenin altında kaldı — kullanıcı ne yazdığını göremez
```

`KeyboardAvoidingView` bunu çözer — klavye açılınca içeriği yukarı iter:

```tsx
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  // iOS: 'padding' — klavye yüksekliği kadar padding-bottom ekler
  // Android: 'height' — View yüksekliğini azaltır
  // Neden farklı? iOS ve Android klavye animasyonları farklı
  // iOS: klavye slide-up, View'ın altına padding eklenerek iter
  // Android: sistem penceresi yeniden boyutlanır, 'height' daha doğru

  keyboardVerticalOffset={0}
  // Header yüksekliği varsa burada ver
  // Tab bar veya custom header'ın yüksekliği kadar offset
>
  <ScrollView>
    {/* form içeriği */}
  </ScrollView>
</KeyboardAvoidingView>
```

---

## 6. `ref` ile Focus Yönetimi

Form'da "Sonraki" tuşuna basınca bir sonraki input'a geçmek için `ref` kullanılır:

```tsx
import { useRef } from 'react';
import { TextInput } from 'react-native';

function LoginFormu() {
  const sifreRef = useRef<TextInput>(null);
  // useRef: Web'deki useRef ile aynı — DOM değil native component

  return (
    <>
      <TextInput
        placeholder="E-posta"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => sifreRef.current?.focus()}
        // returnKeyType="next" tuşuna basıldığında sonraki input'a geç
        // sifreRef.current?.focus() — ref varsa focus'la
        // Web'de: nextInput.focus() ile aynı mantık
        blurOnSubmit={false}
        // Submit edilince klavye kapanmasın — bir sonraki input'a geçsin
      />

      <TextInput
        ref={sifreRef}
        placeholder="Şifre"
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={() => console.log('Giriş yap')}
        // "done" tuşuna basınca formu gönder
      />
    </>
  );
}
```

---

## 7. ShopApp: Arama Çubuğu

`components/SearchBar.tsx` oluştur:

```tsx
// components/SearchBar.tsx
import { useRef } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';

type Props = {
  deger: string;
  onChange: (metin: string) => void;
  placeholder?: string;
};

export function SearchBar({ deger, onChange, placeholder = 'Ürün ara...' }: Props) {
  const inputRef = useRef<TextInput>(null);

  const temizle = () => {
    onChange('');
    inputRef.current?.focus();
    // Temizle + klavyeyi açık tut
  };

  return (
    <View style={styles.kapsayici}>
      <View style={styles.inputAlani}>

        {/* ARAMA İKONU */}
        <Ionicons
          name="search-outline"
          size={18}
          color={COLORS.textDisabled}
          style={styles.aramaIkonu}
        />

        {/* INPUT */}
        <TextInput
          ref={inputRef}
          value={deger}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textDisabled}
          style={styles.input}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          // clearButtonMode: iOS'ta sağa X butonu ekler
          // 'never' | 'while-editing' | 'unless-editing' | 'always'
          // Kendimiz yapıyoruz — her platformda aynı görünsün
        />

        {/* TEMİZLE BUTONU — sadece metin varsa göster */}
        {deger.length > 0 && (
          <Pressable onPress={temizle} style={styles.temizleButon} hitSlop={8}>
            {/* hitSlop: tıklanabilir alanı genişlet — küçük ikonlar için */}
            {/* Web'de buna gerek yok, mobilde parmak büyük */}
            <Ionicons name="close-circle" size={18} color={COLORS.textDisabled} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kapsayici: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
  },

  inputAlani: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 44,
    // 44dp minimum dokunma hedefi — Apple HIG standardı
  },

  aramaIkonu: {
    marginRight: SPACING.sm,
  },

  input: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    // React Native TextInput'ta height ayarı bazen gerekir:
    height: '100%',
    // Özellikle Android'de input alanının tüm yüksekliği kaplaması için
  },

  temizleButon: {
    marginLeft: SPACING.sm,
  },
});
```

Arama çubuğunu ürünler tab'ına ekle:

```tsx
// app/(tabs)/index.tsx — FlatList'e ListHeaderComponent güncelle
const [aramaMetni, setAramaMetni] = useState('');

const filtrelenmisUrunler = useMemo(
  () =>
    aramaMetni.trim() === ''
      ? urunler
      : urunler.filter(u =>
          u.isim.toLowerCase().includes(aramaMetni.toLowerCase())
        ),
  [urunler, aramaMetni]
);

<FlatList
  data={filtrelenmisUrunler}
  // ...
  ListHeaderComponent={() => (
    <>
      <Text style={styles.baslik}>Ürünler</Text>
      <SearchBar deger={aramaMetni} onChange={setAramaMetni} />
    </>
  )}
/>
```

---

## 8. ShopApp: Login Formu

`app/(auth)/login.tsx` oluştur:

```tsx
// app/(auth)/login.tsx
import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../constants/theme';

export default function LoginEkrani() {
  const router = useRouter();
  const sifreRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [yukleniyorMu, setYukleniyorMu] = useState(false);
  const [hata, setHata] = useState('');

  const girisYap = async () => {
    // Basit validasyon
    if (!email.trim()) {
      setHata('E-posta adresi gerekli');
      return;
    }
    if (!sifre) {
      setHata('Şifre gerekli');
      return;
    }
    setHata('');
    setYukleniyorMu(true);

    // Sahte API çağrısı — Gün 18'de gerçek API bağlanacak
    await new Promise(resolve => setTimeout(resolve, 1000));
    setYukleniyorMu(false);

    router.replace('/(tabs)');
    // replace: login ekranına geri dönülmesin
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.sayfa}
        keyboardShouldPersistTaps="handled"
        // keyboardShouldPersistTaps:
        // 'handled': input dışına tıklanınca klavye kapanır
        //            ama Pressable'lar tıklamayı alır (kapanmayı beklemez)
        // 'always': klavye açıkken de butonlar tıklanabilir
        // 'never': klavye açıkken dışarıya tıklayınca önce klavye kapanır
      >

        {/* LOGO ALANI */}
        <View style={styles.logoAlani}>
          <Text style={styles.logo}>ShopApp</Text>
          <Text style={styles.altBaslik}>Hesabına giriş yap</Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>

          {/* HATA MESAJI */}
          {hata ? (
            <View style={styles.hataKutusu}>
              <Text style={styles.hataYazi}>{hata}</Text>
            </View>
          ) : null}

          {/* E-POSTA */}
          <View style={styles.inputGrubu}>
            <Text style={styles.etiket}>E-posta</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              placeholderTextColor={COLORS.textDisabled}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => sifreRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* ŞİFRE */}
          <View style={styles.inputGrubu}>
            <Text style={styles.etiket}>Şifre</Text>
            <TextInput
              ref={sifreRef}
              value={sifre}
              onChangeText={setSifre}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textDisabled}
              style={styles.input}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={girisYap}
            />
          </View>

          {/* GİRİŞ BUTONU */}
          <Pressable
            style={({ pressed }) => [
              styles.buton,
              pressed && { opacity: 0.85 },
              yukleniyorMu && styles.butonDisabled,
            ]}
            onPress={girisYap}
            disabled={yukleniyorMu}
          >
            {yukleniyorMu ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.butonYazi}>Giriş Yap</Text>
            )}
          </Pressable>

          {/* KAYIT LİNKİ */}
          <Pressable
            onPress={() => router.push('/register')}
            style={styles.kayitLink}
          >
            <Text style={styles.kayitYazi}>
              Hesabın yok mu?{' '}
              <Text style={styles.kayitVurgu}>Kayıt ol</Text>
            </Text>
          </Pressable>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sayfa: {
    flexGrow: 1,
    // flexGrow: 1 — contentContainerStyle'da flex: 1 yerine flexGrow
    // ScrollView içeriği ekrandan kısa olduğunda da tüm ekranı kaplar
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xl,
  },

  logoAlani: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },

  logo: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },

  altBaslik: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },

  form: {
    gap: SPACING.lg,
  },

  hataKutusu: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },

  hataYazi: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
  },

  inputGrubu: {
    gap: SPACING.xs,
  },

  etiket: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },

  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    height: 50,
  },

  buton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },

  butonDisabled: {
    opacity: 0.6,
  },

  butonYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },

  kayitLink: {
    alignItems: 'center',
  },

  kayitYazi: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },

  kayitVurgu: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
```

---

## 9. `contentContainerStyle`'da `flex: 1` vs `flexGrow: 1`

ScrollView içinde form yapılırken sık karşılaşılan sorun:

```tsx
// ❌ flex: 1 — içerik kısaysa ScrollView scroll eder ama içerik alta yapışmaz
<ScrollView contentContainerStyle={{ flex: 1 }}>

// ✅ flexGrow: 1 — içerik kısaysa ekranı doldurur, uzunsa scroll eder
<ScrollView contentContainerStyle={{ flexGrow: 1 }}>
```

`flex: 1` sabit boyut demek. `flexGrow: 1` en az 1 birim büyü — içerik yeterliyse daha da büyüyebilir. Login formunda logo üstte, "kayıt ol" linki altta sabitlenmiş görünüm için `flexGrow: 1` şart.

---

## 10. Web ile Karşılaştırma

| HTML Input | TextInput (RN) | Fark |
|---|---|---|
| `type="email"` | `keyboardType="email-address"` | Klavye türü değişir, doğrulama yapmaz |
| `type="password"` | `secureTextEntry={true}` | Boolean prop |
| `type="number"` | `keyboardType="numeric"` | Sadece klavye değişir, string döner |
| `onChange={e => e.target.value}` | `onChangeText={text => text}` | Direkt string, event yok |
| `placeholder` | `placeholder` + `placeholderTextColor` | Renk ayrı prop |
| `autoFocus` | `autoFocus` | Aynı |
| `maxLength` | `maxLength` | Aynı |
| CSS `::placeholder` | `placeholderTextColor` | Prop olarak verilir |
| Klavye overlap yok | `KeyboardAvoidingView` | Mobil'e özgü sorun |
| `ref.focus()` | `ref.current?.focus()` | Optional chaining gerekli |

---

## 11. Yaygın Hatalar

**Hata 1: Android'de input görünmüyor / çok küçük**
```tsx
// ❌ Android TextInput bazen yükseklik almaz
<TextInput style={{ borderWidth: 1 }} />

// ✅ Açıkça yükseklik ver
<TextInput style={{ height: 50, borderWidth: 1, paddingHorizontal: 12 }} />
```

**Hata 2: `KeyboardAvoidingView` düzgün çalışmıyor**
```tsx
// ❌ Platform.OS kontrolü yok
<KeyboardAvoidingView behavior="padding">

// ✅ Platform'a göre behavior
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
```

**Hata 3: Klavye açıkken buton tıklanamıyor**
```tsx
// ❌ Klavye önce kapanıyor, sonra tıklanıyor — UX kötü
<ScrollView>

// ✅ keyboardShouldPersistTaps ekle
<ScrollView keyboardShouldPersistTaps="handled">
```

**Hata 4: `secureTextEntry` ile Android'de font garip**
```tsx
// Android'de secureTextEntry açıkken bazı özel fontlar bozulur
<TextInput
  secureTextEntry
  style={{ fontFamily: undefined }}
  // fontFamily'yi temizle — sistem fontuna düş
/>
```

---

## 12. Kontrol Soruları

**1. `onChange` yerine `onChangeText` — neden event objesi yok?**
> Mobil native text event'leri tarayıcıdan farklı. React Native team, `SyntheticEvent` sarmalayıcısı yerine doğrudan string değeri expose etmeyi tercih etti. `e.target.value` gibi zincir gereksiz — değişen string zaten tek bilgi. Düşük seviyeli erişim gerekirse `onChange` prop'u `e.nativeEvent.text` verir.

**2. `KeyboardAvoidingView` neden gerekli? Web'de bu sorun neden yok?**
> Web'de soft keyboard yok — fiziksel klavye veya sanal klavye viewport'u etkilemez. Mobilde soft keyboard ekranın yarısını kaplar ve içeriğin üstüne biner. `KeyboardAvoidingView` klavye animasyonunu dinleyip View'ı yukarı iter.

**3. iOS'ta `behavior="padding"`, Android'de `behavior="height"` — neden farklı?**
> iOS'ta klavye açılışı View'ın dışında gerçekleşir — View'a padding eklenerek içerik iter. Android'de sistem penceresi küçülür (window resize) — View yüksekliği zaten azalır, fazladan padding çift etki yapar ve layout bozulur. Her platform kendi yaklaşımını destekler.

---

## Bugün Ne Yaptık?

```
✅ TextInput'un HTML input'tan farkını anladık
✅ onChangeText ile controlled input yazdık
✅ keyboardType, returnKeyType, secureTextEntry öğrendik
✅ KeyboardAvoidingView ile klavye overlap sorununu çözdük
✅ ref + focus() ile form navigasyonu yaptık
✅ hitSlop ile küçük dokunma hedefini genişlettik
✅ keyboardShouldPersistTaps öğrendik
✅ flexGrow: 1 vs flex: 1 ScrollView içinde anladık
✅ SearchBar bileşeni yazdık — filtreli ürün listesi
✅ Login formu yazdık — validasyon, loading, hata mesajı
```

---

## Sonraki Gün

**[Gün 10 → Platform API: iOS vs Android Farkları](gun10_platform_api.md)**

`Platform.OS`, platform-specific dosyalar, SafeAreaView, StatusBar, BackHandler.
ShopApp'te platforma göre davranış farkları.

---

*← [Gün 8](gun08_flatlist.md) | [Müfredat](../reactNaitiveMufredat.md) | [Gün 10 →](gun10_platform_api.md)*
