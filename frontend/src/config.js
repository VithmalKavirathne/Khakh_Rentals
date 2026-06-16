import axios from 'axios';

// Production (Hostinger/Vercel): set VITE_API_URL to your backend URL, e.g. https://api.yourdomain.com
// Local dev: use relative URLs so Vite proxies /api -> http://localhost:5000
export const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:5000');
axios.defaults.withCredentials = true;
