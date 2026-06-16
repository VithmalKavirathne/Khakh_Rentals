const { chromium } = require('playwright-core');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL === '1';
const useSparticuz =
  isVercel || process.env.USE_SPARTICUZ_CHROMIUM === '1' || process.env.HOSTINGER === '1';

const loadImageAsDataUri = (fileName) => {
  const candidates = [
    path.join(__dirname, '../assets/', fileName),
    path.join(__dirname, '../../frontend/src/assets/', fileName),
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        return `data:image/png;base64,${buffer.toString('base64')}`;
      }
    } catch {
      // try next path
    }
  }

  console.warn(`Image "${fileName}" not found in backend/assets or frontend/src/assets`);
  return '';
};

const logoSrc = loadImageAsDataUri('logo.png');
const inspectionDiagramSrc = loadImageAsDataUri('inspection-diagram.png');

const SYSTEM_CHROMIUM_PATHS = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  process.env.CHROMIUM_EXECUTABLE_PATH,
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
].filter(Boolean);

async function launchBrowser() {
  if (useSparticuz) {
    const sparticuz = require('@sparticuz/chromium');
    sparticuz.setGraphicsMode = false;
    return chromium.launch({
      args: [...sparticuz.args, '--hide-scrollbars', '--disable-web-security', '--no-sandbox'],
      executablePath: await sparticuz.executablePath(),
      headless: sparticuz.headless,
    });
  }

  for (const executablePath of SYSTEM_CHROMIUM_PATHS) {
    if (fs.existsSync(executablePath)) {
      return chromium.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }
  }

  // Local dev: full playwright package ships its own Chromium.
  try {
    const { chromium: localChromium } = require('playwright');
    return localChromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch {
    throw new Error(
      'No Chromium found for PDF generation. Install Playwright locally (npm install) or set CHROMIUM_EXECUTABLE_PATH on the server.'
    );
  }
}

exports.generateInvoicePDF = async (data) => {
  let browser;
  try {
    const templatePath = path.join(__dirname, '../templates/invoice.ejs');
    const html = await ejs.renderFile(templatePath, { data, logoSrc, inspectionDiagramSrc });

    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        bottom: '20px',
        left: '20px',
        right: '20px',
      },
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
