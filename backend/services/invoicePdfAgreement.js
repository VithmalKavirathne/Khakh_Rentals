const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const {
  MARGIN,
  CONTENT_WIDTH,
  BORDER,
  loadDataUriImage,
  px,
} = require('./invoicePdfLayout');
const { pdfFont } = require('./invoicePdfFonts');

// invoice.ejs .agreement { font-size: 10.5px; line-height: 1.5; color: #000 }
const AGREEMENT_FONT = px(10.5);
const AGREEMENT_H3 = px(12.5);
const AGREEMENT_TITLE = px(16);
const AGREEMENT_PART = px(14);
const AGREEMENT_LINE_GAP = px(4.5);
const CHECKBOX_SIZE = px(13);

function decodeHtml(text, { trim = true } = {}) {
  let result = text
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&deg;/g, '°')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ');
  if (trim) {
    result = result.trim();
  } else {
    result = result.replace(/^\s+/, ' ');
  }
  return result;
}

function parseParagraph(inner) {
  if (inner.includes('<input type="checkbox"')) {
    return {
      type: 'checkbox',
      checked: inner.includes('checked'),
      text: decodeHtml(inner.replace(/<input[^>]*>/gi, '')),
    };
  }

  if (inner.includes('<img') && inner.toLowerCase().includes('signature')) {
    return { type: 'signature-line', inner };
  }

  const plain = decodeHtml(inner.replace(/<[^>]+>/g, ' '));
  if (/^Signature:/i.test(plain)) {
    return { type: 'signature-line', inner };
  }

  const termMatch = inner.match(/<span class="term">([\s\S]*?)<\/span>\s*([\s\S]*)/i);
  if (termMatch) {
    return {
      type: 'term-p',
      term: decodeHtml(termMatch[1]),
      text: decodeHtml(termMatch[2]).trim(),
    };
  }

  return { type: 'p', text: decodeHtml(inner) };
}

function parseAgreementHtml(html) {
  const blocks = [];
  const chunkRe =
    /<div class="doc-title">([\s\S]*?)<\/div>|<div class="part-title">([\s\S]*?)<\/div>|<h3>([\s\S]*?)<\/h3>|<p([^>]*)>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = chunkRe.exec(html)) !== null) {
    if (match[1] !== undefined) {
      blocks.push({ type: 'doc-title', text: decodeHtml(match[1]) });
    } else if (match[2] !== undefined) {
      blocks.push({ type: 'part-title', text: decodeHtml(match[2]) });
    } else if (match[3] !== undefined) {
      blocks.push({ type: 'h3', text: decodeHtml(match[3]) });
    } else if (match[5] !== undefined) {
      blocks.push(parseParagraph(match[5]));
    }
  }

  return blocks;
}

function writeParagraph(doc, text, opts = {}) {
  const width = opts.width || CONTENT_WIDTH;
  const fontSize = opts.fontSize || AGREEMENT_FONT;
  if (opts.marginTop) {
    doc.y += opts.marginTop;
  }
  doc.font(pdfFont(doc, opts.bold)).fontSize(fontSize);
  doc.text(text, MARGIN, doc.y, {
    width,
    align: opts.align || 'justify',
    lineGap: opts.lineGap ?? AGREEMENT_LINE_GAP,
  });
  doc.y += opts.gap ?? px(4);
}

