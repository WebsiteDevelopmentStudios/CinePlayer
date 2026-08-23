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

    // STEP 3: Extract ALL URLs from the HTML
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const allUrls = [...new Set(html2.match(urlRegex) || [])];

    // Filter out common static assets to reduce noise
    const filteredUrls = allUrls.filter(url => 
        !url.includes('.css') && 
        !url.includes('.woff') && 
        !url.includes('.png') && 
        !url.includes('.svg') && 
        !url.includes('.ico') &&
        !url.includes('googleapis.com') &&
        !url.includes('fonts.')
    );

    // STEP 4: Search for specific keywords in the HTML to find the hidden stream context
    const keywordMatches = [];
    
    // Search for 'm3u8'
    const m3u8Index = html2.indexOf('m3u8');
    if (m3u8Index !== -1) {
      keywordMatches.push({
        keyword: 'm3u8',
        context: html2.substring(Math.max(0, m3u8Index - 150), m3u8Index + 150)
      });
    }

    // Search for '"source"'
    const sourceIndex = html2.indexOf('"source"');
    if (sourceIndex !== -1) {
      keywordMatches.push({
        keyword: '"source"',
        context: html2.substring(Math.max(0, sourceIndex - 100), sourceIndex + 200)
      });
    }

    // Search for 'playlist'
    const playlistIndex = html2.indexOf('playlist');
    if (playlistIndex !== -1) {
      keywordMatches.push({
        keyword: 'playlist',
        context: html2.substring(Math.max(0, playlistIndex - 100), playlistIndex + 200)
      });
    }

    return res.status(200).json({
      message: "URLs and keyword contexts extracted",
      movieUrl: movieUrl,
      htmlLength: html2.length,
      extractedUrls: filteredUrls,
      keywordContexts: keywordMatches
    });

  } catch (error) {
    return res.status(500).json({ error: "Crash reason: " + error.message });
  }
        }
  
