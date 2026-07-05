# Gün 33 — Offline First ve NetInfo

## Mobilde İnternet Güvenilmez

Web'de sayfanı açan birinin interneti var — sayfa zaten yüklendi. Mobilde farklı: kullanıcı metro tüneline giriyor, asansöre biniyor, zayıf 3G'ye düşüyor. Uygulama bu anlarda ne yapıyor?

**Kötü uygulama:** Spinner gösterir, donup kalır, hata verir.  
**İyi uygulama:** Cache'den eski veriyi gösterir, "çevrimdışısın" bildirir, bağlantı gelince günceller.

Bu **offline first** yaklaşımı — ağ olmasa da uygulama çalışır.

---

## NetInfo: Bağlantı Durumu

`@react-native-community/netinfo` kütüphanesi bağlantı durumunu ve tipini verir.

```bash
npx expo install @react-native-community/netinfo
```

### Anlık Sorgu

```tsx
import NetInfo from '@react-native-community/netinfo';

async function baglantiKontrol() {
  const durum = await NetInfo.fetch();

  console.log(durum.isConnected);        // true | false | null
  console.log(durum.isInternetReachable); // gerçekten internet var mı?
  console.log(durum.type);               // 'wifi' | 'cellular' | 'none' | 'unknown'

  if (durum.type === 'cellular') {
    console.log(durum.details?.cellularGeneration); // '3g' | '4g' | '5g'
  }
}
```

**`isConnected` vs `isInternetReachable` farkı:**
- `isConnected: true` → ağa bağlı (WiFi, cellular) — ama router'ın interneti olmayabilir
- `isInternetReachable: true` → gerçekten dışarıya çıkılabiliyor

