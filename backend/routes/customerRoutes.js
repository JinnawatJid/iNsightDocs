const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/search', customerController.searchCustomers);
router.get('/suggestions', customerController.getSuggestions);

module.exports = router;
