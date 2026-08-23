export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Fetching directly from 2embed.cc again (since we know it works)
    const response = await fetch(`https://2embed.cc/embed/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to reach 2embed.cc (Status: ${response.status})` });
    }

    const html = await response.text();

    // Let's print the ENTIRE HTML so we can see what is going on
    return res.status(200).json({ 
      htmlLength: html.length, 
      fullHtml: html 
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
    }
