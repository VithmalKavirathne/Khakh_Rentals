import axios from 'axios';

// Base URL of the backend API.
// In production (Vercel) set VITE_API_URL to your Render backend URL,
// e.g. https://khakh-rentals-api.onrender.com
// Locally it falls back to the dev backend.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Send cookies / auth credentials consistently on every request so that
// session-based auth keeps working across the Vercel <-> Render origins.
axios.defaults.withCredentials = true;
