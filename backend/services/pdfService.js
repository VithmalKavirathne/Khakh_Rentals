const PDFDocument = require('pdfkit');
const { renderPageOne } = require('./invoicePdfPageOne');
const { renderAgreement } = require('./invoicePdfAgreement');
const { MARGIN, px } = require('./invoicePdfLayout');

/**
 * Hostinger-safe invoice PDF using PDFKit only (no browser/Chromium).
 * Layout matches the Khakh Rentals rental agreement / tax invoice template.
 */
exports.generateInvoicePDF = async (data) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      renderPageOne(doc, data);
      renderAgreement(doc, data)
        .then(() => doc.end())
        .catch(reject);
    } catch (error) {
      console.error('PDF generation failed:', error);
      reject(error);
    }
  });
