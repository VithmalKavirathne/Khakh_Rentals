const { JSDOM } = require('jsdom');

function appendStyle(el, style) {
  const current = el.getAttribute('style') || '';
  el.setAttribute('style', `${current}${style}`);
}

/**
 * Inline CSS classes onto elements so html-to-pdfmake reproduces the
 * Puppeteer/Chrome invoice layout (JSDOM does not apply stylesheet classes reliably).
 */
function prepareHtmlForPdfMake(html) {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  const classStyles = {
    'bg-red': 'background-color:#e53935;color:#ffffff;font-weight:bold;',
    'bg-light-red': 'background-color:#ffcdd2;color:#333333;font-weight:bold;',
    'text-center': 'text-align:center;',
    'text-right': 'text-align:right;',
    'company-title': 'font-weight:bold;font-size:12px;line-height:1.4;',
  };

  Object.entries(classStyles).forEach(([className, style]) => {
    document.querySelectorAll(`.${className}`).forEach((el) => appendStyle(el, style));
  });

  document.querySelectorAll('.table-section th, .table-section td').forEach((el) => {
    appendStyle(el, 'border:1px solid #d32f2f;padding:4px;vertical-align:top;font-size:10px;');
  });

  document.querySelectorAll('.table-section').forEach((el) => {
    appendStyle(el, 'width:100%;border-collapse:collapse;margin-bottom:5px;');
  });

  document.querySelectorAll('.layout-table > tbody > tr > td').forEach((el, index) => {
    appendStyle(el, 'width:49%;vertical-align:top;border:none;padding:0;');
    if (index % 2 === 1) {
      appendStyle(el, 'padding-left:8px;');
    }
  });

  document.querySelectorAll('.header-table td').forEach((el) => {
    appendStyle(el, 'border:none;padding:0;vertical-align:top;');
  });

  document.querySelectorAll('.company-info').forEach((el) => {
    appendStyle(el, 'line-height:1.4;font-size:10px;');
  });

  document.querySelectorAll('.logo-placeholder img').forEach((el) => {
    appendStyle(el, 'height:70px;width:auto;');
  });

  document.querySelectorAll('.inspection-diagram').forEach((el) => {
    appendStyle(el, 'border:1px solid #d32f2f;min-height:150px;text-align:center;margin-bottom:5px;padding:4px;');
  });

  document.querySelectorAll('.inspection-diagram img').forEach((el) => {
    appendStyle(el, 'max-width:100%;max-height:200px;');
  });

  document.querySelectorAll('.special-conditions').forEach((el) => {
    appendStyle(el, 'color:#d32f2f;font-weight:bold;font-size:14px;line-height:1.5;margin-top:10px;');
  });

  document.querySelectorAll('.declaration').forEach((el) => {
    appendStyle(el, 'font-size:13px;line-height:1.6;margin-top:14px;color:#333333;');
  });

  document.querySelectorAll('.dec-title').forEach((el) => {
    appendStyle(el, 'font-weight:bold;font-size:14px;margin-bottom:4px;');
  });

  document.querySelectorAll('.sign-img').forEach((el) => {
    appendStyle(el, 'height:55px;max-width:280px;vertical-align:middle;');
  });

  document.querySelectorAll('.bank-line').forEach((el) => {
    appendStyle(el, 'font-weight:bold;font-size:13px;text-align:center;margin-top:14px;color:#333333;');
  });

  document.querySelectorAll('.important-wrap').forEach((el) => {
    appendStyle(el, 'text-align:center;margin-top:10px;');
  });

  document.querySelectorAll('.important-line').forEach((el) => {
    appendStyle(
      el,
      'font-weight:bold;font-size:13px;color:#d32f2f;text-align:center;border:2px solid #d32f2f;padding:8px 12px;display:inline-block;'
    );
  });

  document.querySelectorAll('.agreement').forEach((el) => {
    appendStyle(el, 'page-break-before:always;font-size:10.5px;line-height:1.5;color:#000000;text-align:justify;');
  });

  document.querySelectorAll('.agreement .doc-title').forEach((el) => {
    appendStyle(el, 'font-weight:bold;font-size:16px;text-align:center;color:#d32f2f;margin-bottom:2px;');
  });

  document.querySelectorAll('.agreement .part-title').forEach((el) => {
    appendStyle(el, 'font-weight:bold;font-size:14px;text-align:center;margin:10px 0;');
  });

  document.querySelectorAll('.agreement h3').forEach((el) => {
    appendStyle(el, 'font-size:12.5px;font-weight:bold;color:#d32f2f;margin:10px 0 4px;');
  });

  document.querySelectorAll('.agreement .term').forEach((el) => {
    appendStyle(el, 'font-weight:bold;');
  });

  document.querySelectorAll('.agreement p').forEach((el) => {
    appendStyle(el, 'margin:4px 0;');
  });

  document.body.setAttribute(
    'style',
    'font-size:10px;color:#333333;margin:0;padding:0;'
  );

  return dom.serialize();
}

module.exports = { prepareHtmlForPdfMake };
