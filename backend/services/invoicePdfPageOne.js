const {
  MARGIN,
  CONTENT_WIDTH,
  COL_WIDTH,
  COL_GAP,
  COL_W25x4,
  COL_W35_65,
  COL_W35_CENTER_RIGHT,
  COL_W4_PAIRS,
  BORDER,
  HEADER_BG,
  LABEL_BG,
  FONT_BODY,
  FONT_TITLE,
  FONT_SECTION,
  FONT_DECL,
  FONT_SPECIAL,
  FONT_NOTE,
  LOGO_HEIGHT,
  LOGO_MAX_WIDTH,
  TABLE_SPACING,
  px,
  safe,
  money,
  loadImageBuffer,
  loadDataUriImage,
  drawTable,
  drawBorderBox,
  drawImportantBox,
} = require('./invoicePdfLayout');
const { pdfFont } = require('./invoicePdfFonts');

const headerCell = (text, opts = {}) => ({
  text,
  bg: HEADER_BG,
  color: '#ffffff',
  bold: true,
  ...opts,
});

const labelCell = (text, opts = {}) => ({
  text,
  bg: LABEL_BG,
  bold: true,
  ...opts,
});

const valueCell = (text, opts = {}) => ({ text: safe(text), ...opts });

function drawHeader(doc, y) {
  const logo = loadImageBuffer('logo.png');
  doc.font(pdfFont(doc, true)).fontSize(FONT_TITLE).fillColor('#333333');
  doc.text('RENTAL AGREEMENT / TAX INVOICE\nKHAKH RENTALS', MARGIN, y, {
    width: COL_WIDTH,
    lineGap: 2,
  });
  doc.font(pdfFont(doc, false)).fontSize(FONT_BODY);
  doc.text(
    'Level 23, Tower 5, Collins Square, 727 Collins Street, Australia\n' +
      'ABN : 16609767071\n' +
      'Email : khakhrentals@yahoo.com\n' +
      'Phone : 1300911600',
    MARGIN,
    doc.y + px(2),
    { width: COL_WIDTH, lineGap: 2 }
  );

  const headerBottom = doc.y;
  const logoX = MARGIN + CONTENT_WIDTH - LOGO_MAX_WIDTH;
  if (logo) {
    doc.image(logo, logoX, y, {
      fit: [LOGO_MAX_WIDTH, LOGO_HEIGHT],
      align: 'right',
      valign: 'top',
    });
  } else {
    doc
      .font(pdfFont(doc, true))
      .fontSize(px(24))
      .fillColor(BORDER)
      .text('KHAKH RENTALS', logoX, y + px(20), {
        width: LOGO_MAX_WIDTH,
        align: 'right',
      });
    doc.fillColor('#333333');
  }

  return Math.max(headerBottom, y + LOGO_HEIGHT + px(10)) + px(10);
}

function drawInvoiceMeta(doc, data, y) {
  return drawTable(
    doc,
    MARGIN,
    y,
    CONTENT_WIDTH,
    COL_W25x4,
    [
      [
        headerCell('INVOICE NO.'),
        valueCell(data.invoiceNo),
        headerCell('INVOICE DATE'),
        valueCell(data.invoiceDate),
      ],
      [
        headerCell('THIRD PARTY CLAIM #'),
        valueCell(data.thirdPartyClaimNo),
        headerCell('CLIENT REGISTRATION'),
        valueCell(data.clientRegistration),
      ],
    ]
  );
}

function drawHirerTable(doc, data, x, y, width) {
  const d = data.driver || {};
  return drawTable(doc, x, y, width, COL_W4_PAIRS, [
    [headerCell('HIRER & AUTHORISED DRIVER', { colspan: 4 })],
    [labelCell('Name'), valueCell(d.fullName, { colspan: 3 })],
    [labelCell('Street Address'), valueCell(d.streetAddress, { colspan: 3 })],
    [labelCell('Suburb'), valueCell(d.suburb, { colspan: 3 })],
    [labelCell('State'), valueCell(d.state), labelCell('Post Code'), valueCell(d.postCode)],
    [labelCell('Home Ph'), valueCell(d.homePhone), labelCell('Mobile'), valueCell(d.mobilePhone)],
    [labelCell('Work'), valueCell(d.workPhone), labelCell('DOB'), valueCell(d.dob)],
    [labelCell('Email'), valueCell(d.email, { colspan: 3 })],
    [
      labelCell('Licence No.'),
      valueCell(d.licenceNo),
      labelCell('State of Issue'),
      valueCell(d.stateOfIssue),
    ],
    [labelCell('Licence Expiry'), valueCell(d.licenceExpiry, { colspan: 3 })],
  ]);
}

