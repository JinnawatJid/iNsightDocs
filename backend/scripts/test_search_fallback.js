const logger = require('../utils/logger');
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/api/customers/search';

const runTest = async () => {
  logger.info('Testing Search Fallback...');

  try {
    // 1. Valid Query (Should be found in DB even if API fails)
    // We use a query known to exist in Customers_rows.csv or DB: e.g. '00001AY' (likely exists) or 'C001'
    // '00001AY' is mentioned in memory.
    const query = '00001AY';
    logger.info(`Searching for: ${query}`);

    const response = await axios.get(API_URL, { params: { q: query } });

    if (response.status === 200) {
      const data = response.data;
      logger.info(`Search successful. Found ${data.length} results.`);

      if (data.length > 0) {
        const firstResult = data[0];
        logger.info(`First Result Name: ${firstResult.customer.name}`);
        logger.info(`Data Source: ${firstResult._source}`);

        if (firstResult._source === 'database') {
            logger.info('PASS: Correctly fell back to database (Sandbox has no VPN to Internal API).');
        } else if (firstResult._source === 'api') {
            logger.info('WARN: Unexpectedly connected to API (Are we in a network with access?). This is fine, but verify fallback manually by disabling network if needed.');
        } else {
            logger.error('FAIL: Source property missing or invalid.');
            process.exit(1);
        }
      } else {
        logger.warn('WARN: No results found. Cannot verify source.');
      }
    } else {
      logger.error(`FAIL: API returned status ${response.status}`);
      process.exit(1);
    }

  } catch (err) {
    logger.error('FAIL: Request failed', err.message);
    process.exit(1);
  }
};

runTest();
