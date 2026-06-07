const fs = require('fs');

let content = fs.readFileSync('backend/server.js', 'utf-8');

const loginRe = /apiRouter\.post\('\/login', async \(req, res\) => \{([\s\S]*?)\n\}\);/;
content = content.replace(loginRe, "apiRouter.post('/login', async (req, res, next) => {\n  try {$1\n  } catch (err) { next(err); }\n});");

const regRe = /apiRouter\.post\('\/register', async \(req, res\) => \{([\s\S]*?)\n\}\);/;
content = content.replace(regRe, "apiRouter.post('/register', async (req, res, next) => {\n  try {$1\n  } catch (err) { next(err); }\n});");

const authMeRe = /apiRouter\.get\('\/auth\/me', async \(req, res\) => \{([\s\S]*?)\n\}\);/;
content = content.replace(authMeRe, "apiRouter.get('/auth/me', async (req, res, next) => {\n  try {$1\n  } catch (err) { next(err); }\n});");

const resetRe = /apiRouter\.post\('\/reset-password', async \(req, res\) => \{([\s\S]*?)\n\}\);/;
content = content.replace(resetRe, "apiRouter.post('/reset-password', async (req, res, next) => {\n  try {$1\n  } catch (err) { next(err); }\n});");

const linkRe = /apiRouter\.post\('\/link-discord', async \(req, res\) => \{([\s\S]*?)\n\}\);/;
content = content.replace(linkRe, "apiRouter.post('/link-discord', async (req, res, next) => {\n  try {$1\n  } catch (err) { next(err); }\n});");

const statsRe = /apiRouter\.get\('\/global\/stats', async \(req, res\) => \{([\s\S]*?)\n\}\);/;
content = content.replace(statsRe, "apiRouter.get('/global/stats', async (req, res, next) => {\n  try {$1\n  } catch (err) { next(err); }\n});");

fs.writeFileSync('backend/server.js', content);
console.log("Patched server.js with try/catch blocks for API routes.");
