// Gün 27 — Dark Mode ve Theming
// Token sistemi: sabit renk adı yerine anlamsal isimler kullanılır

export const acikTema = {
  colors: {
    arka: '#F2F2F7',
    kart: '#FFFFFF',
    yaziBaslik: '#000000',
    yaziIkincil: '#6D6D72',
    yaziTersiyer: '#AEAEB2',
    sinir: '#E5E5EA',
    birincil: '#007AFF',
    ikincil: '#5AC8FA',
    basari: '#34C759',
    uyari: '#FF9500',
    tehlike: '#FF3B30',
    iskelet: '#E1E9EE',
    iskeletVurgu: '#F2F8FC',
    overlay: 'rgba(0,0,0,0.5)',
    tab: '#FFFFFF',
    header: '#FFFFFF',
  },
  araliklar: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  yaziStilleri: {
    h1: { fontSize: 32, fontWeight: '700' as const },
    h2: { fontSize: 24, fontWeight: '700' as const },
    h3: { fontSize: 20, fontWeight: '600' as const },
    govde: { fontSize: 16, fontWeight: '400' as const },
    kucuk: { fontSize: 13, fontWeight: '400' as const },
    mikro: { fontSize: 11, fontWeight: '400' as const },
  },
  radii: {
    s: 6,
    m: 12,
    l: 18,
    tam: 9999,
  },
} as const;

export const koyuTema = {
  ...acikTema,
  colors: {
    arka: '#000000',
    kart: '#1C1C1E',
    yaziBaslik: '#FFFFFF',
    yaziIkincil: '#8E8E93',
    yaziTersiyer: '#636366',
    sinir: '#38383A',
    birincil: '#0A84FF',
    ikincil: '#64D2FF',
    basari: '#30D158',
    uyari: '#FF9F0A',
    tehlike: '#FF453A',
    iskelet: '#2C2C2E',
    iskeletVurgu: '#3A3A3C',
    overlay: 'rgba(0,0,0,0.7)',
    tab: '#1C1C1E',
    header: '#1C1C1E',
  },
} as const;

export type TemaRenkleri = Record<keyof typeof acikTema.colors, string>;

export type Tema = {
  colors: TemaRenkleri;
  araliklar: typeof acikTema.araliklar;
  yaziStilleri: typeof acikTema.yaziStilleri;
  radii: typeof acikTema.radii;
};
