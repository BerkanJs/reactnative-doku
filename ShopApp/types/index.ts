// ShopApp — Merkezi tip tanımları (Gün 22: TypeScript Derinlik)

// ─── Ürün ────────────────────────────────────────────────────────────────────

export interface Urun {
  id: string;
  ad: string;
  marka: string;
  fiyat: number;
  indirimYuzdesi?: number;
  gorselUrl: string;
  aciklama: string;
  stok: number;
  kategori: Kategori;
  puanlar: Puan[];
  ozellikler: Record<string, string>;
}

export interface Puan {
  kullaniciId: string;
  kullaniciAdi: string;
  puan: number;           // 1-5
  yorum: string;
  tarih: string;          // ISO 8601
}

export const KATEGORILER = [
  'elektronik',
  'giyim',
  'kitap',
  'mutfak',
  'spor',
  'kozmetik',
] as const;

export type Kategori = (typeof KATEGORILER)[number];

export const SIRALAMA_TIPLERI = [
  'varsayilan',
  'ucuzdan-pahaliya',
  'pahalidan-ucuya',
  'sadece-indirimli',
] as const;

export type SiralamaKey = (typeof SIRALAMA_TIPLERI)[number];

// Fiyat hesap yardımcıları
export function indirimliFilya(urun: Urun): number {
  if (!urun.indirimYuzdesi) return urun.fiyat;
  return urun.fiyat * (1 - urun.indirimYuzdesi / 100);
}

export function ortalamanPuan(urun: Urun): number {
  if (urun.puanlar.length === 0) return 0;
  const toplam = urun.puanlar.reduce((t, p) => t + p.puan, 0);
  return toplam / urun.puanlar.length;
}

// ─── Sepet ───────────────────────────────────────────────────────────────────

export interface SepetItem {
  urun: Urun;
  adet: number;
}

export interface Sepet {
  itemlar: SepetItem[];
  toplamFiyat: number;
  toplamAdet: number;
}

// ─── Kullanıcı / Auth ─────────────────────────────────────────────────────────

export interface Kullanici {
  id: string;
  email: string;
  ad: string;
  soyad: string;
  avatarUrl?: string;
  adresler: Adres[];
}

export interface Adres {
  id: string;
  baslik: string;       // "Ev", "İş" vb.
  satir1: string;
  satir2?: string;
  ilce: string;
  il: string;
  postaKodu: string;
  ulke: string;
  varsayilan: boolean;
}

// ─── Sipariş ─────────────────────────────────────────────────────────────────

export type SiparisDurumu =
  | 'beklemede'
  | 'onaylandi'
  | 'hazirlaniyor'
  | 'kargoda'
  | 'teslim-edildi'
  | 'iptal-edildi';

export interface Siparis {
  id: string;
  tarih: string;
  durum: SiparisDurumu;
  itemlar: SepetItem[];
  toplamTutar: number;
  kargoBedeli: number;
  adres: Adres;
  odemeYontemi: string;
}

// ─── API / Network ───────────────────────────────────────────────────────────

// Discriminated union — "hangi durumda olduğumu söyle" (Gün 22)
export type ApiSonucu<T> =
  | { durum: 'yukleniyor' }
  | { durum: 'basarili'; veri: T }
  | { durum: 'hata'; mesaj: string; kod: number };

export interface SayfalamaParams {
  sayfa: number;
  sayfaBoyutu: number;
  kategori?: Kategori;
  siralama?: SiralamaKey;
  aramaMetni?: string;
}

export interface SayfalamaYaniti<T> {
  veri: T[];
  toplamSayfa: number;
  toplamAdet: number;
  mevcutSayfa: number;
}

// ─── Ödeme Formu ─────────────────────────────────────────────────────────────

export interface OdemeFormVerisi {
  kartSahibi: string;
  kartNumarasi: string;
  sonKullanma: string;
  cvv: string;
  adresSatir1: string;
  sehir: string;
  postaKodu: string;
}

// ─── Bildirim ────────────────────────────────────────────────────────────────

export type BildirimTipi = 'siparis' | 'indirim' | 'stok' | 'genel';

export interface BildirimData {
  tip: BildirimTipi;
  siparisId?: string;
  urunId?: string;
  ekran?: string;
  ekranParametreleri?: Record<string, string>;
}

// ─── Utility types ───────────────────────────────────────────────────────────

export type UrunOzet = Pick<Urun, 'id' | 'ad' | 'marka' | 'fiyat' | 'gorselUrl' | 'indirimYuzdesi'>;

export type UrunGuncelle = Partial<Omit<Urun, 'id'>>;

export type SiparisOzet = Pick<Siparis, 'id' | 'tarih' | 'durum' | 'toplamTutar'>;
