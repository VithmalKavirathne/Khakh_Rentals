const path = require('path');
const fs = require('fs');

const MARGIN = 15;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COL_GAP = 8;
const COL_WIDTH = (CONTENT_WIDTH - COL_GAP) / 2;
const PADDING = 3;

const BORDER = '#d32f2f';
const HEADER_BG = '#e53935';
const LABEL_BG = '#ffcdd2';

const FONT_BODY = 8;
const FONT_TITLE = 9;
const FONT_SECTION = 10.5;
const FONT_DECL = 10;
const FONT_SPECIAL = 10.5;

const safe = (value) => (value === null || value === undefined ? '' : String(value));
const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;

const assetPath = (fileName) => {
  const candidates = [
    path.join(__dirname, '../assets/', fileName),
    path.join(__dirname, '../../frontend/src/assets/', fileName),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
};

const loadImageBuffer = (fileName) => {
  const filePath = assetPath(fileName);
  return filePath ? fs.readFileSync(filePath) : null;
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
    let rowHeight = 14;
    const cells = [];

    for (const cell of row) {
      const span = cell.colspan || 1;
      const cellWidth = widths.slice(colIndex, colIndex + span).reduce((a, b) => a + b, 0);
      const font = cell.bold ? 'Helvetica-Bold' : 'Helvetica';
      const fontSize = cell.fontSize || FONT_BODY;
      doc.font(font).fontSize(fontSize);
      const innerWidth = cellWidth - PADDING * 2;
      const textHeight = doc.heightOfString(safe(cell.text), {
        width: innerWidth,
        align: cell.align || 'left',
      });
      const cellHeight = Math.max(textHeight + PADDING * 2, 14);
      rowHeight = Math.max(rowHeight, cellHeight);
      cells.push({ cell, xPos, cellWidth });
      colIndex += span;
      xPos += cellWidth;
    }

    for (const { cell, xPos, cellWidth } of cells) {
      if (cell.bg) {
        doc.save();
        doc.rect(xPos, currentY, cellWidth, rowHeight).fill(cell.bg);
        doc.restore();
      }
      doc
        .rect(xPos, currentY, cellWidth, rowHeight)
        .strokeColor(BORDER)
        .lineWidth(0.5)
        .stroke();
      doc
        .fillColor(cell.color || '#333333')
        .font(cell.bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(cell.fontSize || FONT_BODY)
        .text(safe(cell.text), xPos + PADDING, currentY + PADDING, {
          width: cellWidth - PADDING * 2,
          align: cell.align || 'left',
        });
    }

    currentY += rowHeight;
  }

  return currentY + 4;
}

function drawBorderBox(doc, x, y, width, height) {
  doc.rect(x, y, width, height).strokeColor(BORDER).lineWidth(0.5).stroke();
}

function drawImportantBox(doc, text, y) {
  const boxWidth = CONTENT_WIDTH * 0.92;
  const boxX = MARGIN + (CONTENT_WIDTH - boxWidth) / 2;
  doc.font('Helvetica-Bold').fontSize(FONT_DECL);
  const textHeight = doc.heightOfString(text, { width: boxWidth - 16, align: 'center' });
  const boxHeight = textHeight + 16;
  doc
    .roundedRect(boxX, y, boxWidth, boxHeight, 3)
    .strokeColor(BORDER)
    .lineWidth(1.5)
    .stroke();
  doc.fillColor(BORDER).text(text, boxX + 8, y + 8, {
    width: boxWidth - 16,
    align: 'center',
  });
  doc.fillColor('#333333');
  return y + boxHeight + 8;
}

module.exports = {
  MARGIN,
  CONTENT_WIDTH,
  COL_WIDTH,
  COL_GAP,
  BORDER,
  HEADER_BG,
  LABEL_BG,
  FONT_BODY,
  FONT_TITLE,
  FONT_SECTION,
  FONT_DECL,
  FONT_SPECIAL,
  safe,
  money,
  assetPath,
  loadImageBuffer,
  loadDataUriImage,
  drawTable,
  drawBorderBox,
  drawImportantBox,
};
