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

    // STEP 3: Extract all script src tags
    const scriptSrcRegex = /<script[^>]+src=["']([^"']+)["']/g;
    let scripts = [];
    let match;
    while ((match = scriptSrcRegex.exec(html2)) !== null) {
      scripts.push(match[1]);
    }

    // STEP 4: Fetch each script and search for ".m3u8"
    let foundSnippets = [];
    
    for (const scriptUrl of scripts) {
      // Only check local Next.js chunks
      if (!scriptUrl.startsWith('/_next/')) continue;
      
      const fullUrl = `https://cineby.hair${scriptUrl}`;
      const scriptRes = await fetch(fullUrl);
      const scriptText = await scriptRes.text();

      if (scriptText.includes('.m3u8')) {
        // Find all occurrences of .m3u8 and grab surrounding code
        let idx = scriptText.indexOf('.m3u8');
        while (idx !== -1) {
          foundSnippets.push({
            file: scriptUrl,
            snippet: scriptText.substring(Math.max(0, idx - 300), idx + 300)
          });
          idx = scriptText.indexOf('.m3u8', idx + 1);
        }
      }
    }

    return res.status(200).json({ 
      message: "Searched all scripts",
      foundSnippets: foundSnippets
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
  }
    
