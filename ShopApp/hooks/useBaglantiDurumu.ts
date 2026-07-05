// Gün 33 — Offline First: NetInfo ile bağlantı durumu
// isConnected: fiziksel bağlantı var mı
// isInternetReachable: gerçekten internet var mı (captive portal gibi durumlar için)

import { useState, useEffect } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface BaglantiDurumu {
  bagliMi: boolean;
  internetVarMi: boolean;
  baglantiTipi: string | null;
}

export function useBaglantiDurumu(): BaglantiDurumu {
  const [durum, setDurum] = useState<BaglantiDurumu>({
    bagliMi: true,
    internetVarMi: true,
    baglantiTipi: null,
  });

  useEffect(() => {
    const aboneliktenCik = NetInfo.addEventListener((state: NetInfoState) => {
      setDurum({
        bagliMi: state.isConnected ?? false,
        internetVarMi: state.isInternetReachable ?? false,
        baglantiTipi: state.type,
      });
    });

    return aboneliktenCik;
  }, []);

  return durum;
}
