export default async function handler(req, res) {
    // Get the IMDb ID from the URL (e.g., /api/getstream?imdb=tt1375666)
    const { imdb } = req.query;

    if (!imdb) {
        return res.status(400).json({ error: "No IMDb ID provided" });
    }

    try {
        // 1. Fetch the page that hosts the video (This is just an example URL)
        // In reality, you would fetch a page from a site like vidsrc, 2embed, or a file host
        const response = await fetch(`https://example-filehost.com/movie/${imdb}`);
        const html = await response.text();

        // 2. Scrape the HTML to find the .m3u8 link using Regex
        // Every site hides the link differently. You have to inspect the page source to find the right pattern.
        const match = html.match(/"(https:\/\/.*?\.m3u8.*?)"/);

        if (match && match[1]) {
            // 3. Send the raw link back to your frontend
            res.status(200).json({ 
                success: true, 
                streamUrl: match[1] 
            });
        } else {
            res.status(404).json({ error: "Stream not found" });
        }

    } catch (error) {
        res.status(500).json({ error: "Failed to scrape stream" });
    }
          }
  
