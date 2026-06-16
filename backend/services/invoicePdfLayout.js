const path = require('path');
const fs = require('fs');
const embeddedAssets = require('./embeddedPdfAssets');
const { pdfFont } = require('./invoicePdfFonts');

/** Convert invoice.ejs CSS px to PDF points (96dpi → 72pt/in). */
const px = (value) => (value * 72) / 96;

const MARGIN = px(20);
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
// invoice.ejs: .col-left, .col-right { width: 49%; }
const COL_WIDTH = CONTENT_WIDTH * 0.49;
const COL_GAP = CONTENT_WIDTH - COL_WIDTH * 2;
const PADDING = px(4);
const MIN_ROW_HEIGHT = px(14);
const TABLE_SPACING = px(5);

// invoice.ejs width classes
const COL_W25x4 = [0.25, 0.25, 0.25, 0.25];
const COL_W35_65 = [0.35, 0.65];
const COL_W35_CENTER_RIGHT = [0.35, 0.325, 0.325];
const COL_W4_EQUAL = [1, 1, 1, 1];
const COL_W4_PAIRS = [1, 1, 1, 1];

const BORDER = '#d32f2f';
const HEADER_BG = '#e53935';
const LABEL_BG = '#ffcdd2';

// From invoice.ejs stylesheet
const FONT_BODY = px(10);
const FONT_TITLE = px(12);
const FONT_SECTION = px(14);
const FONT_DECL = px(13);
const FONT_SPECIAL = px(14);
const FONT_NOTE = px(13);

const LOGO_HEIGHT = px(70);
const LOGO_MAX_WIDTH = px(140);

const safe = (value) => (value === null || value === undefined ? '' : String(value));
const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;