function drawCheckbox(doc, checked, text) {
  const textWidth = CONTENT_WIDTH - CHECKBOX_SIZE - px(8);
  doc.font(pdfFont(doc, false)).fontSize(AGREEMENT_FONT);
  const textHeight = doc.heightOfString(text, { width: textWidth, lineGap: AGREEMENT_LINE_GAP });
  const rowHeight = Math.max(CHECKBOX_SIZE + px(2), textHeight);
  const y = doc.y + px(4);
  const boxY = y + (rowHeight - CHECKBOX_SIZE) / 2;
  const radius = px(2);

  doc.roundedRect(MARGIN, boxY, CHECKBOX_SIZE, CHECKBOX_SIZE, radius);

  if (checked) {
    doc.fillColor(BORDER).fill();
    doc
      .moveTo(MARGIN + px(2.5), boxY + CHECKBOX_SIZE / 2)
      .lineTo(MARGIN + CHECKBOX_SIZE / 2 - px(0.5), boxY + CHECKBOX_SIZE - px(3))
      .lineTo(MARGIN + CHECKBOX_SIZE - px(2), boxY + px(2.5))
      .strokeColor('#ffffff')
      .lineWidth(1.4)
      .stroke();
  } else {
    doc.fillColor('#ffffff').fill();
    doc.lineWidth(1).strokeColor('#757575').stroke();
  }

  doc.fillColor('#000000').text(text, MARGIN + CHECKBOX_SIZE + px(8), y, {
    width: textWidth,
    lineGap: AGREEMENT_LINE_GAP,
  });
  doc.y = y + rowHeight + px(2);
}

function renderBlock(doc, block, data) {
  switch (block.type) {
    case 'doc-title':
      doc.fillColor(BORDER);
      writeParagraph(doc, block.text, {
        fontSize: AGREEMENT_TITLE,
        bold: true,
        align: 'center',
        gap: px(2),
      });
      doc.fillColor('#000000');
      break;
    case 'part-title':
      doc.fillColor('#000000');
      writeParagraph(doc, block.text, {
        fontSize: AGREEMENT_PART,
        bold: true,
        align: 'center',
        gap: px(6),
      });
      break;
    case 'h3':
      doc.fillColor(BORDER);
      writeParagraph(doc, block.text, {
        fontSize: AGREEMENT_H3,
        bold: true,
        gap: px(4),
      });
      doc.fillColor('#000000');
      break;
    case 'term-p': {
      doc.y += px(4);
      doc.font(pdfFont(doc, true)).fontSize(AGREEMENT_FONT).text(`${block.term} `, MARGIN, doc.y, {
        continued: true,
        lineGap: AGREEMENT_LINE_GAP,
      });
      doc.font(pdfFont(doc, false)).text(block.text, {
        width: CONTENT_WIDTH,
        align: 'justify',
        lineGap: AGREEMENT_LINE_GAP,
      });
      doc.y += px(4);
      break;
    }
    case 'checkbox':
      drawCheckbox(doc, block.checked, block.text);
      break;
    case 'signature-line': {
      const plain = decodeHtml(block.inner || '');
      if (/Full Name:/i.test(plain)) {
        writeParagraph(doc, plain, { marginTop: px(10), gap: px(4) });
        break;
      }
      doc.y += px(8);
      doc.font(pdfFont(doc, false)).fontSize(AGREEMENT_FONT).text('Signature:', MARGIN, doc.y, {
        continued: false,
      });
      const signature = loadDataUriImage(data.signature);
      if (data.acknowledged && signature) {
        doc.image(signature, MARGIN + px(52), doc.y - px(12), {
          fit: [px(280), px(55)],
        });
        doc.y += px(55);
      } else {
        doc.text(' ______________________', MARGIN + px(52), doc.y - px(10));
        doc.y += px(14);
      }
      break;
    }
    case 'p':
    default:
      writeParagraph(doc, block.text, {
        fontSize: AGREEMENT_FONT,
        gap: px(4),
      });
      break;
  }
}

async function renderAgreement(doc, data) {
  const templateCandidates = [
    path.join(__dirname, '../templates/invoice-agreement.ejs'),
    path.join(process.cwd(), 'templates/invoice-agreement.ejs'),
    path.join(process.cwd(), 'backend/templates/invoice-agreement.ejs'),
  ];
  const templatePath = templateCandidates.find((candidate) => fs.existsSync(candidate));
  if (!templatePath) {
    throw new Error('invoice-agreement.ejs template not found on server');
  }

  const html = await ejs.renderFile(templatePath, { data });
  const blocks = parseAgreementHtml(html);

  doc.addPage();
  doc.x = MARGIN;
  doc.y = MARGIN;
  doc.fillColor('#000000');

  for (const block of blocks) {
    renderBlock(doc, block, data);
  }
}

module.exports = { renderAgreement };
