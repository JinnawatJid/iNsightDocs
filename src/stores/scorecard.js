import { defineStore } from 'pinia';
import { fetchScorecardConfig, updateScorecardConfig } from '../services/api/scorecard';

export const useScorecardStore = defineStore('scorecard', {
    state: () => ({
        activeType: 'new', // 'new' or 'existing'
        configData: null,
        originalConfigStr: null,
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
                return true;
            } catch (err) {
                this.error = err.response?.data?.message || 'Failed to save scorecard.';
                console.error(err);
                return false;
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
