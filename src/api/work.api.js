import apiClient from './client';

export const workAPI = {
  checkIn: (buildingId, lat, lon) =>
    apiClient.post('/work/checkin', { buildingId, lat, lon }).then((r) => r.data.data),

  checkOut: (lat, lon) =>
    apiClient.post('/work/checkout', { lat, lon }).then((r) => r.data.data),

  getToday: () => apiClient.get('/work/today').then((r) => r.data.data),

  getWeek: (from) =>
    apiClient.get('/work/week', { params: from != null ? { from } : {} }).then((r) => r.data.data),

  getMonth: (year, month) =>
    apiClient.get('/work/month', { params: { year, month } }).then((r) => r.data.data),

  getActive: () => apiClient.get('/work/active').then((r) => r.data.data),

  ping: (lat, lon, accuracy) =>
    apiClient.post('/work/ping', { lat, lon, accuracy }),
};
