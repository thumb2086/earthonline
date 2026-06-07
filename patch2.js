const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf-8');

const const_del = /apiRouter\.post\('\/auth\/delete-account', async \(req, res\) => \{([\s\S]*?)\n\}\);/;
content = content.replace(const_del, "apiRouter.post('/auth/delete-account', async (req, res, next) => {\n  try {$1\n  } catch (err) { next(err); }\n});");

const const_gen = /apiRouter\.post\('\/auth\/generate-recovery-key', async \(req, res\) => \{([\s\S]*?)\n\}\);/;
content = content.replace(const_gen, "apiRouter.post('/auth/generate-recovery-key', async (req, res, next) => {\n  try {$1\n  } catch (err) { next(err); }\n});");

fs.writeFileSync('backend/server.js', content);
console.log("Patched remaining auth routes.");
