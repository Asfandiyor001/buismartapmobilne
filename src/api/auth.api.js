import apiClient from './client';

export const authAPI = {
  login: (phone, password) =>
    apiClient.post('/auth/login', { phone, password }).then((r) => r.data.data),

  biometricLogin: (userId, bioKey) =>
    apiClient.post('/auth/biometric', { userId, bioKey }).then((r) => r.data.data),

  logout: () => apiClient.post('/auth/logout').then((r) => r.data.data),

  changePassword: (oldPassword, newPassword) =>
    apiClient
      .put('/auth/change-password', { oldPass: oldPassword, newPass: newPassword })
      .then((r) => r.data.data),
};
