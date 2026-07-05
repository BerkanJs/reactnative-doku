// Gün 26 — Skeleton Loading + Shimmer efekti
// expo-linear-gradient + Reanimated ile titreşimli yükleme animasyonu

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTema } from '@/hooks/useTema';

const { width } = Dimensions.get('window');
const KART_GENISLIGI = (width - 48) / 2;

export function SkeletonCard() {
  const { tema } = useTema();
  const ilerleme = useSharedValue(0);

  useEffect(() => {
    ilerleme.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,   // sonsuz tekrar
      false
    );
  }, []);

  const shimmerStil = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          ilerleme.value,
          [0, 1],
          [-KART_GENISLIGI, KART_GENISLIGI]
        ),
      },
    ],
  }));

  const renk = tema.colors.iskelet;
  const vurgu = tema.colors.iskeletVurgu;

  return (
    <View
      style={[styles.kart, { backgroundColor: renk, width: KART_GENISLIGI }]}
      accessible
      accessibilityLabel="Ürün yükleniyor"
      accessibilityRole="image"
    >
      {/* Görsel alanı */}
      <View style={[styles.gorsel, { backgroundColor: renk }]}>
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStil]}>
          <LinearGradient
            colors={['transparent', vurgu, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {/* Metin alanı */}
      <View style={styles.bilgi}>
        <View style={[styles.satirKisa, { backgroundColor: renk }]}>
          <Animated.View style={[StyleSheet.absoluteFill, shimmerStil]}>
            <LinearGradient
              colors={['transparent', vurgu, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <View style={[styles.satirUzun, { backgroundColor: renk }]}>
          <Animated.View style={[StyleSheet.absoluteFill, shimmerStil]}>
            <LinearGradient
              colors={['transparent', vurgu, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <View style={[styles.satirOrta, { backgroundColor: renk }]}>
          <Animated.View style={[StyleSheet.absoluteFill, shimmerStil]}>
            <LinearGradient
              colors={['transparent', vurgu, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kart: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gorsel: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
  },
  bilgi: {
    padding: 10,
    gap: 8,
  },
  satirKisa: {
    height: 10,
    width: '40%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  satirUzun: {
    height: 14,
    width: '90%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  satirOrta: {
    height: 18,
    width: '55%',
    borderRadius: 5,
    overflow: 'hidden',
  },
});
