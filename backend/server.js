const express = require('express');
const customerController = require('./controllers/customerController');
const financialController = require('./controllers/financialController');

const app = express();
app.use(express.json());

// Routes
const customerRoutes = require('./routes/customerRoutes');
app.use('/api/customers', customerRoutes);

const financialRoutes = require('./routes/financialRoutes');
app.use('/api/financials', financialRoutes);

app.listen(8080, () => {
  console.log('Backend started on port 8080');
});
