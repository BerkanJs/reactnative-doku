# Gün 20 — Auth Flow

> **Faz:** 1 — Temeller | **Hafta:** 3 | **Gün:** 20 / 60
>
> **Bugünün Hedefi:** Giriş yapan kullanıcıyı uygulamada doğru yere yönlendirmek.
> "Giriş yapmadan sepete ekleyemesin", "token süresi dolunca login'e gitsin" gibi akışları kuracağız.

---

## 1. Problem: Oturum Açmamış Kullanıcı Ne Görmeli?

Düşün: ShopApp'i ilk açan birisi var. Henüz giriş yapmadı. Ne olmalı?

- Ürün listesini görebilmeli ✅
- Ürün detayını görebilmeli ✅
- Sepete ekle deyince → login sayfasına gitmeli 🔒
- Profil ekranına gitmeye çalışırsa → login sayfasına gitmeli 🔒
- Giriş yaptıktan sonra → ürün listesine dönmeli ✅

Buna **auth flow** denir. Kullanıcının oturum durumuna göre hangi ekranları görebileceğini belirlersin.

---

## 2. Web'de Nasıldı?

Next.js'te şöyle bir şey yapıyordun:

```jsx
// middleware.ts — her isteği karşılar, token yoksa login'e yönlendir
export function middleware(req) {
  const token = req.cookies.get("token");
  if (!token) return NextResponse.redirect("/login");
}
```

Ya da component seviyesinde:

```jsx
function ProfilePage() {
  const { user, isLoading } = useSession();
  if (isLoading) return <Spinner />;
  if (!user) redirect("/login");
  return <Profile />;
}
```

React Native'de middleware yok. Ama Expo Router ile benzer bir şey yapılıyor: **layout seviyesinde yönlendirme**.

---

## 3. Expo Router'da Auth Flow Nasıl Çalışır?

Expo Router'da dosya sistemi navigasyonu var. Klasör yapısı şöyle düşün:

```
app/
  _layout.jsx          ← Kök layout — auth durumuna göre yönlendir
  (auth)/
    login.jsx          ← Giriş sayfası
    register.jsx       ← Kayıt sayfası
  (app)/
    _layout.jsx        ← Korumalı alan — giriş yoksa buraya girilemiyor
    index.jsx          ← Ürün listesi
    cart.jsx           ← Sepet
    profile.jsx        ← Profil
```

Parantezli klasörler `(auth)` ve `(app)` → URL'de görünmez, sadece gruplama için.

Mantık şu: Kök `_layout.jsx` kullanıcının token'ı var mı yok mu bakıyor. Token varsa `(app)` grubunu göster, yoksa `(auth)` grubunu göster.

---

## 4. Kök Layout — Yönlendirme Merkezi

```jsx
// app/_layout.jsx
import { useEffect } from "react";
import { Stack } from "expo-router";
import { useUserStore } from "../store/userStore";
import { useRouter, useSegments } from "expo-router";

export default function RootLayout() {
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const router = useRouter();
  const segments = useSegments(); // şu an hangi URL grubundayız?

  useEffect(() => {
    const inAuthGroup = segments[0] === "(auth)";

    if (!isLoggedIn && !inAuthGroup) {
      // Giriş yoksa ve (auth) grubunda değilsek → login'e gönder
      router.replace("/(auth)/login");
    } else if (isLoggedIn && inAuthGroup) {
      // Giriş varsa ve (auth) grubundaysak → ana sayfaya gönder
      router.replace("/(app)");
    }
  }, [isLoggedIn, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Ne zaman çalışıyor bu `useEffect`?

- Uygulama ilk açıldığında → `isLoggedIn` değeri Zustand'dan (AsyncStorage'dan persist ile geldi) okundu
- Kullanıcı giriş yaptı → `isLoggedIn` true oldu → `useEffect` tekrar çalıştı → ana sayfaya yönlendirdi
- Token geçersiz oldu (Gün 19'da 401 interceptor logout çağırdı) → `isLoggedIn` false oldu → `useEffect` tekrar çalıştı → login'e yönlendirdi

---

## 5. Login Ekranı

```jsx
// app/(auth)/login.jsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useUserStore } from "../../store/userStore";
import { login } from "../../api/auth";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const storeLogin = useUserStore((state) => state.login);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Uyarı", "Email ve şifre gerekli.");
      return;
    }

    setLoading(true);
    try {
      const { user, token } = await login(email, password); // api/auth.js (Gün 19)
      storeLogin({ ...user, token });                        // Zustand store'a yaz (Gün 17)
      // Yönlendirme kök layout'taki useEffect hallediyor — burada router.push yazmana gerek yok
    } catch (error) {
      Alert.alert("Giriş Başarısız", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ShopApp'e Giriş Yap</Text>

      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="E-posta"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Şifre"
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 32, color: "#111" },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#6366f1",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
```

Login butonuna baştın → API çağrısı → başarılıysa Zustand store'a kullanıcı yazıldı → `isLoggedIn` true oldu → kök layout'taki `useEffect` tetiklendi → `(app)` grubuna yönlendirildi.

Tek bir yerde yönlendirme yönetimi — LoginScreen'de `router.push` yazmadın.

---

## 6. Korumalı Ekranlar — `(app)` Grubu

`(app)` altındaki hiçbir ekran yönlendirme kodu içermez. Güvenlik kök layout'ta:

```jsx
// app/(app)/_layout.jsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "../../store/cartStore";

export default function AppLayout() {
  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, i) => sum + i.quantity, 0)
  );

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Ürünler",
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Sepet",
          tabBarBadge: cartCount > 0 ? cartCount : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="cart" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

---

## 7. Logout

