const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

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

exports.generateInvoicePDF = async (data) => {
    try {
        // Compile EJS template
        const templatePath = path.join(__dirname, '../templates/invoice.ejs');
        const html = await ejs.renderFile(templatePath, { data, logoSrc, inspectionDiagramSrc });
        
        // Launch Puppeteer
        const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
        const page = await browser.newPage();
        
        // Set HTML content
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true, // Needed to print background colors
            margin: {
                top: '20px',
                bottom: '20px',
                left: '20px',
                right: '20px'
            }
        });
        
        await browser.close();
        return pdfBuffer;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
