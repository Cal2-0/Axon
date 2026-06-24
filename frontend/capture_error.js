import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  
  await page.goto('http://localhost:5173/wallet');
  
  // Fill the input
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  
  // Click the Investigate button
  // The button text is "INVESTIGATE WALLET"
  await page.click('button:has-text("Investigate")');
  
  // Wait a bit for the error to occur
  await page.waitForTimeout(5000);
  
  await browser.close();
})();
