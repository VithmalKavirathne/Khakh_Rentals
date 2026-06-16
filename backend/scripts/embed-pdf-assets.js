const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../assets');
const logo = fs.readFileSync(path.join(assetsDir, 'logo.png'));
const diagram = fs.readFileSync(path.join(assetsDir, 'inspection-diagram.png'));

const contents = `/** Embedded PDF assets — fallback when backend/assets is missing on the server. */
module.exports = {
  logo: Buffer.from(${JSON.stringify(logo.toString('base64'))}, 'base64'),
  inspectionDiagram: Buffer.from(${JSON.stringify(diagram.toString('base64'))}, 'base64'),
};
`;

fs.writeFileSync(path.join(__dirname, '../services/embeddedPdfAssets.js'), contents);
console.log('embeddedPdfAssets.js written');
