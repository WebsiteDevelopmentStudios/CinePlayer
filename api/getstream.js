export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    const response = await fetch(`https://2embed.cc/embed/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://2embed.cc/'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach streaming site (Status: ${response.status})` });
    }

    const html = await response.text();

    const match = html.match(/"file":"(https:\/\/[^"]*\.m3u8[^"]*)"/);

    if (match && match[1]) {
      res.status(200).json({ success: true, streamUrl: match[1] });
    } else {
      res.status(404).json({ error: "Stream link not found in HTML" });
    }
  } catch (error) {
    res.status(500).json({ error: "Crash reason: " + error.message });
  }
        }
