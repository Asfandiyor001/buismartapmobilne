import apiClient from './client';

export const reportAPI = {
  /** Oxirgi yozilgan oylik hisobot (monthly_reports) yoki null */
  fetchMyReport: () =>
    apiClient.get('/staff/my-report').then((r) => r.data.data),

  /** Tanlangan oy uchun hisobot: GET /api/reports/monthly?year=&month= */
  fetchMonthlyReport: (year, month) =>
    apiClient
      .get('/reports/monthly', { params: { year, month } })
      .then((r) => r.data.data),
};
