# Gün 12 — Modal ve Alert

> **Faz:** 1 — Temeller | **Hafta:** 2 | **Gün:** 12 / 60
>
> **Bugünün Hedefi:** React Native'de kullanıcıya overlay/dialog göstermeyi öğrenmek.
> ShopApp'te "sepete ekle onayı", "silme uyarısı" ve "ürün detay modal"ı yapacağız.

---

## 1. Web'de Ne Yapıyorduk?

Web'de dialog/overlay için iki yol vardı:

```jsx
// 1. Native browser dialog (blokluyor, stillenemez)
window.alert("Ürün sepete eklendi!");
window.confirm("Silmek istediğinize emin misiniz?");

// 2. Custom modal (React portal ile)
import { createPortal } from "react-dom";

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;
  return createPortal(
    <div className="overlay">
      <div className="modal">{children}</div>
    </div>,
    document.body
  );
}
```

React Native'de **`document.body` yok, portal yok.** Bunun yerine:
- **`Alert`** → OS'un native dialog'u (stillenemez ama hızlı)
- **`Modal`** → tamamen özelleştirilebilir overlay

---

## 2. `Alert` — Hızlı Native Dialog

`Alert`, işletim sisteminin kendi alert dialog'unu açar. Android'de Android dialog, iOS'ta iOS sheet görünür.

### Temel Kullanım

```jsx
import { Alert, Button } from "react-native";

// Sadece mesaj (tek buton: OK)
Alert.alert("Bilgi", "Ürün sepete eklendi.");

// Birden fazla buton
Alert.alert(
  "Ürünü Sil",                   // başlık
  "Bu ürünü silmek istiyor musunuz?", // mesaj
  [
    {
      text: "İptal",
      style: "cancel",            // iOS'ta bold değil
    },
    {
      text: "Sil",
      style: "destructive",       // iOS'ta kırmızı
      onPress: () => deleteProduct(id),
    },
  ]
);
```

### `Alert.prompt` — Sadece iOS

```jsx
// Android'de çalışmaz!
Alert.prompt(
  "İncelemenizi Yazın",
  "Ürün için yorumunuzu girin:",
  (text) => console.log("Yorum:", text),
  "plain-text",
  "",              // placeholder değil, default değer
  "default"
);
```

| Özellik | Web (`window.confirm`) | React Native (`Alert`) |
|---------|------------------------|------------------------|
| Stilleme | ❌ Yok | ❌ Yok (OS stilini kullanır) |
| Blokluyor mu? | ✅ Evet (senkron) | ❌ Hayır (callback ile) |
| Platform farkı | Yok | `destructive` / `prompt` iOS-only |
| Custom buton sayısı | Sabit (ok/cancel) | Sınırsız |

---

## 3. `Modal` — Özelleştirilebilir Overlay

`Modal`, içine istediğin her şeyi koyabileceğin tam ekran (veya kısmi) overlay.

### Temel Yapı

```jsx
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";

export default function ProductDetailModal() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <Text>Detayları Gör</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}           // göster/gizle
        animationType="slide"       // "none" | "slide" | "fade"
        transparent={true}          // arka planı saydam yap
        onRequestClose={() => setVisible(false)}  // Android geri tuşu
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Ürün Detayı</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",  // yarı saydam arka plan
    justifyContent: "flex-end",           // bottom sheet için
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
});
```

### `animationType` Seçenekleri

| Değer | Davranış | Ne Zaman Kullan |
|-------|----------|-----------------|
| `"none"` | Anında açılır | Performans kritikse |
| `"fade"` | Yavaşça görünür | Uyarı dialog'ları |
| `"slide"` | Alttan kayar | Bottom sheet, form |

### `transparent` Prop'u

```jsx
// transparent={false} → Modal tam ekranı kaplar (siyah arka plan)
// transparent={true}  → Modal arka planı şeffaf, sen arka planı kontrol edersin
<Modal transparent={true}>
  <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}>
    {/* İçerik */}
  </View>
</Modal>
```

> **Dikkat:** `transparent={true}` olmadan `rgba` arka plan çalışmaz — Modal kendi opak arka planını çizer.

---

## 4. ShopApp — Pratik Kullanım Senaryoları

### Senaryo 1: Sepete Ekle Onayı (Alert)

```jsx
// components/AddToCartButton.jsx
import { Alert, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useCartStore } from "../store/cartStore";

export function AddToCartButton({ product }) {
  const addItem = useCartStore((state) => state.addItem);

  function handlePress() {
    Alert.alert(
      "Sepete Ekle",
      `${product.name} sepetinize eklensin mi?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Ekle",
          onPress: () => {
            addItem(product);
            // Başarı bildirimi için Alert tekrar kullanabilirsin
            // ya da toast/snackbar tercih edilir (Gün 36)
          },
        },
      ]
    );
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress}>
      <Text style={styles.text}>Sepete Ekle</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  text: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
