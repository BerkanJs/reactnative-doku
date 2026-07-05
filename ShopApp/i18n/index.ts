// Gün 39 — i18next + react-i18next + expo-localization
// Cihaz dilini otomatik algıla, Türkçe/İngilizce arası geçiş

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import trCommon from './locales/tr/common.json';
import enCommon from './locales/en/common.json';
import arCommon from './locales/ar/common.json';

// Gün 39 — RTL dilleri: Arapça, İbranice, Farsça, Urduca
export const RTL_DILLER = ['ar', 'he', 'fa', 'ur'];

const desteklenenDiller = ['tr', 'en', 'ar'];
const cihazDili = getLocales()[0]?.languageCode ?? 'tr';
const baslangicDili = desteklenenDiller.includes(cihazDili) ? cihazDili : 'tr';

i18n.use(initReactI18next).init({
  resources: {
    tr: { common: trCommon },
    en: { common: enCommon },
    ar: { common: arCommon },
  },
  lng: baslangicDili,
  fallbackLng: 'tr',
  defaultNS: 'common',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
