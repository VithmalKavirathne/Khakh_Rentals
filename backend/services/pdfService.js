const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { JSDOM } = require('jsdom');
const htmlToPdfmake = require('html-to-pdfmake');
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');

pdfMake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs;

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
    const templatePath = path.join(__dirname, '../templates/invoice.ejs');
    const html = await ejs.renderFile(templatePath, { data, logoSrc, inspectionDiagramSrc });

    const dom = new JSDOM(html);
    const content = htmlToPdfmake(html, {
      window: dom.window,
      tableAutoSize: true,
      defaultStyles: {
        b: { bold: true },
        strong: { bold: true },
        em: { italics: true },
        h1: { fontSize: 16, bold: true, marginBottom: 5 },
        h3: { fontSize: 12, bold: true, marginBottom: 4, marginTop: 8 },
        p: { margin: [0, 2, 0, 2] },
      },
    });

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [20, 20, 20, 20],
      defaultStyle: {
        font: 'Roboto',
        fontSize: 8,
        lineHeight: 1.15,
      },
      styles: {
        'html-th': { bold: true, fillColor: '#e53935', color: '#ffffff' },
        'html-td': { color: '#333333' },
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
