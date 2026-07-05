// Gün 27 — Dark Mode toggle
// Gün 29 — expo-image-picker: profil fotoğrafı
// Gün 31 — Push bildirim izni
// Gün 39 — i18n: dil değiştirme + RTL

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  I18nManager,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTema } from '@/hooks/useTema';
import { useAuthStore } from '@/store/authStore';
import { useDilStore, type DilKodu } from '@/store/dilStore';
import { RTL_DILLER } from '@/i18n';

type TemaSecim = 'acik' | 'koyu' | 'sistem';
type Dil = DilKodu;

export default function ProfilEkrani() {
  const { tema, secim: temaSecim, setSecim: setTemaSecim, koyuMu } = useTema();
  const { t } = useTranslation();
  const { kullanici, kullaniciyiGuncelle, cikisYap } = useAuthStore();
  const { dilKodu: mevcutDil, dilDegistir: dilStoreDegistir } = useDilStore();

  const fotoDegistir = async () => {
    // İzin iste (Gün 29)
    const { status, canAskAgain } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      if (!canAskAgain) {
        Alert.alert(
          'İzin Gerekli',
          'Galeri erişimi için Ayarlar\'dan izin verin.',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Ayarlar',
              onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync(),
            },
          ]
        );
      }
      return;
    }

    const sonuc = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!sonuc.canceled && sonuc.assets[0]) {
      kullaniciyiGuncelle({ avatarUrl: sonuc.assets[0].uri });
    }
  };

  const bildirimIzniAl = async () => {
    // Gün 31 — Push bildirim izni
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      Alert.alert('Bildirimler Açık', 'Siparişlerinizden haberdar olacaksınız.');
    } else {
      Alert.alert('İzin Verilmedi', 'Bildirimleri açmak için Ayarlar\'a gidin.');
    }
  };

  const dilDegistir = (yeniDil: Dil) => {
    // Gün 39 — RTL desteği: yön değişecekse yeniden başlatma konusunda kullanıcıyı uyar
    const yonDegisecek = RTL_DILLER.includes(yeniDil) !== I18nManager.isRTL;

    if (!yonDegisecek) {
      dilStoreDegistir(yeniDil);
      return;
    }

    Alert.alert(t('profil.dil'), t('profil.rtlYenidenBaslatma'), [
      { text: t('genel.iptal'), style: 'cancel' },
      { text: t('genel.tamam'), onPress: () => dilStoreDegistir(yeniDil) },
    ]);
  };

  const cikisYapOnay = () => {
    Alert.alert(t('auth.cikis'), 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
      { text: t('genel.iptal'), style: 'cancel' },
      {
        text: t('auth.cikis'),
        style: 'destructive',
        onPress: async () => {
          await cikisYap();
          router.replace('/(auth)/giris');
        },
      },
    ]);
  };

  const AyarSatiri = ({
    etiket,
    deger,
    onPress,
    tehlikeli = false,
  }: {
    etiket: string;
    deger?: string;
    onPress?: () => void;
    tehlikeli?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.satir,
        { borderBottomColor: tema.colors.sinir },
      ]}
      accessibilityRole="button"
      accessibilityLabel={etiket}
    >
      <Text
        style={[
          styles.satirEtiket,
          {
            color: tehlikeli ? tema.colors.tehlike : tema.colors.yaziBaslik,
          },
        ]}
      >
        {etiket}
      </Text>
      {deger && (
        <Text style={[styles.satirDeger, { color: tema.colors.yaziIkincil }]}>
          {deger}
        </Text>
      )}
    </Pressable>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tema.colors.arka }]}
      contentContainerStyle={styles.icerik}
    >
      {/* Profil fotoğrafı */}
      <View style={styles.profil}>
        <Pressable
          onPress={fotoDegistir}
          accessibilityRole="button"
          accessibilityLabel={t('profil.fotoDegistir')}
        >
          {kullanici?.avatarUrl ? (
            <Image
              source={{ uri: kullanici.avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              accessible={false}
              cachePolicy="memory"
              // Gün 44 — kullanıcının kendi fotoğrafı: oturum boyunca sık görülür ama
              // bir sonraki açılışta zaten güncel hâli sunucudan gelir, diske yazmaya gerek yok
            />
          ) : (
            <View
              style={[styles.avatar, styles.avatarYerTutucu, { backgroundColor: tema.colors.iskelet }]}
              accessible={false}
            >
              <Ionicons name="person" size={48} color={tema.colors.yaziIkincil} />
            </View>
          )}
          <View
            style={[
              styles.fotoDegistirRozet,
              { backgroundColor: tema.colors.birincil },
            ]}
            accessible={false}
          >
            <Text style={styles.rozet}>📷</Text>
          </View>
        </Pressable>

        <Text style={[styles.ad, { color: tema.colors.yaziBaslik }]}>
          {kullanici ? `${kullanici.ad} ${kullanici.soyad}` : 'Misafir'}
        </Text>
        <Text style={[styles.email, { color: tema.colors.yaziIkincil }]}>
          {kullanici?.email ?? ''}
        </Text>
      </View>

      {/* Tema seçimi */}
      <View
        style={[styles.bolum, { backgroundColor: tema.colors.kart }]}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('profil.tema')}
      >
        <Text style={[styles.bolumBaslik, { color: tema.colors.yaziIkincil }]}>
          {t('profil.tema').toUpperCase()}
        </Text>

        {(['acik', 'koyu', 'sistem'] as TemaSecim[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setTemaSecim(s)}
            style={[styles.satir, { borderBottomColor: tema.colors.sinir }]}
            accessibilityRole="radio"
            accessibilityLabel={t(`profil.${s}`)}
            accessibilityState={{ checked: temaSecim === s }}
          >
            <Text style={[styles.satirEtiket, { color: tema.colors.yaziBaslik }]}>
              {t(`profil.${s}`)}
            </Text>
            {temaSecim === s && (
              <Text style={{ color: tema.colors.birincil }}>✓</Text>
            )}
          </Pressable>
        ))}
      </View>

      {/* Dil seçimi */}
      <View
        style={[styles.bolum, { backgroundColor: tema.colors.kart }]}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('profil.dil')}
      >
        <Text style={[styles.bolumBaslik, { color: tema.colors.yaziIkincil }]}>
          {t('profil.dil').toUpperCase()}
        </Text>

        {(['tr', 'en', 'ar'] as Dil[]).map((d) => {
          const bayrak = d === 'tr' ? '🇹🇷' : d === 'en' ? '🇬🇧' : '🇸🇦';
          const etiket =
            d === 'tr' ? t('profil.turkce') : d === 'en' ? t('profil.ingilizce') : t('profil.arapca');

          return (
            <Pressable
              key={d}
              onPress={() => dilDegistir(d)}
              style={[styles.satir, { borderBottomColor: tema.colors.sinir }]}
              accessibilityRole="radio"
              accessibilityLabel={etiket}
              accessibilityState={{ checked: mevcutDil === d }}
            >
              <Text style={[styles.satirEtiket, { color: tema.colors.yaziBaslik }]}>
                {bayrak} {etiket}
              </Text>
              {mevcutDil === d && (
                <Text style={{ color: tema.colors.birincil }}>✓</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Diğer ayarlar */}
      <View style={[styles.bolum, { backgroundColor: tema.colors.kart }]}>
        <Text style={[styles.bolumBaslik, { color: tema.colors.yaziIkincil }]}>
          HESAP
        </Text>
        <AyarSatiri
          etiket={t('profil.bildirimler')}
          deger="İzin Ver"
          onPress={bildirimIzniAl}
        />
        <AyarSatiri etiket={t('profil.kisiselBilgiler')} />
        <AyarSatiri etiket={t('profil.hakkinda')} deger="v1.0.0" />
        <AyarSatiri
          etiket={t('auth.cikis')}
          onPress={cikisYapOnay}
          tehlikeli
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  icerik: { paddingBottom: 40 },
  profil: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    gap: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarYerTutucu: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoDegistirRozet: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rozet: { fontSize: 14 },
  ad: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 14 },
  bolum: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bolumBaslik: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  satir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  satirEtiket: { fontSize: 16 },
  satirDeger: { fontSize: 14 },
});
