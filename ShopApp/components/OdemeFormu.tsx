// Gün 35 — React Hook Form + Zod: ödeme formu
// Controller zorunlu (RN native input'lar ref desteklemez)
// returnKeyType ile klavye zinciri, KeyboardAvoidingView ile kayma önleme

import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Keyboard,
  type TextInput as TextInputType,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTema } from '@/hooks/useTema';
import { TeslimatAdresi } from '@/components/TeslimatAdresi';

const odemeSchema = z.object({
  kartSahibi: z.string().min(3, 'En az 3 karakter'),
  kartNumarasi: z
    .string()
    .regex(/^\d{4} \d{4} \d{4} \d{4}$/, 'Geçerli kart numarası girin'),
  sonKullanma: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'AA/YY formatında girin'),
  cvv: z.string().regex(/^\d{3,4}$/, 'CVV 3 veya 4 haneli olmalı'),
  adresSatir1: z.string().min(5, 'Adres zorunlu'),
  sehir: z.string().min(2, 'Şehir zorunlu'),
  postaKodu: z.string().regex(/^\d{5}$/, '5 haneli posta kodu'),
});

type OdemeVerisi = z.infer<typeof odemeSchema>;

interface Props {
  onSubmit: (veri: OdemeVerisi) => void;
  gonderiliyor?: boolean;
}

function kartNumarasiFormula(deger: string): string {
  const sadeceSayi = deger.replace(/\D/g, '').slice(0, 16);
  return sadeceSayi.replace(/(.{4})/g, '$1 ').trim();
}

