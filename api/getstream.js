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
    
    // STEALTH MODE
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      window.chrome = {
        runtime: {},
      };
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

    let foundStreamUrl = null;
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if ((url.includes('.m3u8') || url.includes('.mp4')) && !url.includes('cineby.hair/_stream')) {
        foundStreamUrl = url;
      }
      request.continue();
    });

    // STEP 3: Navigate to the movie page and capture the HTTP status
    const movieUrl = `https://cineby.hair/movie/${tmdbId}?autostart=true`;
    
    let httpStatus = 0;
    await page.goto(movieUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 8000
    }).then(resp => {
      if (resp) httpStatus = resp.status();
    }).catch(() => {});

    // STEP 4: Try to click the Play button if it exists
    try {
      await page.click('.vjs-big-play-button', { timeout: 2000 });
    } catch (e) { /* ignore */ }
    
    try {
      await page.click('button[title="Play"]', { timeout: 2000 });
    } catch (e) { /* ignore */ }

    // STEP 5: Poll for the stream URL for up to 4 seconds
    for (let i = 0; i < 4; i++) {
      if (foundStreamUrl) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    await browser.close();
    browser = null;

    // STEP 6: Return the intercepted URL
    if (foundStreamUrl) {
      return res.status(200).json({
        success: true,
        streamUrl: foundStreamUrl
      });
    } else {
      return res.status(404).json({
        success: false,
        error: `Timeout. HTTP Status: ${httpStatus}`
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
      
