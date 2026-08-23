export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    const response1 = await fetch(`https://2embed.cc/embed/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    const html1 = await response1.text();

    let match1 = html1.match(/data-src="(https:\/\/streamsrcs\.2embed\.cc\/[^"]+)"/);
    
    if (!match1 || !match1[1]) {
      match1 = html1.match(/go\('(https:\/\/streamsrcs\.2embed\.cc\/vnest[^']+)'/);
    }

    if (!match1 || !match1[1]) {
      return res.status(404).json({ error: "Could not find hidden iframe link on 2embed" });
    }

    const iframeUrl = match1[1];

    const response2 = await fetch(iframeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://2embed.cc/'
      }
    });

    const html2 = await response2.text();

    // Let's return a 2000 character chunk of the inner page so we can see how they hide it
    return res.status(200).json({ 
      iframeUrl: iframeUrl,
      innerHtmlLength: html2.length,
      innerHtmlPreview: html2.substring(0, 2500) 
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
  }
      
