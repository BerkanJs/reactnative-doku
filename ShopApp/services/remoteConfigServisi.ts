// Gün 50 — Remote Config: kod değiştirmeden, App Store'a gitmeden davranışı değiştir
// Aynı native-modül kısıtı (bkz. firebaseServisi.ts): dinamik import + try/catch,
// Expo Go'da hata sessizce yutulur ve varsayılanlar kullanılır.

// Firebase'e ulaşılamazsa (offline, Expo Go) bu değerler kullanılır — güvenlik ağı
const VARSAYILANLAR = {
  maksimum_sepet_adedi: 10,
  yeni_odeme_akisi_aktif: false,
};

// fetchAndActivate() ile gelen değer burada önbelleğe alınır — senkron okuma
// (Zustand action'ları senkron olduğu için native modülü orada tekrar sorgulayamayız)
let onbellek = { ...VARSAYILANLAR };

export async function remoteConfigYukle() {
  try {
    const remoteConfig = require('@react-native-firebase/remote-config').default;
    const config = remoteConfig();
    await config.setDefaults(VARSAYILANLAR);
    await config.setConfigSettings({
      minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000, // prod: 1 saat, dev: her zaman taze
    });
    await config.fetchAndActivate();

    onbellek = {
      maksimum_sepet_adedi: config.getValue('maksimum_sepet_adedi').asNumber(),
      yeni_odeme_akisi_aktif: config.getValue('yeni_odeme_akisi_aktif').asBoolean(),
    };
  } catch (hata) {
    console.warn('Remote Config yüklenemedi, varsayılan değerler kullanılıyor:', hata);
  }
}

export function maksimumSepetAdedi(): number {
  return onbellek.maksimum_sepet_adedi;
}
