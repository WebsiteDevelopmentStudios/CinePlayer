export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

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
    const movieUrl = `https://cineby.hair/movie/${tmdbId}?autostart=true`;

    // STEP 2: Fetch cineby.hair using the TMDB ID
    const response2 = await fetch(movieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://cineby.hair/'
      }
    });
    const html2 = await response2.text();

    // STEP 3: Search for any .m3u8 URL directly inside the cineby HTML
    const m3u8Match = html2.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
    const m3u8Url = m3u8Match ? m3u8Match[0].replace(/\\\//g, '/') : null;

    // STEP 4: Search for the Cloudflare Worker URL to see what it's attached to
    const workerMatch = html2.match(/https:\/\/fetch\.streaming-1\.workers\.dev\/fetch\?url=([^\s"'\\]+)/);
    
    let workerUrl = null;
    let workerContext = null;
    
    if (workerMatch && workerMatch[1]) {
      workerUrl = decodeURIComponent(workerMatch[1]);
      // Grab 100 characters before and 200 after the worker URL to understand how it's embedded
      const startIndex = workerMatch.index;
      workerContext = html2.substring(Math.max(0, startIndex - 100), startIndex + workerMatch[0].length + 200);
    }

    // STEP 5: Evaluate and return findings
    if (m3u8Url) {
      // If we find the direct m3u8, we are good to go!
      return res.status(200).json({
        success: true,
        streamUrl: m3u8Url,
        message: "Direct m3u8 found on cineby.hair"
      });
    } else if (workerUrl) {
      // If only the worker URL was found, return the context so we can debug
      return res.status(200).json({
        success: false,
        message: "No direct m3u8 found, but worker URL exists inside a JS tag. Returning context to debug.",
        movieUrl: movieUrl,
        workerUrl: workerUrl,
        workerContext: workerContext
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        error: "Neither m3u8 nor Worker Stream URL found in HTML",
        movieUrl: movieUrl
      });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
  }
  
