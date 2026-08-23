export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // Fetching the vnest.js file from 2embed.cc
    const response = await fetch(`https://streamsrcs.2embed.cc/vnest.js?tmdb=502356`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://streamsrcs.2embed.cc/vnest?tmdb=502356'
      }
    });

    if (!response.ok) {
      return res.status(404).json({ error: `Failed to fetch vnest.js (Status: ${response.status})` });
    }

    const jsText = await response.text();

    // Print the first 3000 characters of the JS file so we can see where the video is hidden
    return res.status(200).json({ 
      jsLength: jsText.length, 
      jsPreview: jsText.substring(0, 3000) 
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
      }
      
