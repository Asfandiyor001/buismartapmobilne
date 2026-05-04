import apiClient from './client';

/**
 * Bildirishnomalar API.
 * Har bir so‘rovda `Authorization: Bearer <token>` client interceptor orqali yuboriladi.
 */
export const notificationAPI = {
  /**
   * GET /api/notifications — faqat joriy foydalanuvchining xabarlari (server JWT bo‘yicha).
   * @param {number} [limit=100]
   * @param {number} [offset=0]
   */
  getAll: (limit = 100, offset = 0) =>
    apiClient
      .get('/notifications', { params: { limit, offset } })
      .then((r) => r.data.data),

  /** PUT /api/notifications/:id/read */
  markRead: (id) =>
    apiClient.put(`/notifications/${id}/read`).then((r) => r.data.data),

  /** PUT /api/notifications/read-all */
  markAllRead: () =>
    apiClient.put('/notifications/read-all').then((r) => r.data.data),

  delete: (id) =>
    apiClient.delete(`/notifications/${id}`).then((r) => r.data.data),
};
