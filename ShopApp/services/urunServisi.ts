// Gün 18 — TanStack Query ile API katmanı
// Gün 22 — Zod şeması ile runtime doğrulama

import { z } from 'zod';
import { apiClient, guvenliGet } from './apiClient';
import { MOCK_URUNLER, SAYFA_BOYUTU } from '@/constants/mockData';
import { KATEGORILER, type Urun, type SayfalamaParams, type SayfalamaYaniti } from '@/types';

// Zod şemaları (Gün 22)
const PuanSemasi = z.object({
  kullaniciId: z.string(),
  kullaniciAdi: z.string(),
  puan: z.number().min(1).max(5),
  yorum: z.string(),
  tarih: z.string(),
});

const UrunSemasi = z.object({
  id: z.string(),
  ad: z.string(),
  marka: z.string(),
  fiyat: z.number().positive(),
  indirimYuzdesi: z.number().min(0).max(100).optional(),
  gorselUrl: z.string().url(),
  aciklama: z.string(),
  stok: z.number().int().min(0),
  kategori: z.enum(KATEGORILER),
  puanlar: z.array(PuanSemasi),
  ozellikler: z.record(z.string(), z.string()),
});

const UrunListeSemasi = z.object({
  veri: z.array(UrunSemasi),
  toplamSayfa: z.number(),
  toplamAdet: z.number(),
  mevcutSayfa: z.number(),
});

// API çağrıları — geliştirmede mock, prodda gerçek API
const KULLAN_MOCK = true;

export async function urunleriGetir(
  params: SayfalamaParams
): Promise<SayfalamaYaniti<Urun>> {
  if (KULLAN_MOCK) {
    await yavaşlat(600);

    let filtrelenmis = [...MOCK_URUNLER];

    if (params.kategori) {
      filtrelenmis = filtrelenmis.filter((u) => u.kategori === params.kategori);
    }

    if (params.aramaMetni) {
      const metin = params.aramaMetni.toLowerCase();
      filtrelenmis = filtrelenmis.filter(
        (u) =>
          u.ad.toLowerCase().includes(metin) ||
          u.marka.toLowerCase().includes(metin)
      );
    }

    if (params.siralama === 'ucuzdan-pahaliya') {
      filtrelenmis.sort((a, b) => a.fiyat - b.fiyat);
    } else if (params.siralama === 'pahalidan-ucuya') {
      filtrelenmis.sort((a, b) => b.fiyat - a.fiyat);
    } else if (params.siralama === 'sadece-indirimli') {
      filtrelenmis = filtrelenmis.filter((u) => u.indirimYuzdesi);
    }

    const baslangic = (params.sayfa - 1) * SAYFA_BOYUTU;
    const sayfa = filtrelenmis.slice(baslangic, baslangic + SAYFA_BOYUTU);

    return {
      veri: sayfa,
      toplamSayfa: Math.ceil(filtrelenmis.length / SAYFA_BOYUTU),
      toplamAdet: filtrelenmis.length,
      mevcutSayfa: params.sayfa,
    };
  }

  return guvenliGet(
    '/urunler',
    UrunListeSemasi,
    params as unknown as Record<string, unknown>
  );
}

export async function urunGetir(id: string): Promise<Urun> {
  if (KULLAN_MOCK) {
    await yavaşlat(400);
    const urun = MOCK_URUNLER.find((u) => u.id === id);
    if (!urun) throw new Error(`Ürün bulunamadı: ${id}`);
    return urun;
  }

  return guvenliGet(`/urunler/${id}`, UrunSemasi);
}

export async function favorilereEkle(urunId: string): Promise<void> {
  if (KULLAN_MOCK) {
    await yavaşlat(300);
    return;
  }
  await apiClient.post(`/favoriler/${urunId}`);
}

export async function favorilerdenCikar(urunId: string): Promise<void> {
  if (KULLAN_MOCK) {
    await yavaşlat(300);
    return;
  }
  await apiClient.delete(`/favoriler/${urunId}`);
}

function yavaşlat(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
