import apiClient from './client';

export const staffAPI = {
  getProfile: () => apiClient.get('/staff/profile').then((r) => r.data.data),

  updateProfile: (data) => apiClient.put('/staff/profile', data).then((r) => r.data.data),

  getDocuments: () => apiClient.get('/staff/documents').then((r) => r.data.data),

  addDocument: (data) => apiClient.post('/staff/documents', data).then((r) => r.data.data),

  getVacations: () => apiClient.get('/staff/vacations').then((r) => r.data.data),

  requestVacation: (data) => apiClient.post('/staff/vacations', data).then((r) => r.data.data),

  getRewards: () => apiClient.get('/staff/rewards').then((r) => r.data.data),

  getWorkStats: () => apiClient.get('/staff/work-stats').then((r) => r.data.data),

  getTeamStatus: () =>
    apiClient
      .get('/staff/team-status', {
        params: { _t: Date.now() },
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      })
      .then((r) => r.data.data),
};