export function OdemeFormu({ onSubmit, gonderiliyor = false }: Props) {
  const { tema } = useTema();

  // Klavye zinciri için ref'ler (Gün 35)
  const kartSahibiRef = useRef<TextInputType>(null);
  const kartNoRef = useRef<TextInputType>(null);
  const sonKullanmaRef = useRef<TextInputType>(null);
  const cvvRef = useRef<TextInputType>(null);
  const adresRef = useRef<TextInputType>(null);
  const sehirRef = useRef<TextInputType>(null);
  const postaRef = useRef<TextInputType>(null);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OdemeVerisi>({
    resolver: zodResolver(odemeSchema),
    mode: 'onBlur',
  });

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
      style={{ flex: 1 }}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Kart Sahibi */}
        <Controller
          control={control}
          name="kartSahibi"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.alan}>
              <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                Kart Sahibi
              </Text>
              <TextInput
                ref={kartSahibiRef}
                style={inputStil}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Ad Soyad"
                placeholderTextColor={tema.colors.yaziTersiyer}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => kartNoRef.current?.focus()}
                accessibilityLabel="Kart sahibinin adı"
              />
              {errors.kartSahibi && (
                <Text style={styles.hata}>{errors.kartSahibi.message}</Text>
              )}
            </View>
          )}
        />

        {/* Kart Numarası */}
        <Controller
          control={control}
          name="kartNumarasi"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.alan}>
              <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                Kart Numarası
              </Text>
              <TextInput
                ref={kartNoRef}
                style={inputStil}
                value={value}
                onChangeText={(text) => onChange(kartNumarasiFormula(text))}
                onBlur={onBlur}
                placeholder="0000 0000 0000 0000"
                placeholderTextColor={tema.colors.yaziTersiyer}
                keyboardType="numeric"
                maxLength={19}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => sonKullanmaRef.current?.focus()}
                accessibilityLabel="16 haneli kart numarası"
              />
              {errors.kartNumarasi && (
                <Text style={styles.hata}>{errors.kartNumarasi.message}</Text>
              )}
            </View>
          )}
        />

        {/* Son Kullanma + CVV */}
        <View style={styles.satir}>
          <Controller
            control={control}
            name="sonKullanma"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[styles.alan, { flex: 1 }]}>
                <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                  Son Kullanma
                </Text>
                <TextInput
                  ref={sonKullanmaRef}
                  style={inputStil}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="AA/YY"
                  placeholderTextColor={tema.colors.yaziTersiyer}
                  keyboardType="numeric"
                  maxLength={5}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => cvvRef.current?.focus()}
                  accessibilityLabel="Kartın son kullanma tarihi"
                />
                {errors.sonKullanma && (
                  <Text style={styles.hata}>{errors.sonKullanma.message}</Text>
                )}
              </View>
            )}
          />

          <View style={{ width: 12 }} />

          <Controller
            control={control}
            name="cvv"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[styles.alan, { flex: 1 }]}>
                <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                  CVV
                </Text>
                <TextInput
                  ref={cvvRef}
                  style={inputStil}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="000"
                  placeholderTextColor={tema.colors.yaziTersiyer}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => adresRef.current?.focus()}
                  accessibilityLabel="Kartın güvenlik kodu"
                />
                {errors.cvv && (
                  <Text style={styles.hata}>{errors.cvv.message}</Text>
                )}
              </View>
            )}
          />
        </View>

        {/* Konum — Gün 30: teslimat adresini GPS ile otomatik doldur */}
        <TeslimatAdresi
          onAdresSecildi={(adres) => {
            if (adres.tam) setValue('adresSatir1', adres.tam, { shouldValidate: true });
            if (adres.sehir) setValue('sehir', adres.sehir, { shouldValidate: true });
            if (adres.postaKodu) setValue('postaKodu', adres.postaKodu, { shouldValidate: true });
          }}
        />

        {/* Adres */}
        <Controller
          control={control}
          name="adresSatir1"
          render={({ field: { onChange, onBlur, value } }) => (
            <View style={styles.alan}>
              <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                Adres
              </Text>
              <TextInput
                ref={adresRef}
                style={inputStil}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="Cadde, Mahalle, No"
                placeholderTextColor={tema.colors.yaziTersiyer}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => sehirRef.current?.focus()}
                accessibilityLabel="Teslimat adresi"
              />
              {errors.adresSatir1 && (
                <Text style={styles.hata}>{errors.adresSatir1.message}</Text>
              )}
            </View>
          )}
        />

        {/* Şehir + Posta Kodu */}
        <View style={styles.satir}>
          <Controller
            control={control}
            name="sehir"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[styles.alan, { flex: 1 }]}>
                <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                  Şehir
                </Text>
                <TextInput
                  ref={sehirRef}
                  style={inputStil}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="İstanbul"
                  placeholderTextColor={tema.colors.yaziTersiyer}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => postaRef.current?.focus()}
                  accessibilityLabel="Şehir"
                />
                {errors.sehir && (
                  <Text style={styles.hata}>{errors.sehir.message}</Text>
                )}
              </View>
            )}
          />

          <View style={{ width: 12 }} />

          <Controller
            control={control}
            name="postaKodu"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={[styles.alan, { flex: 1 }]}>
                <Text style={[styles.etiket, { color: tema.colors.yaziIkincil }]}>
                  Posta Kodu
                </Text>
                <TextInput
                  ref={postaRef}
                  style={inputStil}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="34000"
                  placeholderTextColor={tema.colors.yaziTersiyer}
                  keyboardType="numeric"
                  maxLength={5}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    handleSubmit(onSubmit)();
                  }}
                  accessibilityLabel="Posta kodu"
                />
                {errors.postaKodu && (
                  <Text style={styles.hata}>{errors.postaKodu.message}</Text>
                )}
              </View>
            )}
          />
        </View>

        {/* Ödeme Butonu */}
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            handleSubmit(onSubmit)();
          }}
          disabled={gonderiliyor}
          style={[
            styles.buton,
            { backgroundColor: tema.colors.birincil },
            gonderiliyor && { opacity: 0.6 },
          ]}
          accessibilityLabel="Ödemeyi tamamla"
          accessibilityRole="button"
          accessibilityState={{ disabled: gonderiliyor, busy: gonderiliyor }}
        >
          <Text style={styles.butonYazi}>
            {gonderiliyor ? 'İşleniyor...' : 'Ödemeyi Tamamla'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  alan: {
    marginBottom: 16,
  },
  etiket: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hata: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
  },
  satir: {
    flexDirection: 'row',
  },
  buton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  butonYazi: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
