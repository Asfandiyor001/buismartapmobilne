import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { navigateTo } from '../../navigation/ref';

// Remote config URL — Vercel da joylashgan, hech qachon o'zgarmaydi
const REMOTE_CONFIG_URL = 'https://buismartapp.vercel.app/config.json';
const FALLBACK_URL = 'https://backend-production-bec7.up.railway.app';

// Ichki o'zgaruvchi — to'g'ridan import qilma, getBaseURL() dan foydalan
let _baseURL = process.env.EXPO_PUBLIC_API_URL || FALLBACK_URL;

/** Hozirgi backend URL ni qaytaradi (remote config dan yangilanadi) */
export function getBaseURL() {
  return _baseURL;
}

/** App yuklanganda bir marta chaqiriladi — Vercel dan URL ni oladi */
export async function loadRemoteConfig() {
  try {
    const res = await fetch(REMOTE_CONFIG_URL, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.apiUrl && typeof data.apiUrl === 'string') {
        _baseURL = data.apiUrl.replace(/\/$/, ''); // trailing slash olib tashlash
        apiClient.defaults.baseURL = `${_baseURL}/api`;
        console.log('[Config] API URL yangilandi:', _baseURL);
      }
    }
  } catch (e) {
    console.log('[Config] Remote config yuklanmadi, fallback ishlatiladi:', _baseURL);
  }
}

const apiClient = axios.create({
  baseURL: `${_baseURL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'cloudflare-skip-browser-warning': 'true',
  },
});

let inMemoryToken = null;

export function setAuthToken(token) {
  inMemoryToken = token || null;
}

export function clearAuthToken() {
  inMemoryToken = null;
}

apiClient.interceptors.request.use(async (config) => {
  let token = inMemoryToken;
  if (!token) {
    token = await SecureStore.getItemAsync('biu_token');
    if (token) inMemoryToken = token;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const reqUrl = error.config?.url || '';
    const isAuthAttempt =
      reqUrl.includes('/auth/login') || reqUrl.includes('/auth/biometric');
    if (error.response?.status === 401 && !isAuthAttempt) {
      inMemoryToken = null;
      await SecureStore.deleteItemAsync('biu_token');
      navigateTo('Login');
    }
    if (error.response) {
      throw error.response.data;
    }
    throw { message: "Internet aloqasi yo'q" };
  },
);

export default apiClient;
