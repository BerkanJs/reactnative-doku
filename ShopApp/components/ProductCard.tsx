// Gün 26 (Skeleton) + Gün 27 (Dark Mode) + Gün 38 (A11y) + Gün 24 (Reanimated)
// Sepete ekle, favorilere al, karanlık mod ve ekran okuyucu desteği

import React from 'react';
import {
  Pressable,
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTema } from '@/hooks/useTema';
import { useFormat } from '@/hooks/useFormat';
import { DusukStokRozeti } from '@/components/DusukStokRozeti';
import type { Urun } from '@/types';

const { width } = Dimensions.get('window');
const KART_GENISLIGI = (width - 48) / 2;

interface Props {
  urun: Urun;
  onPress: () => void;
  onSepeteEkle?: () => void;
}

export const ProductCard = React.memo(function ProductCard({
  urun,
  onPress,
  onSepeteEkle,
}: Props) {
  const { tema } = useTema();
  const { paraFormula } = useFormat();
  const olcek = useSharedValue(1);

  const animasyonStil = useAnimatedStyle(() => ({
    transform: [{ scale: olcek.value }],
  }));

  const dokunulunca = () => {
    'worklet';
    olcek.value = withSpring(0.96, {}, () => {
      olcek.value = withSpring(1);
    });
  };

  const indirimliFilya = urun.indirimYuzdesi
    ? urun.fiyat * (1 - urun.indirimYuzdesi / 100)
    : urun.fiyat;

  // Ekran okuyucu için anlamlı etiket (Gün 38)
  const a11yEtiket = [
    urun.ad,
    urun.marka,
    urun.indirimYuzdesi
      ? `${paraFormula(indirimliFilya)}, %${urun.indirimYuzdesi} indirimli`
      : paraFormula(urun.fiyat),
    urun.stok === 0 ? 'Stokta yok' : `${urun.stok} adet stokta`,
  ].join(', ');

  return (
    <Animated.View style={animasyonStil}>
      <Pressable
        onPress={onPress}
        onPressIn={dokunulunca}
        accessible
        accessibilityLabel={a11yEtiket}
        accessibilityRole="button"
        accessibilityHint="Ürün detayına gitmek için çift dokunun"
        accessibilityState={{ disabled: urun.stok === 0 }}
        style={[
          styles.kart,
          {
            backgroundColor: tema.colors.kart,
            width: KART_GENISLIGI,
          },
        ]}
      >
        {/* Ürün görseli */}
        <Image
          source={{ uri: urun.gorselUrl }}
          style={styles.gorsel}
          contentFit="cover"
          transition={300}
          accessible={false}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          cachePolicy="memory-disk"
        />

        {/* İndirim rozeti */}
        {urun.indirimYuzdesi ? (
          <View
            style={[styles.rozet, { backgroundColor: tema.colors.tehlike }]}
            accessible={false}
          >
            <Text style={styles.rozetYazi}>%{urun.indirimYuzdesi}</Text>
          </View>
        ) : null}

        {/* Stokta yok overlay */}
        {urun.stok === 0 && (
          <View style={styles.stokYokOverlay}>
            <Text style={styles.stokYokYazi}>Stokta Yok</Text>
          </View>
        )}

        {/* Düşük stok uyarısı — NativeWind className ile (Gün 36) */}
        <DusukStokRozeti kalanAdet={urun.stok} />

        {/* Bilgi alanı */}
        <View style={styles.bilgi}>
          <Text
            style={[styles.marka, { color: tema.colors.yaziIkincil }]}
            numberOfLines={1}
            accessible={false}
          >
            {urun.marka}
          </Text>
          <Text
            style={[styles.ad, { color: tema.colors.yaziBaslik }]}
            numberOfLines={2}
            accessible={false}
          >
            {urun.ad}
          </Text>

          <View style={styles.fiyatSatir}>
            <Text
              style={[styles.fiyat, { color: tema.colors.yaziBaslik }]}
              accessible={false}
            >
              {paraFormula(indirimliFilya)}
            </Text>
            {urun.indirimYuzdesi ? (
              <Text
                style={[styles.eskiFiyat, { color: tema.colors.yaziIkincil }]}
                accessible={false}
              >
                {paraFormula(urun.fiyat)}
              </Text>
            ) : null}
          </View>

          {/* Sepete ekle butonu */}
          {onSepeteEkle && urun.stok > 0 && (
            <Pressable
              onPress={onSepeteEkle}
              style={[styles.sepetButon, { backgroundColor: tema.colors.birincil }]}
              accessibilityLabel={`${urun.ad} sepete ekle`}
              accessibilityRole="button"
            >
              <Text style={styles.sepetButonYazi}>Sepete Ekle</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  kart: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  gorsel: {
    width: '100%',
    height: 160,
  },
  rozet: {
    position: 'absolute',
    top: 8,
    start: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rozetYazi: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  stokYokOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stokYokYazi: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  bilgi: {
    padding: 10,
    gap: 3,
  },
  marka: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ad: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  fiyatSatir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  fiyat: {
    fontSize: 16,
    fontWeight: '700',
  },
  eskiFiyat: {
    fontSize: 12,
    textDecorationLine: 'line-through',
  },
  sepetButon: {
    marginTop: 8,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  sepetButonYazi: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
