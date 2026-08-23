export default async function handler(req, res) {
  const { imdb } = req.query;

  if (!imdb) {
    return res.status(400).json({ error: "No IMDb ID provided" });
  }

  return res.status(200).json({ 
    success: true, 
    streamUrl: "https://test.com/video.m3u8",
    message: "API is working! Received: " + imdb 
  });
}
