const express = require('express');
const cors = require('cors');
const path = require('path');
const invoiceRoutes = require('./routes/invoiceRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed browser origins. Set FRONTEND_URL in production (comma-separated to
// allow more than one). Falls back to the local Vite dev server.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (curl, server-to-server) that send no origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/api/invoices', invoiceRoutes);
app.use('/api/vehicles', vehicleRoutes);

// Simple health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