function drawInspectionSection(doc, data, x, y, width) {
  let currentY = drawTable(doc, x, y, width, [1], [[headerCell('DELIVERY VEHICLE INSPECTION')]]);

  const diagramHeight = px(150);
  drawBorderBox(doc, x, currentY, width, diagramHeight);
  const diagram = loadImageBuffer('inspection-diagram.png');
  if (diagram) {
    doc.image(diagram, x + px(4), currentY + px(4), {
      fit: [width - px(8), diagramHeight - px(8)],
      align: 'center',
      valign: 'center',
    });
  } else {
    doc
      .font(pdfFont(doc, false))
      .fontSize(FONT_BODY)
      .fillColor('#999999')
      .text('[ Vehicle Wireframe Diagram ]', x, currentY + diagramHeight / 2 - 4, {
        width,
        align: 'center',
      });
    doc.fillColor('#333333');
  }
  currentY += diagramHeight + TABLE_SPACING;

  const ins = data.inspection || {};
  currentY = drawTable(doc, x, currentY, width, COL_W4_PAIRS, [
    [labelCell('Inspection Completed By', { colspan: 4 })],
    [
      labelCell('Fuel Level'),
      valueCell(ins.fuelLevel),
      labelCell('Fuel Type'),
      valueCell(ins.fuelType),
    ],
    [
      labelCell('Condition'),
      valueCell(ins.condition, { nowrap: true }),
      labelCell('HIRER INITIAL'),
      valueCell(''),
    ],
  ]);

  doc
    .font(pdfFont(doc, true))
    .fontSize(FONT_NOTE)
    .fillColor(BORDER)
    .text('*Hirers will be charged $50 for vehicles returned uncleaned', x, currentY + px(2), {
      width,
    });
  doc.fillColor('#333333');
  return currentY + px(16);
}

function drawRentalColumn(doc, data, x, y, width) {
  const v = data.vehicle || {};
  const r = data.rental || {};
  const rep = data.repairer || {};
  const tp = data.thirdParty || {};
  const b = data.billing || {};

  let currentY = drawTable(doc, x, y, width, COL_W4_PAIRS, [
    [headerCell('RENTAL DETAILS', { colspan: 4 })],
    [labelCell('Make'), valueCell(v.make), labelCell('Model'), valueCell(v.model)],
    [labelCell('Colour'), valueCell(v.colour), labelCell('Registration'), valueCell(v.registration)],
    [labelCell('Date Out'), valueCell(r.dateOut), labelCell('Date Return'), valueCell(r.dateReturn)],
    [labelCell('Kms Out'), valueCell(r.kmsOut), labelCell('Kms Return'), valueCell(r.kmsReturn)],
    [labelCell('Time Out'), valueCell(r.timeOut), labelCell('Time Return'), valueCell(r.timeReturn)],
    [
      labelCell('Excess Amount'),
      valueCell(`$${safe(r.excessAmount)}`, { nowrap: true }),
      labelCell('Total Days'),
      valueCell(r.totalDays, { nowrap: true }),
    ],
  ]);

  currentY = drawTable(doc, x, currentY, width, COL_W35_65, [
    [headerCell('Repairer Details', { colspan: 2 })],
    [labelCell('Repairer Name'), valueCell(rep.name)],
    [labelCell('Phone'), valueCell(rep.phone)],
  ]);

  currentY = drawTable(doc, x, currentY, width, COL_W35_65, [
    [headerCell('Third Party Details', { colspan: 2 })],
    [labelCell('Insurance Company'), valueCell(tp.insuranceCompany)],
    [labelCell('Claim Number'), valueCell(tp.claimNumber)],
    [labelCell('Driver Name'), valueCell(tp.driverName)],
    [labelCell('Damaged Vehicle Rego'), valueCell(tp.damagedVehicleRego)],
    [labelCell('Date of Accident'), valueCell(tp.dateOfAccident)],
  ]);

  const dailyTotal = (Number(b.dailyRentalDays) || 0) * (Number(b.dailyRentalRate) || 0);
  const excessTotal = (Number(b.excessReductionDays) || 0) * (Number(b.excessReductionRate) || 0);
  const regoTotal =
    (Number(b.registrationRecoveryDays) || 0) * (Number(b.registrationRecoveryRate) || 0);

  currentY = drawTable(doc, x, currentY, width, COL_W35_CENTER_RIGHT, [
    [headerCell('RENTAL CHARGES', { colspan: 3 })],
    [
      labelCell('Daily Rental'),
      valueCell(`${b.dailyRentalDays} Days x $${b.dailyRentalRate}`, { align: 'center' }),
      valueCell(money(dailyTotal), { align: 'right' }),
    ],
    [
      labelCell('Excess Reduction'),
      valueCell(`${b.excessReductionDays} Days x $${b.excessReductionRate}`, { align: 'center' }),
      valueCell(money(excessTotal), { align: 'right' }),
    ],
    [
      labelCell('Registration Recovery Fee'),
      valueCell(`${b.registrationRecoveryDays} Days x $${b.registrationRecoveryRate}`, {
        align: 'center',
      }),
      valueCell(money(regoTotal), { align: 'right' }),
    ],
    [
      labelCell('Delivery', { colspan: 2 }),
      valueCell(money(b.deliveryCharge), { align: 'right' }),
    ],
    [
      labelCell('Sub Total', { colspan: 2 }),
      valueCell(money(b.subTotal), { align: 'right' }),
    ],
    [
      labelCell('GST (10%)', { colspan: 2 }),
      valueCell(money(b.gst), { align: 'right' }),
    ],
    [
      headerCell('Total', { colspan: 2 }),
      headerCell(money(b.grandTotal), { align: 'right' }),
    ],
  ]);

  return currentY;
}

