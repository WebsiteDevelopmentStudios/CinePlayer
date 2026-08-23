export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Using SuperEmbed API
    const response = await fetch(`https://multiembed.mov/?video_id=${imdb}`);

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach SuperEmbed (Status: ${response.status})` });
    }

    const data = await response.json();

    // SuperEmbed returns an array of streams: [{url: "https://...m3u8", name: "Server 1"}, ...]
    if (data && data.length > 0 && data[0].url) {
      res.status(200).json({ success: true, streamUrl: data[0].url });
    } else {
      res.status(404).json({ error: "Stream link not found in API response", apiResponse: data });
    }

  } catch (error) {
    res.status(500).json({ error: "Crash reason: " + error.message });
  }
      }
