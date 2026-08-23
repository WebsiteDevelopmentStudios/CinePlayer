export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { imdb } = req.query;
  
  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }
  
  try {
    // STEP 1: Fetch 2embed.cc to find the TMDB ID
    const response1 = await fetch(`https://2embed.cc/embed/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://2embed.cc/'
      }
    });
    
    const html1 = await response1.text();
    const tmdbMatch = html1.match(/tmdb=(\d+)/);
    
    if (!tmdbMatch || !tmdbMatch[1]) {
      return res.status(404).json({ error: "Could not find TMDB ID on 2embed" });
    }
    
    const tmdbId = tmdbMatch[1];

    // STEP 2: Fetch the movie page natively (No headless browser needed!)
    const response2 = await fetch(`https://cineby.hair/movie/${tmdbId}?autostart=true`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://cineby.hair/'
      }
    });
    
    const html2 = await response2.text();

    // STEP 3: Search for the m3u8 URL inside the returned HTML/Next.js payload
    // This regex looks for any URL ending in .m3u8
    const match = html2.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/);
    
    if (match && match[0]) {
      return res.status(200).json({ 
        success: true, 
        streamUrl: match[0] 
      });
    } else {
      // If it's not in the HTML, it means the site generates it dynamically with deeper JavaScript
      return res.status(404).json({ 
        success: false, 
        error: "m3u8 link not found in HTML. Dynamic JS execution might still be required." 
      });
    }
  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
}
  
