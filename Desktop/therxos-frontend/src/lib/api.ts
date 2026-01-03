export const analyticsApi = {
  dashboard: async () => ({ data: { pending_opportunities: 0, pending_margin: 0 } }),
  byType: async () => ({ data: [] }),
  performance: async () => ({ data: { changes: {} } }),
  topPatients: async () => ({ data: [] }),
};
