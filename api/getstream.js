export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    const response = await fetch(`https://vidsrc2.ru/embed/movie/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://vidsrc2.ru/'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach vidsrc2.ru (Status: ${response.status})` });
    }

    const html = await response.text();

    // Let's return a chunk of the HTML so we can see exactly what Vercel is downloading
    if (html.length === 0) {
      return res.status(404).json({ error: "Page returned empty HTML" });
    }

    // Return the first 2000 characters of the HTML so we can inspect it
    res.status(200).json({ 
      success: false, 
      htmlPreview: html.substring(0, 2000) 
    });

  } catch (error) {
    res.status(500).json({ error: "Crash reason: " + error.message });
  }
}