```

### Senaryo 2: Ürün Silme Uyarısı (Alert + destructive)

```jsx
// components/ProductCard.jsx (yönetici paneli)
import { Alert, TouchableOpacity } from "react-native";

function DeleteButton({ productId, onDeleted }) {
  function confirmDelete() {
    Alert.alert(
      "Ürünü Sil",
      "Bu işlem geri alınamaz. Devam etmek istiyor musunuz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            await deleteProductFromAPI(productId);
            onDeleted(productId);
          },
        },
      ]
    );
  }

  return (
    <TouchableOpacity onPress={confirmDelete}>
      {/* Çöp kutusu ikonu */}
    </TouchableOpacity>
  );
}
```

### Senaryo 3: Ürün Detay Bottom Sheet (Modal)

```jsx
// screens/ProductListScreen.jsx
import { useState } from "react";
import { View, FlatList } from "react-native";
import { ProductDetailModal } from "../components/ProductDetailModal";

export default function ProductListScreen() {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => setSelectedProduct(item)}
          />
        )}
      />

      <ProductDetailModal
        product={selectedProduct}
        visible={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </View>
  );
}
```

```jsx
// components/ProductDetailModal.jsx
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";

export function ProductDetailModal({ product, visible, onClose }) {
  if (!product) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Backdrop — tıklanınca kapat */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          <Image source={{ uri: product.imageUrl }} style={styles.image} />

          <View style={styles.content}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.price}>{product.price} ₺</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.addButton} onPress={onClose}>
          <Text style={styles.addButtonText}>Sepete Ekle — {product.price} ₺</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: 240,
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  price: {
    fontSize: 22,
    fontWeight: "800",
    color: "#6366f1",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 22,
  },
  addButton: {
    marginHorizontal: 20,
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
```

---

## 5. `Pressable` vs `TouchableOpacity` — Backdrop Kapama

Modal dışına tıklandığında kapatmak için iki yol:

```jsx
// Yol 1: Pressable (önerilen — daha esnek)
<Pressable style={styles.backdrop} onPress={onClose} />

// Yol 2: TouchableOpacity (opacity animasyonu oluyor — backdrop için istemeyiz)
<TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose} />
// activeOpacity={1} → opacity animasyonunu devre dışı bırakır
```

`Pressable` backdrop için daha temiz çünkü görsel feedback yok.

---

## 6. Yaygın Hatalar

### Modal görünmüyor

```jsx
// ❌ Yanlış: visible prop'u undefined
<Modal visible={selectedProduct}>  // null/undefined → false gibi davranır ama uyarı verir

// ✅ Doğru: boolean'a çevir
<Modal visible={!!selectedProduct}>
```

### Android geri tuşu Modal'ı kapatmıyor

```jsx
// ❌ Yanlış: onRequestClose yok
<Modal visible={visible} animationType="slide">

// ✅ Doğru: onRequestClose zorunlu (Android)
<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
```

### Keyboard Modal içinde input'u örtüyor

```jsx
import { KeyboardAvoidingView, Platform } from "react-native";

<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <View style={styles.backdrop}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.sheet}
    >
      <TextInput placeholder="Kupon kodu girin" />
    </KeyboardAvoidingView>
  </View>
</Modal>
```

---

## 7. Web vs React Native Karşılaştırması

| Özellik | Web | React Native |
|---------|-----|--------------|
| Hızlı dialog | `window.alert/confirm` | `Alert.alert` |
| Custom modal | React Portal + CSS | `<Modal>` component |
| Bottom sheet | CSS `position: fixed` | `Modal` + `justifyContent: "flex-end"` |
| Backdrop kapat | `onClick` overlay div | `Pressable` veya `onRequestClose` |
| Keyboard handling | CSS `position: sticky` | `KeyboardAvoidingView` |
| Animasyon | CSS `transition` / `animation` | `animationType` prop |

---

## 8. Özet

- **`Alert`** → hızlı onay/uyarı diyalogları için, stillenemez ama OS'a uygun görünür
- **`Modal`** → tam özelleştirme gereken her şey için — bottom sheet, ürün detayı, form overlay
- **`transparent={true}` + `onRequestClose`** → her Modal'da olması gereken iki prop
- Backdrop kapatma için **`Pressable`** tercih et
- Keyboard varsa **`KeyboardAvoidingView`** Modal içine ekle

---

## Mini Görev

ShopApp'te aşağıdakileri uygula:

1. Ürün listesinde bir ürüne tıklanınca `ProductDetailModal` açılsın
2. Modal içinde "Sepete Ekle" butonuna basılınca `Alert` ile onay istensin
3. Sepet ekranındaki "Tüm Sepeti Temizle" butonu `Alert.alert` ile `destructive` stil kullanarak onay sorsun
4. Backdrop'a tıklanınca Modal kapansın

---

**Sonraki Gün:** [Gün 13 — Image Optimizasyonu](gun13_image_optimizasyon.md)
