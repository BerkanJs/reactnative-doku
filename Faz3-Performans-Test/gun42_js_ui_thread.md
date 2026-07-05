# Gün 42 — JS Thread vs UI Thread: Render Performansı

> **Faz 3 başlıyor.** Faz 1 ve 2'de "çalışan uygulama" yaptık. Faz 3'te bunu "akıcı ve dayanıklı" hale getiriyoruz. Bugün performansın en temel konusu: React Native'in içinde kaç thread var, hangisi ne iş yapıyor, ve JS thread neden bu kadar önemli?

---

## Önce Masayı Temizleyelim: Web'de Neler Oluyordu?

Web'de tarayıcıya bir React bileşeni render ettiğinde aslında pek çok şey paralel yürür: stil hesaplamalar, layout, paint, compositor — bunlar büyük ölçüde tarayıcının kendi Main Thread ve Compositor Thread'inde kendi hızında ilerler. Sen JavaScript yazarsın, tarayıcı gerisini halleder.

React Native'de bu ayrım çok daha belirgin ve **senin sorumluluğundadır.** Hangi işin hangi thread'de çalıştığını bilmezsen kullanıcı ekran donması yaşar.

---

## React Native'in 3 Thread'i

### 1. JS Thread — Senin Yazdığın Kodun Çalıştığı Yer

React bileşenleri, `useEffect`, `useState`, API çağrıları, event handler'lar, `setTimeout` — bunların hepsi JS Thread'de çalışır. Tek bir thread, tek sıra. Bir iş bitmeden diğeri başlamaz.

Buradaki kritik nokta şu: **ekranın akıcı görünmesi için her 16ms'de bir frame üretilmesi gerekir (60fps).** Eğer JS Thread 16ms içinde işini bitiremezse bir frame atlanır ve kullanıcı titreme görür. Buna **jank** denir.

```
Normal (60fps):   |----16ms----|----16ms----|----16ms----|
                  ✅ frame      ✅ frame      ✅ frame

Jank:             |----16ms----|----32ms---------|----16ms----|
                  ✅ frame      ❌ frame atlandı  ✅ frame
```

Frame atlandığında ekran bir önceki halinde "takılı" kalır — parmak kaydırırken liste duruyormuş gibi hissedilir.

### 2. UI Thread (Main Thread) — Native Ekranı Çizen Yer

Gerçek native view'ların (iOS UIView, Android View) güncellenmesi burada olur. Dokunma, kaydırma, native gesture tanıma da burada çalışır. Bu thread her zaman 60fps'i yakalamaya çalışır.

**Önemli:** UI Thread, JS Thread'den bağımsızdır. JS Thread kalabalıksa UI Thread beklemek zorunda değildir — ama JS Thread'den talep gelmezse ne çizeceğini de bilemez.

### 3. Native Modules Thread — Platform API'lerinin Çalıştığı Yer

Kamera, dosya sistemi, Bluetooth, GPS gibi ağır native işlemler buradadır. Zaten async olarak tasarlanmışlardır, genellikle senin müdahalene gerek kalmaz.

---

## "Jank" Kelimesini Somutlaştıralım

Bir kullanıcı ShopApp'te ürün listesini kaydırıyor. Aynı anda JS Thread şunları yapıyor olabilir:

- TanStack Query bir API isteğinden dönen 200 ürünü parse ediyor
- Fiyatları sıralamak için sort çalışıyor
- Zustand store güncelleniyor
- 3 tane `useEffect` tetiklendi

Bu işlemlerin tamamı sırayla ve aynı thread'de çalışır. Eğer hepsi birden 30-40ms sürerse, kullanıcının parmağı liste üzerinde kaymaya devam ederken ekran 2-3 frame donup sonra sıçrar. İşte bu jank.

---

## Sorun 1: Animasyonlar ve `useNativeDriver`

### useNativeDriver: false (kötü) — Ne Oluyor?

```tsx
Animated.timing(opaklık, {
  toValue: 1,
  duration: 500,
  useNativeDriver: false, // ← bu satır ne anlama geliyor?
}).start();
```

`useNativeDriver: false` demek şudur: animasyon her frame'inde (yani her 16ms'de bir) JS Thread "şu anda opaklık 0.1 olsun, şimdi 0.2 olsun, şimdi 0.3 olsun..." diye native tarafa mesaj göndermek zorundadır.

JS Thread meşgulse — diyelim ki aynı anda bir API cevabı işleniyor — bu mesaj geç gider. Native taraf bekler. Frame atlanır. Animasyon titrer.

