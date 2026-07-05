# Gün 16 — useEffect ve Yaşam Döngüsü

> **Faz:** 1 — Temeller | **Hafta:** 3 | **Gün:** 16 / 60
>
> **Bugünün Hedefi:** React Native'de ekranların nasıl "doğup öldüğünü" kavramak.
> Bu konuyu anlamadan yazdığın her `useEffect` beklenmedik şekilde davranır.

---

## 1. "Mount" ve "Unmount" Ne Demek?

Düşün ki bir component bir sahnedeki oyuncu gibi:

- **Mount** = oyuncu sahneye çıktı. Component ekranda göründü, `useEffect` ilk kez çalıştı.
- **Unmount** = oyuncu sahneden çıktı. Component ekrandan tamamen silindi, cleanup fonksiyonu çalıştı.

```jsx
useEffect(() => {
  console.log("mount oldu — ekrana geldim");   // 1. oyuncu sahneye çıktı

  return () => {
    console.log("unmount oldu — sahneden çıktım"); // 2. oyuncu sahneden çıktı
  };
}, []);
```

Bu `[]` dependency array'in anlamı: **"sadece mount ve unmount anında çalış, başka hiçbir zaman çalışma."**

---

## 2. Web'de Nasıl Çalışıyordu?

Web'de React Router / Next.js kullandığında:

```
Kullanıcı Ürün Listesi sayfasındayken →
  Bir ürüne tıkladı, Ürün Detayı sayfasına geçti →
  Geri düğmesine bastı, Ürün Listesi sayfasına döndü
```

Bu senaryoda React şunu yapıyordu:

