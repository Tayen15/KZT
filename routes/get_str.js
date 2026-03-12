const text = require('fs').readFileSync('../../web/src/app/dashboard/owner/page.tsx', 'utf8');
const start = text.indexOf('<div className="space-y-3">');
const end = text.indexOf('</div>\n            </div>\n          </div>');
console.log(text.substring(start, end));