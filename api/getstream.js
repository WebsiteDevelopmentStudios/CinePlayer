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

    // STEP 3: Extract and fetch the "unfortunatelyejectinflected" URL
    const tokenUrlMatch = html2.match(/https:\/\/unfortunatelyejectinflected\.com\/[^"'\\\s]+/);
    
    if (!tokenUrlMatch) {
      return res.status(404).json({ error: "Token URL not found in HTML" });
    }
    
    const tokenUrl = tokenUrlMatch[0];

    // Fetch the token URL and capture everything
    const tokenRes = await fetch(tokenUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': movieUrl,
        'Accept': '*/*'
      },
      redirect: 'manual' // Don't follow redirects, so we can see where it wants to send us
    });

    const tokenText = await tokenRes.text();

    // Get all headers
    const headers = {};
    tokenRes.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return res.status(200).json({
      message: "Token URL fetched",
      tokenUrl: tokenUrl,
      tokenStatus: tokenRes.status,
      tokenHeaders: headers,
      tokenResponseSnippet: tokenText.slice(0, 1000) // See if it returns JSON or JS
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
}
  
