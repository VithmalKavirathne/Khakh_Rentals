const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const invoiceRoutes = require('./routes/invoiceRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed browser origins. Set FRONTEND_URL in production (comma-separated).
// In local dev, also allow any localhost / 127.0.0.1 port (Vite may pick 5173, 5174, etc.).
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
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

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Khakh Rentals API is running',
        status: 'ok',
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
    });
});

// Simple health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Temporary DB connectivity check (uses existing pool; no secrets returned)
app.get('/api/db-test', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.status(200).json({ ok: true, time: result.rows[0].now });
    } catch (error) {
        res.status(500).json({ ok: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
