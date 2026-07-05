import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Link } from 'expo-router';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';

type Urun = {
  id: string;
  isim: string;
  fiyat: number;
  gorsel: string;
  indirim?: number;
};

type Props = {
  urunler: Urun[];
};

export function ProductGrid({ urunler }: Props) {
  const { width } = useWindowDimensions();

  // Sol padding(16) + sağ padding(16) + sütunlar arası gap(12) = 44
  const kartGenisligi = (width - 44) / 2;

  return (
    <View style={styles.grid}>
      {urunler.map((urun) => (
        // Link asChild: Pressable'ın press davranışını + Link'in navigasyonunu birleştir
        // asChild olmadan Link kendi View'ını oluşturur — stil vermek zorlaşır
        <Link key={urun.id} href={`/products/${urun.id}`} asChild>
          <Pressable
            style={({ pressed }) => [
              styles.kart,
              { width: kartGenisligi },
              pressed && { opacity: 0.85 },
            ]}
          >
          <View style={styles.gorselKapsayici}>
            <Image
              source={{ uri: urun.gorsel }}
              style={styles.gorsel}
              resizeMode="cover"
            />
            {urun.indirim && (
              <View style={styles.indirimEtiketi}>
                <Text style={styles.indirimYazi}>%{urun.indirim}</Text>
              </View>
            )}
          </View>

          <View style={styles.bilgi}>
            <Text style={styles.isim} numberOfLines={2}>
              {urun.isim}
            </Text>

            {urun.indirim ? (
              <View style={styles.fiyatSatiri}>
                <Text style={styles.eskiFiyat}>
                  {urun.fiyat.toLocaleString('tr-TR')} TL
                </Text>
                <Text style={styles.yeniFiyat}>
                  {(urun.fiyat * (1 - urun.indirim / 100)).toLocaleString(
                    'tr-TR',
                    { maximumFractionDigits: 0 }
                  )}{' '}
                  TL
                </Text>
              </View>
            ) : (
              <Text style={styles.fiyat}>
                {urun.fiyat.toLocaleString('tr-TR')} TL
              </Text>
            )}
          </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  kart: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  gorselKapsayici: {
    position: 'relative',
  },
  gorsel: {
    width: '100%',
    aspectRatio: 1,
  },
  indirimEtiketi: {
    position: 'absolute',
    top: SPACING.sm,
    start: SPACING.sm, // Gün 39 — RTL'de otomatik sağa döner
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  indirimYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  bilgi: {
    padding: SPACING.sm,
  },
  isim: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  fiyatSatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  eskiFiyat: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textDisabled,
    textDecorationLine: 'line-through',
  },
  yeniFiyat: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.error,
  },
  fiyat: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});
