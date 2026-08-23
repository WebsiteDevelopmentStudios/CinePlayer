export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Call MultiEmbed's direct stream API
    const response = await fetch(`https://multiembed.mov/directstream?video_id=${imdb}`, {
      redirect: 'follow', // Tells Vercel to follow the redirect to the final .m3u8 URL
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach MultiEmbed (Status: ${response.status})` });
    }

    // By this point, response.url contains the final redirect URL (which should be the .m3u8)
    const streamUrl = response.url;

    if (streamUrl && streamUrl.includes('.m3u8')) {
      res.status(200).json({ success: true, streamUrl: streamUrl });
    } else {
      // If it didn't redirect to an m3u8, let's see what it redirected to
      res.status(404).json({ error: "Did not redirect to an m3u8 file.", finalUrl: streamUrl });
    }

  } catch (error) {
    res.status(500).json({ error: "Crash reason: " + error.message });
  }
        }
