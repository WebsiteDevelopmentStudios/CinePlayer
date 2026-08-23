export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    const response = await fetch(`https://2embed.cc/embed/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();

    // Let's take a 1000 character snapshot of the middle of the page to see what we're working with
    let snippet;
    if (html.length > 1500) {
      // Grab a chunk from the middle of the code where scripts usually are
      snippet = html.substring(500, 2500);
    } else {
      snippet = html;
    }
    
    // Let's also check if they use Base64 encoding (atob)
    const usesBase64 = html.includes('atob') || html.includes('base64');
    
    return res.status(200).json({ 
      usesBase64: usesBase64, 
      snippet: snippet 
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
}
