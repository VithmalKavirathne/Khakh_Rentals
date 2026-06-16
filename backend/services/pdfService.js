const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { JSDOM } = require('jsdom');
const htmlToPdfmake = require('html-to-pdfmake');
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
const { prepareHtmlForPdfMake } = require('./invoicePdfStyles');

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

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

const TABLE_LAYOUT = {
  hLineWidth: () => 1,
  vLineWidth: () => 1,
  hLineColor: () => '#d32f2f',
  vLineColor: () => '#d32f2f',
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 4,
  paddingBottom: () => 4,
};

exports.generateInvoicePDF = async (data) => {
  try {
    const templatePath = path.join(__dirname, '../templates/invoice.ejs');
    const renderedHtml = await ejs.renderFile(templatePath, { data, logoSrc, inspectionDiagramSrc });
    const html = prepareHtmlForPdfMake(renderedHtml);

    const dom = new JSDOM(html);
    const content = htmlToPdfmake(html, {
      window: dom.window,
      tableAutoSize: true,
      defaultStyles: {
        b: { bold: true },
        strong: { bold: true },
        em: { italics: true },
        h1: { fontSize: 16, bold: true, marginBottom: 5 },
        h3: { fontSize: 12.5, bold: true, marginBottom: 4, marginTop: 8, color: '#d32f2f' },
        p: { margin: [0, 2, 0, 2], fontSize: 10 },
        li: { fontSize: 10 },
      },
    });

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [20, 20, 20, 20],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        lineHeight: 1.15,
        color: '#333333',
      },
      styles: {
        'html-th': { bold: true, fillColor: '#e53935', color: '#ffffff', fontSize: 10 },
        'html-td': { color: '#333333', fontSize: 10 },
      },
      tableLayouts: {
        invoiceTable: TABLE_LAYOUT,
      },
      content,
    };

    return new Promise((resolve, reject) => {
      pdfMake.createPdf(docDefinition).getBuffer((buffer) => {
        if (!buffer) {
          reject(new Error('PDF buffer generation returned empty result'));
          return;
        }
        resolve(buffer);
      });
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
};