Captive portal (otobüs WiFi'si, otel ağı) durumunda `isConnected: true` ama `isInternetReachable: false` olabilir.

### Sürekli Dinle

```tsx
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useBaglantiDurumu() {
  const [baglanti, setBaglanti] = useState({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown' as string,
  });

  useEffect(() => {
    const abonelikKaldir = NetInfo.addEventListener((durum) => {
      setBaglanti({
        isConnected: durum.isConnected ?? false,
        isInternetReachable: durum.isInternetReachable ?? false,
        type: durum.type,
      });
    });

    return abonelikKaldir; // cleanup — bunu yazmasaydık memory leak olurdu
  }, []);

  return baglanti;
}
```

---

## Çevrimdışı Banner

```tsx
// components/CevrimdisBanner.tsx
import { useBaglantiDurumu } from '@/hooks/useBaglantiDurumu';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';

export function CevrimdisBanner() {
  const { isConnected } = useBaglantiDurumu();

  const animasyonStil = useAnimatedStyle(() => ({
    height: withTiming(isConnected ? 0 : 40, { duration: 300 }),
    opacity: withTiming(isConnected ? 0 : 1, { duration: 300 }),
  }));

  return (
    <Animated.View style={[styles.banner, animasyonStil]}>
      <Text style={styles.metin}>İnternet bağlantısı yok — çevrimdışı mod</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // height: 0 olunca görünmemesi için
  },
  metin: { color: '#fff', fontSize: 13 },
});
```

---

## TanStack Query: Offline Cache

TanStack Query gelen veriyi otomatik cache'liyor. Bağlantı kesilince cache'den sunmak için yapılandırma:

```tsx
// providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';

// TanStack Query'nin online/offline durumunu NetInfo ile senkronize et
// Bunu yazmasaydık: Query, window'un focus event'ini dinlerdi — RN'de window yok
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((durum) => {
    setOnline(durum.isConnected ?? false);
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 dakika — veri "taze" sayılır
      gcTime: 24 * 60 * 60 * 1000, // 24 saat — cache'de tutulur
      retry: 2,
      networkMode: 'offlineFirst', // offline'da da çalış, cache'den sun
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

**`networkMode: 'offlineFirst'` ne yapar?**
- Varsayılan: offline'da query başlamaz, hata döner
- `offlineFirst`: offline'da da çalıştır, cache varsa onu döndür, yoksa error state'e geç

**`staleTime` vs `gcTime`:**
- `staleTime: 5dk` → 5 dakika boyunca veri "taze" — yeniden fetch edilmez
- `gcTime: 24sa` → 24 saat boyunca cache'de tutulur — network yokken buradan sunulur

```tsx
// hooks/useUrunler.ts
export function useUrunler() {
  return useQuery({
    queryKey: ['urunler'],
    queryFn: urunleriGetir,
    // offline'da bile önceki cache gösterilir, spinner görünmez
  });
}

// Kullanımda:
function UrunListesi() {
  const { data, isLoading, isError, isFetching } = useUrunler();
  const { isConnected } = useBaglantiDurumu();

  if (isLoading && !data) return <SkeletonListesi />;
  // isFetching && !isLoading → arka planda güncelliyor ama eski data gösteriliyor
  // isError && data → hata oldu ama cache var, eskiyi göster

  return (
    <>
      {!isConnected && data && (
        <Text style={styles.cachedUyari}>Çevrimdışı — son güncelleme gösteriliyor</Text>
      )}
      <FlatList data={data} ... />
    </>
  );
}
```

---

## Optimistic Update: Anında Güncelle, Hata Olursa Geri Al

Kullanıcı sepete ürün ekledi. Sunucu yanıtı beklemeden UI'ı hemen güncelle. Hata olursa eski haline döndür.

```tsx
// ShopApp: favoriye ekle — optimistic
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useFavoriyeEkle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (urunId: string) => api.post(`/favoriler/${urunId}`),

    onMutate: async (urunId: string) => {
      // 1. Devam eden urunler query'sini iptal et (race condition önlemi)
      await queryClient.cancelQueries({ queryKey: ['favoriler'] });

      // 2. Mevcut veriyi kaydet (hata olursa geri döneceğiz)
      const eskiFavoriler = queryClient.getQueryData<string[]>(['favoriler']);

      // 3. Hemen UI'ı güncelle — sunucu yanıtı bekleme
      queryClient.setQueryData<string[]>(['favoriler'], (eski = []) => [
        ...eski,
        urunId,
      ]);

      // context olarak geri döndür — onError'da kullanacağız
      return { eskiFavoriler };
    },

    onError: (hata, urunId, context) => {
      // Hata oldu — eski haline döndür
      if (context?.eskiFavoriler !== undefined) {
        queryClient.setQueryData(['favoriler'], context.eskiFavoriler);
      }
    },

    onSettled: () => {
      // Başarı veya hata — sunucudan gerçek veriyi al
      queryClient.invalidateQueries({ queryKey: ['favoriler'] });
    },
  });
}
```

**Neden `cancelQueries`?**  
Optimistic update sırasında arka planda devam eden bir fetch varsa, o fetch tamamlanınca bizim optimistic güncellememizin üzerine yazar. `cancelQueries` bunu önler.

**Akış:**
1. Kullanıcı tıkladı → `onMutate`: UI anında güncellendi (0ms gecikme)
2. API çağrısı gidiyor (belki 500ms)
3a. Başarı → `onSettled`: sunucudan tazele
3b. Hata → `onError`: eski haline döndür + `onSettled`: tazele

---

## Sync Queue: Offline İşlemleri Kuyruğa Al

Kullanıcı offline'da sipariş vermek istiyor. Kuyruğa al, online olunca gönder.

```tsx
// services/syncQueue.ts
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();
const KUYRUK_KEY = 'shopapp_sync_queue';

type KuyrukOge = {
  id: string;
  islem: 'siparis_ver' | 'favori_ekle' | 'yorum_yaz';
  veri: Record<string, unknown>;
  olusturulma: number;
};

export const syncQueue = {
  ekle(islem: KuyrukOge['islem'], veri: Record<string, unknown>) {
    const kuyruk = this.getir();
    const yeniOge: KuyrukOge = {
      id: Date.now().toString(),
      islem,
      veri,
      olusturulma: Date.now(),
    };
    storage.set(KUYRUK_KEY, JSON.stringify([...kuyruk, yeniOge]));
    return yeniOge.id;
  },

  getir(): KuyrukOge[] {
    const ham = storage.getString(KUYRUK_KEY);
    return ham ? JSON.parse(ham) : [];
  },

  sil(id: string) {
    const kuyruk = this.getir().filter((o) => o.id !== id);
    storage.set(KUYRUK_KEY, JSON.stringify(kuyruk));
  },

  temizle() {
    storage.delete(KUYRUK_KEY);
  },
};
```

```tsx
// hooks/useSyncQueue.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { syncQueue } from '@/services/syncQueue';
import { api } from '@/services/api';

