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

    // Let's return a snippet of the 2embed HTML to see what's there
    const tmdbIndex = html1.indexOf('tmdb');
    const snippet1 = tmdbIndex !== -1 ? html1.substring(Math.max(0, tmdbIndex - 200), tmdbIndex + 200) : html1.substring(0, 500);

    return res.status(200).json({ 
      message: "2embed HTML snippet",
      snippet: snippet1
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
}
