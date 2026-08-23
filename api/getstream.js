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

    // STEP 3: Extract all Next.js script chunk URLs
    const scriptUrls = [...new Set(html2.match(/\/_next\/static\/chunks\/[^"'\s]+\.js/g) || [])];
    const absoluteScriptUrls = scriptUrls.map(url => `https://cineby.hair${url}`);

    // STEP 4: Search the first 5 large chunks for "m3u8" or "_stream"
    const searchResults = [];
    const limit = Math.min(absoluteScriptUrls.length, 10); // Check first 10 chunks

    for (let i = 0; i < limit; i++) {
      const url = absoluteScriptUrls[i];
      const scriptRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Referer': movieUrl
        }
      });
      const scriptText = await scriptRes.text();
      
      // We only care about strings that contain m3u8 or stream configuration
      if (scriptText.includes('m3u8') || scriptText.includes('/api/') || scriptText.includes('vidnest')) {
        // Extract the API endpoint URLs from the JS
        const apiMatches = [...new Set(scriptText.match(/["'](\/api\/[^"'\s]+)["']/g) || [])];
        
        searchResults.push({
          chunkUrl: url,
          foundKeywords: true,
          apiEndpoints: apiMatches.slice(0, 5) // Limit to 5 results per chunk
        });
      }
    }

    return res.status(200).json({
      message: "Extracted API routes from Next.js JS chunks",
      tmdbId: tmdbId,
      scriptChunksFound: absoluteScriptUrls.length,
      searchResults: searchResults
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
      }
        
