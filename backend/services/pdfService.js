const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

const isVercel = process.env.VERCEL === '1';

const LINUX_CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--single-process',
];

const loadImageAsDataUri = (fileName) => {
  try {
    const buffer = fs.readFileSync(path.join(__dirname, '../assets/', fileName));
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.warn(`Image "${fileName}" not found, using fallback:`, err.message);
    return '';
  }
};

const logoSrc = loadImageAsDataUri('logo.png');
const inspectionDiagramSrc = loadImageAsDataUri('inspection-diagram.png');

async function launchWithSparticuz() {
  chromium.setGraphicsMode = false;
  return puppeteer.launch({
    args: [...chromium.args, ...LINUX_CHROME_ARGS],
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
}

async function launchBrowser() {
  if (isVercel) {
    return launchWithSparticuz();
  }

  try {
    const localPuppeteer = require('puppeteer');
    return localPuppeteer.launch({
      headless: true,
      args: LINUX_CHROME_ARGS,
    });
  } catch (err) {
    console.warn('Bundled Chromium failed, trying @sparticuz/chromium:', err.message);
    return launchWithSparticuz();
  }
}

exports.generateInvoicePDF = async (data) => {
  let browser;
  try {
    const templatePath = path.join(__dirname, '../templates/invoice.ejs');
    const html = await ejs.renderFile(templatePath, { data, logoSrc, inspectionDiagramSrc });

    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

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
