// Gün 9 — TextInput + KeyboardAvoidingView
// Gün 20 — Auth flow: giris → router.replace ile (tabs)
// Gün 35 — React Hook Form + Zod

import { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  Keyboard,
  Alert,
  type TextInput as TextInputType,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useTema } from '@/hooks/useTema';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/services/apiClient';
import { pushTokenKaydet } from '@/services/bildirimServisi';

const girisSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  sifre: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

type GirisVerisi = z.infer<typeof girisSchema>;

export default function GirisEkrani() {
  const { tema } = useTema();
  const { t } = useTranslation();
  const { girisYap } = useAuthStore();
  const sifreRef = useRef<TextInputType>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GirisVerisi>({
    resolver: zodResolver(girisSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (veri: GirisVerisi) => {
    try {
      Keyboard.dismiss();
      // Gerçek API çağrısı — şimdilik mock
      const { data } = await apiClient.post('/auth/login', veri).catch(() => ({
        data: {
          kullanici: {
            id: '1',
            email: veri.email,
            ad: 'Test',
            soyad: 'Kullanıcı',
            adresler: [],
          },
          token: 'mock-token',
          refreshToken: 'mock-refresh',
        },
      }));

      await girisYap(data.kullanici, data.token, data.refreshToken);
      pushTokenKaydet(data.kullanici.id); // fire-and-forget, giriş akışını bekletmesin
      router.replace('/(tabs)');
    } catch (hata) {
      Alert.alert('Hata', 'E-posta veya şifre yanlış');
    }
  };

  const inputStil = [
    styles.input,
    {
      backgroundColor: tema.colors.kart,
      color: tema.colors.yaziBaslik,
      borderColor: tema.colors.sinir,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: tema.colors.arka }]}
    >
      <ScrollView
        contentContainerStyle={styles.icerik}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Başlık */}
        <View style={styles.baslik}>
          <Text style={[styles.logo, { color: tema.colors.birincil }]}>
            ShopApp
          </Text>
          <Text style={[styles.altBaslik, { color: tema.colors.yaziIkincil }]}>
            Hesabına giriş yap
          </Text>
        </View>

        {/* E-posta */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.alan}>
              <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                {t('auth.email')}
              </Text>
              <TextInput
                style={inputStil}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="ornek@email.com"
                placeholderTextColor={tema.colors.yaziTersiyer}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => sifreRef.current?.focus()}
                accessibilityLabel={t('auth.email')}
              />
              {errors.email && (
                <Text style={styles.hata}>{errors.email.message}</Text>
              )}
            </View>
          )}
        />

        {/* Şifre */}
        <Controller
          control={control}
          name="sifre"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.alan}>
              <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                {t('auth.sifre')}
              </Text>
              <TextInput
                ref={sifreRef}
                style={inputStil}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="••••••"
                placeholderTextColor={tema.colors.yaziTersiyer}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                accessibilityLabel={t('auth.sifre')}
              />
              {errors.sifre && (
                <Text style={styles.hata}>{errors.sifre.message}</Text>
              )}
            </View>
          )}
        />

        {/* Şifremi Unuttum */}
        <Pressable
          style={styles.sifremiUnuttum}
          accessibilityRole="link"
          accessibilityLabel={t('auth.sifremiUnuttum')}
        >
          <Text style={[styles.link, { color: tema.colors.birincil }]}>
            {t('auth.sifremiUnuttum')}
          </Text>
        </Pressable>

        {/* Giriş Butonu */}
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={[
            styles.buton,
            { backgroundColor: tema.colors.birincil },
            isSubmitting && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('auth.girisYap')}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          <Text style={styles.butonYazi}>
            {isSubmitting ? 'Giriş yapılıyor...' : t('auth.girisYap')}
          </Text>
        </Pressable>

        {/* Kayıt Ol Linki */}
        <View style={styles.kayitSatir}>
          <Text style={[styles.normalYazi, { color: tema.colors.yaziIkincil }]}>
            {t('auth.hesabinYokMu')}{' '}
          </Text>
          <Link href="/(auth)/kayit" asChild>
            <Pressable accessibilityRole="link">
              <Text style={[styles.link, { color: tema.colors.birincil }]}>
                {t('auth.kayitOl')}
              </Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  icerik: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  baslik: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  altBaslik: {
    fontSize: 16,
    marginTop: 8,
  },
  alan: {
    marginBottom: 16,
  },
  etiket: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  hata: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  sifremiUnuttum: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: 4,
  },
  buton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  butonYazi: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  kayitSatir: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  normalYazi: { fontSize: 15 },
  link: { fontSize: 15, fontWeight: '600' },
});
