// Gün 31 — Push Token: sunucunun cihazı bulması için gereken token

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { apiClient } from './apiClient';

export async function pushTokenAl(): Promise<string | null> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  // Push token için APNs/FCM bağlantısı gerekiyor — sadece fiziksel cihaz veya EAS Build'de çalışır
  if (!Constants.isDevice) {
    console.warn('Push token sadece fiziksel cihazda çalışır (Expo Go/simülatörde çalışmaz)');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data;
}

// Login sonrası çağrılır — sunucu artık bu kullanıcıya push gönderebilir
export async function pushTokenKaydet(kullaniciId: string): Promise<void> {
  const token = await pushTokenAl();
  if (!token) return;

  await apiClient
    .post('/kullanicilar/push-token', { kullaniciId, token })
    .catch(() => {
      // Gerçek sunucu yok — geliştirme ortamında sessizce yut
    });
}
