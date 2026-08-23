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

    // STEP 3: Find direct m3u8 URLs if any exist
    const streamUrlRegex = /https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g;
    const directStreams = [...new Set(html2.match(streamUrlRegex) || [])];

    // STEP 4: Extract specific chunk of code around "vidnest.fun" and "_stream?url="
    const vidnestIndex = html2.indexOf('vidnest.fun');
    const _streamIndex = html2.indexOf('_stream?url=');

    let vidnestContext = "";
    if (vidnestIndex !== -1) {
      vidnestContext = html2.substring(Math.max(0, vidnestIndex - 500), vidnestIndex + 500);
    }

    let _streamContext = "";
    if (_streamIndex !== -1) {
      _streamContext = html2.substring(Math.max(0, _streamIndex - 500), _streamIndex + 500);
    }
    
    // STEP 5: Hunt for JSON properties that might contain the stream source
    // e.g., "streamUrl":"https://...", "source":"...", "m3u8":"..."
    const streamPropMatch = html2.match(/"(?:streamUrl|source|sources|src|m3u8|file|playlist)"\s*:\s*("[^"]+"|\[[^\]]+\])/g);

    return res.status(200).json({
      message: "Deep HTML context extraction",
      directM3u8Urls: directStreams,
      vidnestContext: vidnestContext,
      _streamContext: _streamContext,
      streamProperties: streamPropMatch
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
  }
        
