const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');
const COMPANY_NAME = 'Khakh Rentals';
const BRAND_COLOR = '#d32f2f';

const formatMoney = (value) => `$${(Number(value) || 0).toFixed(2)}`;

const safe = (value) => (value === null || value === undefined ? '' : String(value));

const driverAddress = (driver) => {
  const parts = [
    driver.streetAddress,
    driver.suburb,
    driver.state,
    driver.postCode,
  ].filter(Boolean);
  return parts.join(', ');
};

function drawSectionHeading(doc, title, y) {
  doc.fillColor(BRAND_COLOR).fontSize(11).font('Helvetica-Bold').text(title, 50, y);
  doc.fillColor('#333333');
  return doc.y + 6;
}

function drawLabelValue(doc, label, value, x, y, valueWidth = 200) {
  doc.fontSize(9).font('Helvetica-Bold').text(label, x, y, { continued: false });
  doc.font('Helvetica').text(safe(value), x + 110, y, { width: valueWidth });
  return y + 14;
}

function drawBillingRow(doc, label, amount, y) {
  doc.fontSize(9).font('Helvetica').text(label, 50, y, { width: 350 });
  doc.text(formatMoney(amount), 420, y, { width: 125, align: 'right' });
  return y + 16;
}

function addLogoOrTitle(doc) {
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 50, 45, { width: 90 });
    doc.fontSize(16).fillColor(BRAND_COLOR).font('Helvetica-Bold');
    doc.text(COMPANY_NAME, 150, 55);
  } else {
    doc.fontSize(20).fillColor(BRAND_COLOR).font('Helvetica-Bold');
    doc.text(COMPANY_NAME, 50, 50);
  }
  doc.fillColor('#333333');
}

exports.generateInvoicePDF = (data) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      addLogoOrTitle(doc);

      doc.fontSize(10).font('Helvetica');
      doc.text('Invoice', 50, 110);
      let y = 130;

      y = drawSectionHeading(doc, 'Invoice Details', y);
      y = drawLabelValue(doc, 'Invoice No:', data.invoiceNo, 50, y);
      y = drawLabelValue(doc, 'Invoice Date:', data.invoiceDate, 50, y);
      y = drawLabelValue(doc, 'Claim No:', data.thirdPartyClaimNo, 50, y);
      y = drawLabelValue(doc, 'Client Rego:', data.clientRegistration, 50, y);
      y += 8;

      const driver = data.driver || {};
      y = drawSectionHeading(doc, 'Driver / Customer', y);
      y = drawLabelValue(doc, 'Full Name:', driver.fullName, 50, y);
      y = drawLabelValue(doc, 'Address:', driverAddress(driver), 50, y, 380);
      y = drawLabelValue(doc, 'Mobile:', driver.mobilePhone, 50, y);
      y = drawLabelValue(doc, 'Email:', driver.email, 50, y);
      y = drawLabelValue(doc, 'Licence No:', driver.licenceNo, 50, y);
      y += 8;

      const vehicle = data.vehicle || {};
      y = drawSectionHeading(doc, 'Vehicle', y);
      y = drawLabelValue(doc, 'Make / Model:', `${vehicle.make} ${vehicle.model}`.trim(), 50, y);
      y = drawLabelValue(doc, 'Colour:', vehicle.colour, 50, y);
      y = drawLabelValue(doc, 'Registration:', vehicle.registration, 50, y);
      y += 8;

      const rental = data.rental || {};
      y = drawSectionHeading(doc, 'Rental Details', y);
      y = drawLabelValue(doc, 'Date Out:', `${rental.dateOut} ${rental.timeOut || ''}`.trim(), 50, y);
      y = drawLabelValue(doc, 'Date Return:', `${rental.dateReturn} ${rental.timeReturn || ''}`.trim(), 50, y);
      y = drawLabelValue(doc, 'Kms Out / Return:', `${safe(rental.kmsOut)} / ${safe(rental.kmsReturn)}`, 50, y);
      y = drawLabelValue(doc, 'Total Days:', rental.totalDays, 50, y);
      y = drawLabelValue(doc, 'Excess Amount:', formatMoney(rental.excessAmount), 50, y);
      y += 8;

      const billing = data.billing || {};
      y = drawSectionHeading(doc, 'Billing Breakdown', y);

      const dailyLine =
        billing.dailyRentalDays * billing.dailyRentalRate;
      const excessLine =
        billing.excessReductionDays * billing.excessReductionRate;
      const regoLine =
        billing.registrationRecoveryDays * billing.registrationRecoveryRate;

      y = drawBillingRow(
        doc,
        `Daily rental (${billing.dailyRentalDays} x ${formatMoney(billing.dailyRentalRate)})`,
        dailyLine,
        y
      );
      y = drawBillingRow(
        doc,
        `Excess reduction (${billing.excessReductionDays} x ${formatMoney(billing.excessReductionRate)})`,
        excessLine,
        y
      );
      y = drawBillingRow(
        doc,
        `Registration recovery (${billing.registrationRecoveryDays} x ${formatMoney(billing.registrationRecoveryRate)})`,
        regoLine,
        y
      );
      y = drawBillingRow(doc, 'Delivery charge', billing.deliveryCharge, y);
      y = drawBillingRow(doc, 'Sub total', billing.subTotal, y);
      y = drawBillingRow(doc, 'GST', billing.gst, y);

      doc.moveTo(50, y + 2).lineTo(545, y + 2).strokeColor(BRAND_COLOR).stroke();
      y += 10;
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('Grand Total', 50, y, { width: 350 });
      doc.text(formatMoney(billing.grandTotal), 420, y, { width: 125, align: 'right' });
      y += 24;

      if (data.signature && String(data.signature).startsWith('data:image')) {
        try {
          const base64 = String(data.signature).split(',')[1];
          const imageBuffer = Buffer.from(base64, 'base64');
          y = drawSectionHeading(doc, 'Customer Signature', y);
          doc.image(imageBuffer, 50, y, { width: 160, height: 60 });
          y += 70;
        } catch (sigErr) {
          console.warn('Could not embed signature image:', sigErr.message);
        }
      }

      if (data.acknowledged) {
        doc.fontSize(9).font('Helvetica').text('Terms and conditions acknowledged.', 50, y);
      }

      doc.fontSize(8).fillColor('#666666').text(
        'Account name: Khakh Rentals, BSB: 063-185, Account number: 1127 0117',
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 }
      );

      doc.end();
    } catch (error) {
      console.error('PDF generation failed:', error);
      reject(error);
    }
  });
