import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCartStore } from '@/store/cartStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { MOCK_URUNLER } from '@/constants/mockData';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';

export default function UrunDetay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const addItem = useCartStore((s) => s.addItem);
  const toggle = useFavoritesStore((s) => s.toggle);
  const isFav = useFavoritesStore((s) => s.isFavorite(id));

  const urun = MOCK_URUNLER.find((u) => u.id === id);

  if (!urun) {
    return (
      <View style={styles.hata}>
        <Text style={styles.hataYazi}>Ürün bulunamadı</Text>
        <Pressable style={styles.geriButon} onPress={() => router.back()}>
          <Text style={styles.geriButonYazi}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  const indirimliKFiyat = urun.indirimYuzdesi
    ? urun.fiyat * (1 - urun.indirimYuzdesi / 100)
    : null;

  async function sepeteEkle() {
    if (!urun) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addItem(urun);
    Alert.alert('Sepete Eklendi', `${urun.ad} sepetinize eklendi.`, [
      { text: 'Alışverişe Devam', style: 'cancel' },
      { text: 'Sepete Git', onPress: () => router.push('/(tabs)/cart') },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: urun.ad,
          headerRight: () => (
            <Pressable onPress={() => toggle(urun.id)} hitSlop={8} style={{ marginRight: 4 }}>
              <Ionicons
                name={isFav ? 'heart' : 'heart-outline'}
                size={24}
                color={isFav ? COLORS.error : COLORS.white}
              />
            </Pressable>
          ),
        }}
      />

      <ScrollView style={styles.sayfa} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: urun.gorselUrl }}
          style={styles.gorsel}
          contentFit="cover"
          transition={200}
        />

        <View style={styles.detay}>
          <Text style={styles.isim}>{urun.ad}</Text>

          <View style={styles.fiyatAlani}>
            {indirimliKFiyat ? (
              <>
                <Text style={styles.yeniFiyat}>
                  {indirimliKFiyat.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
                </Text>
                <View style={styles.indirimBadge}>
                  <Text style={styles.indirimYazi}>%{urun.indirimYuzdesi} İndirim</Text>
                </View>
                <Text style={styles.eskiFiyat}>
                  {urun.fiyat.toLocaleString('tr-TR')} TL
                </Text>
              </>
            ) : (
              <Text style={styles.fiyat}>
                {urun.fiyat.toLocaleString('tr-TR')} TL
              </Text>
            )}
          </View>

          <Text style={styles.aciklamaBaslik}>Ürün Açıklaması</Text>
          <Text style={styles.aciklama}>
            Bu ürün, kaliteli malzemeleri ve modern tasarımıyla öne çıkmaktadır.
            Günlük kullanım için ideal olan bu model, konfor ve şıklığı bir arada sunar.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.sepetButon, pressed && { opacity: 0.85 }]}
            onPress={sepeteEkle}
          >
            <Ionicons name="cart-outline" size={20} color={COLORS.white} />
            <Text style={styles.sepetButonYazi}>Sepete Ekle</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  sayfa: { flex: 1, backgroundColor: COLORS.background },
  gorsel: { width: '100%', height: 320, backgroundColor: COLORS.gray100 },
  detay: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    marginTop: -SPACING.xl,
    ...SHADOW.lg,
  },
  isim: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  fiyatAlani: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  fiyat: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  yeniFiyat: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
  },
  eskiFiyat: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textDisabled,
    textDecorationLine: 'line-through',
  },
  indirimBadge: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  indirimYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },
  aciklamaBaslik: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  aciklama: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  sepetButon: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  sepetButonYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  hata: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.lg },
  hataYazi: { fontSize: FONT_SIZE.lg, color: COLORS.textSecondary },
  geriButon: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  geriButonYazi: { color: COLORS.white, fontWeight: FONT_WEIGHT.semibold },
});
