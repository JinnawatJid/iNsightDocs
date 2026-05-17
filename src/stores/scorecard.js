import { defineStore } from 'pinia';
import { fetchScorecardConfig, updateScorecardConfig, listScorecardVersions, fetchScorecardVersion, revertScorecardVersion } from '../services/api/scorecard';

export const useScorecardStore = defineStore('scorecard', {
    state: () => ({
        activeType: 'new', // 'new' or 'existing'
        configData: null,
        originalConfigStr: null,
        versions: [],
        isLoading: false,
        error: null,
    }),

    getters: {
        hasChanges: (state) => {
            if (!state.configData || !state.originalConfigStr) return false;
            return JSON.stringify(state.configData) !== state.originalConfigStr;
        },
        components: (state) => {
             return state.configData ? state.configData.components : {};
        }
    },

    actions: {
        async loadScorecard(type = 'new') {
            this.isLoading = true;
            this.error = null;
            this.activeType = type;

            try {
                const data = await fetchScorecardConfig(type);
                this.configData = JSON.parse(JSON.stringify(data)); // Deep clone
                this.originalConfigStr = JSON.stringify(data);
                // Load versions metadata
                const fetched = await listScorecardVersions(type);
                // Insert an immutable original/default version at the top so users can always revert to baseline
                const originalVersion = {
                    id: 'original',
                    comment: 'เวอร์ชันต้นฉบับ (ค่าเริ่มต้น)',
                    created_at: null
                };
                this.versions = [originalVersion].concat(fetched || []);
            } catch (err) {
                this.error = err.response?.data?.message || 'Failed to load scorecard.';
                console.error(err);
            } finally {
                this.isLoading = false;
            }
        },

        async saveScorecard() {
            this.isLoading = true;
            this.error = null;

            try {
                await updateScorecardConfig(this.activeType, this.configData);
                // Update original state to reflect saved changes
                this.originalConfigStr = JSON.stringify(this.configData);
                // Refresh versions list
                this.versions = await listScorecardVersions(this.activeType);
                return true;
            } catch (err) {
                this.error = err.response?.data?.message || 'Failed to save scorecard.';
                console.error(err);
                return false;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchVersion(id) {
            this.isLoading = true;
            try {
                const data = await fetchScorecardVersion(this.activeType, id);
                return data;
            } catch (err) {
                this.error = err.response?.data?.message || 'Failed to fetch version.';
                console.error(err);
                return null;
            } finally {
                this.isLoading = false;
            }
        },

        async revertVersion(id) {
            this.isLoading = true;
            try {
                const res = await revertScorecardVersion(this.activeType, id);
                // After revert, reload active config and versions
                await this.loadScorecard(this.activeType);
                return res;
            } catch (err) {
                this.error = err.response?.data?.message || 'Failed to revert version.';
                console.error(err);
                return null;
            } finally {
                this.isLoading = false;
            }
        },

        resetChanges() {
            if (this.originalConfigStr) {
                this.configData = JSON.parse(this.originalConfigStr);
            }
        }
    }
});
