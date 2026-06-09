// api/tmdb.js — proxies TMDB requests so the API token stays server-side
export default async function handler(req, res) {
  const { path } = req.query;

  if (!path) {
    return res.status(400).json({ error: "Missing 'path' query parameter" });
  }
  if (!process.env.TMDB_TOKEN) {
    return res.status(500).json({ error: "TMDB_TOKEN environment variable is not set" });
  }

  // Normalize: allow callers to pass "/movie/popular" or "movie/popular"
  const clean = String(path).replace(/^\/+/, "");
  const targetUrl = `https://api.themoviedb.org/3/${clean}`;

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_TOKEN}`,
        Accept: "application/json",
      },
    });

    const data = await upstream.json();

    // Cache successful responses at the edge for 1h (stale-while-revalidate 1 day)
    if (upstream.ok) {
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    }
    return res.status(upstream.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: "Failed to fetch from TMDB", detail: error.message });
  }
}
