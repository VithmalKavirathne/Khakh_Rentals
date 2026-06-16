const path = require('path');
const ejs = require('ejs');
const {
  MARGIN,
  CONTENT_WIDTH,
  BORDER,
  FONT_BODY,
  loadDataUriImage,
} = require('./invoicePdfLayout');

const AGREEMENT_FONT = 8.5;
const AGREEMENT_H3 = 9.5;
const AGREEMENT_TITLE = 12;
const AGREEMENT_PART = 10;
const BOTTOM_MARGIN = 15;

function decodeHtml(text) {
  return text
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&deg;/g, '°')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAgreementHtml(html) {
  const blocks = [];
  const regex =
    /<(div class="doc-title"|div class="part-title"|h3|p)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const tag = match[1];
    const inner = match[2];

    if (tag.startsWith('div class="doc-title"')) {
      blocks.push({ type: 'doc-title', text: decodeHtml(inner) });
    } else if (tag.startsWith('div class="part-title"')) {
      blocks.push({ type: 'part-title', text: decodeHtml(inner) });
    } else if (tag === 'h3') {
      blocks.push({ type: 'h3', text: decodeHtml(inner) });
    } else if (tag === 'p') {
      if (inner.includes('<input type="checkbox"')) {
        blocks.push({
          type: 'checkbox',
          checked: !inner.includes('type="checkbox"') || inner.includes('checked'),
          text: decodeHtml(inner.replace(/<input[^>]*>/gi, '')),
        });
      } else if (inner.includes('<img') && inner.toLowerCase().includes('signature')) {
        blocks.push({ type: 'signature-line', inner });
      } else if (/Full Name:/i.test(inner)) {
        blocks.push({ type: 'p', text: decodeHtml(inner) });
      } else if (/^Signature:/i.test(decodeHtml(inner.replace(/<[^>]+>/g, '')))) {
        blocks.push({ type: 'signature-line', inner });
      } else {
        const termMatch = inner.match(/<span class="term">([\s\S]*?)<\/span>\s*([\s\S]*)/i);
        if (termMatch) {
          blocks.push({
            type: 'term-p',
            term: decodeHtml(termMatch[1]),
            text: decodeHtml(termMatch[2]),
          });
        } else {
          blocks.push({ type: 'p', text: decodeHtml(inner) });
        }
      }
    }
  }

  return blocks;
}

function ensureSpace(doc, heightNeeded) {
  const pageBottom = doc.page.height - BOTTOM_MARGIN;
  if (doc.y + heightNeeded > pageBottom) {
    doc.addPage();
    doc.x = MARGIN;
    doc.y = MARGIN;
  }
}

function writeParagraph(doc, text, opts = {}) {
  const width = opts.width || CONTENT_WIDTH;
  const fontSize = opts.fontSize || AGREEMENT_FONT;
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
  const height = doc.heightOfString(text, { width, align: opts.align || 'justify', lineGap: 1 });
  ensureSpace(doc, height + (opts.gap || 4));
  doc.text(text, MARGIN, doc.y, {
    width,
    align: opts.align || 'justify',
    lineGap: 1,
  });
  doc.y += opts.gap || 4;
}

function renderBlock(doc, block, data) {
  switch (block.type) {
    case 'doc-title':
      doc.fillColor(BORDER);
      writeParagraph(doc, block.text, {
        fontSize: AGREEMENT_TITLE,
        bold: true,
        align: 'center',
        gap: 2,
      });
      doc.fillColor('#000000');
      break;
    case 'part-title':
      doc.fillColor('#000000');
      writeParagraph(doc, block.text, {
        fontSize: AGREEMENT_PART,
        bold: true,
        align: 'center',
        gap: 6,
      });
      break;
    case 'h3':
      doc.fillColor(BORDER);
      writeParagraph(doc, block.text, {
        fontSize: AGREEMENT_H3,
        bold: true,
        gap: 2,
      });
      doc.fillColor('#000000');
      break;
    case 'term-p':
      ensureSpace(doc, 20);
      doc.font('Helvetica-Bold').fontSize(AGREEMENT_FONT).text(block.term, MARGIN, doc.y, {
        continued: true,
      });
      doc.font('Helvetica').text(` ${block.text}`, {
        width: CONTENT_WIDTH,
        align: 'justify',
        lineGap: 1,
      });
      doc.y += 4;
      break;
    case 'checkbox': {
      const marker = block.checked ? '☑' : '☐';
      writeParagraph(doc, `${marker} ${block.text}`, { fontSize: AGREEMENT_FONT, gap: 2 });
      break;
    }
    case 'signature-line': {
      ensureSpace(doc, 50);
      if (/Full Name:/i.test(block.inner || '')) {
        writeParagraph(doc, decodeHtml(block.inner || block.text || ''), { gap: 4 });
        break;
      }
      doc.font('Helvetica').fontSize(AGREEMENT_FONT).text('Signature:', MARGIN, doc.y, {
        continued: false,
      });
      const signature = loadDataUriImage(data.signature);
      if (data.acknowledged && signature) {
        doc.image(signature, MARGIN + 52, doc.y - 12, { width: 120, height: 36 });
        doc.y += 30;
      } else {
        doc.text(' ______________________', MARGIN + 52, doc.y - 10);
        doc.y += 14;
      }
      break;
    }
    case 'p':
    default:
      writeParagraph(doc, block.text, { fontSize: AGREEMENT_FONT, gap: 3 });
      break;
  }
}

async function renderAgreement(doc, data) {
  const templatePath = path.join(__dirname, '../templates/invoice-agreement.ejs');
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
