// The Mental Health Zone — episode bookshelf
// Usage: <div id="bookshelf"></div>
//        <link rel="stylesheet" href="/bookshelf.css">
//        <script src="/bookshelf.js" defer></script>
//
// Episodes come from /api/episodes (your Spotify RSS feed).
// Transcripts, takeaways and Spotify links come from /data/episode-extras.json.

(function () {
  const API_URL = "/api/episodes";
  const EXTRAS_URL = "/data/episode-extras.json";
  const SHOW_URL = "https://open.spotify.com/show/6nE7zMTQKaJQdRrWRktqjY";
  const COVER = "/images/cover.png";
  const SEASONS = {
    1: { name: "Season 1: The Basics", blurb: "Solo episodes" },
    2: { name: "Season 2: Teen Voices", blurb: "Interviews" },
  };
  const PALETTE = [
    ["#2A2E31", "#F8D0D0"], ["#F8D0D0", "#1F2225"], ["#A9D8EC", "#1F2225"], ["#3B4045", "#FFFFFF"],
    ["#EAD9C8", "#1F2225"], ["#DDF0F8", "#1F4A5C"], ["#F3B8B8", "#1F2225"], ["#54595E", "#F8D0D0"],
  ];

  const norm = (s) => String(s).toLowerCase().replace(/[“”"'’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const fmtLen = (sec) => {
    const m = Math.floor(sec / 60), s = sec % 60;
    return m ? `${m} min${s ? ` ${s} sec` : ""}` : `${s} sec`;
  };
  const shortTitle = (t) => t.split(/\s[|—–-]\s|\(|:/)[0].trim().slice(0, 34);

  let episodes = [];
  let current = -1;
  let lastFocus = null;
  let modal;

  async function init() {
    const root = document.getElementById("bookshelf");
    if (!root) return;
    root.textContent = "Loading episodes…";
    try {
      let [feed, extras] = await Promise.all([
        fetch(API_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(EXTRAS_URL).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      ]);
      const extraByTitle = {};
      Object.entries(extras).forEach(([title, v]) => { if (!title.startsWith("_")) extraByTitle[norm(title)] = v; });

      // If the RSS feed can't be reached (or isn't set up yet), use the saved episode list.
      if (!feed || !Array.isArray(feed.episodes) || feed.episodes.length === 0) {
        const saved = Object.entries(extras)
          .filter(([title, v]) => !title.startsWith("_") && v.date)
          .map(([title, v]) => ({ title, date: v.date, durationSec: v.durationSec || 0, description: v.description || "", season: v.season || 1, episode: null, isTrailer: !!v.isTrailer }))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        if (!saved.length) throw new Error("No episodes");
        feed = { episodes: saved };
      }

      const counters = {};
      episodes = feed.episodes.map((e, i) => {
        const x = extraByTitle[norm(e.title)] || {};
        if (!e.isTrailer) counters[e.season] = (counters[e.season] || 0) + 1;
        return {
          ...e,
          i,
          code: e.isTrailer ? "Trailer" : `E${e.episode || counters[e.season]}`,
          short: x.shortTitle || shortTitle(e.title),
          spotifyUrl: x.spotifyUrl || SHOW_URL,
          takeaways: x.takeaways || [],
          transcript: x.transcript || "",
        };
      });
      root.textContent = "";
      renderShelves(root);
      buildModal();
    } catch {
      root.textContent = "Couldn't load episodes right now. ";
      const a = el("a", null, "Listen on Spotify");
      a.href = SHOW_URL;
      root.appendChild(a);
    }
  }

  function renderShelves(root) {
    const seasons = [...new Set(episodes.map((e) => e.season))].sort((a, b) => a - b);
    seasons.forEach((s) => {
      const eps = episodes.filter((e) => e.season === s);
      const info = SEASONS[s] || { name: `Season ${s}`, blurb: "" };
      const first = new Date(eps[0].date), last = new Date(eps[eps.length - 1].date);
      const range = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear()
        ? fmtDate(eps[0].date)
        : `${first.toLocaleDateString("en-US", { month: "short" })}–${last.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;

      const sec = el("section", "mhz-season");
      const head = el("div", "mhz-season-head");
      head.append(el("h3", null, info.name), el("span", null, [info.blurb, range].filter(Boolean).join(" · ")));
      const scroller = el("div", "mhz-shelf-scroll");
      const row = el("div", "mhz-shelf-row");

      eps.forEach((e) => {
        const [bg, fg] = PALETTE[e.i % PALETTE.length];
        const mins = Math.round(e.durationSec / 60);
        const b = el("button", "mhz-book");
        b.type = "button";
        b.setAttribute("aria-label", `Open ${e.title}`);
        b.style.width = `${Math.max(46, Math.min(66, 30 + e.short.length * 1.2))}px`;
        b.style.height = `${Math.min(300, 220 + mins * 5 + (e.i % 3) * 8)}px`;
        b.style.background = bg;
        b.style.color = fg;

        const peek = el("span", "mhz-peek");
        const img = el("img");
        img.src = COVER;
        img.alt = "";
        peek.append(img, el("span", "mhz-peek-title", e.title), el("span", "mhz-peek-meta", `${fmtDate(e.date)} · ${fmtLen(e.durationSec)}`));

        b.append(peek, el("span", "mhz-code", e.code), el("span", "mhz-spine", e.short), el("span", "mhz-mark"));
        b.addEventListener("click", () => open(e.i, b));
        row.appendChild(b);
      });

      scroller.append(row, el("div", "mhz-plank"));
      sec.append(head, scroller);
      root.appendChild(sec);
    });
  }

  function buildModal() {
    modal = el("div", "mhz-modal");
    modal.hidden = true;
    modal.innerHTML = `
      <article class="mhz-dialog" role="dialog" aria-modal="true" aria-labelledby="mhz-title">
        <header class="mhz-dialog-head">
          <button type="button" class="mhz-close" aria-label="Close episode">✕</button>
          <img class="mhz-cover" src="${COVER}" alt="">
          <div class="mhz-head-text">
            <span class="mhz-kicker"></span>
            <h2 id="mhz-title"></h2>
            <span class="mhz-meta"></span>
            <a class="mhz-listen" target="_blank" rel="noopener">▶ Listen on Spotify</a>
          </div>
        </header>
        <div class="mhz-body">
          <section><h3>About this episode</h3><p class="mhz-desc"></p></section>
          <section class="mhz-tk-wrap"><h3>Key takeaways</h3><ul class="mhz-tk"></ul></section>
          <section>
            <div class="mhz-tx-head"><h3>Transcript</h3><span>Auto-generated by Spotify. It may contain mistakes.</span></div>
            <div class="mhz-tx" tabindex="0"></div>
          </section>
          <nav class="mhz-nav">
            <button type="button" class="mhz-prev">← Previous episode</button>
            <button type="button" class="mhz-next">Next episode →</button>
          </nav>
        </div>
      </article>`;
    document.body.appendChild(modal);
    modal.querySelector(".mhz-close").addEventListener("click", close);
    modal.querySelector(".mhz-prev").addEventListener("click", () => show((current - 1 + episodes.length) % episodes.length));
    modal.querySelector(".mhz-next").addEventListener("click", () => show((current + 1) % episodes.length));
    modal.addEventListener("click", (ev) => { if (ev.target === modal) close(); });
    modal.addEventListener("keydown", (ev) => { if (ev.key === "Escape") close(); });
  }

  function show(i) {
    current = i;
    const e = episodes[i];
    const q = (s) => modal.querySelector(s);
    q(".mhz-kicker").textContent = `Season ${e.season} · ${e.code}`;
    q("#mhz-title").textContent = e.title;
    q(".mhz-meta").textContent = `${fmtDate(e.date)} · ${fmtLen(e.durationSec)}`;
    q(".mhz-listen").href = e.spotifyUrl;
    q(".mhz-desc").textContent = e.description;

    const tk = q(".mhz-tk");
    tk.textContent = "";
    e.takeaways.forEach((t) => tk.appendChild(el("li", null, t)));
    q(".mhz-tk-wrap").hidden = e.takeaways.length === 0;

    q(".mhz-tx").textContent = e.transcript || "The transcript for this episode isn't available yet.";
    q(".mhz-dialog").scrollTop = 0;
  }

  function open(i, trigger) {
    lastFocus = trigger;
    show(i);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector(".mhz-close").focus();
  }

  function close() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }

  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
