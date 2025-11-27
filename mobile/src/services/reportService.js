import api from '../config/api';

export const reportService = {
  // Create report
  createReport: async (songId, reportType, title, description) => {
    const response = await api.post('/reports', {
      song_id: songId,
      report_type: reportType,
      title,
      description
    });
    return response.data;
  },

  // Get my reports
  getMyReports: async (limit = 50, offset = 0) => {
    const response = await api.get(`/reports/my-reports?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get all reports (admin)
  getAllReports: async (limit = 50, offset = 0, status = null) => {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.append('status', status);
    const response = await api.get(`/reports?${params.toString()}`);
    return response.data;
  },

  // Get artist reports
  getArtistReports: async (limit = 50, offset = 0, status = null) => {
    const params = new URLSearchParams({ limit, offset });
    if (status) params.append('status', status);
    const response = await api.get(`/reports/artist?${params.toString()}`);
    return response.data;
  },

  // Get report by ID
  getReportById: async (reportId) => {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  },

  // Update report status
  updateReportStatus: async (reportId, status, adminResponse = null) => {
    const response = await api.put(`/reports/${reportId}/status`, {
      status,
      admin_response: adminResponse
    });
    return response.data;
  },

  // Get pending count
  getPendingCount: async () => {
    const response = await api.get('/reports/pending-count');
    return response.data;
  }
};

