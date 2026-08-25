// api/proxy.js

// Allow up to 60 seconds instead of the default 15
export const config = {
  maxDuration: 60,
};

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

    // Fetch the stream
    const response = await fetch(targetUrl, { headers, redirect: 'follow' });

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
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

    res.status(response.status);

    // STREAM the binary data directly to the browser, preventing freezing
    if (response.body && response.body.getReader) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } else {
      // Fallback just in case
      const buffer = await response.arrayBuffer();
      res.write(Buffer.from(buffer));
    }
    
    res.end();

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Proxy fetch failed', details: error.message });
  }
}
  
