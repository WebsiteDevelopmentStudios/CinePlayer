export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Fetching directly from 2embed.skin based on the redirect we saw
    const response = await fetch(`https://www.2embed.skin/embed/movie/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach 2embed.skin (Status: ${response.status})` });
    }

    const html = await response.text();

    if (html.includes('.m3u8')) {
      const index = html.indexOf('.m3u8');
      const snippet = html.substring(Math.max(0, index - 400), index + 400);
      return res.status(200).json({ message: "Found .m3u8 in HTML!", snippet: snippet });
    } else {
      return res.status(404).json({ error: "No .m3u8 found, here is what we got:", snippet: html.substring(0, 1500) });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
  }
