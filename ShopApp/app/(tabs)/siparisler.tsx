// Gün 16 — useFocusEffect: her sekme geçişinde yenile
// Gün 18 — TanStack Query: sipariş listesi
// Gün 31 — Push: sipariş durumu bildirimi (sunucu simülasyonu)
// Gün 38 — A11y: sipariş durumu live region

import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  type ListRenderItem,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useTranslation } from 'react-i18next';
import { useTema } from '@/hooks/useTema';
import { useFormat } from '@/hooks/useFormat';
import { SIPARIS_DURUMLARI } from '@/constants/mockData';
import type { Siparis, SiparisOzet } from '@/types';

// Gerçek uygulamada bu bildirim sunucudan gelir (Expo Push API).
// Burada "kargo takip" simülasyonu için yerel bildirimle taklit ediyoruz.
async function siparisTakipBildirimiGonder(siparisId: string) {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Siparişin Yola Çıktı! 🚚',
      body: 'Bugün 18:00-20:00 arasında teslim edilecek.',
      data: { ekran: 'siparis', siparisId },
    },
    trigger: { channelId: 'siparisler' }, // hemen gönder, Android'de bu kanalda göster
  });
}

// Mock siparişler
const MOCK_SIPARISLER: SiparisOzet[] = [
  { id: 'SP001', tarih: '2025-06-15', durum: 'teslim-edildi', toplamTutar: 54999 },
  { id: 'SP002', tarih: '2025-06-28', durum: 'kargoda', toplamTutar: 8597 },
  { id: 'SP003', tarih: '2025-07-01', durum: 'hazirlaniyor', toplamTutar: 249 },
];

export default function SiparislerEkrani() {
  const { tema } = useTema();
  const { t } = useTranslation();
  const { paraFormula, kisaTarihFormula } = useFormat();

  const { data, refetch } = useQuery({
    queryKey: ['siparisler'],
    queryFn: async () => {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_SIPARISLER;
    },
  });

  // Her sekme geçişinde siparişleri güncelle (Gün 16)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const renderSiparis: ListRenderItem<SiparisOzet> = ({ item }) => {
    const durumBilgi =
      SIPARIS_DURUMLARI[item.durum as keyof typeof SIPARIS_DURUMLARI];

    return (
      <Pressable
        style={[styles.kart, { backgroundColor: tema.colors.kart }]}
        accessibilityRole="button"
        accessibilityLabel={`${t('siparis.numarasi', { id: item.id })}, ${durumBilgi.etiket}, ${paraFormula(item.toplamTutar)}`}
      >
        <View style={styles.ustSatir}>
          <Text
            style={[styles.siparisNo, { color: tema.colors.yaziBaslik }]}
            accessible={false}
          >
            {t('siparis.numarasi', { id: item.id })}
          </Text>
          <View
            style={[styles.durumRozet, { backgroundColor: durumBilgi.renk + '20' }]}
            accessible={false}
          >
            <Text style={[styles.durumYazi, { color: durumBilgi.renk }]}>
              {durumBilgi.etiket}
            </Text>
          </View>
        </View>

        <Text
          style={[styles.tarih, { color: tema.colors.yaziIkincil }]}
          accessible={false}
        >
          {t('siparis.tarihi', { tarih: kisaTarihFormula(item.tarih) })}
        </Text>

        <View style={styles.altSatir}>
          <Text
            style={[styles.tutar, { color: tema.colors.yaziBaslik }]}
            accessible={false}
          >
            {t('siparis.toplam', { tutar: paraFormula(item.toplamTutar) })}
          </Text>
          {item.durum === 'kargoda' && (
            <Pressable
              onPress={() => siparisTakipBildirimiGonder(item.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('siparis.takipEt')}
            >
              <Text style={[styles.takipLink, { color: tema.colors.birincil }]}>
                {t('siparis.takipEt')}
              </Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  };

  if (!data || data.length === 0) {
    return (
      <View
        style={[styles.bos, { backgroundColor: tema.colors.arka }]}
        accessible
        accessibilityLabel={t('siparis.bos')}
      >
        <Text style={styles.bosIkon}>📦</Text>
        <Text style={[styles.bosYazi, { color: tema.colors.yaziBaslik }]}>
          {t('siparis.bos')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.colors.arka }]}>
      <FlatList
        data={data}
        renderItem={renderSiparis}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.liste}
        initialNumToRender={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  liste: { padding: 16, gap: 12 },
  kart: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ustSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  siparisNo: { fontSize: 16, fontWeight: '600' },
  durumRozet: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  durumYazi: { fontSize: 13, fontWeight: '600' },
  tarih: { fontSize: 14 },
  altSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  tutar: { fontSize: 17, fontWeight: '700' },
  takipLink: { fontSize: 14, fontWeight: '600' },
  bos: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  bosIkon: { fontSize: 64 },
  bosYazi: { fontSize: 18, fontWeight: '600' },
});
