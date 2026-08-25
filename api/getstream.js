import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// We will aggressively enforce an 8.5 second limit to beat Vercel's 10s kill switch
const HARD_TIMEOUT = 8500;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { imdb } = req.query;
  
  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  let browser = null;

  // Promise wrapper to guarantee we respond fast
  const task = new Promise(async (resolve, reject) => {
    let timeoutId = setTimeout(() => {
      reject(new Error("Timeout limit reached"));
    }, HARD_TIMEOUT);

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
        clearTimeout(timeoutId);
        return reject(new Error("Could not find TMDB ID"));
      }

      const tmdbId = tmdbMatch[1];

      // STEP 2: Launch Headless Browser with aggressive speed optimizations
      browser = await puppeteer.launch({
        args: [...chromium.args, '--no-zygote', '--single-process'],
        executablePath: await chromium.executablePath(),
        headless: 'new',
        defaultViewport: { width: 1280, height: 720 },
      });

      const page = await browser.newPage();
      
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
        window.chrome = { runtime: {} };
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

      let foundStreamUrl = null;
      
      // STEP 3: Aggressively block unneeded assets to make page load instant!
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        const resourceType = request.resourceType();
        
        if (url.includes('.m3u8') || url.includes('.mp4')) {
          foundStreamUrl = url;
        }
        
        // Block heavy resources that slow down the browser
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          return request.abort();
        }
        
        request.continue();
      });

      // STEP 4: Navigate and click play
      const movieUrl = `https://cineby.tech/movie/${tmdbId}/watch?autostart=true`;
      
      await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});

      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
        const playButton = buttons.find(b => b.textContent.includes('Play') || b.classList.contains('vjs-big-play-button') || b.classList.contains('plyr__control'));
        if (playButton) playButton.click();
      }).catch(() => {});
      
      // Wait for stream URL to pass by
      for (let i = 0; i < 5; i++) {
        if (foundStreamUrl) break;
        await new Promise(r => setTimeout(r, 500));
      }

      if (browser) await browser.close().catch(()=>{});
      browser = null;
      clearTimeout(timeoutId);
      
      if (foundStreamUrl) {
        resolve({ success: true, streamUrl: foundStreamUrl });
      } else {
        reject(new Error("Timeout or could not bypass anti-bot."));
      }

    } catch (error) {
      if (browser) await browser.close().catch(()=>{});
      clearTimeout(timeoutId);
      reject(error);
    }
  });

  try {
    const result = await task;
    return res.status(200).json(result);
  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    return res.status(404).json({
      success: false,
      error: error.message
    });
  }
        }
               
