// Gün 45 — RNTL: bileşen kullanıcı perspektifinden test edilir (internal state değil)
// NOT: bu RNTL sürümünde render() async'tir — await edilmezse `screen` bağlanmadan
// sorgu çağrılır ve "render function has not been called" hatası alınır.

import { render, screen, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '@/components/ProductCard';
import type { Urun } from '@/types';

const mockUrun: Urun = {
  id: '1',
  ad: 'Kablosuz Kulaklık',
  marka: 'SesMarka',
  fiyat: 999,
  gorselUrl: 'https://example.com/urun.jpg',
  aciklama: 'Test ürünü',
  stok: 10,
  kategori: 'elektronik',
  puanlar: [],
  ozellikler: {},
};

test('ürün adını gösterir', async () => {
  await render(<ProductCard urun={mockUrun} onPress={jest.fn()} />);
  expect(screen.getByText('Kablosuz Kulaklık')).toBeVisible();
});

test('karta basınca onPress çağrılır', async () => {
  const onPress = jest.fn();
  await render(<ProductCard urun={mockUrun} onPress={onPress} />);

  fireEvent.press(screen.getByRole('button', { name: /Kablosuz Kulaklık/ }));

  expect(onPress).toHaveBeenCalledTimes(1);
});

test('stokta yoksa "Stokta Yok" overlay görünür', async () => {
  await render(<ProductCard urun={{ ...mockUrun, stok: 0 }} onPress={jest.fn()} />);
  expect(screen.getByText('Stokta Yok')).toBeVisible();
});

test('stok azaldığında düşük stok rozeti görünür', async () => {
  await render(<ProductCard urun={{ ...mockUrun, stok: 3 }} onPress={jest.fn()} />);
  expect(screen.getByText('Son 3 adet!')).toBeVisible();
});

test('stok bol olduğunda düşük stok rozeti görünmez', async () => {
  await render(<ProductCard urun={{ ...mockUrun, stok: 50 }} onPress={jest.fn()} />);
  expect(screen.queryByText(/Son \d+ adet!/)).toBeNull();
});
