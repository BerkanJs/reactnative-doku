// Gün 8 — FlatList: getItemLayout, infinite scroll, pull to refresh
// Gün 18 — TanStack Query: useInfiniteQuery
// Gün 26 — Skeleton loading
// Gün 27 — Dark mode
// Gün 43 — FlatList optimizasyonu: React.memo, windowSize

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
  type ListRenderItem,
} from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useDebouncedCallback } from 'use-debounce';
import { useTema } from '@/hooks/useTema';
import { useSepetStore } from '@/store/sepetStore';
import { ProductCard } from '@/components/ProductCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { urunleriGetir } from '@/services/urunServisi';
import { KATEGORILER, ITEM_HEIGHT, ARAMA_GECIKME } from '@/constants/mockData';
import type { Urun, Kategori } from '@/types';

const NUM_COLUMNS = 2;

export default function AnasayfaEkrani() {
  const { tema } = useTema();
  const { t } = useTranslation();
  const { ekle } = useSepetStore();
  const [aramaMetni, setAramaMetni] = useState('');
  const [aramaGercek, setAramaGercek] = useState('');
  const [seciliKategori, setSeciliKategori] = useState<Kategori | undefined>();

  const aramaDebounce = useDebouncedCallback(
    (metin: string) => setAramaGercek(metin),
    ARAMA_GECIKME
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['urunler', aramaGercek, seciliKategori],
    queryFn: ({ pageParam = 1 }) =>
      urunleriGetir({
        sayfa: pageParam as number,
        sayfaBoyutu: 10,
        aramaMetni: aramaGercek,
        kategori: seciliKategori,
      }),
    initialPageParam: 1,
    getNextPageParam: (sonSayfa) =>
      sonSayfa.mevcutSayfa < sonSayfa.toplamSayfa
        ? sonSayfa.mevcutSayfa + 1
        : undefined,
  });

  const urunler = data?.pages.flatMap((s) => s.veri) ?? [];

  const renderUrun: ListRenderItem<Urun> = useCallback(
    ({ item }) => (
      <View style={{ flex: 1, paddingHorizontal: 4 }}>
        <ProductCard
          urun={item}
          onPress={() => router.push(`/urun/${item.id}`)}
          onSepeteEkle={() => ekle(item)}
        />
      </View>
    ),
    [ekle]
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonSatir}>
      {Array.from({ length: NUM_COLUMNS }).map((_, i) => (
        <View key={i} style={{ flex: 1, paddingHorizontal: 4 }}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return renderSkeleton();
  };

  return (
    <View style={[styles.container, { backgroundColor: tema.colors.arka }]}>
      {/* Arama çubuğu */}
      <View
        style={[styles.aramaKutusu, { backgroundColor: tema.colors.kart }]}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={tema.colors.yaziIkincil}
        />
        <TextInput
          style={[styles.aramaInput, { color: tema.colors.yaziBaslik }]}
          value={aramaMetni}
          onChangeText={(metin) => {
            setAramaMetni(metin);
            aramaDebounce(metin);
          }}
          placeholder={t('genel.ara')}
          placeholderTextColor={tema.colors.yaziTersiyer}
          returnKeyType="search"
          accessibilityLabel="Ürün ara"
          accessibilityRole="search"
        />
        {aramaMetni.length > 0 && (
          <Pressable
            onPress={() => {
              setAramaMetni('');
              setAramaGercek('');
            }}
            accessibilityLabel="Aramayı temizle"
            accessibilityRole="button"
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={tema.colors.yaziIkincil}
            />
          </Pressable>
        )}
      </View>

      {/* Kategori filtresi */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.kategoriler}
        contentContainerStyle={styles.kategoriIcerik}
      >
        <Pressable
          onPress={() => setSeciliKategori(undefined)}
          style={[
            styles.kategoriButon,
            {
              backgroundColor: !seciliKategori
                ? tema.colors.birincil
                : tema.colors.kart,
              borderColor: !seciliKategori
                ? tema.colors.birincil
                : tema.colors.sinir,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Tüm kategoriler"
          accessibilityState={{ selected: !seciliKategori }}
        >
          <Text
            style={[
              styles.kategoriYazi,
              { color: !seciliKategori ? '#fff' : tema.colors.yaziBaslik },
            ]}
          >
            Tümü
          </Text>
        </Pressable>

        {KATEGORILER.map((kat) => {
          const secili = seciliKategori === kat;
          return (
            <Pressable
              key={kat}
              onPress={() => setSeciliKategori(secili ? undefined : kat)}
              style={[
                styles.kategoriButon,
                {
                  backgroundColor: secili
                    ? tema.colors.birincil
                    : tema.colors.kart,
                  borderColor: secili
                    ? tema.colors.birincil
                    : tema.colors.sinir,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={kat}
              accessibilityState={{ selected: secili }}
            >
              <Text
                style={[
                  styles.kategoriYazi,
                  { color: secili ? '#fff' : tema.colors.yaziBaslik },
                ]}
              >
                {kat.charAt(0).toUpperCase() + kat.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Ürün listesi */}
      {isLoading ? (
        <ScrollView>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={styles.skeletonSatir}>
              {Array.from({ length: NUM_COLUMNS }).map((_, j) => (
                <View key={j} style={{ flex: 1, paddingHorizontal: 4 }}>
                  <SkeletonCard />
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={urunler}
          renderItem={renderUrun}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.liste}
          columnWrapperStyle={styles.sutunSarici}
          // FlatList optimizasyonları (Gün 43)
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={10}
          removeClippedSubviews
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * Math.floor(index / NUM_COLUMNS),
            index,
          })}
          // Infinite scroll (Gün 8)
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          // Pull to refresh (Gün 16)
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={tema.colors.birincil}
              accessibilityLabel="Yenile"
            />
          }
          ListEmptyComponent={
            <View style={styles.bos}>
              <Text style={[styles.bosYazi, { color: tema.colors.yaziIkincil }]}>
                Ürün bulunamadı
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  aramaKutusu: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  aramaInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  kategoriler: {
    marginBottom: 8,
  },
  kategoriIcerik: {
    paddingHorizontal: 16,
    gap: 8,
  },
  kategoriButon: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  kategoriYazi: {
    fontSize: 14,
    fontWeight: '500',
  },
  liste: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  sutunSarici: {
    gap: 0,
  },
  skeletonSatir: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  bos: {
    alignItems: 'center',
    paddingTop: 80,
  },
  bosYazi: {
    fontSize: 16,
  },
});
