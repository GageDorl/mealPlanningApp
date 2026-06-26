const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const TAG = '<meta name="google-site-verification" content="crS2o6_XLZpBKsQr7j_JeUP1pYpBM6Cz5zylyDitFzE" />';

if (html.includes('google-site-verification')) {
  console.log('google-site-verification already present, skipping.');
  process.exit(0);
}

html = html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n    ${TAG}`);
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Injected google-site-verification into dist/index.html');
