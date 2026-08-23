// api/getstream.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // 1. Fetch the embed page. We use a User-Agent header so the site doesn't block our Vercel server.
    const response = await fetch(`https://vidsrc.to/embed/movie/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: "Failed to reach streaming site" });
    }

    const html = await response.text();

    // 2. Scrape the HTML to find the .m3u8 link.
    // VidSrc usually hides the link in a JSON array or a source object.
    // This regex looks for a string containing https://...m3u8
    const match = html.match(/(https:\/\/[^"']*\.m3u8[^"']*)/);

    if (match && match[1]) {
      // 3. Send the raw, ad-free link back to your frontend
      res.status(200).json({ success: true, streamUrl: match[1] });
    } else {
      res.status(404).json({ error: "Stream link not found in HTML" });
    }
  } catch (error) {
    console.error("Scraping error:", error);
    res.status(500).json({ error: "Failed to scrape stream" });
  }
}