const assetPath = (fileName) => {
  const candidates = [
    path.join(__dirname, '../assets/', fileName),
    path.join(process.cwd(), 'assets', fileName),
    path.join(process.cwd(), 'backend/assets', fileName),
    path.join(__dirname, '../../frontend/src/assets/', fileName),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
};

const loadImageBuffer = (fileName) => {
  const filePath = assetPath(fileName);
  if (filePath) {
    return fs.readFileSync(filePath);
  }

  if (fileName === 'logo.png' && embeddedAssets.logo) {
    return embeddedAssets.logo;
  }
  if (fileName === 'inspection-diagram.png' && embeddedAssets.inspectionDiagram) {
    return embeddedAssets.inspectionDiagram;
  }

  console.warn(`PDF asset not found on disk or embedded fallback: ${fileName}`);
  return null;
};

const getPdfAssetStatus = () => {
  const files = ['logo.png', 'inspection-diagram.png'];
  return files.reduce((status, fileName) => {
    const diskPath = assetPath(fileName);
    const embedded =
      (fileName === 'logo.png' && embeddedAssets.logo) ||
      (fileName === 'inspection-diagram.png' && embeddedAssets.inspectionDiagram);
    status[fileName] = {
      disk: diskPath || null,
      embedded: Boolean(embedded),
      available: Boolean(diskPath || embedded),
    };
    return status;
  }, {});
};

const loadDataUriImage = (dataUri) => {
  if (!dataUri || !String(dataUri).startsWith('data:image')) return null;
  try {
    const base64 = String(dataUri).split(',')[1];
    return Buffer.from(base64, 'base64');
  } catch {
    return null;
  }
};

function normalizeColWidths(colWidths, tableWidth) {
  const total = colWidths.reduce((sum, w) => sum + w, 0);
  return colWidths.map((w) => (w / total) * tableWidth);
}

function drawTable(doc, x, y, tableWidth, colWidths, rows) {
  const widths = normalizeColWidths(colWidths, tableWidth);
  let currentY = y;

  for (const row of rows) {
    let colIndex = 0;
    let xPos = x;
    let rowHeight = MIN_ROW_HEIGHT;
    const cells = [];

    for (const cell of row) {
      const span = cell.colspan || 1;
      const cellWidth = widths.slice(colIndex, colIndex + span).reduce((a, b) => a + b, 0);
      const fontSize = cell.fontSize || FONT_BODY;
      doc.font(pdfFont(doc, cell.bold)).fontSize(fontSize);
      const innerWidth = cellWidth - PADDING * 2;
      let renderSize = fontSize;
      const cellText = safe(cell.text);
      doc.font(pdfFont(doc, cell.bold)).fontSize(renderSize);
      if (cell.nowrap && cellText) {
        let textWidth = doc.widthOfString(cellText);
        while (renderSize > 5.5 && textWidth > innerWidth) {
          renderSize -= 0.25;
          doc.font(pdfFont(doc, cell.bold)).fontSize(renderSize);
          textWidth = doc.widthOfString(cellText);
        }
      }
      const textHeight = cell.nowrap
        ? doc.heightOfString(cellText)
        : doc.heightOfString(cellText, {
            width: innerWidth,
            align: cell.align || 'left',
            lineGap: 0,
          });
      const cellHeight = Math.max(textHeight + PADDING * 2, MIN_ROW_HEIGHT);
      rowHeight = Math.max(rowHeight, cellHeight);
      cells.push({ cell, xPos, cellWidth, renderSize, cellText, innerWidth });
      colIndex += span;
      xPos += cellWidth;
    }

    for (const { cell, xPos, cellWidth, renderSize, cellText, innerWidth } of cells) {
      if (cell.bg) {
        doc.save();
        doc.rect(xPos, currentY, cellWidth, rowHeight).fill(cell.bg);
        doc.restore();
      }
      if (!cell.bg) {
        doc.save();
        doc.rect(xPos, currentY, cellWidth, rowHeight).fill('#ffffff');
        doc.restore();
      }
      doc
        .rect(xPos, currentY, cellWidth, rowHeight)
        .strokeColor(BORDER)
        .lineWidth(1)
        .stroke();
      doc
        .fillColor(cell.color || '#333333')
        .font(pdfFont(doc, cell.bold))
        .fontSize(renderSize);
      if (cell.nowrap) {
        doc.text(cellText, xPos + PADDING, currentY + PADDING, {
          lineBreak: false,
          width: innerWidth,
        });
      } else {
        doc.text(cellText, xPos + PADDING, currentY + PADDING, {
          width: innerWidth,
          align: cell.align || 'left',
          lineGap: 0,
        });
      }
    }

    currentY += rowHeight;
  }

  return currentY + TABLE_SPACING;
}

function drawBorderBox(doc, x, y, width, height) {
  doc.rect(x, y, width, height).strokeColor(BORDER).lineWidth(1).stroke();
}

function drawImportantBox(doc, text, y) {
  const boxWidth = CONTENT_WIDTH * 0.92;
  const boxX = MARGIN + (CONTENT_WIDTH - boxWidth) / 2;
  const boxPaddingX = px(12);
  const boxPaddingY = px(8);
  doc.font(pdfFont(doc, true)).fontSize(FONT_DECL);
  const textHeight = doc.heightOfString(text, { width: boxWidth - boxPaddingX * 2, align: 'center' });
  const boxHeight = textHeight + boxPaddingY * 2;
  doc
    .roundedRect(boxX, y, boxWidth, boxHeight, px(4))
    .strokeColor(BORDER)
    .lineWidth(2)
    .stroke();
  doc.fillColor(BORDER).text(text, boxX + boxPaddingX, y + boxPaddingY, {
    width: boxWidth - boxPaddingX * 2,
    align: 'center',
  });
  doc.fillColor('#333333');
  return y + boxHeight + px(10);
}

module.exports = {
  MARGIN,
  CONTENT_WIDTH,
  COL_WIDTH,
  COL_GAP,
  COL_W25x4,
  COL_W35_65,
  COL_W35_CENTER_RIGHT,
  COL_W4_EQUAL,
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
  assetPath,
  getPdfAssetStatus,
  loadImageBuffer,
  loadDataUriImage,
  drawTable,
  drawBorderBox,
  drawImportantBox,
};
