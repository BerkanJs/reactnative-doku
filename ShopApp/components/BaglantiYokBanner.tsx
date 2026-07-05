// Gün 33 — Offline First: animated offline banner
// Bağlantı kesilince yukarıdan kayar, bağlantı gelince çekilir

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBaglantiDurumu } from '@/hooks/useBaglantiDurumu';

export function BaglantiYokBanner() {
  const { bagliMi } = useBaglantiDurumu();
  const { top } = useSafeAreaInsets();
  const ceviri = useSharedValue(-60);

  useEffect(() => {
    ceviri.value = withTiming(bagliMi ? -60 : 0, { duration: 350 });
  }, [bagliMi]);

  const animasyonStil = useAnimatedStyle(() => ({
    transform: [{ translateY: ceviri.value }],
  }));

  return (
    <Animated.View
      style={[styles.banner, { top: top }, animasyonStil]}
      accessibilityLiveRegion="assertive"
      accessibilityLabel={bagliMi ? '' : 'İnternet bağlantısı yok'}
    >
      <View style={styles.ic}>
        <Text style={styles.yazi}>İnternet bağlantısı yok</Text>
        <Text style={styles.altYazi}>Önbellek görüntüleniyor</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#FF3B30',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  ic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yazi: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  altYazi: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
});
