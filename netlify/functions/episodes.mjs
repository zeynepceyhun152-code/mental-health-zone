// /api/episodes — reads the podcast RSS feed and returns the episodes as JSON.
// New episodes on Spotify show up on the website automatically (within about an hour).
//
// Set the RSS link in Netlify: Site configuration → Environment variables → PODCAST_RSS_URL
// (Spotify for Creators → Settings → Availability → RSS feed)

const SEASON_2_START = "2026-09-01"; // only used if an episode has no season number in Spotify for Creators

const decode = (s = "") =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]).trim() : "";
};
const attr = (xml, name, a) => {
  const m = xml.match(new RegExp(`<${name}\\b[^>]*\\b${a}="([^"]*)"`, "i"));
  return m ? decode(m[1]) : "";
};
const stripHtml = (h) =>
  h.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
const toSeconds = (d) => {
  if (!d) return 0;
  if (!d.includes(":")) return parseInt(d, 10) || 0;
  return d.split(":").reduce((acc, p) => acc * 60 + (parseInt(p, 10) || 0), 0);
};

export default async () => {
  const FEED_URL = process.env.PODCAST_RSS_URL;
  if (!FEED_URL) {
    return Response.json({ error: "PODCAST_RSS_URL is not set in Netlify" }, { status: 500 });
  }
  try {
    const res = await fetch(FEED_URL, { headers: { "User-Agent": "MentalHealthZoneSite/1.0" } });
    if (!res.ok) throw new Error(`Feed returned ${res.status}`);
    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1).map((chunk) => chunk.split(/<\/item>/i)[0]);

    const episodes = items.map((it) => {
      const title = tag(it, "title");
      const date = new Date(tag(it, "pubDate"));
      return {
        id: tag(it, "guid"),
        title,
        date: date.toISOString(),
        durationSec: toSeconds(tag(it, "itunes:duration")),
        description: stripHtml(tag(it, "content:encoded") || tag(it, "description")),
        season: parseInt(tag(it, "itunes:season"), 10) || (date >= new Date(SEASON_2_START) ? 2 : 1),
        episode: parseInt(tag(it, "itunes:episode"), 10) || null,
        isTrailer: tag(it, "itunes:episodeType") === "trailer" || /^trailer$/i.test(title),
        audioUrl: attr(it, "enclosure", "url") || null,
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    return Response.json(
      { episodes, updatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, max-age=300", "Netlify-CDN-Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } }
    );
  } catch (err) {
    return Response.json({ error: "Could not load the podcast feed", detail: err.message }, { status: 502 });
  }
};

export const config = { path: "/api/episodes" };
