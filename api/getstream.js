import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';
import fs from 'fs';

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

    // STEP 2: Fix Amazon Linux 2023 (Node 20) missing libraries automatically
    if (!fs.existsSync('/tmp/libnss3.so')) {
      console.log("Downloading missing nss libraries for Node 20...");
      execSync('curl -sL https://github.com/ultrasecurity/nss-shared-libaries/raw/main/nss_libs.tar.gz -o /tmp/nss.tar.gz');
      execSync('tar -xzf /tmp/nss.tar.gz -C /tmp/');
      console.log("Libraries extracted successfully.");
    }

    // STEP 3: Launch Headless Browser
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      env: {
        ...process.env,
        // Tell Linux to use our freshly downloaded .so files
        LD_LIBRARY_PATH: `/tmp:${process.env.LD_LIBRARY_PATH || ''}`,
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

    // STEP 4: Navigate to the movie page
    const movieUrl = `https://cineby.hair/movie/${tmdbId}?autostart=true`;
    await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 12000 }).catch(() => {});
    
    await browser.close();

    // STEP 5: Return the intercepted URL
    if (foundStreamUrl) {
      return res.status(200).json({ success: true, streamUrl: foundStreamUrl });
    } else {
      return res.status(404).json({ success: false, error: "Timeout or could not bypass anti-bot." });
    }
  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
                }
                                  
