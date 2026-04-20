const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const logger = require('../utils/logger');

const bindRoute = (method, routePath, handlerName) => {
	const handler = customerController[handlerName];
	if (typeof handler !== 'function') {
		logger.error(
			`[customerRoutes] Missing handler '${handlerName}'. Exported keys: ${Object.keys(customerController).join(', ')}`
		);
		router[method](routePath, (req, res) => {
			res.status(500).json({
				error: `Route handler '${handlerName}' is not configured correctly`
			});
		});
		return;
	}

	router[method](routePath, handler);
};

bindRoute('get', '/search', 'searchCustomers');
bindRoute('get', '/by-branch', 'searchCustomersByBranch');
bindRoute('get', '/suggestions', 'getSuggestions');
bindRoute('get', '/check-credit-by-vat', 'checkCreditByVat');
bindRoute('patch', '/:id', 'updateCustomer');

module.exports = router;
