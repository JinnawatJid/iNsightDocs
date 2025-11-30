const express = require('express');
const router = express.Router();
const creditRequestController = require('../controllers/creditRequestController');

router.post('/', creditRequestController.createCreditRequest);

module.exports = router;
