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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    const html1 = await response1.text();

    // Extract the TMDB ID (e.g., from "vnest?tmdb=502356")
    const tmdbMatch = html1.match(/tmdb=(\d+)/);
    if (!tmdbMatch || !tmdbMatch[1]) {
      return res.status(404).json({ error: "Could not find TMDB ID on 2embed" });
    }
    const tmdbId = tmdbMatch[1];

    // STEP 2: Fetch the final video host (cineby.hair) using the TMDB ID
    const response2 = await fetch(`https://cineby.hair/movie/${tmdbId}?autostart=true`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://streamsrcs.2embed.cc/'
      }
    });

    const html2 = await response2.text();

    // STEP 3: Check if the .m3u8 link is on this page!
    if (html2.includes('.m3u8')) {
      // Extract a 400 char snippet around it so we can see how they format the link
      const index = html2.indexOf('.m3u8');
      const snippet = html2.substring(Math.max(0, index - 400), index + 400);
      return res.status(200).json({ message: "Found .m3u8 on cineby.hair!", snippet: snippet });
    } else {
      return res.status(404).json({ error: "No m3u8 found on cineby.hair", snippet: html2.substring(0, 1500) });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
          }
      
