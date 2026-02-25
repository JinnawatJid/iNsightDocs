const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/search', customerController.searchCustomers);
router.get('/by-branch', customerController.searchCustomersByBranch);
router.get('/suggestions', customerController.getSuggestions);
router.patch('/:id', customerController.updateCustomer);

module.exports = router;
