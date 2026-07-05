// Gün 24 — Reanimated: parallax scroll header
// Gün 25 — Gesture Handler: swipe back, pinch
// Gün 31 — Push bildirim: ürün stok bildirimi
// Gün 32 — Deep Linking: shopapp://urun/123 + Share API
// Gün 38 — A11y: rating, indirim, stok durumu

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Share,
  Alert,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTema } from '@/hooks/useTema';
import { useSepetStore } from '@/store/sepetStore';
import { useFormat } from '@/hooks/useFormat';
import { urunGetir } from '@/services/urunServisi';
import { SkeletonCard } from '@/components/SkeletonCard';
import { UrunYorumlari } from '@/components/UrunYorumlari';
import { deeplinks } from '@/utils/deeplink';

const { width, height } = Dimensions.get('window');
const GORSEL_YUKSEKLIGI = 320;

export default function UrunDetayEkrani() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tema } = useTema();
  const { t } = useTranslation();
  const { ekle, itemlar } = useSepetStore();
  const { paraFormula } = useFormat();
  const [seciliAdet, setSeciliAdet] = useState(1);

  const scrollY = useSharedValue(0);

  // Gün 42 — Stack'in slide-in geçiş animasyonu bitmeden veri çekimini başlatma
  // (animasyon + API yanıtını işleme aynı anda JS Thread'i doldurursa geçiş takılır)
  const [gecisTamamlandi, setGecisTamamlandi] = useState(false);
  useEffect(() => {
    const gorev = InteractionManager.runAfterInteractions(() => {
      setGecisTamamlandi(true);
    });
    return () => gorev.cancel();
  }, []);

  const { data: urun, isLoading, error } = useQuery({
    queryKey: ['urun', id],
    queryFn: () => urunGetir(id!),
    enabled: !!id && gecisTamamlandi,
  });

  // Parallax scroll handler (Gün 24)
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Görselin parallax hareketi
  const gorselAnimasyonu = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-GORSEL_YUKSEKLIGI, 0, GORSEL_YUKSEKLIGI],
          [-GORSEL_YUKSEKLIGI / 2, 0, GORSEL_YUKSEKLIGI / 3],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  const sepetteVarMi = itemlar.some((i) => i.urun.id === id);

  const sepeteEkle = () => {
    if (!urun) return;
    ekle(urun, seciliAdet);
    Alert.alert(
      'Sepete Eklendi',
      `${urun.ad} sepete eklendi.`,
      [
        { text: 'Alışverişe Devam', style: 'cancel' },
        { text: 'Sepete Git', onPress: () => router.push('/(tabs)/sepet') },
      ]
    );
  };

  const paylasUrun = async () => {
    if (!urun) return;
    // Gün 32 — Deep Linking + Share: link'i merkezi deeplinks yardımcısından üret
    const link = deeplinks.urun(urun.id);
    await Share.share({
      title: urun.ad,
      message: `${urun.ad} - ${paraFormula(urun.fiyat)}\n\nShopApp'te incele: ${link}`,
      url: link, // iOS'ta ayrı URL alanı
    });
  };

  const stokBildirimKur = async () => {
    // Gün 31 — Local bildirim: stok gelince haber ver
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Bildirim almak için izin verin.');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Stok Geldi! 🎉',
        body: `${urun?.ad} tekrar stokta!`,
        data: { ekran: 'urun', urunId: id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: 'kampanyalar', // Android — hangi bildirim kanalında gösterilecek
      },
    });

    Alert.alert('Tamam', 'Ürün stoka girince bildirim alacaksınız.');
  };

  const ortalamanPuan = urun?.puanlar.length
    ? (
        urun.puanlar.reduce((t, p) => t + p.puan, 0) / urun.puanlar.length
      ).toFixed(1)
    : null;

  if (isLoading || !gecisTamamlandi) {
    return (
      <View style={[styles.container, { backgroundColor: tema.colors.arka }]}>
        <SkeletonCard />
      </View>
    );
  }

  if (error || !urun) {
    return (
      <View style={[styles.merkez, { backgroundColor: tema.colors.arka }]}>
        <Text style={[{ color: tema.colors.tehlike }]}>Ürün yüklenemedi</Text>
      </View>
    );
  }

  const indirimliFilya = urun.indirimYuzdesi
    ? urun.fiyat * (1 - urun.indirimYuzdesi / 100)
    : urun.fiyat;

  const a11yFiyat = urun.indirimYuzdesi
    ? `${paraFormula(indirimliFilya)}, orijinal fiyat ${paraFormula(urun.fiyat)}, %${urun.indirimYuzdesi} indirimli`
    : paraFormula(urun.fiyat);

  return (
    <View style={[styles.container, { backgroundColor: tema.colors.arka }]}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Parallax görsel */}
        <View style={styles.gorselKaplik}>
          <Animated.View style={[StyleSheet.absoluteFill, gorselAnimasyonu]}>
            <Image
              source={{ uri: urun.gorselUrl }}
              style={styles.gorsel}
              contentFit="cover"
              accessibilityLabel={`${urun.ad} görseli`}
            />
          </Animated.View>

          {/* Paylaş butonu */}
          <Pressable
            onPress={paylasUrun}
            style={[styles.paylasButon, { backgroundColor: tema.colors.kart }]}
            accessibilityLabel={t('urun.paylas')}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: 20 }}>⬆️</Text>
          </Pressable>

          {/* İndirim rozeti */}
          {urun.indirimYuzdesi && (
            <View
              style={[styles.indirimRozeti, { backgroundColor: tema.colors.tehlike }]}
              accessible={false}
            >
              <Text style={styles.indirimYazi}>%{urun.indirimYuzdesi} İNDİRİM</Text>
            </View>
          )}
        </View>

        {/* İçerik */}
        <View
          style={[styles.icerik, { backgroundColor: tema.colors.arka }]}
          accessible
          accessibilityLabel={[
            urun.marka,
            urun.ad,
            a11yFiyat,
            urun.stok === 0 ? 'Stokta yok' : `${urun.stok} adet stokta`,
            ortalamanPuan ? `Puan: ${ortalamanPuan} üzere 5` : 'Henüz puan yok',
          ].join('. ')}
        >
          {/* Marka + Ad */}
          <Text
            style={[styles.marka, { color: tema.colors.yaziIkincil }]}
            accessible={false}
          >
            {urun.marka}
          </Text>
          <Text
            style={[styles.ad, { color: tema.colors.yaziBaslik }]}
            accessible={false}
          >
            {urun.ad}
          </Text>

          {/* Fiyat */}
          <View style={styles.fiyatSatir} accessible={false}>
            <Text style={[styles.fiyat, { color: tema.colors.yaziBaslik }]}>
              {paraFormula(indirimliFilya)}
            </Text>
            {urun.indirimYuzdesi && (
              <Text style={[styles.eskiFiyat, { color: tema.colors.yaziIkincil }]}>
                {paraFormula(urun.fiyat)}
              </Text>
            )}
          </View>

          {/* Puan */}
          {ortalamanPuan && (
            <View style={styles.puanSatir} accessible={false}>
              <Text style={styles.yildiz}>⭐</Text>
              <Text style={[styles.puan, { color: tema.colors.yaziBaslik }]}>
                {ortalamanPuan}
              </Text>
              <Text style={[styles.yorumSayisi, { color: tema.colors.yaziIkincil }]}>
                ({urun.puanlar.length} yorum)
              </Text>
            </View>
          )}

          {/* Stok durumu */}
          <View style={styles.stokSatir} accessible={false}>
            <View
              style={[
                styles.stokGostergesi,
                {
                  backgroundColor:
                    urun.stok === 0
                      ? tema.colors.tehlike
                      : urun.stok < 5
                      ? tema.colors.uyari
                      : tema.colors.basari,
                },
              ]}
            />
            <Text style={[styles.stokYazi, { color: tema.colors.yaziIkincil }]}>
              {urun.stok === 0
                ? t('urun.stokYok')
                : t('urun.stokAdet', { adet: urun.stok })}
            </Text>
          </View>

          {/* Açıklama */}
          <Text
            style={[styles.bolumBaslik, { color: tema.colors.yaziBaslik }]}
            accessibilityRole="header"
          >
            Ürün Açıklaması
          </Text>
          <Text style={[styles.aciklama, { color: tema.colors.yaziIkincil }]}>
            {urun.aciklama}
          </Text>

          {/* Özellikler */}
          {Object.keys(urun.ozellikler).length > 0 && (
            <>
              <Text
                style={[styles.bolumBaslik, { color: tema.colors.yaziBaslik }]}
                accessibilityRole="header"
              >
                {t('urun.ozellikler')}
              </Text>
              <View
                style={[styles.ozellikler, { backgroundColor: tema.colors.kart }]}
              >
                {Object.entries(urun.ozellikler).map(([anahtar, deger]) => (
                  <View
                    key={anahtar}
                    style={[
                      styles.ozellikSatir,
                      { borderBottomColor: tema.colors.sinir },
                    ]}
                    accessible
                    accessibilityLabel={`${anahtar}: ${deger}`}
                  >
                    <Text
                      style={[styles.ozellikAnahtar, { color: tema.colors.yaziIkincil }]}
                      accessible={false}
                    >
                      {anahtar}
                    </Text>
                    <Text
                      style={[styles.ozellikDeger, { color: tema.colors.yaziBaslik }]}
                      accessible={false}
                    >
                      {deger}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Yorumlar — Gün 40: GraphQL useQuery/useMutation ile okunur/yazılır */}
          <UrunYorumlari urunId={id!} />

          {/* Stok bildirim butonu */}
          {urun.stok === 0 && (
            <Pressable
              onPress={stokBildirimKur}
              style={[
                styles.bildirimButon,
                { borderColor: tema.colors.birincil },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Stok gelince bildir"
            >
              <Text style={[styles.bildirimYazi, { color: tema.colors.birincil }]}>
                🔔 Stok Gelince Haber Ver
              </Text>
            </Pressable>
          )}

          <View style={{ height: 120 }} />
        </View>
      </Animated.ScrollView>

      {/* Alt - Sepete ekle butonu */}
      {urun.stok > 0 && (
        <View
          style={[
            styles.altBar,
            {
              backgroundColor: tema.colors.kart,
              borderTopColor: tema.colors.sinir,
            },
          ]}
        >
          {/* Adet seçimi */}
          <View style={styles.adetKontrol}>
            <Pressable
              onPress={() => setSeciliAdet(Math.max(1, seciliAdet - 1))}
              style={[styles.adetButon, { borderColor: tema.colors.sinir }]}
              accessibilityRole="button"
              accessibilityLabel="Adedi azalt"
              hitSlop={8}
            >
              <Text style={[{ fontSize: 20, color: tema.colors.yaziBaslik }]}>−</Text>
            </Pressable>
            <Text
              style={[styles.adetDeger, { color: tema.colors.yaziBaslik }]}
              accessibilityLabel={`${seciliAdet} adet`}
            >
              {seciliAdet}
            </Text>
            <Pressable
              onPress={() => setSeciliAdet(Math.min(urun.stok, seciliAdet + 1))}
              style={[styles.adetButon, { borderColor: tema.colors.sinir }]}
              disabled={seciliAdet >= urun.stok}
              accessibilityRole="button"
              accessibilityLabel="Adedi artır"
              accessibilityState={{ disabled: seciliAdet >= urun.stok }}
              hitSlop={8}
            >
              <Text style={[{ fontSize: 20, color: tema.colors.yaziBaslik }]}>+</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={sepeteEkle}
            style={[
              styles.sepetButon,
              { backgroundColor: tema.colors.birincil },
              sepetteVarMi && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              sepetteVarMi
                ? 'Sepete Tekrar Ekle'
                : `${t('urun.sepeteEkle')}, ${paraFormula(indirimliFilya * seciliAdet)}`
            }
          >
            <Text style={styles.sepetButonYazi}>
              {sepetteVarMi ? '✓ Sepete Ekle' : t('urun.sepeteEkle')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  merkez: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gorselKaplik: {
    height: GORSEL_YUKSEKLIGI,
    overflow: 'hidden',
  },
  gorsel: {
    width: '100%',
    height: GORSEL_YUKSEKLIGI + 100,
  },
  paylasButon: {
    position: 'absolute',
    top: 56,
    end: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  indirimRozeti: {
    position: 'absolute',
    bottom: 12,
    start: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  indirimYazi: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  icerik: {
    padding: 20,
  },
  marka: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  ad: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 12,
  },
  fiyatSatir: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    marginBottom: 8,
  },
  fiyat: { fontSize: 28, fontWeight: '800' },
  eskiFiyat: {
    fontSize: 18,
    textDecorationLine: 'line-through',
  },
  puanSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  yildiz: { fontSize: 16 },
  puan: { fontSize: 16, fontWeight: '600' },
  yorumSayisi: { fontSize: 14 },
  stokSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  stokGostergesi: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stokYazi: { fontSize: 14 },
  bolumBaslik: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  aciklama: {
    fontSize: 16,
    lineHeight: 24,
  },
  ozellikler: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ozellikSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ozellikAnahtar: { fontSize: 15 },
  ozellikDeger: { fontSize: 15, fontWeight: '500' },
  yorumKart: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  yorumUst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  yorumKullanici: { fontSize: 15, fontWeight: '600' },
  yorumYildiz: { fontSize: 14 },
  yorumMetin: { fontSize: 15, lineHeight: 22 },
  bildirimButon: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  bildirimYazi: { fontSize: 16, fontWeight: '600' },
  altBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  adetKontrol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adetButon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adetDeger: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'center',
  },
  sepetButon: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  sepetButonYazi: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