### useNativeDriver: true (iyi) — Ne Oluyor?

```tsx
Animated.timing(opaklık, {
  toValue: 1,
  duration: 500,
  useNativeDriver: true, // ← bu satır ne anlama geliyor?
}).start();
```

`useNativeDriver: true` demek şudur: animasyon **başlamadan önce** tüm konfigürasyon (başlangıç değeri, bitiş değeri, süre, easing) native tarafa tek seferlik gönderilir. Artık native thread kendi başına hesaplar, her frame'i kendisi üretir. JS Thread'in bu animasyonla hiçbir ilişkisi kalmaz.

Sonuç: JS Thread 100ms boyunca bir JSON parse ediyor olsa bile animasyon JS'den tamamen bağımsız olduğu için tam 60fps'te akmaya devam eder.

**Kısıt:** `useNativeDriver: true` sadece `opacity` ve `transform` (translateX, translateY, scale, rotate) gibi özellikler için çalışır. `width`, `height`, `backgroundColor` gibi layout özelliklerini JS Thread'den koordine etmek gerekir çünkü bunlar native layout engine'i tetikler. Bu yüzden renk animasyonlarında veya boyut animasyonlarında `useNativeDriver: false` kullanmak zorunda kalırsın — ve orada dikkatli olman gerekir.

---

## Sorun 2: Ağır İş Doğru Zamanda Yapılmıyor

Bir sayfaya geçiş yaptığında Expo Router ekranı bir animasyonla slide eder. Bu animasyon devam ederken eğer sen aynı anda API'ye istek atıp cevabı işlemeye başlarsan, JS Thread hem animasyonu hem API cevabını aynı anda taşımak zorunda kalır. Sonuç: geçiş animasyonu takılır.

Çözüm: ağır işi animasyon bitene kadar beklet.

```tsx
import { InteractionManager } from 'react-native';
import { useEffect, useState } from 'react';

export function UrunDetayEkrani() {
  const [veriYuklemeBasladi, setVeriYuklemeBasladi] = useState(false);

  useEffect(() => {
    // InteractionManager, Expo Router'ın geçiş animasyonu dahil tüm
    // "interaction"ların bitmesini bekler. Bitince verilen callback'i çalıştırır.
    // Bunu yazmasaydık: geçiş animasyonu + API isteği eş zamanlı çalışır, animasyon takılırdı.
    const gorev = InteractionManager.runAfterInteractions(() => {
      setVeriYuklemeBasladi(true);
    });

    // Eğer kullanıcı sayfaya gelmeden geri dönerse bu cleanup çalışır.
    // Bunu yazmasaydık: kullanıcı geri dönseydi bile callback bir süre sonra çalışırdı,
    // unmount olmuş bir component'in state'ini güncellemeye çalışırdı.
    return () => gorev.cancel();
  }, []);

  // veriYuklemeBasladi false iken TanStack Query çalışmaz (enabled: false)
  const { data } = useQuery({
    queryKey: ['urun-detay'],
    queryFn: fetchUrunDetay,
    enabled: veriYuklemeBasladi,
  });

  return <DetayIcerigi data={data} />;
}
```

`setTimeout(fn, 0)` ile aynı şey değil midir? Hayır. `setTimeout(fn, 0)` sadece "bu frame'den sonra yap" demektir — animasyon sürüyor olsa bile çalışmaya başlar. `InteractionManager` ise tüm animasyonlar ve gesture'lar tamamen bitene kadar bekler.

---

## Sorun 3: Gereksiz Re-render'lar

React her component'i ne zaman re-render eder? Parent component re-render olunca tüm child'lar da re-render olur — props değişmemiş olsa bile. Web'de bu genellikle sorun çıkarmaz çünkü DOM diff algoritması hızlı çalışır. React Native'de re-render, native bridge'den geçmesi gereken view güncellemeleri demektir — ve bu 1000 item'lı bir FlatList'te son derece pahalıdır.

### React.memo — Ne Yapar?

```tsx
// Bu component'i düşün:
function UrunKart({ urun }: { urun: Urun }) {
  return <Text>{urun.baslik}</Text>;
}
```

FlatList bu component'i her item için render eder. Liste 100 item içeriyorsa ve parent (örneğin sepet sayısı) her değiştiğinde 100 UrunKart yeniden render olur. Ama ürün verileri hiç değişmedi — gereksiz iş.

```tsx
// React.memo: props değişmemişse bu component'i render etme
const UrunKart = React.memo(function UrunKart({ urun }: { urun: Urun }) {
  return <Text>{urun.baslik}</Text>;
});
```

