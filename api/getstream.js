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

    // STEP 2: Fetch cineby.hair using the TMDB ID
    const response2 = await fetch(`https://cineby.hair/movie/${tmdbId}?autostart=true`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://cineby.hair/'
      }
    });

    const html2 = await response2.text();

    // STEP 3: Search for common player variables
    const keywords = ['sources', 'file:', 'src:', 'api', 'fetch(', 'm3u8', 'playlist'];
    let snippets = [];

    keywords.forEach(keyword => {
      let index = html2.indexOf(keyword);
      if (index !== -1) {
        // Grab 200 chars before and after the keyword
        snippets.push({
          keyword: keyword,
          snippet: html2.substring(Math.max(0, index - 200), index + 200)
        });
      }
    });

    return res.status(200).json({ 
      message: "Found keywords",
      snippets: snippets
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
      }
                                            
