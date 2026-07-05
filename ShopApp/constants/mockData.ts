// Gün 22 — as const ile literal tipler
// Geliştirme aşamasında kullanılacak mock veriler

import type { Urun, Kategori } from '@/types';

export const KATEGORILER = [
  'elektronik',
  'giyim',
  'kitap',
  'mutfak',
  'spor',
  'kozmetik',
] as const satisfies readonly Kategori[];

export const SIRALAMA_TIPLERI = [
  'varsayilan',
  'ucuzdan-pahaliya',
  'pahalidan-ucuya',
  'sadece-indirimli',
] as const;

export type SiralamaKey = (typeof SIRALAMA_TIPLERI)[number];

export const MOCK_URUNLER: Urun[] = [
  {
    id: '1',
    ad: 'iPhone 15 Pro',
    marka: 'Apple',
    fiyat: 54999,
    indirimYuzdesi: 10,
    gorselUrl: 'https://picsum.photos/seed/iphone/400/400',
    aciklama: 'Titanium tasarım, A17 Pro çip, ProRAW ve ProRes video desteği.',
    stok: 15,
    kategori: 'elektronik',
    puanlar: [
      { kullaniciId: 'u1', kullaniciAdi: 'Ahmet Y.', puan: 5, yorum: 'Harika kamera!', tarih: '2025-01-15' },
      { kullaniciId: 'u2', kullaniciAdi: 'Fatma K.', puan: 4, yorum: 'Biraz pahalı ama değer.', tarih: '2025-01-20' },
    ],
    ozellikler: { 'Ekran': '6.1"', 'Ram': '8 GB', 'Depolama': '256 GB', 'Renk': 'Doğal Titanyum' },
  },
  {
    id: '2',
    ad: 'Samsung Galaxy S24 Ultra',
    marka: 'Samsung',
    fiyat: 49999,
    indirimYuzdesi: 15,
    gorselUrl: 'https://picsum.photos/seed/samsung/400/400',
    aciklama: '200 MP kamera, dahili S Pen, yapay zeka özellikleri.',
    stok: 8,
    kategori: 'elektronik',
    puanlar: [
      { kullaniciId: 'u3', kullaniciAdi: 'Mete B.', puan: 5, yorum: 'S Pen çok kullanışlı.', tarih: '2025-02-01' },
    ],
    ozellikler: { 'Ekran': '6.8"', 'Ram': '12 GB', 'Depolama': '512 GB', 'Renk': 'Titanyum Siyah' },
  },
  {
    id: '3',
    ad: 'Nike Air Max 270',
    marka: 'Nike',
    fiyat: 4299,
    gorselUrl: 'https://picsum.photos/seed/nike/400/400',
    aciklama: 'Max Air yastıklaması ile günlük kullanım için ideal spor ayakkabı.',
    stok: 42,
    kategori: 'spor',
    puanlar: [],
    ozellikler: { 'Numara': '42', 'Renk': 'Beyaz/Siyah', 'Materyal': 'Mesh' },
  },
  {
    id: '4',
    ad: 'MacBook Air M3',
    marka: 'Apple',
    fiyat: 44999,
    indirimYuzdesi: 5,
    gorselUrl: 'https://picsum.photos/seed/macbook/400/400',
    aciklama: 'M3 çip, 18 saate kadar pil ömrü, fanless tasarım.',
    stok: 6,
    kategori: 'elektronik',
    puanlar: [
      { kullaniciId: 'u4', kullaniciAdi: 'Zeynep A.', puan: 5, yorum: 'Sessiz ve hızlı, mükemmel.', tarih: '2025-03-10' },
    ],
    ozellikler: { 'Ekran': '15"', 'Ram': '16 GB', 'Depolama': '512 GB SSD', 'Renk': 'Uzay Grisi' },
  },
  {
    id: '5',
    ad: 'Erkek Slim Fit Ceket',
    marka: 'Zara',
    fiyat: 1299,
    indirimYuzdesi: 30,
    gorselUrl: 'https://picsum.photos/seed/jacket/400/400',
    aciklama: 'Modern slim fit kesim, dört mevsim kullanım için uygun.',
    stok: 23,
    kategori: 'giyim',
    puanlar: [],
    ozellikler: { 'Beden': 'M', 'Renk': 'Lacivert', 'Materyal': '%100 Pamuk' },
  },
  {
    id: '6',
    ad: 'Türk Kahvesi Seti',
    marka: 'Mehmet Efendi',
    fiyat: 249,
    gorselUrl: 'https://picsum.photos/seed/coffee/400/400',
    aciklama: '5 farklı aromalı Türk kahvesi koleksiyonu, özel kutu içinde.',
    stok: 100,
    kategori: 'mutfak',
    puanlar: [
      { kullaniciId: 'u5', kullaniciAdi: 'Hasan T.', puan: 4, yorum: 'Hediye için mükemmel.', tarih: '2025-01-05' },
    ],
    ozellikler: { 'İçerik': '5 × 100g', 'Öğütme': 'İnce', 'Menşei': 'Türkiye' },
  },
];

export const ITEM_HEIGHT = 280;
export const NUM_COLUMNS = 2;
export const SAYFA_BOYUTU = 10;
export const ARAMA_GECIKME = 300;

export const SIPARIS_DURUMLARI = {
  beklemede: { etiket: 'Beklemede', renk: '#FF9500' },
  onaylandi: { etiket: 'Onaylandı', renk: '#007AFF' },
  hazirlaniyor: { etiket: 'Hazırlanıyor', renk: '#5AC8FA' },
  kargoda: { etiket: 'Kargoda', renk: '#34C759' },
  'teslim-edildi': { etiket: 'Teslim Edildi', renk: '#30D158' },
  'iptal-edildi': { etiket: 'İptal Edildi', renk: '#FF3B30' },
} as const;
