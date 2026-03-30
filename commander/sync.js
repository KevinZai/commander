'use strict';

// Sync interface — Free tier: local file I/O. Paid tier swaps this for API calls.
// This stub ensures the architecture is ready for cloud sync without building it now.

const state = require('./state');

module.exports = {
  async saveSession(session) {
    state.updateSession(session.id, session);
  },

  async loadSessions(limit = 10) {
    return state.listSessions(limit);
  },

  async syncState(stateData) {
    state.saveState(stateData);
  },

  // Paid tier stubs — no-op in free version
  async pushToCloud(_data) {
    return { synced: false, reason: 'free_tier' };
  },

  async pullFromCloud() {
    return null;
  },

  async getTeamData() {
    return null;
  },
};