export function useSyncQueue() {
  useEffect(() => {
    const abonelikKaldir = NetInfo.addEventListener(async (durum) => {
      if (!durum.isConnected) return;

      // Online olduk — kuyruktaki işlemleri gönder
      const kuyruk = syncQueue.getir();
      if (kuyruk.length === 0) return;

      for (const oge of kuyruk) {
        try {
          switch (oge.islem) {
            case 'siparis_ver':
              await api.post('/siparisler', oge.veri);
              break;
            case 'favori_ekle':
              await api.post(`/favoriler/${oge.veri.urunId}`, {});
              break;
            case 'yorum_yaz':
              await api.post('/yorumlar', oge.veri);
              break;
          }
          syncQueue.sil(oge.id); // başarılı → kuyruktan çıkar
        } catch {
          // Hata → kuyrukta bırak, sonraki bağlantıda tekrar dene
          console.warn('Sync başarısız, tekrar denenecek:', oge.islem);
        }
      }
    });

    return abonelikKaldir;
  }, []);
}
```

```tsx
// Kullanım — app/_layout.tsx içinde
export default function RootLayout() {
  useSyncQueue(); // uygulama boyunca çalışır
  // ...
}

// Offline sipariş verme
function siparisVer(siparisBilgileri: SiparisBilgisi) {
  const { isConnected } = useBaglantiDurumu();

  if (isConnected) {
    // Direkt gönder
    api.post('/siparisler', siparisBilgileri);
  } else {
    // Kuyruğa al
    syncQueue.ekle('siparis_ver', siparisBilgileri);
    Alert.alert(
      'Çevrimdışı Mod',
      'Siparişin kaydedildi. İnternet bağlantısı sağlandığında otomatik gönderilecek.'
    );
  }
}
```

---

## TanStack Query Persist: Cache'i Kalıcı Hale Getir

Uygulama kapanıp açılınca cache sıfırlanır. MMKV ile kalıcı hale getirebilirsin:

```tsx
// providers/QueryProvider.tsx
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV();

const persister = createSyncStoragePersister({
  storage: {
    getItem: (key) => mmkv.getString(key) ?? null,
    setItem: (key, value) => mmkv.set(key, value),
    removeItem: (key) => mmkv.delete(key),
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 saat sonra expire
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
```

Artık uygulama kapanıp açılınca bile ürün listesi cache'den anlık yükleniyor.

---

## Web ile Karşılaştırma

| Web | React Native | Fark |
|-----|-------------|------|
| `navigator.onLine` | `NetInfo.isConnected` | RN'de tip bilgisi de var |
| `window.addEventListener('online')` | `NetInfo.addEventListener` | Benzer |
| Service Worker cache | TanStack Query persist | Farklı mekanizma |
| PWA offline: SW + Cache API | MMKV + TanStack persist | RN daha basit |
| Optimistic UI: Redux / SWR | TanStack Query `onMutate` | Aynı konsept |
| Background sync: SW | Sync queue hook | Manuel ama tam kontrol |

---

## Kontrol Soruları

1. `isConnected: true` iken `isInternetReachable: false` ne zaman olur? Nasıl handle etmeli?

2. TanStack Query `networkMode: 'offlineFirst'` olmadan offline'da ne olur? Default davranış ne?

3. Optimistic update'te `cancelQueries` neden gerekli? Yazmasaydık hangi race condition çıkar?

4. `onError` callback'inde `context` parametresi nasıl geliyor? `onMutate`'den nasıl aktarılıyor?

5. Sync queue'daki işlem başarısız olursa sonsuza kadar mı kuyruğa kalır? Bunu nasıl engellersin?

---

## Özet

| Konu | Araç |
|------|------|
| Bağlantı durumu | `NetInfo.fetch()` / `addEventListener` |
| Bağlantı tipi | `durum.type`, `cellularGeneration` |
| Query offline davranış | `networkMode: 'offlineFirst'` |
| Cache süresi | `staleTime`, `gcTime` |
| TanStack ↔ NetInfo sync | `onlineManager.setEventListener` |
| Anlık UI güncelleme | `useMutation` → `onMutate` optimistic |
| Hata geri alma | `onError` + context |
| Kalıcı cache | `PersistQueryClientProvider` + MMKV |
| Offline işlem kuyruğu | Sync queue + MMKV |

**Yarın (Gün 35):** React Hook Form + Zod — form validasyon, `Controller` wrapper, `useForm`, klavye yönetimi, ShopApp'te adres ve ödeme formu.
