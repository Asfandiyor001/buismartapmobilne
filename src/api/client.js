import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateTo } from '../../navigation/ref';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    'cloudflare-skip-browser-warning': 'true',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('biu_token');
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
      await AsyncStorage.multiRemove(['biu_token', 'biu_user']);
      navigateTo('Login');
    }
    if (error.response) {
      throw error.response.data;
    }
    throw { message: "Internet aloqasi yo'q" };
  },
);

export default apiClient;
