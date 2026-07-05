// Gün 18 — TanStack Query ile API katmanı deseni (mock + gerçek API arasında geçiş)

import { apiClient } from './apiClient';
import type { SepetItem } from '@/types';

const KULLAN_MOCK = true;

export interface SiparisOlusturSonucu {
  siparisId: string;
}

export async function siparisOlustur(
  itemlar: SepetItem[],
  toplamTutar: number
): Promise<SiparisOlusturSonucu> {
  if (KULLAN_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { siparisId: `SP${Math.floor(1000 + Math.random() * 9000)}` };
  }

  const { data } = await apiClient.post('/siparisler', { itemlar, toplamTutar });
  return data;
}
