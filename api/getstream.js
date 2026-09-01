import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Allow Vercel to run this function for up to 60 seconds
export const config = {
  maxDuration: 14,
};

// Our own internal limit, raised to 25 seconds
const HARD_TIMEOUT = 14000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { imdb } = req.query;
  
  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  let browser = null;

  const task = new Promise(async (resolve, reject) => {
    let timeoutId = setTimeout(() => {
      reject(new Error("Timeout limit reached"));
    }, HARD_TIMEOUT);

    try {
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
      
      // Passive listener, don't intercept
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('.m3u8') || url.includes('.mp4')) {
          foundStreamUrl = url;
        }
      });

      const movieUrl = `https://cineby.tech/movie/${tmdbId}/watch?autostart=true`;
      
      await page.goto(movieUrl, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});

      // Give React time to fully boot and render the player
      await new Promise(r => setTimeout(r, 3000));

      // Try to click play
      try {
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, [role="button"], a, div'));
          const playButton = buttons.find(b => 
            b.textContent.includes('Play') || 
            b.classList.contains('vjs-big-play-button') || 
            b.classList.contains('plyr__control')
          );
          if (playButton) playButton.click();
          document.elementFromPoint(640, 360)?.click();
        });
      } catch (e) { }
      
      // Wait up to 18 seconds for the stream URL
      for (let i = 0; i < 36; i++) {
        if (foundStreamUrl) break;
        await new Promise(r => setTimeout(r, 500));
      }

      if (browser) await browser.close().catch(()=>{});
      browser = null;
      clearTimeout(timeoutId);
      
      if (foundStreamUrl) {
        resolve({ success: true, streamUrl: foundStreamUrl });
      } else {
        reject(new Error("Video player did not load the stream in time."));
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
        
