// Gün 39 — Localization: para, tarih ve sayı formatı
// Intl API — platform native format kurallarını kullanır

import { useMemo } from 'react';
import { getLocales } from 'expo-localization';

export function useFormat() {
  const locale = getLocales()[0]?.languageTag ?? 'tr-TR';

  const paraFormat = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: locale.startsWith('tr') ? 'TRY' : 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const sayiFormat = useMemo(
    () => new Intl.NumberFormat(locale),
    [locale]
  );

  const tarihFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [locale]
  );

  const kisaTarihFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    [locale]
  );

  return {
    // "54.999 ₺" veya "$54,999"
    paraFormula: (fiyat: number) => paraFormat.format(fiyat),
    // "1.234"
    sayiFormula: (sayi: number) => sayiFormat.format(sayi),
    // "15 Ocak 2025"
    tarihFormula: (tarih: string | Date) =>
      tarihFormat.format(typeof tarih === 'string' ? new Date(tarih) : tarih),
    // "15.01.2025"
    kisaTarihFormula: (tarih: string | Date) =>
      kisaTarihFormat.format(typeof tarih === 'string' ? new Date(tarih) : tarih),
  };
}
