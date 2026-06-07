const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  
  // Try to login
  await page.type('input[type="text"]', 'testuser');
  await page.type('input[type="password"]', 'testpass');
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 3000));
  console.log("Finished waiting after login click.");
  await browser.close();
})();
