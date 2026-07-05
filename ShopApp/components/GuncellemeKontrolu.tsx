// Gün 48 — OTA Updates: uygulama açılışında arka planda yeni JS bundle kontrolü
// Development'ta çalışmaz (__DEV__), sadece production build'de anlamlıdır.

import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

export function GuncellemeKontrolu() {
  useEffect(() => {
    async function guncellemeKontrolEt() {
      if (__DEV__) return;

      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();

          Alert.alert(
            'Güncelleme Hazır',
            'Yeni bir versiyon yüklendi. Şimdi uygulamak ister misin?',
            [
              { text: 'Daha Sonra', style: 'cancel' },
              {
                text: 'Yeniden Başlat',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ]
          );
        }
      } catch (hata) {
        // CDN'e ulaşılamazsa (offline) sessizce geç — crash ettirme
        console.log('Güncelleme kontrolü yapılamadı:', hata);
      }
    }

    guncellemeKontrolEt();
  }, []);

  return null;
}
