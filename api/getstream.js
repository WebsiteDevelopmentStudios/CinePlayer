export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Using moviesapi.club which returns a clean JSON array of streams
    const response = await fetch(`https://moviesapi.club/api/movie/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach API (Status: ${response.status})` });
    }

    const data = await response.json();

    // The API returns an array of streams like: [{ name: "Server 1", url: "https://...m3u8" }]
    if (data && data.length > 0 && data[0].url) {
      // Send the first available stream to the player
      return res.status(200).json({ success: true, streamUrl: data[0].url });
    } else {
      return res.status(404).json({ error: "No streams found for this IMDb ID" });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
}
