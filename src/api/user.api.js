import apiClient from './client';

export const userAPI = {
  fetchMyProfile: () =>
    apiClient.get('/auth/me').then((r) => r.data.data),
};
