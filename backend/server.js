const express = require('express');
const cors = require('cors');
const path = require('path');
const invoiceRoutes = require('./routes/invoiceRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/invoices', invoiceRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Simple health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