1. Ürün Listesi sayfasına gelince → **mount** → `useEffect` çalıştı, ürünler çekildi
2. Ürün Detayına geçince → Ürün Listesi **unmount** oldu (DOM'dan silindi)
3. Geri dönünce → Ürün Listesi **yeniden mount** oldu → `useEffect` tekrar çalıştı, ürünler tekrar çekildi

Yani web'de geri dönünce `useEffect([])` **her seferinde** tetikleniyordu. Çünkü sayfa sıfırdan oluşuyordu.

---

## 3. React Native'de Fark Ne? (Önemli!)

React Native'de Expo Router / React Navigation ekranları **silmez, arka planda bekletir.**

```
Kullanıcı Ürün Listesi ekranındayken →
  Bir ürüne tıkladı, Ürün Detayı ekranına geçti →
  Geri düğmesine bastı, Ürün Listesi ekranına döndü
```

Bu senaryoda React Native şunu yapıyor:

1. Ürün Listesi açılınca → **mount** → `useEffect` çalıştı, ürünler çekildi ✅
2. Ürün Detayına geçince → Ürün Listesi **unmount OLMADI**, arka planda uyuyor 😴
3. Geri dönünce → Ürün Listesi uyandı ama **mount olmadı** → `useEffect([])` çalışmadı ❌

### Gerçek Hayat Örneği

Diyelim ki kullanıcı sepet ekranına girdi, sepeti gördü. Ardından ana sayfaya gidip yeni bir ürün sepete ekledi. Tekrar sepet ekranına döndü.

**Beklenti:** Yeni ürün sepette görünsün.
**Sonuç:** `useEffect([])` çalışmadığı için sepet eski haliyle gösteriyor.

Bu React Native'e geçerken insanların en çok şikâyet ettiği davranış.

---

## 4. Çözüm: `useFocusEffect`

Expo Router / React Navigation, "ekran ekrana her gelince çalış" diyebilmek için `useFocusEffect` hook'unu sunuyor.

**Focus** = ekran öne geçti, kullanıcı bu ekrana bakıyor.
**Blur** = ekran arkaya düştü, kullanıcı başka ekrana geçti.

```jsx
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

function CartScreen() {
  const [cart, setCart] = useState([]);

  useFocusEffect(
    useCallback(() => {
      // Ekran her focus aldığında burası çalışır
      // — İlk açılışta da çalışır
      // — Başka ekrandan geri dönüldüğünde de çalışır
      console.log("Sepet ekranı açıldı, veriyi tazeliyorum");
      loadCart().then(setCart);

      return () => {
        // Ekran focus'u kaybedince (başka ekrana geçilince) burası çalışır
        console.log("Sepet ekranından ayrıldım");
      };
    }, [])
  );

  return <FlatList data={cart} /* ... */ />;
}
```

Artık kullanıcı her sepet ekranına geldiğinde `loadCart()` çalışır ve sepet güncellenir.

### Neden `useCallback` Şart?

`useFocusEffect`'e geçilen fonksiyon her render'da yeniden oluşturulursa, React "yeni fonksiyon geldi, tekrar çalıştırayım" der ve **sonsuz döngüye** girer. `useCallback` fonksiyonu memoize ederek bunu engeller.

```jsx
// ❌ Sonsuz döngü — her render'da yeni fonksiyon oluşuyor
useFocusEffect(() => {
  loadCart();
});

// ✅ useCallback ile memoize et
useFocusEffect(
  useCallback(() => {
    loadCart();
  }, [])
);
```

---

## 5. `useEffect` vs `useFocusEffect` — Ne Zaman Hangisi?

```
Ürün Listesi açıldı    → useEffect([]) çalışır    | useFocusEffect çalışır ✅
Ürün Detayına geçildi  → (arka planda bekler)      | (arka planda bekler)
Geri dönüldü           → useEffect([]) çalışmaz ❌ | useFocusEffect çalışır ✅
```

| Senaryo | Hangi Hook | Neden |
|---|---|---|
| Uygulama açılışında bir kez token kontrolü | `useEffect([])` | Tek seferlik yeter |
| Ekrana her gelince güncel veri çek | `useFocusEffect` | Geri dönüşte de çalışmalı |
| `productId` değişince ürünü yeniden çek | `useEffect([productId])` | Dependency değişimi |
| Her ekrana gelince analytics log at | `useFocusEffect` | Her görüntüleme kayıt edilmeli |

---

## 6. Cleanup — "Arkamı Temizlemek"

Cleanup fonksiyonu, component sahneden çıkarken "arkasını toplar."

### Neden Önemli?

Düşün: Ekranın fiyatı her 3 saniyede bir API'den çekiyor. Kullanıcı başka ekrana geçti ama timer hâlâ çalışıyor. 10 ekran açıp kapattı — artık 10 ayrı timer çalışıyor, hepsi gereksiz API isteği atıyor. Buna **memory leak** denir.

```jsx
useEffect(() => {
  // Timer başladı
  const timer = setInterval(() => {
    fetchLatestPrice(productId).then(setPrice);
  }, 3000);

  return () => {
    // Ekran kapanınca timer'ı durdur
    clearInterval(timer);
    console.log("Timer temizlendi");
  };
}, [productId]);
```

### Async İşlemlerde Cleanup

Kullanıcı bir ürün sayfasına girdi, API isteği uçtu. Ama hemen geri tuşuna bastı, ekran kapandı. API yanıtı 2 saniye sonra geldi — ama ekran artık yok. Bu durumda state güncellemeye çalışmak konsola uyarı yazıyor.

```jsx
useEffect(() => {
  let active = true; // "ekran hâlâ açık mı?"

  async function loadProduct() {
    const data = await getProduct(productId);

    if (active) {
      // Ekran hâlâ açıksa state'i güncelle
      setProduct(data);
    }
    // Ekran kapandıysa hiçbir şey yapma, suskunca çık
  }

  loadProduct();

  return () => {
    active = false; // "ekran kapandı" işareti koy
  };
}, [productId]);
```

---

## 7. AppState — Uygulama Arka Plana Geçince

Ekranlar arası geçiş değil de kullanıcı home tuşuna basıp uygulamadan çıktığında ne olur?

Bu durumda `useFocusEffect` çalışmaz — çünkü ekranlar arasında değil, uygulamanın kendisi arka plana indi. Bunun için `AppState` kullanılır.

```
Kullanıcı ShopApp'teyken →
  Home tuşuna bastı, telefon ana ekranına döndü  → AppState: "background"
  WhatsApp'a baktı                               → AppState: "background"
  Tekrar ShopApp'e döndü                         → AppState: "active"
```

```jsx
import { AppState } from "react-native";
import { useEffect, useRef } from "react";

function CartScreen() {
  const appState = useRef(AppState.currentState); // şu anki durum

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const prevState = appState.current;
      appState.current = nextState;

      // Arka plandan ön plana geçti
      if (
        (prevState === "background" || prevState === "inactive") &&
        nextState === "active"
      ) {
        console.log("Kullanıcı geri döndü, sepeti yeniliyorum");
        loadCart().then(setCart);
      }
    });

    return () => subscription.remove(); // cleanup
  }, []);
}
```

| AppState Değeri | Ne Anlama Geliyor |
|---|---|
| `"active"` | Uygulama ekranda, kullanıcı etkileşimde |
| `"background"` | Kullanıcı home'a bastı veya başka uygulamaya geçti |
| `"inactive"` | iOS'a özgü geçiş anı — telefon geldi, kontrol merkezi açıldı |

---

## 8. ShopApp'te Hepsini Bir Arada Görmek

**Senaryo:** Kullanıcı ürün detayına girdi, fiyat her 30 saniyede güncelleniyor. Geri dönünce timer durmalı. Sepet ekranına her girişte sepet tazelenmeli.

```jsx
// screens/CartScreen.jsx
import { useState } from "react";
import { View, FlatList } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { loadCart } from "../utils/cartStorage";

export default function CartScreen() {
  const [cart, setCart] = useState([]);

  // Her sepet ekranına gelişte (ilk açılış + geri dönüş) sepeti yükle
  useFocusEffect(
    useCallback(() => {
      loadCart().then(setCart);
    }, [])
  );

  return <FlatList data={cart} keyExtractor={(i) => i.id} renderItem={/* ... */} />;
}
```

```jsx
// screens/ProductDetailScreen.jsx
import { useState, useEffect } from "react";
import { ScrollView, Text } from "react-native";
import { getProduct } from "../api/products";

export default function ProductDetailScreen({ productId }) {
  const [product, setProduct] = useState(null);

  // Mount'ta ürünü çek — ID değişince tekrar çek
  useEffect(() => {
    let active = true;

    getProduct(productId).then((data) => {
      if (active) setProduct(data);
    });

    return () => { active = false; };
  }, [productId]);

  // Fiyatı her 30 saniyede yenile, ekrandan çıkınca durdur
  useEffect(() => {
    if (!product) return;

    const timer = setInterval(async () => {
      const fresh = await getProduct(productId);
      setProduct((prev) => ({ ...prev, price: fresh.price }));
    }, 30_000);

    return () => clearInterval(timer); // cleanup — timer durdur
  }, [productId, product]);

  if (!product) return null;

  return (
    <ScrollView>
      <Text>{product.name}</Text>
      <Text>{product.price} ₺</Text>
    </ScrollView>
  );
}
```

---

## 9. Dependency Array — Hangi `[]` Ne Yapar?

```jsx
// Boş array — sadece mount'ta bir kez çalışır
useEffect(() => {
  fetchUserProfile(); // Uygulama açılınca bir kez çek, hep aynı
}, []);

// Değer var — o değer değişince çalışır
useEffect(() => {
  fetchProduct(productId); // productId değişince yeniden çek
}, [productId]);

// Array yok — her render'da çalışır (neredeyse hiç kullanma)
useEffect(() => {
  console.log("Her render'da çalışıyorum"); // tehlikeli
});
```

---

## 10. Yaygın Hatalar ve Düzeltmeleri

### "Sepete ürün ekledim ama geri dönünce görünmüyor"

```jsx
// ❌ Sorun — geri dönünce useEffect çalışmıyor
useEffect(() => {
  loadCart().then(setCart);
}, []);

// ✅ Çözüm — useFocusEffect ile her dönüşte yükle
useFocusEffect(
  useCallback(() => {
    loadCart().then(setCart);
  }, [])
);
```

### "useFocusEffect döngüye giriyor"

```jsx
// ❌ useCallback yok — her render'da yeni fonksiyon → sonsuz döngü
useFocusEffect(() => {
  loadCart();
});

// ✅
useFocusEffect(useCallback(() => {
  loadCart();
}, []));
```

### "Konsolda: Can't perform a React state update on an unmounted component"

```jsx
// ❌ Ekran kapandıktan sonra API yanıtı gelirse state güncellemeye çalışır
useEffect(() => {
  getProduct(id).then(setProduct);
}, [id]);

// ✅ active flag ile koru
useEffect(() => {
  let active = true;
  getProduct(id).then((data) => { if (active) setProduct(data); });
  return () => { active = false; };
}, [id]);
```

---

## Özet

- **Mount** = component ekrana geldi, **unmount** = ekrandan tamamen silindi
- React Native'de ekranlar geri dönüşte **unmount olmaz** — arka planda uyur
- Bu yüzden geri dönüşte `useEffect([])` çalışmaz → **`useFocusEffect`** kullan
- **Cleanup fonksiyonu** = component kapanırken timer/listener gibi şeyleri durdur
- **`active` flag** = async istek uçtu ama ekran kapandıysa state güncelleme
- **`AppState`** = uygulama home'a inince / geri gelince tetiklen

---

## Mini Görev

1. `CartScreen`'e `useFocusEffect` ekle — her açılışta AsyncStorage'dan sepeti yükle
2. `ProductDetailScreen`'de ürün çekilirken `active` flag kullan
3. Bir sayaç component'i yaz: mount olunca her saniye artsın, unmount olunca dursun (`setInterval` + `clearInterval`)

---

**Sonraki Gün:** [Gün 17 — Zustand](gun17_zustand.md)
