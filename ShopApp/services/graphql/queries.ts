// Gün 40 — GraphQL: ürün yorumları için query/mutation tanımları

import { gql } from '@apollo/client';

export const URUN_YORUMLARI_SORGU = gql`
  query UrunYorumlari($urunId: ID!) {
    urunYorumlari(urunId: $urunId) {
      urunId
      ortalamaPuan
      yorumlar {
        kullaniciId
        kullaniciAdi
        puan
        yorum
        tarih
      }
    }
  }
`;

export const YORUM_EKLE_MUTASYONU = gql`
  mutation YorumEkle($urunId: ID!, $kullaniciAdi: String!, $puan: Int!, $yorum: String!) {
    yorumEkle(urunId: $urunId, kullaniciAdi: $kullaniciAdi, puan: $puan, yorum: $yorum) {
      kullaniciId
      kullaniciAdi
      puan
      yorum
      tarih
    }
  }
`;
