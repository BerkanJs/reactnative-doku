import { useQuery } from '@tanstack/react-query';
import { tumUrunlerGetir, urunDetayGetir } from '@/api/urunler';

export function useUrunler() {
  return useQuery({
    queryKey: ['urunler'],
    queryFn: tumUrunlerGetir,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUrunDetay(id: string) {
  return useQuery({
    queryKey: ['urunler', id],
    queryFn: () => urunDetayGetir(id),
    staleTime: 5 * 60 * 1000,
  });
}
