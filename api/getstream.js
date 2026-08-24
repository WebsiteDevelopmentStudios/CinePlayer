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
      // Changed to cineby.tech and broadened the match to include /stream/ or index.m3u8
      if ((url.includes('.m3u8') || url.includes('.mp4') || url.includes('/stream/')) && !url.includes('cineby.tech')) {
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

    // Wait 2 seconds for the React app to build the video player
    await new Promise(r => setTimeout(r, 2000));

    // STEP 4: Click in the center of the screen to trigger autoplay
    await page.mouse.click(683, 384);
    
    // Also try standard play buttons just in case
    try {
      await page.click('.vjs-big-play-button', { timeout: 1000 });
    } catch (e) { /* ignore */ }

    // STEP 5: Poll for the stream URL for up to 7 seconds
    for (let i = 0; i < 7; i++) {
      if (foundStreamUrl) break;
      await new Promise(r => setTimeout(r, 1000));
    }

    const pageTitle = await page.title().catch(() => 'No Title');
    
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
        error: `Timeout. Page Title: ${pageTitle}`
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
  
