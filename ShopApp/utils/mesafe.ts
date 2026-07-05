// Gün 30 — Konum: iki koordinat arası mesafe (Haversine formülü)
// expo-location mesafe hesabı sunmuyor, kendimiz yazıyoruz

export function metreCinsindenMesafe(
  enlem1: number,
  boylam1: number,
  enlem2: number,
  boylam2: number
): number {
  const R = 6371000; // dünya yarıçapı (metre)
  const φ1 = (enlem1 * Math.PI) / 180;
  const φ2 = (enlem2 * Math.PI) / 180;
  const Δφ = ((enlem2 - enlem1) * Math.PI) / 180;
  const Δλ = ((boylam2 - boylam1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface Magaza {
  id: string;
  ad: string;
  enlem: number;
  boylam: number;
}

// ShopApp mağazaları — gerçek projede API'den gelir
export const MAGAZALAR: Magaza[] = [
  { id: '1', ad: 'Kadıköy', enlem: 40.9902, boylam: 29.0233 },
  { id: '2', ad: 'Beşiktaş', enlem: 41.0435, boylam: 29.004 },
  { id: '3', ad: 'Şişli', enlem: 41.0602, boylam: 28.9877 },
];

export function enYakinMagazaBul(
  kullaniciEnlem: number,
  kullaniciBoylam: number,
  magazalar: Magaza[] = MAGAZALAR
): { magaza: Magaza; mesafeMetre: number } | null {
  if (magazalar.length === 0) return null;

  const siraliMagazalar = [...magazalar]
    .map((magaza) => ({
      magaza,
      mesafeMetre: metreCinsindenMesafe(
        kullaniciEnlem,
        kullaniciBoylam,
        magaza.enlem,
        magaza.boylam
      ),
    }))
    .sort((a, b) => a.mesafeMetre - b.mesafeMetre);

  return siraliMagazalar[0];
}
