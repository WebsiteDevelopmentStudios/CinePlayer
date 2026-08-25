// api/proxy.js

// Tell Vercel to run this on the Edge (No 15-second timeout!)
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');
  
  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const referer = `${parsedUrl.protocol}//${parsedUrl.host}/`;

    // Pass through the incoming request headers (like 'Range')
    const headers = new Headers(req.headers);
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    headers.set('Referer', referer);
    headers.set('Origin', referer);

    // Fetch the stream
    const response = await fetch(targetUrl, { 
      headers, 
      redirect: 'follow' 
    });

    // Clone the response and add CORS / No-Cache headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    newHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    newHeaders.set('Pragma', 'no-cache');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: newHeaders });
    }

    // Stream the binary data directly back to the browser infinitely
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Proxy fetch failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
        }
      
