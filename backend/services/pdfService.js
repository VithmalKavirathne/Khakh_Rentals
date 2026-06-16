const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Vercel sets VERCEL=1 in serverless functions.
const isVercel = process.env.VERCEL === '1';

// Embed static images once as base64 data URIs so Puppeteer's setContent can render them
// (relative file paths do not resolve when HTML is set directly).
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

async function launchBrowser() {
    if (isVercel) {
        // Serverless: lightweight Chromium bundle for Vercel/AWS Lambda.
        chromium.setGraphicsMode = false;
        return puppeteer.launch({
            args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
    }

    // Local dev: use full puppeteer (devDependency) which ships its own Chromium.
    const localPuppeteer = require('puppeteer');
    return localPuppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
}

exports.generateInvoicePDF = async (data) => {
    let browser;
    try {
        const templatePath = path.join(__dirname, '../templates/invoice.ejs');
        const html = await ejs.renderFile(templatePath, { data, logoSrc, inspectionDiagramSrc });

        browser = await launchBrowser();
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });

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
