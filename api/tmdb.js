// api/tmdb.js
export default async function handler(req, res) {
  // Grab the path from the frontend (e.g., /movie/popular)
  const { path } = req.query;
  
  // Construct the real TMDB URL
  const targetUrl = `https://api.themoviedb.org/3/${path}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
      },
    });
    
    const data = await response.json();
    
    // Send the data back to your frontend
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch from TMDB" });
  }
}