export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Fetching from Embed.su
    const response = await fetch(`https://embed.su/embed/movie/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://embed.su/'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach Embed.su (Status: ${response.status})` });
    }

    const html = await response.text();

    // Check if .m3u8 is anywhere in the code
    if (html.includes('.m3u8')) {
      // Extract a 400 character snippet around the m3u8 link so we can see how they format it
      const index = html.indexOf('.m3u8');
      const snippet = html.substring(Math.max(0, index - 400), index + 400);
      return res.status(200).json({ message: "Found .m3u8!", snippet: snippet });
    } else {
      return res.status(404).json({ error: "No m3u8 on Embed.su" });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
                                     }
        
