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

    // STEP 2: Test common Next.js API endpoints to bypass the frontend entirely
    const apiVariations = [
      `https://cineby.hair/api/source/${tmdbId}`,
      `https://cineby.hair/api/sources/${tmdbId}`,
      `https://cineby.hair/api/movie/${tmdbId}`,
      `https://cineby.hair/api/movies/${tmdbId}`,
      `https://cineby.hair/api/stream/${tmdbId}`
    ];

    const apiResults = [];

    for (const apiUrl of apiVariations) {
      const apiRes = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Referer': movieUrl,
          'Accept': 'application/json'
        }
      });
      
      const contentType = apiRes.headers.get('content-type') || 'unknown';
      const text = await apiRes.text();
      
      apiResults.push({
        url: apiUrl,
        status: apiRes.status,
        contentType: contentType,
        snippet: text.slice(0, 200)
      });
    }

    // STEP 3: Try fetching the HTML 1 more time and hunt deep for "playlist" or "file"
    const response2 = await fetch(movieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://cineby.hair/'
      }
    });
    const html2 = await response2.text();

    // Search for UP_HOST to understand what host the proxy is actually proxying to
    const upHostMatch = html2.match(/UP_HOST\s*=\s*['"]([^'"]+)['"]/);
    const myHostMatch = html2.match(/MY_HOST\s*=\s*['"]([^'"]+)['"]/);

    return res.status(200).json({
      message: "API Endpoint tests and variable extraction",
      apiResults: apiResults,
      proxyVariables: {
        UP_HOST: upHostMatch ? upHostMatch[1] : null,
        MY_HOST: myHostMatch ? myHostMatch[1] : null
      }
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
        }
            