```jsx
// app/(app)/profile.jsx
import { View, Text, TouchableOpacity } from "react-native";
import { useUserStore } from "../../store/userStore";
import { useCartStore } from "../../store/cartStore";

export default function ProfileScreen() {
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const clearCart = useCartStore((state) => state.clear);

  function handleLogout() {
    logout();    // token sil, isLoggedIn = false
    clearCart(); // sepeti boşalt
    // Yönlendirme kök layout hallediyor — burada router.push yazmana gerek yok
  }

  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 18 }}>{user?.name}</Text>
      <Text style={{ color: "#6b7280" }}>{user?.email}</Text>

      <TouchableOpacity onPress={handleLogout} style={{ marginTop: 32 }}>
        <Text style={{ color: "#ef4444", fontWeight: "600" }}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
  );
}
```

Çıkış Yap'a bastın → `logout()` → `isLoggedIn` false → kök layout yönlendirdi → login ekranı geldi.

---

## 8. Uygulama İlk Açılınca Ne Olur?

Kullanıcı daha önce giriş yapmıştı. Uygulamayı kapattı, tekrar açtı. Şu olmalı:

1. Uygulama açıldı
2. Zustand `persist` middleware AsyncStorage'dan user bilgisini okudu (Gün 17)
3. `isLoggedIn: true` olarak yüklendi
4. Kök layout render oldu, `isLoggedIn` true, `(app)` grubunda değiliz → `(app)`'e yönlendir
5. Kullanıcı direkt ürün listesini gördü — login ekranı görmedi

Ama token süresi dolmuş olabilir. Ne olacak?

1. Ürün listesi açıldı, TanStack Query fetchProducts() çağırdı
2. Axios isteği gitti, sunucu 401 döndürdü
3. Response interceptor 401'i yakaladı (Gün 19)
4. Interceptor `logout()` çağırdı → `isLoggedIn` false
5. Kök layout tetiklendi → login sayfasına gönderildi

Kullanıcı hiçbir şey yapmadı, sistem otomatik halletti.

---

## 9. Splash Screen — Hazırlık Süresi

Uygulama açılınca Zustand store'u yüklerken bir an boş kalabilir — ne login ne de ürün listesi hazır. Bu an için splash screen veya loading ekranı gerekli:

```jsx
// app/_layout.jsx — hidrasyon durumu
import { useEffect, useState } from "react";
import { useUserStore } from "../store/userStore";

export default function RootLayout() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // persist middleware store'u AsyncStorage'dan yükledi mi?
    const unsub = useUserStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsub;
  }, []);

  if (!hydrated) {
    // Zustand henüz AsyncStorage'dan okumadı — boş ekran yerine splash göster
    return <SplashScreen />;
  }

  return <RootNavigator />;
}
```

Neden önemli? `hydrated` false'ken `isLoggedIn` her zaman false görünür (initial değer). Kök layout "giriş yok, login'e git" der — ama aslında kullanıcı giriş yapmıştı. Token bir anlık AsyncStorage'dan yüklenince doğru değer gelir. Bu yarım saniyelik anlık yönlendirmeyi önlemek için bekliyoruz.

---

## 10. Şifremi Unuttum / Kayıt Akışı

```
app/
  (auth)/
    login.jsx
    register.jsx
    forgot-password.jsx
```

```jsx
// app/(auth)/login.jsx — alt linkler
<TouchableOpacity onPress={() => router.push("/(auth)/register")}>
  <Text>Hesabın yok mu? Kayıt ol</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => router.push("/(auth)/forgot-password")}>
  <Text>Şifremi unuttum</Text>
</TouchableOpacity>
```

`(auth)` grubundaki sayfalar arasında normal navigasyon var — hepsi giriş yapılmamış kullanıcı için.

---

## 11. Tüm Akışı Özetle

```
İlk açılış:
  Zustand AsyncStorage'dan oku
    → isLoggedIn: true  → (app) grubuna git
    → isLoggedIn: false → (auth)/login'e git

Giriş yap:
  login() → sunucu token verdi → storeLogin() → isLoggedIn: true → (app)'e git

Token doldu:
  Herhangi bir istek → 401 → interceptor logout() → isLoggedIn: false → login'e git

Çıkış yap:
  logout() → isLoggedIn: false → login'e git
```

Her senaryo aynı mekanizmadan geçiyor: `isLoggedIn` değişti → kök layout tepki verdi → yönlendirdi.

---

## Özet

- **Auth flow** = oturum durumuna göre hangi ekranları göreceğini belirlemek
- Kök `_layout.jsx` tek yönlendirme noktası — her component'e router.push yazma
- `isLoggedIn` değişince `useEffect` tetiklenir, otomatik yönlendirir
- `(auth)` grubu → giriş yapmamış kullanıcı ekranları
- `(app)` grubu → korumalı ekranlar, sadece giriş yaptıysa erişilir
- 401 → interceptor → logout → kök layout → login (Gün 19 ile entegrasyon)
- `hydrated` kontrolü → persist yüklenmeden yönlendirme yapma

---

## Mini Görev

1. Klasör yapısını oluştur: `app/(auth)/login.jsx`, `app/(app)/index.jsx`, `app/(app)/cart.jsx`, `app/(app)/profile.jsx`
2. Kök `_layout.jsx`'e `isLoggedIn` kontrolü ekle
3. Login ekranında form yaz — `api/auth.js`'teki `login` fonksiyonunu çağır
4. Profil ekranına Çıkış Yap butonu ekle — `logout()` + `clearCart()`
5. `useUserStore.persist.onFinishHydration` ile splash screen ekle

---

**Sonraki Gün:** [Gün 21 — Hafta 3 Özet](gun21_hafta3_ozet.md)
