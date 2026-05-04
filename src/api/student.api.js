import apiClient from './client';

export const studentAPI = {
  getProfile: () => apiClient.get('/student/profile').then((r) => r.data.data),

  getSchedule: (week) =>
    apiClient.get('/student/schedule', { params: week != null ? { week } : {} }).then((r) => r.data.data),

  getTodaySchedule: () => apiClient.get('/student/schedule/today').then((r) => r.data.data),

  checkInQR: (token, lat, lon) =>
    apiClient.post('/student/attendance/checkin', { token, lat, lon }).then((r) => r.data.data),

  getAttendance: (subject, semester) =>
    apiClient
      .get('/student/attendance', { params: { subject, semester } })
      .then((r) => r.data.data),

  getAttendanceSummary: () =>
    apiClient.get('/student/attendance/summary').then((r) => r.data.data),

  getGrades: (semester) =>
    apiClient.get('/student/grades', { params: semester != null ? { semester } : {} }).then((r) => r.data.data),

  getAssignments: () => apiClient.get('/student/assignments').then((r) => r.data.data),

  submitAssignment: (id, data) =>
    apiClient.post(`/student/assignments/${id}/submit`, data).then((r) => r.data.data),
};
