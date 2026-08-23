export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Fetching from Gomo.to which is very scrape-friendly
    const response = await fetch(`https://gomo.to/movie/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();

    if (html.includes('.m3u8')) {
      const index = html.indexOf('.m3u8');
      const snippet = html.substring(Math.max(0, index - 300), index + 300);
      return res.status(200).json({ message: "Found .m3u8 on Gomo!", snippet: snippet });
    } else {
      return res.status(404).json({ error: "No m3u8 on Gomo" });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
  }
                                 