`React.memo` component'i "önceki props" ile "yeni props"ı karşılaştırır. Eğer eşitse render'ı tamamen atlar. Kopyayı döner.

**Uyarı:** Bu karşılaştırma shallow (yüzeysel) çalışır. Obje veya array prop'lar için her render'da yeni referans oluşuyorsa `React.memo` fayda sağlamaz çünkü `{} !== {}` JavaScript'te her zaman doğrudur.

### useMemo — Ne Zaman Değerli?

```tsx
// Kötü: her render'da 500 ürün tekrar sıralanıyor
function UrunListesi({ urunler }: { urunler: Urun[] }) {
  const siralamisUrunler = [...urunler].sort((a, b) => a.fiyat - b.fiyat);
  // Bu satır her render'da çalışır. Sepet güncellenince, header güncellenince,
  // herhangi bir state değişince — hep sıralama yapılır.
  return <FlatList data={siralamisUrunler} />;
}

// İyi: urunler değişmediği sürece sort tekrar çalışmaz
function UrunListesi({ urunler }: { urunler: Urun[] }) {
  const siralamisUrunler = useMemo(
    () => [...urunler].sort((a, b) => a.fiyat - b.fiyat),
    [urunler] // sadece urunler değişince yeniden hesapla
  );
  return <FlatList data={siralamisUrunler} />;
}
```

`useMemo` dependency array'ine giren değerler değişmedikçe hesaplamayı tekrar yapmaz, önceki sonucu döner. 500 elemanlı bir sort işlemi için bu çok değerlidir. Ama basit bir string birleştirme için `useMemo` yazmak — karşılaştırma maliyeti, closure oluşturma — asıl işlemden pahalı olabilir. **Kör kullanma. Profil et, sonra karar ver.**

### useCallback — Ne Zaman Değerli?

`useCallback` bir fonksiyonun referansını "dondurur". Her render'da aynı referansı döner.

```tsx
// Parent component her render'da yeni bir handlePress fonksiyonu oluşturuyor:
function Liste({ urunler }) {
  const handlePress = (id: string) => router.push(`/urun/${id}`);
  // Bu fonksiyon her render'da yeniden oluşturulur, yeni bir referanstır.
  // React.memo ile wrap'lenmiş UrunKart'a bu prop geçilirse,
  // React.memo "props değişti" sanır çünkü önceki handlePress !== yeni handlePress
  
  return <FlatList renderItem={({ item }) => <UrunKart onPress={handlePress} urun={item} />} />;
}

// Düzeltme:
function Liste({ urunler }) {
  const handlePress = useCallback(
    (id: string) => router.push(`/urun/${id}`),
    [] // hiç değişmeyecek, bir kez oluştur
  );
  // Artık handlePress her render'da aynı referanstır.
  // React.memo doğru çalışır.
}
```

`useCallback` tek başına performans kazandırmaz. Ancak `React.memo` ile kullanılan bir child component'e fonksiyon prop geçiliyorsa gereklidir — yoksa React.memo'yu etkisiz kılar.

---

## Hermes Engine — Neden Önemli?

Web tarayıcıları V8 (Chrome) veya SpiderMonkey (Firefox) kullanır. Bu engine'ler kodu çalışırken optimize eder — JIT (Just-In-Time) compilation. İlk çalışmada yavaş, sonra giderek hızlanır.

React Native, 0.70 sürümünden itibaren Facebook'un geliştirdiği **Hermes** engine'i varsayılan olarak kullanır. Hermes farklı çalışır: kodu build aşamasında bytecode'a çevirir (AOT — Ahead-Of-Time). Uygulama açıldığında JS parse etmek ve compile etmek gerekmez, bytecode direkt çalışır.

Sonuç: uygulamanın açılış süresi yaklaşık %30-40 kısalır, bellek kullanımı azalır. ShopApp'te bu, splash screen'in daha kısa sürmesi ve ilk ekranın daha hızlı gelmesi anlamına gelir.

`app.json`'da özellikle ayarlaman gerekmez — varsayılan olarak aktiftir.

---

## Profiling: Sorunu Nasıl Bulursun?

Performans problemlerini tahminle değil, ölçümle bulursun. Yanlış yere optimizasyon yapmak hem zaman kaybettirir hem de kodu gereksiz karmaşıklaştırır.

**React DevTools Profiler:**

