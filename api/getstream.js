export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Using the confirmed LIVE domain: vidsrc2.ru
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

    // Search for any https link containing .m3u8 in the HTML
    const match = html.match(/(https:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/);

    if (match && match[1]) {
      res.status(200).json({ success: true, streamUrl: match[1] });
    } else {
      res.status(404).json({ error: "Stream link not found in HTML" });
    }
  } catch (error) {
    res.status(500).json({ error: "Crash reason: " + error.message });
  }
        }                                                                       
