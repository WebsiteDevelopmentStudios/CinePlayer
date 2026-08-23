export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  try {
    // STEP 1: Fetch 2embed.cc to find the hidden iframe link
    const response1 = await fetch(`https://2embed.cc/embed/${imdb}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    const html1 = await response1.text();

    // Extract the streamsrcs link from the data-src attribute
    let match1 = html1.match(/data-src="(https:\/\/streamsrcs\.2embed\.cc\/[^"]+)"/);
    
    // Fallback if they change the attribute to an onclick button
    if (!match1 || !match1[1]) {
      match1 = html1.match(/go\('(https:\/\/streamsrcs\.2embed\.cc\/vnest[^']+)'/);
    }

    if (!match1 || !match1[1]) {
      return res.status(404).json({ error: "Could not find hidden iframe link on 2embed" });
    }

    const iframeUrl = match1[1];

    // STEP 2: Fetch that hidden iframe link to get the actual video page
    const response2 = await fetch(iframeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://2embed.cc/'
      }
    });

    const html2 = await response2.text();

    // STEP 3: Find the .m3u8 link in this final page
    const match2 = html2.match(/(https:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/);

    if (match2 && match2[1]) {
      return res.status(200).json({ success: true, streamUrl: match2[1] });
    } else {
      return res.status(404).json({ error: "m3u8 not found in inner page" });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
}
