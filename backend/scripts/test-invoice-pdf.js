const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { generateInvoicePDF } = require('../services/pdfService');
const { getInvoiceFontStatus } = require('../services/invoicePdfFonts');

const sampleData = {
  invoiceNo: '452',
  invoiceDate: '2026-06-15',
  thirdPartyClaimNo: '45236',
  clientRegistration: 'r520',
  driver: {
    fullName: 'vithmal kavirathne',
    streetAddress: 'No:81,4th lane Dikhenapura, Horana',
    suburb: 'Horana North',
    state: '',
    postCode: '12400',
    homePhone: '',
    mobilePhone: '0762374897',
    workPhone: '',
    dob: '',
    email: 'vithakavirathne@gmail.com',
    licenceNo: '4532299',
    stateOfIssue: '',
    licenceExpiry: '',
  },
  inspection: {
    fuelLevel: 'FULL',
    fuelType: 'ULP',
    condition: 'WASHED VACCUMED',
  },
  vehicle: {
    make: 'toyota',
    model: 'camry',
    colour: 'white',
    registration: 'rc4523',
  },
  rental: {
    dateOut: '2026-06-01',
    dateReturn: '2026-06-14',
    kmsOut: '',
    kmsReturn: '',
    timeOut: '',
    timeReturn: '',
    excessAmount: '850',
    totalDays: '13',
  },
  repairer: {
    name: 'EPPING ACCIDENT REPAIR CENTER',
    phone: '0762374897',
  },
  thirdParty: {
    insuranceCompany: 'khakh',
    claimNumber: 'd4563',
    driverName: 'saman',
    damagedVehicleRego: '',
    dateOfAccident: '',
  },
  billing: {
    dailyRentalDays: 13,
    dailyRentalRate: 140,
    excessReductionDays: 0,
    excessReductionRate: 11,
    registrationRecoveryDays: 0,
    registrationRecoveryRate: 40,
    deliveryCharge: 75,
    subTotal: 1895,
    gst: 189.5,
    grandTotal: 2084.5,
  },
  acknowledged: true,
  signature: null,
};

async function main() {
  const buffer = await generateInvoicePDF(sampleData);
  const outPath = path.join(__dirname, '../test-pdfkit-invoice.pdf');
  fs.writeFileSync(outPath, buffer);
  const pdf = await PDFDocument.load(buffer);
  const fonts = getInvoiceFontStatus();
  console.log(`Wrote ${outPath} (${buffer.length} bytes, ${pdf.getPageCount()} pages)`);
  console.log(`Font: ${fonts.source}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
