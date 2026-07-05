import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '@/store/userStore';
import { useCartStore } from '@/store/cartStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
  SHADOW,
} from '@/constants/theme';

function MenuItem({
  icon,
  label,
  onPress,
  tehlikeli,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tehlikeli?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={tehlikeli ? COLORS.error : COLORS.primary} />
      <Text style={[styles.menuLabel, tehlikeli && { color: COLORS.error }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textDisabled} />
    </Pressable>
  );
}

export default function ProfilTab() {
  const kullanici = useUserStore((s) => s.kullanici);
  const cikisYap = useUserStore((s) => s.cikisYap);
  const sepetiTemizle = useCartStore((s) => s.clear);
  const favoriSayisi = useFavoritesStore((s) => s.ids.length);
  const sepetSayisi = useCartStore((s) => s.toplamAdet());

  function cikisOnay() {
    Alert.alert('Çıkış Yap', 'Hesabından çıkmak istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: () => {
          cikisYap();
          sepetiTemizle();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.sayfa} contentContainerStyle={styles.icerik}>
      {/* AVATAR */}
      <View style={styles.avatarAlani}>
        <Image
          source={{
            uri:
              kullanici?.avatar ??
              `https://picsum.photos/seed/${kullanici?.id ?? 'user'}/200/200`,
          }}
          style={styles.avatar}
          contentFit="cover"
        />
        <Text style={styles.isim}>{kullanici?.isim ?? 'Kullanıcı'}</Text>
        <Text style={styles.email}>{kullanici?.email ?? ''}</Text>
      </View>

      {/* İSTATİSTİKLER */}
      <View style={styles.istatistikler}>
        <View style={styles.istatistik}>
          <Text style={styles.istatistikSayi}>{sepetSayisi}</Text>
          <Text style={styles.istatistikEtiket}>Sepet</Text>
        </View>
        <View style={styles.ayrac} />
        <View style={styles.istatistik}>
          <Text style={styles.istatistikSayi}>{favoriSayisi}</Text>
          <Text style={styles.istatistikEtiket}>Favori</Text>
        </View>
      </View>

      {/* MENÜ */}
      <View style={styles.menu}>
        <MenuItem
          icon="heart-outline"
          label="Favorilerim"
          onPress={() => Alert.alert('Favoriler', 'Favoriler sayfası yakında.')}
        />
        <MenuItem
          icon="bag-outline"
          label="Siparişlerim"
          onPress={() => Alert.alert('Siparişler', 'Sipariş geçmişi Faz 4\'te eklenecek.')}
        />
        <MenuItem
          icon="settings-outline"
          label="Ayarlar"
          onPress={() => Alert.alert('Ayarlar', 'Ayarlar sayfası yakında.')}
        />
        <MenuItem
          icon="log-out-outline"
          label="Çıkış Yap"
          onPress={cikisOnay}
          tehlikeli
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sayfa: { flex: 1, backgroundColor: COLORS.background },
  icerik: { paddingBottom: SPACING.xxxl },
  avatarAlani: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  isim: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  email: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  istatistikler: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginTop: SPACING.md,
    paddingVertical: SPACING.lg,
    ...SHADOW.sm,
  },
  istatistik: {
    flex: 1,
    alignItems: 'center',
  },
  istatistikSayi: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  istatistikEtiket: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  ayrac: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  menu: {
    backgroundColor: COLORS.surface,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
});
