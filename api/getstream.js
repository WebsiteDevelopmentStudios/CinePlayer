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

    // STEP 3: Search for the Cloudflare Worker URL to get the base host/path
    const workerMatch = html2.match(/https:\/\/fetch\.streaming-1\.workers\.dev\/fetch\?url=([^\s"'\\]+)/);
    
    if (!workerMatch || !workerMatch[1]) {
      return res.status(404).json({ error: "Stream URL not found in HTML" });
    }

    const workerUrl = decodeURIComponent(workerMatch[1]); // e.g., https://fn.gaudsfervour.qpon/r1a02f07a70b83d18c/130989

    // STEP 4: Try variations of appending m3u8 paths to the worker URL
    const variations = [
      `${workerUrl}/master.m3u8`,
      `${workerUrl}.m3u8`,
      `${workerUrl}/index.m3u8`
    ];

    const testResults = [];
    let finalM3u8 = null;

    for (const testUrl of variations) {
      try {
        const testRes = await fetch(testUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Referer': movieUrl
          }
        });
        const contentType = testRes.headers.get('content-type') || 'unknown';
        const text = await testRes.text();
        
        testResults.push({ url: testUrl, status: testRes.status, contentType, snippet: text.slice(0, 100) });

        // If we find an m3u8 playlist, we've found our stream!
        if (contentType.includes('mpegurl') || text.trim().startsWith('#EXTM3U')) {
          finalM3u8 = testUrl;
          break; // Stop testing other variations
        }
      } catch (e) {
        testResults.push({ url: testUrl, error: e.message });
      }
    }

    if (finalM3u8) {
      return res.status(200).json({
        success: true,
        streamUrl: finalM3u8,
        message: "Successfully found .m3u8 by appending it to the URL"
      });
    } else {
      return res.status(200).json({
        success: false,
        message: "Worker URL exists, but appending m3u8 variations did not trigger the playlist.",
        baseWorkerUrl: workerUrl,
        testResults: testResults
      });
    }

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
          }
                          
