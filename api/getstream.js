import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  let browser = null;

  try {
    // TEST: Hardcoded TMDB ID
    const tmdbId = "1226863";

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      defaultViewport: chromium.defaultViewport,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    
    // STEALTH MODE
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      window.chrome = { runtime: {} };
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    let foundStreamUrl = null;
    const allRequests = [];
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      // Catching all hyperlinks/script/api requests to see what React is doing
      if (!url.includes('.css') && !url.includes('.js') && !url.includes('.woff') && !url.includes('.png') && !url.includes('.svg') && !url.includes('google')) {
        allRequests.push(url);
      }
      if (url.includes('.m3u8') || url.includes('.mp4')) {
        foundStreamUrl = url;
      }
      request.continue();
    });

    const movieUrl = `https://cineby.tech/movie/${tmdbId}/watch?autostart=true`;
    
    await page.goto(movieUrl, {
      waitUntil: 'load',
      timeout: 10000
    }).catch(() => {});

    // Wait 4 seconds for the React player to render
    await new Promise(r => setTimeout(r, 4000));

    // Scroll to the middle of the page just in case the player is lower
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await new Promise(r => setTimeout(r, 1000));

    // Try to click a play button by its text or common classes
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
        const playButton = buttons.find(b => b.textContent.includes('Play') || b.classList.contains('vjs-big-play-button') || b.classList.contains('plyr__control'));
        if (playButton) playButton.click();
      });
    } catch (e) { /* ignore */ }
    
    await new Promise(r => setTimeout(r, 3000));

    const bodyHtml = await page.evaluate(() => document.body.innerHTML).catch(() => 'Could not get body HTML');
    
    await browser.close();
    browser = null;

    if (foundStreamUrl) {
      return res.status(200).json({ success: true, streamUrl: foundStreamUrl });
    } else {
      // Increase snippet to 4000 chars to see the video player area
      const snippet = bodyHtml.substring(0, 4000);
      return res.status(404).json({
        success: false,
        error: `Timeout. Requests: ${JSON.stringify(allRequests)} | Body HTML: ${snippet}`
      });
    }

  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return res.status(500).json({
      error: 'Chromium crash reason: ' + error.message
    });
  }
          }
      
