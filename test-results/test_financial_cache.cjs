const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { expect } = require('chai');
const sinon = require('sinon');
const { promisify } = require('util');

// Mock dependencies
const dbdCacheService = require('../backend/services/dbdCacheService');
const financialController = require('../backend/controllers/financialController');

// Mock Data
const MOCK_FILES = {
    balance_sheet: {
        buffer: fs.readFileSync(path.join(__dirname, '../backend/controllers/financialController.js')), // Just using a dummy file for buffer
        originalname: 'balance_sheet.xlsx'
    }
};

describe('Financial Controller & Cache Integration', () => {
    let req, res, saveCacheStub, getCacheStub, performAnalysisStub;

    beforeEach(() => {
        // Reset stubs
        sinon.restore();

        req = {
            body: {
                customer_no: 'TEST001',
                customer_name: 'Test Company',
                request_amount: '1000000'
            },
            files: MOCK_FILES
        };

        res = {
            json: sinon.spy(),
            status: sinon.stub().returnsThis()
        };
    });

    it('should save to cache when analyzing new files', async () => {
        // Stub the saveToCache function
        saveCacheStub = sinon.stub(dbdCacheService, 'saveToCache').resolves();

        // Use the real controller logic
        await financialController.analyzeFinancials(req, res);

        // Assertions
        expect(saveCacheStub.calledOnce).to.be.true;
        expect(saveCacheStub.firstCall.args[0]).to.equal('TEST001'); // Check customer code
    });

    it('should analyze from cache correctly', async () => {
        // Stub getCachedFiles
        getCacheStub = sinon.stub(dbdCacheService, 'getCachedFiles').resolves(MOCK_FILES);

        req = {
            body: {
                customer_code: 'TEST001',
                request_amount: '1000000'
            }
        };

        await financialController.analyzeCachedFinancials(req, res);

        expect(getCacheStub.calledOnce).to.be.true;
        expect(res.json.calledOnce).to.be.true;
    });

    it('should return cache status', async () => {
        const checkCacheStub = sinon.stub(dbdCacheService, 'checkCache').resolves({ exists: true, year: '2024' });

        req = { query: { customer_code: 'TEST001' } };

        await financialController.checkCacheStatus(req, res);

        expect(checkCacheStub.calledOnce).to.be.true;
        expect(res.json.firstCall.args[0]).to.deep.equal({ hasCache: true, year: '2024' });
    });
});
