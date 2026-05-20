// api/rawg.js
export default async function handler(req, res) {
  const { path } = req.query;
  
  // RAWG expects the API key as a URL parameter, not a header
  const sep = path.includes('?') ? '&' : '?';
  const targetUrl = `https://api.rawg.io/api${path}${sep}key=${process.env.RAWG_KEY}`;

  try {
    const response = await fetch(targetUrl);
    const data = await response.json();
    
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch from RAWG" });
  }
}