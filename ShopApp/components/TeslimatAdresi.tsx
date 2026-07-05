// Gün 30 — Konum: "Konumumu Kullan" ile teslimat adresi tespiti
// Foreground izin → getCurrentPositionAsync → reverseGeocodeAsync

import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTema } from '@/hooks/useTema';

export interface KonumAdresi {
  tam: string;
  sehir: string;
  postaKodu: string;
  enlem: number;
  boylam: number;
}

interface Props {
  onAdresSecildi: (adres: KonumAdresi) => void;
}

export function TeslimatAdresi({ onAdresSecildi }: Props) {
  const { tema } = useTema();
  const [yukleniyor, setYukleniyor] = useState(false);
  const [adres, setAdres] = useState<string | null>(null);

  async function konumKullan() {
    setYukleniyor(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Konum İzni',
          'Teslimat adresi tespiti için konum erişimine izin verin.',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Ayarları Aç', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Teslimat adresi için bina düzeyinde doğruluk yeterli — pil dostu
      const konum = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const sonuclar = await Location.reverseGeocodeAsync({
        latitude: konum.coords.latitude,
        longitude: konum.coords.longitude,
      });

      if (sonuclar.length === 0) {
        Alert.alert('Hata', 'Adres bilgisi alınamadı.');
        return;
      }

      const a = sonuclar[0];
      const tamAdres = [a.street, a.streetNumber, a.district]
        .filter(Boolean)
        .join(', ');

      setAdres(tamAdres || a.city || 'Konum bulundu');
      onAdresSecildi({
        tam: tamAdres,
        sehir: a.city ?? '',
        postaKodu: a.postalCode ?? '',
        enlem: konum.coords.latitude,
        boylam: konum.coords.longitude,
      });
    } catch {
      Alert.alert('Hata', 'Konum alınamadı. GPS açık mı?');
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <View style={styles.konteyner}>
      {adres ? (
        <View style={[styles.adresKutu, { backgroundColor: tema.colors.basari + '1A' }]}>
          <Ionicons name="location" size={18} color={tema.colors.basari} />
          <Text style={[styles.adresYazi, { color: tema.colors.yaziBaslik }]} numberOfLines={2}>
            {adres}
          </Text>
          <Pressable
            onPress={() => setAdres(null)}
            hitSlop={8}
            accessibilityLabel="Adresi değiştir"
            accessibilityRole="button"
          >
            <Text style={[styles.degistirYazi, { color: tema.colors.birincil }]}>Değiştir</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={konumKullan}
          disabled={yukleniyor}
          style={[styles.konumButon, { borderColor: tema.colors.birincil }]}
          accessibilityLabel="Konumumu kullanarak adresi doldur"
          accessibilityRole="button"
          accessibilityState={{ busy: yukleniyor }}
        >
          {yukleniyor ? (
            <ActivityIndicator color={tema.colors.birincil} size="small" />
          ) : (
            <Ionicons name="locate-outline" size={20} color={tema.colors.birincil} />
          )}
          <Text style={[styles.konumButonYazi, { color: tema.colors.birincil }]}>
            {yukleniyor ? 'Konum alınıyor...' : 'Konumumu Kullan'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  konteyner: { marginBottom: 16 },
  adresKutu: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  adresYazi: { flex: 1, fontSize: 14, lineHeight: 19 },
  degistirYazi: { fontSize: 13, fontWeight: '600' },
  konumButon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
  },
  konumButonYazi: { fontSize: 15, fontWeight: '500' },
});
