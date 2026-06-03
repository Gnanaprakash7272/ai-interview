const puppeteer = require('puppeteer');
const http = require('http');

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
  });
}

(async () => {
  let port = 3000;
  const is3000 = await checkPort(3000);
  if (!is3000) {
    const is3001 = await checkPort(3001);
    if (is3001) port = 3001;
    else {
      console.log("Could not find server on port 3000 or 3001.");
      process.exit(1);
    }
  }

  const BASE_URL = `http://localhost:${port}`;
  console.log(`Using base URL: ${BASE_URL}`);

  const browser = await puppeteer.launch({ 
    headless: "new",
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // 1. Take a screenshot of the Home/Login page
    console.log("Navigating to Login...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'public/screenshots/login.png' });
    
    // 2. Register a dummy user to access the dashboard
    console.log("Registering dummy user...");
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0' });
    
    await page.type('#name', 'Candidate Test');
    const uniqueEmail = `test_${Date.now()}@example.com`;
    await page.type('#email', uniqueEmail);
    await page.type('#password', 'password123');
    
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    console.log("Waiting for dashboard...");
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Taking Dashboard screenshot...");
    await page.screenshot({ path: 'public/screenshots/dashboard.png' });
    
    // 3. Create a new interview to get to the interview room
    console.log("Creating new interview...");
    
    // Click "New Interview" button
    const startBtn = await page.$('button.start-btn');
    if (startBtn) {
        await startBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        
        // Select domain
        await page.select('select', 'Frontend Developer');
        
        // Select difficulty (Beginner)
        const diffBtns = await page.$$('button.diff-btn');
        for (let btn of diffBtns) {
           const text = await page.evaluate(el => el.textContent, btn);
           if (text.includes('Beginner')) {
               await btn.click();
               break;
           }
        }
        
        // Submit
        const genBtn = await page.$('button.modal-submit-btn');
        if (!genBtn) {
           const buttons = await page.$$('button');
           for (let btn of buttons) {
              const text = await page.evaluate(el => el.textContent, btn);
              if (text.includes('Generate')) {
                  await btn.click();
                  break;
              }
           }
        } else {
           await genBtn.click();
        }
           console.log("Waiting for interview room...");
           await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
           
           // Wait for UI to settle and camera to "start" (with fake streams)
           await new Promise(r => setTimeout(r, 5000));
           
           console.log("Taking Interview Room screenshot...");
           await page.screenshot({ path: 'public/screenshots/interview-room.png' });
    } else {
        console.log("Start button not found");
    }

  } catch (err) {
    console.error("Error during script:", err);
  } finally {
    await browser.close();
    console.log("Done!");
  }
})();
