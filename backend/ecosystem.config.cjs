// PM2 config for Hostinger VPS
// From backend folder: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'khakh-rentals-api',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
