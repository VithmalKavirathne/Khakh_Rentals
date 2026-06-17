# Hostinger Deployment Guide (Frontend + Backend + Supabase)

Deploy **Khakh Rentals** on Hostinger with **Supabase** as the database.

---

## Architecture

```
Browser  →  Hostinger Frontend (React static site)
                ↓  VITE_API_URL
            Hostinger Backend (Node.js / Express)
                ↓  DATABASE_URL
            Supabase PostgreSQL
```

**Recommended Hostinger plans**
- **Business or Cloud Web Hosting** — Node.js Web App in hPanel (easiest)
- **VPS** — full control; best if PDF generation needs extra memory (recommended for Puppeteer)

---

## Part 1 — Supabase (database)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → run the SQL from `backend/db/schema.sql`.
3. Go to **Project Settings → Database**.
4. Copy the **Transaction pooler** URI (port **6543**).
5. Replace `[YOUR-PASSWORD]` with your database password.

Example:
```text
postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

---

## Part 2 — Backend on Hostinger

### Option A — hPanel Node.js Web App (Business / Cloud plan)

1. Log in to **hPanel** → **Websites** → **Add Website**.
2. Choose **Node.js Web App**.
3. Connect **GitHub** → repo `VithmalKavirathne/Khakh_Rentals`.
4. Configure:

| Setting | Value |
|---------|--------|
| **Root directory** | `backend` |
| **Entry file** | `server.js` |
| **Build command** | `npm run build` |
| **Start command** | `npm start` |
| **Node.js version** | 20.x or 22.x |

5. **Environment variables** (Settings → Environment Variables, or upload `.env`):

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Supabase pooler URI |
| `FRONTEND_URL` | `https://yourdomain.com` (your frontend URL) |
| `PORT` | `5000` (or whatever Hostinger assigns) |

6. Click **Deploy**.
7. Connect a subdomain, e.g. **`api.yourdomain.com`**.

**Test:** `https://api.yourdomain.com/api/health` → `{"status":"ok",...}`

### Option B — Hostinger VPS (recommended for PDF invoices)

SSH into your VPS, then:

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Chromium dependencies for PDF generation
sudo apt-get install -y chromium-browser fonts-liberation libasound2 libatk-bridge2.0-0 \
  libgtk-3-0 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils

# Clone your repo
git clone https://github.com/VithmalKavirathne/Khakh_Rentals.git
cd Khakh_Rentals/backend

# Create .env (copy from deploy/hostinger/backend.env.example)
nano .env

npm install
npm start   # test once, Ctrl+C to stop

# Run with PM2 (keeps server running)
sudo npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

**Nginx reverse proxy** — copy `deploy/hostinger/nginx-api.conf.example`, set `api.yourdomain.com`, enable SSL in hPanel.

---

## Part 3 — Frontend on Hostinger

### Option A — hPanel Frontend Web App (output `frontend/dist`) **recommended**

1. **Websites** → your frontend site → **Settings and redeploy**.
2. Connect GitHub repo `VithmalKavirathne/Khakh_Rentals`, branch **`main`**.

| Setting | Value |
|---------|--------|
| **Framework** | React |
| **Root directory** | `./` |
| **Build command** | `npm run build:frontend` |
| **Output directory** | `frontend/dist` |
| **Node.js version** | 22.x |

Do **not** use `npm run postinstall` as the build command — that only installs backend packages and does not build React.

3. **Environment variable (build time):**

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `https://palevioletred-frog-869231.hostingersite.com` (no trailing slash) |

4. **Save** → **Redeploy**. Build log should show `vite build` completing successfully.
5. Hard-refresh (Ctrl+Shift+R) and open `/login`.

### Option A2 — Same output, root directory `frontend`

| Setting | Value |
|---------|--------|
| **Root directory** | `frontend` |
| **Build command** | `npm install && npm run build` |
| **Output directory** | `dist` |

Same `VITE_API_URL` as above. (Hostinger publishes `frontend/dist` — equivalent to this layout.)

### Option A3 — Output root `dist` (alternative)

| Setting | Value |
|---------|--------|
| **Root directory** | `./` |
| **Build command** | `npm install && npm run build` |
| **Output directory** | `dist` |

Root `npm run build` runs Vite then copies `frontend/dist` → `dist`.

### Option B — Manual upload (any Hostinger plan with static hosting)

On your PC:

```bash
cd frontend
# Create .env.production with VITE_API_URL=https://api.yourdomain.com
echo VITE_API_URL=https://api.yourdomain.com > .env.production
npm install
npm run build
```

Upload everything inside **`frontend/dist/`** to **`public_html`** via File Manager or FTP.

---

## Part 4 — Environment variables summary

| Where | Variable | Example |
|-------|----------|---------|
| **Backend** | `DATABASE_URL` | Supabase pooler URI |
| **Backend** | `FRONTEND_URL` | `https://yourdomain.com` |
| **Backend** | `PORT` | `5000` |
| **Frontend (build)** | `VITE_API_URL` | `https://api.yourdomain.com` |

Templates: `deploy/hostinger/backend.env.example` and `deploy/hostinger/frontend.env.example`

---

## Part 5 — Verify everything

1. `https://api.yourdomain.com/api/health` → OK
2. `https://api.yourdomain.com/api/vehicles` → JSON array (may be empty)
3. Open `https://yourdomain.com` → app loads
4. **Vehicles** tab loads without errors
5. Create an invoice → **PDF downloads**

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Frontend can't reach API | Check `VITE_API_URL` and **rebuild** frontend |
| **`No output directory found after build`** | Use build `npm run build:frontend` with output `frontend/dist`, or `npm run build` with output `dist` — not `npm run postinstall` |
| CORS error | `FRONTEND_URL` must exactly match frontend URL (`https://...`) |
| Database error | Use Supabase **pooler** URI (port 6543), correct password |
| PDF fails on VPS | Install Chromium deps (see VPS section) |
| PDF fails on Node.js Web App | Upgrade to VPS or Cloud with more RAM |
| `.env` not in GitHub | Normal — set vars in hPanel manually |

---

## Local development (unchanged)

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

Open http://localhost:5173 — Vite proxies `/api` to localhost:5000.

---

## Stop using Vercel

You can leave the Vercel projects as-is or delete them in the Vercel dashboard. Point your domain DNS to Hostinger instead.
