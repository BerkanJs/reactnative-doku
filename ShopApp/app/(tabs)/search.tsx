import {
  FlatList,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useDebouncedCallback } from 'use-debounce';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ProductCard } from '@/components/ProductCard';
import { SearchBar } from '@/components/SearchBar';
import { MOCK_URUNLER } from '@/constants/mockData';
import { aramaYapildiOlayi } from '@/services/firebaseServisi';
import type { Urun } from '@/types';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';

export default function AramaTab() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [aramaMetni, setAramaMetni] = useState('');

  // Gün 16: useFocusEffect — tab'dan ayrılınca aramanın sıfırlanması.
  // useEffect ile olsaydı sadece ilk render'da çalışırdı.
  // useFocusEffect her Tab değişiminde çalışır.
  useFocusEffect(
    useCallback(() => {
      return () => {
        // cleanup: tab blur olduğunda (başka tab'a geçince) aramaı temizle
        setAramaMetni('');
      };
    }, [])
  );

  const kartGenisligi = (width - SPACING.lg * 2 - SPACING.md) / 2;

  // Gün 50 — Firebase Analytics: her tuş vuruşunda değil, kullanıcı yazmayı bırakınca logla
  const aramaLogla = useDebouncedCallback((metin: string) => {
    if (metin.trim()) aramaYapildiOlayi(metin.trim());
  }, 500);

  useEffect(() => {
    aramaLogla(aramaMetni);
  }, [aramaMetni, aramaLogla]);

  // Tüm ürünlerde anlık arama — index.tsx'ten farkı: sayfalama yok, hepsi aranıyor
  const sonuclar = useMemo(
    () =>
      aramaMetni.trim() === ''
        ? []
        : MOCK_URUNLER.filter((u) =>
            u.ad.toLowerCase().includes(aramaMetni.toLowerCase())
          ),
    [aramaMetni]
  );

  const renderUrun = useCallback(
    ({ item }: { item: Urun }) => (
      <View style={{ width: kartGenisligi }}>
        <ProductCard
          urun={item}
          onPress={() => router.push(`/urun/${item.id}`)}
        />
      </View>
    ),
    [kartGenisligi, router]
  );

  const renderBos = () => {
    if (aramaMetni.trim() === '') {
      return (
        <View style={styles.bosEkran}>
          <Ionicons name="search-outline" size={64} color={COLORS.textDisabled} />
          <Text style={styles.bosBaslik}>Ürün ara</Text>
          <Text style={styles.bosAlt}>
            Marka veya model adı yaz
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.bosEkran}>
        <Ionicons name="sad-outline" size={64} color={COLORS.textDisabled} />
        <Text style={styles.bosBaslik}>Sonuç bulunamadı</Text>
        <Text style={styles.bosAlt}>
          &ldquo;{aramaMetni}&rdquo; ile eşleşen ürün yok
        </Text>
      </View>
    );
  };

  return (
    <FlatList
      data={sonuclar}
      keyExtractor={(item) => item.id}
      renderItem={renderUrun}
      numColumns={2}
      columnWrapperStyle={styles.satirSarmalayici}
      contentContainerStyle={styles.liste}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={() => (
        <SearchBar
          deger={aramaMetni}
          onChange={setAramaMetni}
          placeholder="Marka veya model ara..."
        />
      )}
      ListEmptyComponent={renderBos}
    />
  );
}

const styles = StyleSheet.create({
  liste: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    paddingBottom: SPACING.xl,
  },
  satirSarmalayici: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  bosEkran: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.xxxl,
    gap: SPACING.md,
  },
  bosBaslik: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  bosAlt: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
});
