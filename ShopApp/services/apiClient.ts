// Gün 19 — Axios API katmanı: interceptor, token, timeout
// Gün 22 — Zod ile runtime tip doğrulama

import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

const BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ?? 'https://api.shopapp.example.com';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// İstek interceptor: her isteğe Bearer token ekle
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Yanıt interceptor: 401 → token yenile → tekrar dene
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const orijinalIstek = error.config;

    if (error.response?.status === 401 && !orijinalIstek._yenilendi) {
      orijinalIstek._yenilendi = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        await SecureStore.setItemAsync('access_token', data.accessToken);
        orijinalIstek.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(orijinalIstek);
      } catch {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        // Auth store'u temizle — burada import cycle önlemek için event kullanılabilir
      }
    }

    return Promise.reject(error);
  }
);

// Zod ile API yanıtını doğrula (Gün 22)
export async function guvenliGet<T>(
  url: string,
  sema: z.ZodType<T>,
  params?: Record<string, unknown>
): Promise<T> {
  const { data } = await apiClient.get(url, { params });
  const sonuc = sema.safeParse(data);

  if (!sonuc.success) {
    console.error('API şema hatası:', sonuc.error.issues);
    throw new Error(`API veri formatı geçersiz: ${url}`);
  }

  return sonuc.data;
}
