// Gün 45 — Zustand store testi: UI üzerinden değil, doğrudan store API'siyle

import { useSepetStore } from '@/store/sepetStore';
import type { Urun } from '@/types';

const mockUrun: Urun = {
  id: '1',
  ad: 'Kablosuz Kulaklık',
  marka: 'SesMarka',
  fiyat: 100,
  gorselUrl: 'https://example.com/urun.jpg',
  aciklama: 'Test ürünü',
  stok: 10,
  kategori: 'elektronik',
  puanlar: [],
  ozellikler: {},
};

// Her testten önce store'u temizle — testler birbirini etkilemesin
beforeEach(() => {
  useSepetStore.setState({ itemlar: [] });
});

test('sepet başlangıçta boş', () => {
  expect(useSepetStore.getState().itemlar).toHaveLength(0);
  expect(useSepetStore.getState().toplamAdet()).toBe(0);
});

test('ekle() sepete yeni ürün ekler', () => {
  useSepetStore.getState().ekle(mockUrun, 2);

  const { itemlar, toplamAdet } = useSepetStore.getState();
  expect(itemlar).toHaveLength(1);
  expect(itemlar[0].adet).toBe(2);
  expect(toplamAdet()).toBe(2);
});

test('aynı ürün tekrar eklenince adet artar, yeni satır oluşmaz', () => {
  useSepetStore.getState().ekle(mockUrun, 1);
  useSepetStore.getState().ekle(mockUrun, 3);

  const { itemlar } = useSepetStore.getState();
  expect(itemlar).toHaveLength(1);
  expect(itemlar[0].adet).toBe(4);
});

test('cikar() ürünü sepetten kaldırır', () => {
  useSepetStore.getState().ekle(mockUrun, 1);
  useSepetStore.getState().cikar(mockUrun.id);

  expect(useSepetStore.getState().itemlar).toHaveLength(0);
});

test('toplamFiyat() indirim varsa indirimli fiyatı hesaplar', () => {
  const indirimliUrun: Urun = { ...mockUrun, fiyat: 100, indirimYuzdesi: 20 };
  useSepetStore.getState().ekle(indirimliUrun, 2);

  expect(useSepetStore.getState().toplamFiyat()).toBe(160); // 100 * 0.8 * 2
});
