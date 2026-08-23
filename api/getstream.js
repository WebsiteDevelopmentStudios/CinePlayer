export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Using 2Embed's official JSON API
    const response = await fetch(`https://www.2embed.to/api/json?id=${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach API (Status: ${response.status})` });
    }

    const data = await response.json();

    // 2Embed JSON returns an array of streams, e.g., [{ "name": "Server 1", "link": "https://...m3u8", "filename": "1080p" }]
    if (Array.isArray(data) && data.length > 0) {
      let finalUrl = null;

      // Look for an m3u8 link first
      const m3u8Stream = data.find(s => s.link && s.link.includes('.m3u8'));
      if (m3u8Stream) {
        finalUrl = m3u8Stream.link;
      } else {
        // If no m3u8, grab the first available link (usually mp4)
        finalUrl = data[0].link;
      }

      return res.status(200).json({ success: true, streamUrl: finalUrl });
    } else {
      return res.status(404).json({ error: "No streams found via API" });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
  }
        
