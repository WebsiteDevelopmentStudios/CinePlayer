// api/getstream.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  // Let's just return a fake link to see if the API runs at all
  return res.status(200).json({ 
    success: true, 
    streamUrl: "https://test.com/video.m3u8",
    message: "API is working! Received IMDb ID: " + imdb 
  });
}
      res.status(404).json({ error: "Stream link not found in HTML" });
    }
  } catch (error) {
    console.error("Scraping error:", error);
    // Return the exact error message so we can see it in the browser
    res.status(500).json({ error: "Crash reason: " + error.message }); 
  }

