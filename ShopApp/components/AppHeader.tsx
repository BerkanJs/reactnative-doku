import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

type Props = {
  baslik: string;
  geriButonu?: boolean;
};

export function AppHeader({ baslik, geriButonu = false }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + SPACING.sm },
        // insets.top: notch / Dynamic Island yüksekliği (iPhone 14 Pro'da ~59)
        // Stack Navigator varken bu bileşene gerek yok — headerShown: false olan
        // ekranlarda kullanılır
      ]}
    >
      {geriButonu && (
        <Pressable
          style={styles.geriButon}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
            // iOS standardı: chevron (<) — Android standardı: ok (←)
            size={24}
            color={COLORS.white}
          />
        </Pressable>
      )}

      <Text style={styles.baslik} numberOfLines={1}>
        {baslik}
      </Text>

      {/* Sağ taraf dengesi — başlığı ortada tutar */}
      {geriButonu && <View style={styles.sagBosluk} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  geriButon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  baslik: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    textAlign: 'center',
  },
  sagBosluk: {
    width: 40,
    // Geri butonuyla simetri — başlık tam ortada
  },
});
