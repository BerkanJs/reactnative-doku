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
import { useUserStore } from '@/store/userStore';
import {
  COLORS,
  SPACING,
  FONT_SIZE,
  FONT_WEIGHT,
  BORDER_RADIUS,
} from '@/constants/theme';

export default function RegisterEkrani() {
  const router = useRouter();
  const girisYap = useUserStore((s) => s.girisYap);

  const emailRef = useRef<TextInput>(null);
  const sifreRef = useRef<TextInput>(null);
  const sifreTekrarRef = useRef<TextInput>(null);

  const [isim, setIsim] = useState('');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreTekrar, setSifreTekrar] = useState('');
  const [yukleniyorMu, setYukleniyorMu] = useState(false);
  const [hata, setHata] = useState('');

  const handleKayit = async () => {
    if (!isim.trim()) { setHata('İsim gerekli'); return; }
    if (!email.trim()) { setHata('E-posta gerekli'); return; }
    if (sifre.length < 6) { setHata('Şifre en az 6 karakter olmalı'); return; }
    if (sifre !== sifreTekrar) { setHata('Şifreler eşleşmiyor'); return; }

    setHata('');
    setYukleniyorMu(true);

    await new Promise((resolve) => setTimeout(resolve, 800));

    girisYap({
      id: Date.now().toString(),
      isim,
      email,
      avatar: `https://picsum.photos/seed/${email}/200/200`,
    });

    setYukleniyorMu(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.sayfa}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          {hata ? (
            <View style={styles.hataKutusu}>
              <Text style={styles.hataYazi}>{hata}</Text>
            </View>
          ) : null}

          <View style={styles.inputGrubu}>
            <Text style={styles.etiket}>İsim Soyisim</Text>
            <TextInput
              value={isim}
              onChangeText={setIsim}
              placeholder="Adınız Soyadınız"
              placeholderTextColor={COLORS.textDisabled}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </View>

          <View style={styles.inputGrubu}>
            <Text style={styles.etiket}>E-posta</Text>
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@email.com"
              placeholderTextColor={COLORS.textDisabled}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
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
              placeholder="En az 6 karakter"
              placeholderTextColor={COLORS.textDisabled}
              style={styles.input}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => sifreTekrarRef.current?.focus()}
            />
          </View>

          <View style={styles.inputGrubu}>
            <Text style={styles.etiket}>Şifre Tekrar</Text>
            <TextInput
              ref={sifreTekrarRef}
              value={sifreTekrar}
              onChangeText={setSifreTekrar}
              placeholder="Şifrenizi tekrar girin"
              placeholderTextColor={COLORS.textDisabled}
              style={styles.input}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleKayit}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.buton,
              pressed && { opacity: 0.85 },
              yukleniyorMu && styles.butonDisabled,
            ]}
            onPress={handleKayit}
            disabled={yukleniyorMu}
          >
            {yukleniyorMu ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.butonYazi}>Kayıt Ol</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.girisLink}>
            <Text style={styles.girisYazi}>
              Zaten hesabın var mı?{' '}
              <Text style={styles.girisVurgu}>Giriş yap</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sayfa: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
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
  girisLink: { alignItems: 'center' },
  girisYazi: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  girisVurgu: { color: COLORS.primary, fontWeight: FONT_WEIGHT.semibold },
});
