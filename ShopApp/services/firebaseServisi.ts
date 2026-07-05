// Gün 50 — Firebase Analytics ve Crashlytics
// @react-native-firebase native kod içerir — Expo Go'da native modül bulunamaz ve
// STATIC import bile anında hata fırlatır. Bu yüzden modülü her çağrıda require()
// ile, try/catch içinde yüklüyoruz: Expo Go'da sessizce uyarı loglar, EAS dev
// client/production build'de gerçek native modülü bulup çalışır.

import type { Kullanici, Urun } from '@/types';

async function guvenliCagir(islemAdi: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (hata) {
    console.warn(`Firebase ${islemAdi} çalışmadı (Expo Go'da beklenen bir durum):`, hata);
  }
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export function ekranGoruntulendi(ekranAdi: string) {
  return guvenliCagir('ekranGoruntulendi', async () => {
    const analytics = require('@react-native-firebase/analytics').default;
    await analytics().logScreenView({ screen_name: ekranAdi, screen_class: ekranAdi });
  });
}

export function sepeteEklendiOlayi(urun: Urun, adet: number) {
  return guvenliCagir('sepeteEklendiOlayi', async () => {
    const analytics = require('@react-native-firebase/analytics').default;
    await analytics().logAddToCart({
      currency: 'TRY',
      value: urun.fiyat * adet,
      items: [
        {
          item_id: urun.id,
          item_name: urun.ad,
          item_category: urun.kategori,
          price: urun.fiyat,
          quantity: adet,
        },
      ],
    });
  });
}

export function aramaYapildiOlayi(aramaMetni: string) {
  return guvenliCagir('aramaYapildiOlayi', async () => {
    const analytics = require('@react-native-firebase/analytics').default;
    await analytics().logSearch({ search_term: aramaMetni });
  });
}

// ─── Crashlytics ─────────────────────────────────────────────────────────────

export function crashlyticsKullaniciAyarla(kullanici: Kullanici | null) {
  return guvenliCagir('crashlyticsKullaniciAyarla', async () => {
    if (!kullanici) return;
    const crashlytics = require('@react-native-firebase/crashlytics').default;
    await crashlytics().setUserId(kullanici.id);
    await crashlytics().setAttribute('email', kullanici.email);
  });
}

export function crashlyticsHataRaporla(hata: Error, baglam: Record<string, string>) {
  return guvenliCagir('crashlyticsHataRaporla', async () => {
    const crashlytics = require('@react-native-firebase/crashlytics').default;
    for (const [anahtar, deger] of Object.entries(baglam)) {
      await crashlytics().setAttribute(anahtar, deger);
    }
    crashlytics().recordError(hata);
  });
}
