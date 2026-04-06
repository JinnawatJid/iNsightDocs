const express = require('express');
const app = express();
const controller = require('./backend/controllers/creditRequestController');
console.log('Project Root defined?', !!controller);
