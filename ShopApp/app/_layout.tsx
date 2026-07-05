// Gün 5/6 — Expo Router root layout
// Gün 20 — Auth flow: token kontrolü → yönlendirme
// Gün 27 — Tema provider
// Gün 31 — Bildirim handler + Android kanalları
// Gün 32 — Bildirime tıklayınca deep link
// Gün 33 — Offline banner + TanStack Query
// Gün 36 — NativeWind: global.css + colorScheme senkronu
// Gün 39 — i18n init
// Gün 40 — Apollo Client provider
// Gün 49 — Sentry: init + hata sınırı (Error Boundary)
// Gün 50 — Firebase Analytics: ekran takibi + Remote Config yüklemesi

import { useEffect } from 'react';
import { Platform, View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack, useRouter, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colorScheme as nativewindColorScheme } from 'nativewind';

import '../global.css';
import '@/i18n';
import { apolloClient } from '@/services/apolloClient';
import { useTema } from '@/hooks/useTema';
import { BaglantiYokBanner } from '@/components/BaglantiYokBanner';
import { useAuthStore } from '@/store/authStore';
import { bildirimdenRouteAl } from '@/utils/deeplink';
import { useSepetHatirlatici } from '@/hooks/useSepetHatirlatici';
import { GuncellemeKontrolu } from '@/components/GuncellemeKontrolu';
import { ekranGoruntulendi } from '@/services/firebaseServisi';
import { remoteConfigYukle } from '@/services/remoteConfigServisi';

SplashScreen.preventAutoHideAsync();

// Gün 49 — Sentry: uygulama başlar başlamaz global hata yakalayıcı kur
Sentry.init({
  dsn: 'https://xxxx@xxxx.ingest.sentry.io/xxxx', // Sentry projesinden alınan gerçek DSN ile değiştirilmeli
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0.2, // isteklerin %20'sini izle — production'da kota için makul oran
  enabled: !__DEV__, // development'ta test kirliliği olmasın
});

// Gün 31 — Uygulama ön plandayken de bildirim göster
// Bu ayar olmadan sadece uygulama kapalıyken bildirimler görünür
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('siparisler', {
    name: 'Sipariş Bildirimleri',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#007AFF',
  });
  Notifications.setNotificationChannelAsync('kampanyalar', {
    name: 'Kampanya ve Stok Bildirimleri',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 dakika
      gcTime: 24 * 60 * 60 * 1000,   // 24 saat
      retry: 2,
      refetchOnWindowFocus: false,     // mobilde window focus yok (Gün 18)
      refetchOnReconnect: true,        // internet gelince yenile (Gün 33)
      networkMode: 'offlineFirst',     // cache'i önce göster (Gün 33)
    },
  },
});

function RootLayoutIc() {
  const { tema, koyuMu } = useTema();
  const { kullanici } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // Gün 50 — Remote Config: uygulama açılışında bir kez yükle
  useEffect(() => {
    remoteConfigYukle();
  }, []);

  // Gün 50 — Firebase Analytics: her rota değişiminde ekran görüntülemesi kaydet
  // segments kullanmak pathname'den daha iyi: '/urun/abc123' yerine 'urun/[id]' — tüm
  // ürün ziyaretleri tek bir ekran adında toplanır, yüzlerce ayrı satır oluşmaz
  useEffect(() => {
    const ekranAdi = segments.join('/') || 'anasayfa';
    ekranGoruntulendi(ekranAdi);
  }, [pathname, segments]);

  // Gün 36 — NativeWind'in dark: varyantını useTema seçimiyle senkronla
  // (NativeWind kendi başına sadece işletim sistemi temasını izler, ShopApp'in
  // manuel açık/koyu/sistem seçimini bilmez — burada elle bildiriyoruz)
  useEffect(() => {
    nativewindColorScheme.set(koyuMu ? 'dark' : 'light');
  }, [koyuMu]);

  // Gün 31 — Sepette ürün unutulursa 2 saat sonra hatırlat
  useSepetHatirlatici();

  // Gün 32 — Uygulama kapalıyken bildirime tıklayıp açtıysa ilk yanıtı yakala
  // web'de bu API desteklenmiyor (UnavailabilityError fırlatıp RootLayoutIc'i çökertiyordu)
  const sonBildirimYaniti = Platform.OS === 'web' ? null : Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!sonBildirimYaniti) return;
    const veri = sonBildirimYaniti.notification.request.content.data;
    const route = bildirimdenRouteAl(veri as Record<string, unknown>);
    if (route) router.push(route as never);
  }, [sonBildirimYaniti, router]);

  // Gün 32 — Uygulama açıkken bildirime tıklanınca
  useEffect(() => {
    const abonelik = Notifications.addNotificationResponseReceivedListener((yanit) => {
      const veri = yanit.notification.request.content.data;
      const route = bildirimdenRouteAl(veri as Record<string, unknown>);
      if (route) router.push(route as never);
    });

    return () => abonelik.remove();
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tema.colors.arka }}>
      <StatusBar style={koyuMu ? 'light' : 'dark'} />
      <GuncellemeKontrolu />
      <BaglantiYokBanner />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: tema.colors.header },
          headerTintColor: tema.colors.yaziBaslik,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: tema.colors.arka },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="urun/[id]"
          options={{
            title: '',
            headerTransparent: true,
            headerBackTitle: '',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

function HataEkrani({ resetError }: { resetError: () => void }) {
  return (
    <View style={hataStyles.container}>
      <Text style={hataStyles.baslik}>Bir sorun oluştu.</Text>
      <Pressable onPress={resetError} style={hataStyles.buton}>
        <Text style={hataStyles.butonYazi}>Tekrar Dene</Text>
      </Pressable>
    </View>
  );
}

const hataStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  baslik: { fontSize: 17, fontWeight: '600' },
  buton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: '#007AFF' },
  butonYazi: { color: '#fff', fontWeight: '600' },
});

export default function RootLayout() {
  return (
    <Sentry.ErrorBoundary fallback={({ resetError }) => <HataEkrani resetError={resetError} />}>
      <ApolloProvider client={apolloClient}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <RootLayoutIc />
          </SafeAreaProvider>
        </QueryClientProvider>
      </ApolloProvider>
    </Sentry.ErrorBoundary>
  );
}
