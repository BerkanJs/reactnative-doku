import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useUserStore } from '@/store/userStore';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
} from '@/constants/theme';

export default function LoginEkrani() {
  const router = useRouter();
  const sifreRef = useRef<TextInput>(null);
  const girisYap = useUserStore((s) => s.girisYap);

  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [yukleniyorMu, setYukleniyorMu] = useState(false);
  const [hata, setHata] = useState('');

  const handleGiris = async () => {
    if (!email.trim()) { setHata('E-posta adresi gerekli'); return; }
    if (!sifre) { setHata('Şifre gerekli'); return; }
    setHata('');
    setYukleniyorMu(true);

    // Mock auth — Gün 19'da gerçek API ile değiştirilecek
    await new Promise((resolve) => setTimeout(resolve, 800));

    girisYap({
      id: '1',
      isim: email.split('@')[0],
      email,
      avatar: `https://picsum.photos/seed/${email}/200/200`,
    });

    setYukleniyorMu(false);
    // _layout.tsx'teki AuthGuard yönlendirmeyi hallediyor
  };

  return (
    <>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.sayfa}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoAlani}>
            <Text style={styles.logo}>ShopApp</Text>
            <Text style={styles.altBaslik}>Hesabına giriş yap</Text>
          </View>

          <View style={styles.form}>
            {hata ? (
              <View style={styles.hataKutusu}>
                <Text style={styles.hataYazi}>{hata}</Text>
              </View>
            ) : null}

            <View style={styles.inputGrubu}>
              <Text style={styles.etiket}>E-posta</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                placeholderTextColor={COLORS.textDisabled}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => sifreRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGrubu}>
              <Text style={styles.etiket}>Şifre</Text>
              <TextInput
                ref={sifreRef}
                value={sifre}
                onChangeText={setSifre}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textDisabled}
                style={styles.input}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleGiris}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.buton,
                pressed && { opacity: 0.85 },
                yukleniyorMu && styles.butonDisabled,
              ]}
              onPress={handleGiris}
              disabled={yukleniyorMu}
            >
              {yukleniyorMu ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.butonYazi}>Giriş Yap</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => router.push('/(auth)/register')}
              style={styles.kayitLink}
            >
              <Text style={styles.kayitYazi}>
                Hesabın yok mu?{' '}
                <Text style={styles.kayitVurgu}>Kayıt ol</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  sayfa: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xl,
  },
  logoAlani: { alignItems: 'center', marginBottom: SPACING.xxxl },
  logo: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  altBaslik: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  form: { gap: SPACING.lg },
  hataKutusu: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  hataYazi: { color: COLORS.error, fontSize: FONT_SIZE.sm },
  inputGrubu: { gap: SPACING.xs },
  etiket: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    height: 50,
  },
  buton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  butonDisabled: { opacity: 0.6 },
  butonYazi: {
    color: COLORS.white,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
  kayitLink: { alignItems: 'center' },
  kayitYazi: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  kayitVurgu: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
});
