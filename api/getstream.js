import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

// Point to the root 'libs' folder
const libsPath = path.join(process.cwd(), 'libs');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { imdb } = req.query;
  
  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }
  
  let browser = null;
  let diagnostics = {};
  
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

    // DIAGNOSTICS GATHERING
    let libsContent = [];
    if (fs.existsSync(libsPath)) {
      libsContent = fs.readdirSync(libsPath);
    }
    diagnostics.arch = process.arch;
    diagnostics.libsPathExists = fs.existsSync(libsPath);
    diagnostics.libsFolderContents = libsContent;
    diagnostics.libsPathValue = libsPath;

    // STEP 2: Launch Headless Browser
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      env: {
        ...process.env,
        LD_LIBRARY_PATH: `${libsPath}:${process.env.LD_LIBRARY_PATH || ''}`,
      },
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    
    let foundStreamUrl = null;
    
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('.m3u8') && !url.includes('cineby.hair/_stream')) {
        foundStreamUrl = url;
      }
      request.continue();
    });

    // STEP 3: Navigate to the movie page
    const movieUrl = `https://cineby.hair/movie/${tmdbId}?autostart=true`;
    await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 12000 }).catch(() => {});
    
    await browser.close();

    // STEP 4: Return the intercepted URL
    if (foundStreamUrl) {
      return res.status(200).json({ success: true, streamUrl: foundStreamUrl });
    } else {
      return res.status(404).json({ success: false, error: "Timeout or could not bypass anti-bot." });
    }
  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ 
      error: "Crash reason: " + error.message,
      diagnostics: diagnostics
    });
  }
      }
    
