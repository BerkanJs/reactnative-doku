// Gün 17 — Zustand sepet store
// Gün 25 — Gesture Handler: swipe to delete
// Gün 35 — Ödeme formu (modal)
// Gün 38 — A11y: adet kontrolü, fiyat okuma

import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
  type ListRenderItem,
} from 'react-native';
import { Image } from 'expo-image';
import { Swipeable } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Sentry from '@sentry/react-native';
import { useTema } from '@/hooks/useTema';
import { useSepetStore } from '@/store/sepetStore';
import { useFormat } from '@/hooks/useFormat';
import { OdemeFormu } from '@/components/OdemeFormu';
import { siparisOlustur } from '@/services/siparisServisi';
import { crashlyticsHataRaporla } from '@/services/firebaseServisi';
import type { SepetItem } from '@/types';

export default function SepetEkrani() {
  const { tema } = useTema();
  const { t } = useTranslation();
  const { paraFormula } = useFormat();
  const { itemlar, cikar, adediniGuncelle, bosalt, toplamFiyat } = useSepetStore();
  const [odemeModalAcik, setOdemeModalAcik] = useState(false);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  const renderSilButon = (urunId: string) => (
    <Pressable
      onPress={() => cikar(urunId)}
      style={[styles.silButon, { backgroundColor: tema.colors.tehlike }]}
      accessibilityLabel={t('sepet.urunCikar')}
      accessibilityRole="button"
    >
      <Text style={styles.silYazi}>Sil</Text>
    </Pressable>
  );

  const renderItem: ListRenderItem<SepetItem> = ({ item }) => (
    <Swipeable
      renderRightActions={() => renderSilButon(item.urun.id)}
      overshootRight={false}
    >
      <View
        style={[
          styles.satir,
          {
            backgroundColor: tema.colors.kart,
            borderBottomColor: tema.colors.sinir,
          },
        ]}
        accessible
        accessibilityLabel={`${item.urun.ad}, ${item.adet} adet, ${paraFormula(
          (item.urun.indirimYuzdesi
            ? item.urun.fiyat * (1 - item.urun.indirimYuzdesi / 100)
            : item.urun.fiyat) * item.adet
        )}`}
      >
        <Image
          source={{ uri: item.urun.gorselUrl }}
          style={styles.gorsel}
          contentFit="cover"
          accessible={false}
        />

        <View style={styles.bilgi}>
          <Text
            style={[styles.ad, { color: tema.colors.yaziBaslik }]}
            numberOfLines={2}
            accessible={false}
          >
            {item.urun.ad}
          </Text>
          <Text
            style={[styles.marka, { color: tema.colors.yaziIkincil }]}
            accessible={false}
          >
            {item.urun.marka}
          </Text>
          <Text
            style={[styles.fiyat, { color: tema.colors.birincil }]}
            accessible={false}
          >
            {paraFormula(
              item.urun.indirimYuzdesi
                ? item.urun.fiyat * (1 - item.urun.indirimYuzdesi / 100)
                : item.urun.fiyat
            )}
          </Text>
        </View>

        {/* Adet kontrol */}
        <View style={styles.adetKontrol}>
          <Pressable
            onPress={() => adediniGuncelle(item.urun.id, item.adet - 1)}
            style={[styles.adetButon, { borderColor: tema.colors.sinir }]}
            accessibilityLabel={t('sepet.adetAzalt')}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text
              style={[styles.adetButonYazi, { color: tema.colors.yaziBaslik }]}
            >
              −
            </Text>
          </Pressable>
          <Text
            style={[styles.adet, { color: tema.colors.yaziBaslik }]}
            accessible={false}
          >
            {item.adet}
          </Text>
          <Pressable
            onPress={() => adediniGuncelle(item.urun.id, item.adet + 1)}
            style={[
              styles.adetButon,
              { borderColor: tema.colors.sinir },
              item.adet >= item.urun.stok && { opacity: 0.4 },
            ]}
            disabled={item.adet >= item.urun.stok}
            accessibilityLabel={t('sepet.adetArttir')}
            accessibilityRole="button"
            accessibilityState={{ disabled: item.adet >= item.urun.stok }}
            hitSlop={8}
          >
            <Text
              style={[styles.adetButonYazi, { color: tema.colors.yaziBaslik }]}
            >
              +
            </Text>
          </Pressable>
        </View>
      </View>
    </Swipeable>
  );

  if (itemlar.length === 0) {
    return (
      <View
        style={[styles.bos, { backgroundColor: tema.colors.arka }]}
        accessible
        accessibilityLabel={t('sepet.bos')}
      >
        <Text style={styles.bosIkon}>🛒</Text>
        <Text style={[styles.bosBaslik, { color: tema.colors.yaziBaslik }]}>
          {t('sepet.bos')}
        </Text>
        <Text style={[styles.bosAciklama, { color: tema.colors.yaziIkincil }]}>
          {t('sepet.bosAlt')}
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)')}
          style={[styles.alisverisButon, { backgroundColor: tema.colors.birincil }]}
          accessibilityRole="button"
          accessibilityLabel={t('sepet.alisveriseyDevam')}
        >
          <Text style={styles.alisverisYazi}>{t('sepet.alisveriseyDevam')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: tema.colors.arka }]}>
      <FlatList
        data={itemlar}
        renderItem={renderItem}
        keyExtractor={(item) => item.urun.id}
        initialNumToRender={8}
        ListFooterComponent={<View style={{ height: 200 }} />}
      />

      {/* Sepet özeti - alt kısım */}
      <View
        style={[
          styles.ozet,
          {
            backgroundColor: tema.colors.kart,
            borderTopColor: tema.colors.sinir,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            Alert.alert(
              'Sepeti Temizle',
              'Tüm ürünler sepetten kaldırılsın mı?',
              [
                { text: 'İptal', style: 'cancel' },
                { text: 'Temizle', style: 'destructive', onPress: bosalt },
              ]
            )
          }
          accessibilityRole="button"
          accessibilityLabel="Sepeti temizle"
        >
          <Text style={[styles.temizle, { color: tema.colors.tehlike }]}>
            Sepeti Temizle
          </Text>
        </Pressable>

        <View style={styles.toplamSatir}>
          <Text
            style={[styles.toplamEtiket, { color: tema.colors.yaziIkincil }]}
            accessible={false}
          >
            {t('sepet.toplamTutar')}
          </Text>
          <Text
            style={[styles.toplamFiyat, { color: tema.colors.yaziBaslik }]}
            accessibilityLabel={`Toplam tutar: ${paraFormula(toplamFiyat())}`}
          >
            {paraFormula(toplamFiyat())}
          </Text>
        </View>

        <Pressable
          onPress={() => setOdemeModalAcik(true)}
          style={[styles.odemeButon, { backgroundColor: tema.colors.birincil }]}
          accessibilityRole="button"
          accessibilityLabel={t('sepet.odemeYap')}
        >
          <Text style={styles.odemeYazi}>{t('sepet.odemeYap')}</Text>
        </Pressable>
      </View>

      {/* Ödeme Modalı */}
      <Modal
        visible={odemeModalAcik}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOdemeModalAcik(false)}
      >
        <View
          style={[styles.modalBaslik, { backgroundColor: tema.colors.kart, borderBottomColor: tema.colors.sinir }]}
        >
          <Text style={[styles.modalBaslikYazi, { color: tema.colors.yaziBaslik }]}>
            Ödeme Bilgileri
          </Text>
          <Pressable
            onPress={() => setOdemeModalAcik(false)}
            accessibilityRole="button"
            accessibilityLabel="Kapat"
          >
            <Text style={[{ color: tema.colors.birincil, fontSize: 16 }]}>
              Kapat
            </Text>
          </Pressable>
        </View>
        <View style={[{ flex: 1, backgroundColor: tema.colors.arka, padding: 16 }]}>
          <OdemeFormu
            gonderiliyor={gonderiliyor}
            onSubmit={async () => {
              setGonderiliyor(true);
              try {
                await siparisOlustur(itemlar, toplamFiyat());
                setOdemeModalAcik(false);
                bosalt();
                Alert.alert('Sipariş Alındı', 'Siparişiniz başarıyla oluşturuldu!');
              } catch (hata) {
                // Gün 49 — Sentry: hatayı bağlamıyla birlikte raporla, kullanıcıya sessizce bildir
                Sentry.captureException(hata, {
                  extra: { urunSayisi: itemlar.length, toplam: toplamFiyat() },
                  tags: { ekran: 'odeme', islem: 'siparis-olustur' },
                });
                // Gün 50 — Crashlytics: aynı hatayı Firebase tarafına da bildir
                crashlyticsHataRaporla(hata as Error, {
                  ekran: 'odeme',
                  urunSayisi: String(itemlar.length),
                });
                Alert.alert('Sipariş Oluşturulamadı', 'Lütfen tekrar deneyin.');
              } finally {
                setGonderiliyor(false);
              }
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  satir: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  gorsel: { width: 80, height: 80, borderRadius: 8 },
  bilgi: { flex: 1, gap: 3 },
  ad: { fontSize: 15, fontWeight: '500' },
  marka: { fontSize: 12 },
  fiyat: { fontSize: 16, fontWeight: '700' },
  adetKontrol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adetButon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adetButonYazi: { fontSize: 18, lineHeight: 20 },
  adet: { fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  silButon: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  silYazi: { color: '#fff', fontWeight: '600' },
  bos: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  bosIkon: { fontSize: 64 },
  bosBaslik: { fontSize: 20, fontWeight: '600' },
  bosAciklama: { fontSize: 15, textAlign: 'center' },
  alisverisButon: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  alisverisYazi: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ozet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  temizle: { fontSize: 14, textAlign: 'right' },
  toplamSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toplamEtiket: { fontSize: 16 },
  toplamFiyat: { fontSize: 22, fontWeight: '700' },
  odemeButon: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  odemeYazi: { color: '#fff', fontSize: 17, fontWeight: '600' },
  modalBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBaslikYazi: { fontSize: 18, fontWeight: '600' },
});
