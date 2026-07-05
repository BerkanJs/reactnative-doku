// Gün 40 — GraphQL: yorumlar için minimal şema
// Gerçek sunucu yok — ShopApp'in geri kalanındaki KULLAN_MOCK yaklaşımıyla tutarlı olarak
// bu şema yerel olarak MOCK_URUNLER üzerinde çalışır (bkz. services/urunServisi.ts)

import { buildSchema } from 'graphql';
import { MOCK_URUNLER } from '@/constants/mockData';
import type { Puan } from '@/types';

export const semaSDL = `
  type Yorum {
    kullaniciId: ID!
    kullaniciAdi: String!
    puan: Int!
    yorum: String!
    tarih: String!
  }

  type YorumlarSonucu {
    urunId: ID!
    ortalamaPuan: Float!
    yorumlar: [Yorum!]!
  }

  type Query {
    urunYorumlari(urunId: ID!): YorumlarSonucu!
  }

  type Mutation {
    yorumEkle(urunId: ID!, kullaniciAdi: String!, puan: Int!, yorum: String!): Yorum!
  }
`;

export const semaGraf = buildSchema(semaSDL);

function ortalamaHesapla(puanlar: Puan[]): number {
  if (puanlar.length === 0) return 0;
  return puanlar.reduce((t, p) => t + p.puan, 0) / puanlar.length;
}

// Root resolver — graphql-js'in varsayılan alan çözücüsü (property erişimi) ile
// dönen objenin alanları GraphQL tipiyle birebir eşleşiyor, ekstra resolver gerekmiyor.
export const kokDegeri = {
  urunYorumlari: ({ urunId }: { urunId: string }) => {
    const urun = MOCK_URUNLER.find((u) => u.id === urunId);
    const yorumlar = urun?.puanlar ?? [];
    return {
      urunId,
      ortalamaPuan: ortalamaHesapla(yorumlar),
      yorumlar,
    };
  },

  yorumEkle: ({
    urunId,
    kullaniciAdi,
    puan,
    yorum,
  }: {
    urunId: string;
    kullaniciAdi: string;
    puan: number;
    yorum: string;
  }): Puan => {
    const urun = MOCK_URUNLER.find((u) => u.id === urunId);
    if (!urun) throw new Error(`Ürün bulunamadı: ${urunId}`);

    const yeniYorum: Puan = {
      kullaniciId: `mock-${Date.now()}`,
      kullaniciAdi,
      puan,
      yorum,
      tarih: new Date().toISOString(),
    };

    urun.puanlar.push(yeniYorum); // mock veriyi oturum boyunca güncelle
    return yeniYorum;
  },
};
