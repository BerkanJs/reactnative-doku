import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'https://api.shopapp.dev/v1',
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API →] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API ←] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const mesaj = error.response?.data?.message ?? error.message;
    console.error(`[API ✕] ${mesaj}`);
    return Promise.reject(new Error(mesaj));
  }
);
