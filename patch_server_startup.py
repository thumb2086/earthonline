import re

with open('backend/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

patch = """let globalProduction = 0;

// Initialize global production immediately on startup
db.getGlobalProduction().then(val => {
  globalProduction = val;
}).catch(err => console.error('[SYS] Failed to init global production:', err));

setInterval(async () => {
  try {
    globalProduction = await db.getGlobalProduction();"""

content = content.replace("""let globalProduction = 0;
setInterval(async () => {
  try {
    globalProduction = await db.getGlobalProduction();""", patch)

with open('backend/server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched server.js for globalProduction initialization")