function drawFooterSection(doc, data, y) {
  doc.font(pdfFont(doc, true)).fontSize(FONT_SPECIAL).fillColor(BORDER);
  doc.text(
    'Special Condition:\n' +
      '1. Vehicle to be returned as per rental vehicle delivery fuel level. Cars must be returned in a clean condition.\n' +
      '2. No pets, no smoking or a $50 cleaning fee will apply. All fines will incur a $50 administration fee.\n' +
      '3. This vehicle is registered for tools. You are liable for any additional charges (e.g. tolls) you incur.',
    MARGIN,
    y,
    { width: CONTENT_WIDTH, lineGap: px(4) }
  );

  let currentY = doc.y + px(10);
  doc.font(pdfFont(doc, true)).fontSize(FONT_SECTION).fillColor('#333333');
  doc.text('Declaration:', MARGIN, currentY);
  currentY = doc.y + px(4);
  doc.font(pdfFont(doc, false)).fontSize(FONT_DECL);
  doc.text(
    '• I have read, understand and agree to this document;\n' +
      '• I have read, understand and agree to the Terms & conditions of Use;\n' +
      '• I confirm that to the best, of my knowledge, the information I have provided is true, complete and correct.',
    MARGIN,
    currentY,
    { width: CONTENT_WIDTH, lineGap: px(4) }
  );

  currentY = doc.y + px(8);
  const signature = loadDataUriImage(data.signature);
  if (signature) {
    const sigY = currentY;
    doc.font(pdfFont(doc, false)).fontSize(FONT_DECL).text("Hire's Signature:", MARGIN, sigY, {
      continued: false,
    });
    doc.image(signature, MARGIN + px(72), sigY - px(2), {
      fit: [px(280), px(55)],
    });
    currentY = sigY + px(55) + px(4);
  } else {
    doc.font(pdfFont(doc, false)).fontSize(FONT_DECL).text("Hire's Signature:", MARGIN, currentY, {
      continued: true,
    });
    doc.text(' ______________________________', { continued: false });
    currentY = doc.y + px(6);
  }

  doc
    .font(pdfFont(doc, true))
    .fontSize(FONT_DECL)
    .text('Account name: Khakh Rentals, BSB: 063-185, Account number: 1127 0117', MARGIN, currentY + px(14), {
      width: CONTENT_WIDTH,
      align: 'center',
    });

  return drawImportantBox(
    doc,
    'IMPORTANT: A COPY OF YOUR LICENCE MUST ACCOMPANY THIS RENTAL AGREEMENT',
    doc.y + px(10)
  );
}

function renderPageOne(doc, data) {
  let y = drawHeader(doc, MARGIN);
  y = drawInvoiceMeta(doc, data, y);

  const leftX = MARGIN;
  const rightX = MARGIN + COL_WIDTH + COL_GAP;
  const leftY = drawHirerTable(doc, data, leftX, y, COL_WIDTH);
  const leftEnd = drawInspectionSection(doc, data, leftX, leftY, COL_WIDTH);
  const rightEnd = drawRentalColumn(doc, data, rightX, y, COL_WIDTH);
  y = Math.max(leftEnd, rightEnd) + px(6);

  drawFooterSection(doc, data, y);
}

module.exports = { renderPageOne };
