export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    const response = await fetch(`https://2embed.to/embed/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://2embed.to/'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach 2embed.to (Status: ${response.status})` });
    }

    const html = await response.text();

    // Search the HTML to see if ".m3u8" appears ANYWHERE in the code.
    if (html.includes('.m3u8')) {
      // If it does, extract 1000 characters around the first ".m3u8" match so we can see how it's hidden
      const index = html.indexOf('.m3u8');
      const snippet = html.substring(Math.max(0, index - 300), index + 300);
      return res.status(200).json({ message: "Found .m3u8 in HTML", snippet: snippet });
    } else {
      return res.status(404).json({ error: "2Embed does not have an m3u8 link in the HTML. It might be Base64 encoded." });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
      }
      
