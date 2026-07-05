// Gün 20 — Kayıt akışı: giris → tabs
// Gün 35 — RHF + Zod: şifre tekrar doğrulama

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

const kayitSchema = z
  .object({
    ad: z.string().min(2, 'Ad en az 2 karakter olmalı'),
    soyad: z.string().min(2, 'Soyad en az 2 karakter olmalı'),
    email: z.string().email('Geçerli bir e-posta girin'),
    sifre: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
    sifreTekrar: z.string(),
  })
  .refine((v) => v.sifre === v.sifreTekrar, {
    message: 'Şifreler eşleşmiyor',
    path: ['sifreTekrar'],
  });

type KayitVerisi = z.infer<typeof kayitSchema>;

export default function KayitEkrani() {
  const { tema } = useTema();
  const { t } = useTranslation();
  const { girisYap } = useAuthStore();

  const soyadRef = useRef<TextInputType>(null);
  const emailRef = useRef<TextInputType>(null);
  const sifreRef = useRef<TextInputType>(null);
  const sifreTekrarRef = useRef<TextInputType>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KayitVerisi>({
    resolver: zodResolver(kayitSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (veri: KayitVerisi) => {
    try {
      Keyboard.dismiss();
      const { data } = await apiClient
        .post('/auth/register', {
          ad: veri.ad,
          soyad: veri.soyad,
          email: veri.email,
          sifre: veri.sifre,
        })
        .catch(() => ({
          data: {
            kullanici: {
              id: '2',
              email: veri.email,
              ad: veri.ad,
              soyad: veri.soyad,
              adresler: [],
            },
            token: 'mock-token',
            refreshToken: 'mock-refresh',
          },
        }));

      await girisYap(data.kullanici, data.token, data.refreshToken);
      router.replace('/(tabs)');
    } catch {
      Alert.alert('Hata', 'Kayıt işlemi başarısız, lütfen tekrar deneyin');
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
        <View style={styles.baslik}>
          <Text style={[styles.logo, { color: tema.colors.birincil }]}>
            ShopApp
          </Text>
          <Text style={[styles.altBaslik, { color: tema.colors.yaziIkincil }]}>
            Yeni hesap oluştur
          </Text>
        </View>

        {/* Ad + Soyad satırı */}
        <View style={styles.satir}>
          <Controller
            control={control}
            name="ad"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[styles.alan, { flex: 1 }]}>
                <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                  {t('auth.ad')}
                </Text>
                <TextInput
                  style={inputStil}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Ad"
                  placeholderTextColor={tema.colors.yaziTersiyer}
                  autoCapitalize="words"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => soyadRef.current?.focus()}
                  accessibilityLabel={t('auth.ad')}
                />
                {errors.ad && (
                  <Text style={styles.hata}>{errors.ad.message}</Text>
                )}
              </View>
            )}
          />
          <View style={{ width: 12 }} />
          <Controller
            control={control}
            name="soyad"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[styles.alan, { flex: 1 }]}>
                <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                  {t('auth.soyad')}
                </Text>
                <TextInput
                  ref={soyadRef}
                  style={inputStil}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Soyad"
                  placeholderTextColor={tema.colors.yaziTersiyer}
                  autoCapitalize="words"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  accessibilityLabel={t('auth.soyad')}
                />
                {errors.soyad && (
                  <Text style={styles.hata}>{errors.soyad.message}</Text>
                )}
              </View>
            )}
          />
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
                ref={emailRef}
                style={inputStil}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="ornek@email.com"
                placeholderTextColor={tema.colors.yaziTersiyer}
                keyboardType="email-address"
                autoCapitalize="none"
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
                placeholder="En az 6 karakter"
                placeholderTextColor={tema.colors.yaziTersiyer}
                secureTextEntry
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => sifreTekrarRef.current?.focus()}
                accessibilityLabel={t('auth.sifre')}
              />
              {errors.sifre && (
                <Text style={styles.hata}>{errors.sifre.message}</Text>
              )}
            </View>
          )}
        />

        {/* Şifre Tekrar */}
        <Controller
          control={control}
          name="sifreTekrar"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.alan}>
              <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                {t('auth.sifreTekrar')}
              </Text>
              <TextInput
                ref={sifreTekrarRef}
                style={inputStil}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Şifreyi tekrar girin"
                placeholderTextColor={tema.colors.yaziTersiyer}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleSubmit(onSubmit)}
                accessibilityLabel={t('auth.sifreTekrar')}
              />
              {errors.sifreTekrar && (
                <Text style={styles.hata}>{errors.sifreTekrar.message}</Text>
              )}
            </View>
          )}
        />

        {/* Kayıt Butonu */}
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          style={[
            styles.buton,
            { backgroundColor: tema.colors.birincil },
            isSubmitting && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t('auth.kayitOl')}
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          <Text style={styles.butonYazi}>
            {isSubmitting ? 'Hesap oluşturuluyor...' : t('auth.kayitOl')}
          </Text>
        </Pressable>

        {/* Giriş Yap Linki */}
        <View style={styles.girisLink}>
          <Text style={[styles.normalYazi, { color: tema.colors.yaziIkincil }]}>
            {t('auth.hesabinVarMi')}{' '}
          </Text>
          <Link href="/(auth)/giris" asChild>
            <Pressable accessibilityRole="link">
              <Text style={[styles.link, { color: tema.colors.birincil }]}>
                {t('auth.girisYap')}
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  baslik: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  altBaslik: { fontSize: 16, marginTop: 8 },
  satir: { flexDirection: 'row' },
  alan: { marginBottom: 16 },
  etiket: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  hata: { color: '#FF3B30', fontSize: 12, marginTop: 4 },
  buton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  butonYazi: { color: '#fff', fontSize: 17, fontWeight: '600' },
  girisLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  normalYazi: { fontSize: 15 },
  link: { fontSize: 15, fontWeight: '600' },
});
