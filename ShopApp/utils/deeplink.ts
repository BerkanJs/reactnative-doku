// Gün 32 — Deep Linking: paylaşım linki üretimi + bildirim data'sından route çözümü

import * as Linking from 'expo-linking';

// Development: custom scheme (shopapp:///), Production: universal link
const BASE_URL = __DEV__ ? Linking.createURL('/') : 'https://shopapp.example.com/';

export const deeplinks = {
  urun: (id: string) => `${BASE_URL}urun/${id}`,
  sepet: () => `${BASE_URL}(tabs)/sepet`,
  siparisler: () => `${BASE_URL}(tabs)/siparisler`,
};

// Gün 31'de bildirimlere eklenen `data` objesini expo-router route'una çevirir.
// İki listener'da (kapalıyken + açıkken) aynı mantık tekrar edilmesin diye merkezi.
export function bildirimdenRouteAl(
  data: Record<string, unknown> | undefined | null
): string | null {
  if (!data) return null;

  if (data.ekran === 'urun' && data.urunId) {
    return `/urun/${data.urunId}`;
  }
  if (data.ekran === 'siparis') {
    return '/(tabs)/siparisler';
  }
  if (data.ekran === 'sepet') {
    return '/(tabs)/sepet';
  }

  return null;
}
