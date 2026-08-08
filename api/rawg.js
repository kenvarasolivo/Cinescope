// api/rawg.js — proxies RAWG requests so the API key stays server-side
export default async function handler(req, res) {
  const { path } = req.query;

  if (!path) {
    return res.status(400).json({ error: "Missing 'path' query parameter" });
  }
  if (!process.env.RAWG_KEY) {
    return res.status(500).json({ error: "RAWG_KEY environment variable is not set" });
  }

  const clean = String(path).replace(/^\/+/, "");
  // RAWG expects the API key as a URL parameter
  const sep = clean.includes("?") ? "&" : "?";
  const targetUrl = `https://api.rawg.io/api/${clean}${sep}key=${process.env.RAWG_KEY}`;

  try {
    // RAWG outages hang for ~20s at their edge — fail fast so the client can fall back
    const upstream = await fetch(targetUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const data = await upstream.json();

    if (upstream.ok) {
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    }
    return res.status(upstream.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: "Failed to fetch from RAWG", detail: error.message });
  }
}
