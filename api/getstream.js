export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  // TEMPORARY: Returning a guaranteed working test stream (Big Buck Bunny)
  // This allows us to test if your player works!
  return res.status(200).json({ 
    success: true, 
    streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" 
  });
}
