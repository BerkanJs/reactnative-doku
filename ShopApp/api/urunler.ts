import { MOCK_URUNLER } from '@/constants/mockData';
import type { Urun } from '@/types';

const gecikme = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function tumUrunlerGetir(): Promise<Urun[]> {
  await gecikme(700);
  return MOCK_URUNLER;
}

export async function urunDetayGetir(id: string): Promise<Urun> {
  await gecikme(300);
  const urun = MOCK_URUNLER.find((u) => u.id === id);
  if (!urun) throw new Error(`Ürün bulunamadı (id: ${id})`);
  return urun;
}
