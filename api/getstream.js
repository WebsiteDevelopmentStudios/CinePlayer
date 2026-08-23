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
    const movieUrl = `https://cineby.hair/movie/${tmdbId}?autostart=true`;

    // STEP 2: Fetch cineby.hair using the TMDB ID
    const response2 = await fetch(movieUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://cineby.hair/'
      }
    });
    const html2 = await response2.text();

    // STEP 3: Extract context of "130989" to see how the player knows what ID to request
    const idContextIndex = html2.indexOf('130989');
    let idContext = "Not found in HTML";
    if (idContextIndex !== -1) {
      idContext = html2.substring(Math.max(0, idContextIndex - 150), idContextIndex + 150);
    }

    // Let's also see what vidnest.fun returns
    const vidnestRes = await fetch('https://vidnest.fun', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': movieUrl
      }
    }).catch(e => ({ status: 'failed', text: () => e.message }));
    
    const vidnestText = await vidnestRes.text();

    // STEP 4: Fetch the inner playwright URL with STRICT headers (Origin, X-Requested-With)
    const strictHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Referer': movieUrl,
      'Origin': 'https://cineby.hair',
      'Accept': '*/*'
    };

    const strictResponse = await fetch('https://fn.gaudsfervour.qpon/r1a02f07a70b83d18c/130989', { headers: strictHeaders });
    const strictText = await strictResponse.text();
    const strictContentType = strictResponse.headers.get('content-type');

    return res.status(200).json({
      message: "Debugging output",
      idContext: idContext,
      vidnestResponse: {
        status: vidnestRes.status,
        contentType: vidnestRes.headers && vidnestRes.headers.get('content-type'),
        snippet: vidnestText.slice(0, 500)
      },
      strictFetchResult: {
        status: strictResponse.status,
        contentType: strictContentType,
        snippet: strictText.slice(0, 500)
      }
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
  }
                    
