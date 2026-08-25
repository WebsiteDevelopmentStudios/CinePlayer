// api/proxy.js
export default async function handler(req, res) {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    // Configure headers to bypass anti-bot restrictions
    const headers = new Headers();
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set this to the domain of the streaming host you are trying to unblock
    const referer = 'https://vidsrc.to/'; // REPLACE with your actual host
    headers.set('Referer', referer);
    headers.set('Origin', referer);

    // Fetch the stream/playlist
    const response = await fetch(targetUrl, { headers });

    // Pipe the body and add permissive CORS headers so your HTML can read it
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Copy content-type (crucial for .ts and .m3u8 files)
    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);

    const buffer = await response.arrayBuffer();
    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Proxy fetch failed', details: error.message });
  }
}