Expo'da geliştirme modunda çalışırken tarayıcıdan React DevTools'u açabilirsin. Profiler sekmesinde "Record" düğmesine basıp uygulamada kaydırmalar, tıklamalar yaptıktan sonra durdurursun. Her component'in ne kadar sürede render olduğunu ve kaç kez render olduğunu flamegraph üzerinde görebilirsin.

Dikkat etmen gerekenler:
- 16ms'yi geçen render süresi olan component'ler
- Beklenmediği halde render olan component'ler ("why did this render?" özelliği)
- Çok sık render olan parent component'ler

**console.time ile hızlı ölçüm:**

```tsx
console.time('urun-sort');
const sorted = [...urunler].sort((a, b) => a.fiyat - b.fiyat);
console.timeEnd('urun-sort');
// Çıktı: urun-sort: 3.2ms — 16ms'nin çok altında, useMemo gerekmeyebilir
// Çıktı: urun-sort: 28ms — 16ms'yi geçiyor, useMemo değerli
```

---

## ShopApp'e Uygulama

Bu bilgileri ShopApp'in ürün listesi ekranında birleştirelim:

```tsx
import { FlatList, InteractionManager, ActivityIndicator } from 'react-native';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

type Urun = { id: string; baslik: string; fiyat: number };

// React.memo ile wrap'lı — sadece prop değişince render olur
const UrunKart = memo(function UrunKart({
  urun,
  onPress,
}: {
  urun: Urun;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable onPress={() => onPress(urun.id)}>
      <Text>{urun.baslik}</Text>
      <Text>{urun.fiyat} ₺</Text>
    </Pressable>
  );
});

export function UrunlerEkrani() {
  const router = useRouter();
  // Geçiş animasyonu bitene kadar API'yi beklet
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    const gorev = InteractionManager.runAfterInteractions(() => setHazir(true));
    return () => gorev.cancel();
  }, []);

  const { data: urunler = [], isLoading } = useQuery({
    queryKey: ['urunler'],
    queryFn: fetchUrunler,
    enabled: hazir,
  });

  // 200 ürünü sort etmek: her render'da değil, urunler değişince
  const siralamisUrunler = useMemo(
    () => [...urunler].sort((a, b) => a.fiyat - b.fiyat),
    [urunler]
  );

  // Her render'da yeni referans oluşmasın — React.memo UrunKart için gerekli
  const handlePress = useCallback(
    (id: string) => router.push(`/urun/${id}`),
    [router]
  );

  if (!hazir || isLoading) return <ActivityIndicator />;

  return (
    <FlatList
      data={siralamisUrunler}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <UrunKart urun={item} onPress={handlePress} />
      )}
    />
  );
}
```

---

## Özet: Hangi Araç Hangi Problemi Çözer?

| Problem | Neden Oluyor? | Çözüm |
|---------|--------------|-------|
| Sayfa geçişi takılıyor | API isteği + animasyon aynı anda JS Thread'i doluyor | `InteractionManager.runAfterInteractions` |
| FlatList kaydırmada titriyor | Her kaydırmada tüm item'lar re-render oluyor | `React.memo` + `useCallback` |
| Büyük liste filtrelenince donuyor | Sort/filter her render'da tekrar çalışıyor | `useMemo` |
| Fade animasyonu takılıyor | `useNativeDriver: false`, animasyon JS Thread'de | `useNativeDriver: true` |
| Uygulama açılışı yavaş | Hermes kapalı ya da büyük JS bundle | Hermes aktif, lazy loading |

---

## Kontrol Soruları

1. JS Thread ile UI Thread bağımsız çalışıyorsa, JS Thread bloke olduğunda neden ekran donuyor? İkisi arasında ne köprüsü var?
2. `useNativeDriver: true` sadece `opacity` ve `transform` için çalışıyor dendi. `backgroundColor` animasyonu yapmak istesen ne yaparsın?
3. `React.memo` ile wrap'lenmiş bir component'e her render'da yeni bir obje prop geçilirse ne olur? Bunu önlemek için ne yapman gerekir?
4. `InteractionManager.runAfterInteractions` ile `setTimeout(fn, 500)` arasındaki fark ne? Neden ikincisi kötü bir çözüm?
5. `useMemo`'nun kendisinin de bir maliyeti var dendi. Bu maliyet nedir? Hangi durumda useMemo kullanmak yarardan çok zarar verir?

---

## Sonraki Gün

**Gün 43 → FlatList Optimizasyonu:** `getItemLayout` nedir, neden scroll to index yavaştır, `windowSize` ne kadar bellek tutar, `removeClippedSubviews` ne zaman açılır — FlatList'in tüm parametreleri detaylı açıklamasıyla.
