const fs = require('fs');
let content = fs.readFileSync('client/src/App.jsx', 'utf-8');

content = content.replace(/\$\{API_URL\}\/api\/reset-password/g, '${API_URL}/reset-password');
content = content.replace(/\$\{API_URL\}\/api\/auth\/me/g, '${API_URL}/auth/me');
content = content.replace(/\$\{API_URL\}\/api\/auth\/generate-recovery-key/g, '${API_URL}/auth/generate-recovery-key');
content = content.replace(/\$\{API_URL\}\/api\/auth\/delete-account/g, '${API_URL}/auth/delete-account');

fs.writeFileSync('client/src/App.jsx', content);
console.log('Fixed endpoints.');
