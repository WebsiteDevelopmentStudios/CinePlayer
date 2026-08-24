import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { imdb } = req.query;
  
  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  let browser = null;

  try {
    // STEP 1: Fetch 2embed.cc to find the TMDB ID
    const response1 = await fetch(`https://2embed.cc/embed/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://2embed.cc/'
      }
    });

    const html1 = await response1.text();
    const tmdbMatch = html1.match(/tmdb=(\d+)/);
    
    if (!tmdbMatch || !tmdbMatch[1]) {
      return res.status(404).json({ error: "Could not find TMDB ID on 2embed" });
    }

    const tmdbId = tmdbMatch[1];

    // STEP 2: Launch Headless Browser
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
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.m3u8') || url.includes('.mp4')) {
        foundStreamUrl = url;
      }
      request.continue();
    });

    // STEP 3: Navigate to the movie page
    const movieUrl = `https://cineby.tech/movie/${tmdbId}/watch?autostart=true`;
    
    await page.goto(movieUrl, {
      waitUntil: 'load',
      timeout: 10000
    }).catch(() => {});

    // Wait 4 seconds for React to render
    await new Promise(r => setTimeout(r, 4000));

    // Scroll down to make sure the player is in view
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await new Promise(r => setTimeout(r, 1000));

    // STEP 4: Click the play button
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
        const playButton = buttons.find(b => b.textContent.includes('Play') || b.classList.contains('vjs-big-play-button') || b.classList.contains('plyr__control'));
        if (playButton) playButton.click();
      });
    } catch (e) { /* ignore */ }
    
    await new Promise(r => setTimeout(r, 3000));

    await browser.close();
    browser = null;

    // STEP 5: Return the intercepted URL
    if (foundStreamUrl) {
      return res.status(200).json({
        success: true,
        streamUrl: foundStreamUrl
      });
    } else {
      return res.status(404).json({
        success: false,
        error: "Timeout or could not bypass anti-bot."
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
        
