// Shared Supabase setup for the sign-in pages and the Rep Portal.
(function () {
  const cfg = window.MHZ_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.startsWith("PASTE")) {
    document.addEventListener("DOMContentLoaded", () => {
      const box = document.querySelector("[data-msg]");
      if (box) box.textContent = "The portal isn't connected yet: add your Supabase keys in js/config.js.";
    });
  }
  window.sb = window.supabase.createClient(cfg.SUPABASE_URL || "https://example.supabase.co", cfg.SUPABASE_ANON_KEY || "x");

  window.mhz = {
    show(el, text, ok) {
      if (!el) return;
      el.textContent = text || "";
      el.className = "msg" + (text ? (ok ? " ok" : " err") : "");
    },
    async requireSession() {
      const { data } = await sb.auth.getSession();
      if (!data.session) { location.replace("/signin.html"); return null; }
      return data.session;
    },
    esc(s) {
      return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    },
  };
})();
