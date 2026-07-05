// Gün 31 — Push Bildirimleri: sepette ürün bırakılırsa 2 saat sonra hatırlat
// Sepet boşalırsa (veya siparişe dönüşürse) bekleyen hatırlatıcıyı iptal et

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useSepetStore } from '@/store/sepetStore';

const IKI_SAAT = 2 * 60 * 60;

async function bildirimIzniVarMi(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export function useSepetHatirlatici() {
  const sepetAdet = useSepetStore((state) => state.toplamAdet());
  const bildirimIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function guncelle() {
      // Sadece iznimiz varsa zamanla — izin isteme akışı ayrı yerde (profil ekranı)
      if (bildirimIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(bildirimIdRef.current);
        bildirimIdRef.current = null;
      }

      if (sepetAdet === 0) return;
      if (!(await bildirimIzniVarMi())) return;

      bildirimIdRef.current = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Sepetini Unutma! 🛒',
          body: `Sepetinde ${sepetAdet} ürün var, hâlâ seni bekliyor.`,
          data: { ekran: 'sepet' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: IKI_SAAT,
          repeats: false,
          channelId: 'kampanyalar',
        },
      });
    }

    guncelle();
  }, [sepetAdet]);
}
