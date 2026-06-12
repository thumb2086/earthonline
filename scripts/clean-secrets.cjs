const fs = require('fs');
try {
  let c = fs.readFileSync('v2.0.0-planning.md', 'utf8');
  c = c.replace(/Yhed2xVA_xNtxeXO6fLedrlXQX56zjvv/g, 'LEAKED_SECRET_REMOVED');
  c = c.replace(/pONcXJjk4d196Xxm/g, 'LEAKED_SECRET_REMOVED');
  c = c.replace(/mRbmivQH5iA8ANlaAsYqM2W2chRPADv1/g, 'LEAKED_SECRET_REMOVED');
  fs.writeFileSync('v2.0.0-planning.md', c, 'utf8');
} catch(e) {}
