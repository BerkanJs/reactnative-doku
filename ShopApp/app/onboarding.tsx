// Gün 5 — Expo Router: AsyncStorage ile "gösterildi" kontrolü
// Gün 24 — Reanimated: slayt geçiş animasyonu
// Gün 39 — i18n: çeviri metinleri

import { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Dimensions,
  type ListRenderItem,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTema } from '@/hooks/useTema';

const { width } = Dimensions.get('window');

const ADIMLAR = [
  {
    id: '1',
    ikon: '🛍️',
    baslikKey: 'onboarding.adim1Baslik',
    aciklamaKey: 'onboarding.adim1Aciklama',
  },
  {
    id: '2',
    ikon: '🚀',
    baslikKey: 'onboarding.adim2Baslik',
    aciklamaKey: 'onboarding.adim2Aciklama',
  },
  {
    id: '3',
    ikon: '🔒',
    baslikKey: 'onboarding.adim3Baslik',
    aciklamaKey: 'onboarding.adim3Aciklama',
  },
] as const;

export default function OnboardingEkrani() {
  const { tema } = useTema();
  const { t } = useTranslation();
  const [mevcutIndex, setMevcutIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const ilerleme = useSharedValue(0);

  const onboardinguBitir = async () => {
    await AsyncStorage.setItem('onboarding_gosterildi', 'true');
    router.replace('/(auth)/giris');
  };

  const sonrakiAdim = () => {
    if (mevcutIndex < ADIMLAR.length - 1) {
      const yeniIndex = mevcutIndex + 1;
      setMevcutIndex(yeniIndex);
      ilerleme.value = withTiming(yeniIndex);
      listRef.current?.scrollToIndex({ index: yeniIndex, animated: true });
    } else {
      onboardinguBitir();
    }
  };

  const renderAdim: ListRenderItem<(typeof ADIMLAR)[number]> = ({ item }) => (
    <View style={[styles.adim, { width }]}>
      <Text style={styles.ikon}>{item.ikon}</Text>
      <Text style={[styles.baslik, { color: tema.colors.yaziBaslik }]}>
        {t(item.baslikKey)}
      </Text>
      <Text style={[styles.aciklama, { color: tema.colors.yaziIkincil }]}>
        {t(item.aciklamaKey)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: tema.colors.arka }]}>
      {/* Atla */}
      <Pressable
        onPress={onboardinguBitir}
        style={styles.atla}
        accessibilityRole="button"
        accessibilityLabel={t('onboarding.atla')}
      >
        <Text style={[styles.atlaYazi, { color: tema.colors.yaziIkincil }]}>
          {t('onboarding.atla')}
        </Text>
      </Pressable>

      {/* Slaytlar */}
      <FlatList
        ref={listRef}
        data={ADIMLAR}
        renderItem={renderAdim}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Noktalar */}
      <View style={styles.noktalar}>
        {ADIMLAR.map((_, i) => (
          <View
            key={i}
            style={[
              styles.nokta,
              {
                backgroundColor:
                  i === mevcutIndex
                    ? tema.colors.birincil
                    : tema.colors.sinir,
                width: i === mevcutIndex ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Sonraki / Başla butonu */}
      <Pressable
        onPress={sonrakiAdim}
        style={[styles.buton, { backgroundColor: tema.colors.birincil }]}
        accessibilityRole="button"
        accessibilityLabel={
          mevcutIndex < ADIMLAR.length - 1
            ? t('onboarding.sonraki')
            : t('onboarding.baslayalim')
        }
      >
        <Text style={styles.butonYazi}>
          {mevcutIndex < ADIMLAR.length - 1
            ? t('onboarding.sonraki')
            : t('onboarding.baslayalim')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  atla: {
    position: 'absolute',
    top: 60,
    end: 24,
    zIndex: 10,
    padding: 8,
  },
  atlaYazi: { fontSize: 16 },
  adim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 120,
  },
  ikon: { fontSize: 80, marginBottom: 40 },
  baslik: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  aciklama: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
  },
  noktalar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  nokta: {
    height: 8,
    borderRadius: 4,
  },
  buton: {
    marginHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 48,
  },
  butonYazi: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
