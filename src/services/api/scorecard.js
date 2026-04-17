import axios from 'axios';

const API_BASE_URL = '/api';

export const fetchScorecardConfig = async (type = 'new') => {
    try {
        const response = await axios.get(`${API_BASE_URL}/scorecard/${type}`);
        return response.data;
    } catch (error) {
        console.error(`[API] Error fetching scorecard (${type}):`, error);
        throw error;
    }
};

export const updateScorecardConfig = async (type, configData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/scorecard/${type}`, configData);
        return response.data;
    } catch (error) {
        console.error(`[API] Error updating scorecard (${type}):`, error);
        throw error;
    }
};
