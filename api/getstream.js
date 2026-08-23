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

    // STEP 2: Try the Vidnest.fun API directly to bypass the cineby.hair anti-bot mess
    const vidnestApiUrl = `https://vidnest.fun/api/source/movie/${tmdbId}`;
    
    const vidnestRes = await fetch(vidnestApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://cineby.hair/',
        'Accept': 'application/json',
        'Origin': 'https://vidnest.fun'
      }
    });

    const vidnestStatus = vidnestRes.status;
    const vidnestContentType = vidnestRes.headers.get('content-type') || 'unknown';
    const vidnestText = await vidnestRes.text();

    // Check if the response is JSON and contains an m3u8
    let parsedJson = null;
    let foundM3u8 = null;
    
    if (vidnestContentType.includes('application/json')) {
      try {
        parsedJson = JSON.parse(vidnestText);
        // Convert JSON to string to search for m3u8 deep inside the object
        const jsonStr = JSON.stringify(parsedJson);
        const m3u8Match = jsonStr.match(/https?:\/\/[^"]+\.m3u8[^"]*/);
        if (m3u8Match && m3u8Match[0]) {
          foundM3u8 = m3u8Match[0].replace(/\\\//g, '/'); // Unescape slashes if needed
        }
      } catch (e) {}
    }

    return res.status(200).json({
      success: foundM3u8 ? true : false,
      message: foundM3u8 ? "Found m3u8 via Vidnest API!" : "Vidnest API did not return a direct stream. We'll need a headless browser next.",
      tmdbId: tmdbId,
      vidnestApiUrl: vidnestApiUrl,
      vidnestStatus: vidnestStatus,
      vidnestContentType: vidnestContentType,
      foundM3u8: foundM3u8,
      apiResponseSnippet: vidnestText.slice(0, 1000) // Show us what it returned
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
  }
  
