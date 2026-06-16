const path = require('path');
const fs = require('fs');

const FONT_REGULAR = 'InvoiceRegular';
const FONT_BOLD = 'InvoiceBold';

const fontCandidates = (fileName) => [
  path.join(__dirname, '../assets/fonts/', fileName),
  path.join(process.cwd(), 'assets/fonts', fileName),
  path.join(process.cwd(), 'backend/assets/fonts', fileName),
];

const resolveFontPaths = () => {
  const pairs = [
    { regular: 'Arial.ttf', bold: 'Arial-Bold.ttf', source: 'Arial' },
    { regular: 'DejaVuSans.ttf', bold: 'DejaVuSans-Bold.ttf', source: 'DejaVu Sans' },
  ];

  for (const pair of pairs) {
    const regularPath = fontCandidates(pair.regular).find((p) => fs.existsSync(p));
    const boldPath = fontCandidates(pair.bold).find((p) => fs.existsSync(p));
    if (regularPath) {
      return {
        regular: regularPath,
        bold: boldPath || regularPath,
        source: pair.source,
      };
    }
  }

  const npmRegular = [
    path.join(__dirname, '../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf'),
    path.join(process.cwd(), 'node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf'),
  ].find((p) => fs.existsSync(p));

  if (npmRegular) {
    const npmBold = npmRegular.replace('DejaVuSans.ttf', 'DejaVuSans-Bold.ttf');
    return {
      regular: npmRegular,
      bold: fs.existsSync(npmBold) ? npmBold : npmRegular,
      source: 'DejaVu Sans (npm)',
    };
  }

  return null;
};

let cachedPaths = null;

function getFontPaths() {
  if (!cachedPaths) {
    cachedPaths = resolveFontPaths();
  }
  return cachedPaths;
}

/** Register invoice fonts on the PDF document (Arial when present, else DejaVu Sans). */
function registerInvoiceFonts(doc) {
  const paths = getFontPaths();
  if (paths) {
    doc.registerFont(FONT_REGULAR, paths.regular);
    doc.registerFont(FONT_BOLD, paths.bold);
    doc._invoiceFonts = { regular: FONT_REGULAR, bold: FONT_BOLD, source: paths.source };
  } else {
    doc._invoiceFonts = { regular: 'Helvetica', bold: 'Helvetica-Bold', source: 'Helvetica' };
  }
  return doc._invoiceFonts;
}

function pdfFont(doc, bold = false) {
  const fonts = doc._invoiceFonts || { regular: 'Helvetica', bold: 'Helvetica-Bold' };
  return bold ? fonts.bold : fonts.regular;
}

function getInvoiceFontStatus() {
  const paths = getFontPaths();
  return {
    source: paths ? paths.source : 'Helvetica (built-in fallback)',
    regular: paths ? paths.regular : null,
    bold: paths ? paths.bold : null,
  };
}

module.exports = {
  registerInvoiceFonts,
  pdfFont,
  getInvoiceFontStatus,
};
