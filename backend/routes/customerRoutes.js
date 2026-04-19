const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.get('/search', customerController.searchCustomers);
router.get('/by-branch', customerController.searchCustomersByBranch);
router.get('/suggestions', customerController.getSuggestions);
router.get('/check-credit-by-vat', customerController.checkCreditByVat);
router.patch('/:id', customerController.updateCustomer);

module.exports = router;
