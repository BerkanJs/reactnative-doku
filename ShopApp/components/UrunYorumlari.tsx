// Gün 40 — GraphQL: ürün yorumlarını çek (useQuery) ve yeni yorum ekle (useMutation)
// REST'teki urunGetir() zaten puanlar'ı döndürüyor ama burada GraphQL'in kendi
// okuma/yazma döngüsünü (useQuery + useMutation + cache invalidation) göstermek için
// yorumlar ayrı bir GraphQL sorgusu/mutasyonu ile yönetiliyor.

import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { useTema } from '@/hooks/useTema';
import { useAuthStore } from '@/store/authStore';
import { URUN_YORUMLARI_SORGU, YORUM_EKLE_MUTASYONU } from '@/services/graphql/queries';

interface Props {
  urunId: string;
}

export function UrunYorumlari({ urunId }: Props) {
  const { tema } = useTema();
  const { kullanici } = useAuthStore();
  const [puan, setPuan] = useState(5);
  const [yorumMetni, setYorumMetni] = useState('');

  const { data, loading, error } = useQuery(URUN_YORUMLARI_SORGU, {
    variables: { urunId },
  });

  const [yorumEkle, { loading: gonderiliyor }] = useMutation(YORUM_EKLE_MUTASYONU, {
    // Mutation sonrası yorum listesini yeniden çek — GraphQL'de invalidation böyle yapılır
    refetchQueries: [{ query: URUN_YORUMLARI_SORGU, variables: { urunId } }],
    onCompleted: () => setYorumMetni(''),
  });

  const gonder = () => {
    if (!yorumMetni.trim()) return;
    yorumEkle({
      variables: {
        urunId,
        kullaniciAdi: kullanici ? `${kullanici.ad} ${kullanici.soyad}` : 'Misafir',
        puan,
        yorum: yorumMetni.trim(),
      },
    });
  };

  if (loading && !data) {
    return <ActivityIndicator color={tema.colors.birincil} style={{ marginVertical: 16 }} />;
  }

  if (error) {
    return (
      <Text style={[styles.hataYazi, { color: tema.colors.tehlike }]}>
        Yorumlar yüklenemedi.
      </Text>
    );
  }

  const yorumlar = data?.urunYorumlari.yorumlar ?? [];

  return (
    <View>
      <Text style={[styles.bolumBaslik, { color: tema.colors.yaziBaslik }]} accessibilityRole="header">
        Yorumlar ({yorumlar.length})
      </Text>

      {yorumlar.length === 0 && (
        <Text style={[styles.bosYazi, { color: tema.colors.yaziIkincil }]}>
          Henüz yorum yapılmamış. İlk yorumu sen yaz!
        </Text>
      )}

      {yorumlar.map((y: { kullaniciId: string; kullaniciAdi: string; puan: number; yorum: string }) => (
        <View
          key={y.kullaniciId}
          style={[styles.yorumKart, { backgroundColor: tema.colors.kart }]}
          accessible
          accessibilityLabel={`${y.kullaniciAdi}, ${y.puan} yıldız, ${y.yorum}`}
        >
          <View style={styles.yorumUst} accessible={false}>
            <Text style={[styles.yorumKullanici, { color: tema.colors.yaziBaslik }]}>
              {y.kullaniciAdi}
            </Text>
            <Text style={styles.yorumYildiz}>{'⭐'.repeat(y.puan)}</Text>
          </View>
          <Text style={[styles.yorumMetin, { color: tema.colors.yaziIkincil }]} accessible={false}>
            {y.yorum}
          </Text>
        </View>
      ))}

      {/* Yorum ekleme formu */}
      <View style={[styles.formKutu, { backgroundColor: tema.colors.kart }]}>
        <Text style={[styles.formBaslik, { color: tema.colors.yaziBaslik }]}>Yorum Yaz</Text>

        <View style={styles.yildizSecici} accessibilityRole="adjustable" accessibilityLabel={`Puan: ${puan} yıldız`}>
          {[1, 2, 3, 4, 5].map((deger) => (
            <Pressable key={deger} onPress={() => setPuan(deger)} hitSlop={4}>
              <Text style={styles.yildizButon}>{deger <= puan ? '⭐' : '☆'}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={yorumMetni}
          onChangeText={setYorumMetni}
          placeholder="Ürün hakkında ne düşünüyorsun?"
          placeholderTextColor={tema.colors.yaziTersiyer}
          multiline
          style={[
            styles.input,
            { color: tema.colors.yaziBaslik, borderColor: tema.colors.sinir, backgroundColor: tema.colors.arka },
          ]}
          accessibilityLabel="Yorum metni"
        />

        <Pressable
          onPress={gonder}
          disabled={gonderiliyor || !yorumMetni.trim()}
          style={[
            styles.gonderButon,
            { backgroundColor: tema.colors.birincil },
            (gonderiliyor || !yorumMetni.trim()) && { opacity: 0.5 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Yorumu gönder"
          accessibilityState={{ disabled: gonderiliyor || !yorumMetni.trim(), busy: gonderiliyor }}
        >
          <Text style={styles.gonderYazi}>{gonderiliyor ? 'Gönderiliyor...' : 'Gönder'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bolumBaslik: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  bosYazi: { fontSize: 14, marginBottom: 12 },
  hataYazi: { fontSize: 14, marginVertical: 12 },
  yorumKart: { borderRadius: 12, padding: 14, marginBottom: 10, gap: 6 },
  yorumUst: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  yorumKullanici: { fontSize: 15, fontWeight: '600' },
  yorumYildiz: { fontSize: 14 },
  yorumMetin: { fontSize: 15, lineHeight: 22 },
  formKutu: { borderRadius: 12, padding: 16, marginTop: 8, gap: 10 },
  formBaslik: { fontSize: 15, fontWeight: '600' },
  yildizSecici: { flexDirection: 'row', gap: 6 },
  yildizButon: { fontSize: 26 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  gonderButon: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  gonderYazi: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
