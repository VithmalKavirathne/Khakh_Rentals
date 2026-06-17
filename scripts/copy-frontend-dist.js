const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../frontend/dist');
const dest = path.join(__dirname, '../dist');

if (!fs.existsSync(src)) {
  console.error('ERROR: frontend/dist not found. Frontend build may have failed.');
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log('Copied frontend/dist -> dist (Hostinger publish folder)');
