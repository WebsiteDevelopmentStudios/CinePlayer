// api/proxy.js
export default async function handler(req, res) {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const referer = `${parsedUrl.protocol}//${parsedUrl.host}/`;

    const headers = new Headers();
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    headers.set('Referer', referer);
    headers.set('Origin', referer);

    if (req.headers.range) {
      headers.set('Range', req.headers.range);
    }

    // Explicitly set redirect to follow, as some sub-playlists redirect
    const response = await fetch(targetUrl, { headers, redirect: 'follow' });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const contentLength = response.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const contentRange = response.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    const buffer = await response.arrayBuffer();
    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Proxy fetch failed', details: error.message });
  }
}
