
const axios = require('axios');
const fs = require('fs');

// Mock function to simulate search
const searchTest = async () => {
    try {
        const response = await axios.get('http://localhost:3000/api/customers/search?q=40035RB');
        console.log('Search Results:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Search failed:', error.message);
    }
};

searchTest();
