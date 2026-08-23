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

    // STEP 2: Fetch cineby.hair using the TMDB ID
    const response2 = await fetch(`https://cineby.hair/movie/${tmdbId}?autostart=true`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://cineby.hair/'
      }
    });

    const html2 = await response2.text();

    // STEP 3: Search for the Cloudflare Worker stream URL
    const workerMatch = html2.match(/https:\/\/fetch\.streaming-1\.workers\.dev\/fetch\?url=[^\s"'\\]+/);
    
    if (workerMatch && workerMatch[0]) {
      const workerUrl = workerMatch[0];
      
      // STEP 4: Fetch the worker URL to see what it returns
      const response3 = await fetch(workerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Referer': 'https://cineby.hair/'
        }
      });

      const contentType = response3.headers.get('content-type');
      const text3 = await response3.text();

      // If it's an m3u8 file, return it directly
      if (contentType.includes('mpegurl') || text3.trim().startsWith('#EXTM3U')) {
        return res.status(200).json({ streamUrl: workerUrl });
      } 
      
      // If it's HTML or something else, let's look for an m3u8 link inside it
      const m3u8Match = text3.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/);
      if (m3u8Match && m3u8Match[0]) {
        return res.status(200).json({ streamUrl: m3u8Match[0] });
      }

      // Fallback: return a snippet so we can see what the worker returned
      return res.status(200).json({ 
        message: "Worker URL did not return m3u8 directly", 
        contentType: contentType,
        snippet: text3.substring(0, 500)
      });

    } else {
      return res.status(404).json({ error: "Stream URL not found in HTML" });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
      }
                                    
