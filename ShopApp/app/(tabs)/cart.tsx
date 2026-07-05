import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore, type SepetItem } from '@/store/cartStore';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';

function SepetSatiri({ item }: { item: SepetItem }) {
  const { addItem, removeItem, deleteItem } = useCartStore();
  const gercekFiyat = item.urun.indirimYuzdesi
    ? item.urun.fiyat * (1 - item.urun.indirimYuzdesi / 100)
    : item.urun.fiyat;

  return (
    <View style={styles.satir}>
      <Image
        source={{ uri: item.urun.gorselUrl }}
        style={styles.gorsel}
        contentFit="cover"
      />
      <View style={styles.bilgi}>
        <Text style={styles.isim} numberOfLines={2}>
          {item.urun.ad}
        </Text>
        <Text style={styles.fiyat}>
          {(gercekFiyat * item.adet).toLocaleString('tr-TR', {
            maximumFractionDigits: 0,
          })}{' '}
          TL
        </Text>
        <View style={styles.adetSatiri}>
          <Pressable style={styles.adetButon} onPress={() => removeItem(item.urun.id)}>
            <Ionicons name="remove" size={16} color={COLORS.primary} />
          </Pressable>
          <Text style={styles.adet}>{item.adet}</Text>
          <Pressable style={styles.adetButon} onPress={() => addItem(item.urun)}>
            <Ionicons name="add" size={16} color={COLORS.primary} />
          </Pressable>
        </View>
      </View>
      <Pressable onPress={() => deleteItem(item.urun.id)} style={styles.silButon}>
        <Ionicons name="trash-outline" size={20} color={COLORS.error} />
      </Pressable>
    </View>
  );
}

export default function SepetTab() {
  const { items, clear, toplamFiyat, toplamAdet } = useCartStore();

  function sepetTemizle() {
    Alert.alert('Sepeti Temizle', 'Tüm ürünler sepetten çıkarılsın mı?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Temizle', style: 'destructive', onPress: clear },
    ]);
  }

  if (items.length === 0) {
    return (
      <View style={styles.bosEkran}>
        <Ionicons name="cart-outline" size={72} color={COLORS.textDisabled} />
        <Text style={styles.bosBaslik}>Sepetiniz boş</Text>
        <Text style={styles.bosAlt}>Ürünler sekmesinden alışverişe başlayın</Text>
      </View>
    );
  }

  return (
    <View style={styles.sayfa}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.urun.id}
        renderItem={({ item }) => <SepetSatiri item={item} />}
        contentContainerStyle={styles.liste}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.ozet}>
            <Text style={styles.ozetYazi}>{toplamAdet()} ürün</Text>
            <Pressable onPress={sepetTemizle}>
              <Text style={styles.temizleYazi}>Temizle</Text>
            </Pressable>
          </View>
        )}
      />

      <View style={styles.altBar}>
        <View>
          <Text style={styles.toplamEtiket}>Toplam</Text>
          <Text style={styles.toplamFiyat}>
            {toplamFiyat().toLocaleString('tr-TR', { maximumFractionDigits: 0 })} TL
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.odemeButon, pressed && { opacity: 0.85 }]}
          onPress={() => Alert.alert('Ödeme', 'Ödeme sayfası Faz 4\'te eklenecek.')}
        >
          <Text style={styles.odemeYazi}>Ödemeye Geç</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sayfa: { flex: 1, backgroundColor: COLORS.background },
  bosEkran: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.background,
  },
  bosBaslik: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  bosAlt: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xxxl,
  },
  liste: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  ozet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  ozetYazi: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
  },
  temizleYazi: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.semibold,
  },
  satir: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  gorsel: { width: 90, height: 90 },
  bilgi: { flex: 1, padding: SPACING.md, gap: SPACING.xs },
  isim: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  fiyat: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  adetSatiri: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  adetButon: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adet: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  silButon: { padding: SPACING.md, justifyContent: 'center' },
  altBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOW.lg,
  },
  toplamEtiket: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  toplamFiyat: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  odemeButon: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  odemeYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
});
