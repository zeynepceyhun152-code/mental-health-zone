// School Rep Portal (and admin tools for Zeynep)
(async function () {
  const $ = (id) => document.getElementById(id);
  const esc = mhz.esc;
  const topMsg = $("top");
  const fmt = (d) => (d ? new Date(d + (d.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Date TBD");

  $("signout").addEventListener("click", async () => { await sb.auth.signOut(); location.href = "/signin.html"; });

  const session = await mhz.requireSession();
  if (!session) return;
  const me = session.user;

  const { data: profile, error: pErr } = await sb.from("profiles").select("*").eq("id", me.id).maybeSingle();
  if (pErr) return mhz.show(topMsg, "Couldn't load your profile: " + pErr.message);
  if (!profile) { location.replace("/create-profile.html"); return; }

  const isAdmin = !!profile.is_admin;
  $("hello").textContent = `Hi ${(profile.full_name || "").split(" ")[0] || "there"}!`;
  $("where").textContent = [profile.school, [profile.city, profile.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ");

  // Private settings (email + Drive link) — only signed-in reps can read these
  const { data: settings } = await sb.from("settings").select("key,value");
  const S = Object.fromEntries((settings || []).map((r) => [r.key, r.value]));
  const mail = $("mail");
  mail.textContent = S.report_email || "";
  mail.href = "mailto:" + (S.report_email || "");
  const drive = S.drive_url || "#";
  $("res").innerHTML = [
    ["School Rep Handbook", "Google Drive"], ["Quick Guide", "Google Drive"],
    ["Logo and posters", "Google Drive"], ["Slide templates", "Google Drive"],
  ].map(([t, s]) => `<a href="${esc(drive)}" target="_blank" rel="noopener">${t}<span>${s}</span></a>`).join("");

  // ---------- Announcements ----------
  async function loadNews() {
    const { data } = await sb.from("announcements").select("*").order("created_at", { ascending: false });
    $("news").innerHTML = data && data.length
      ? data.map((n) => `<div class="news"><small>${fmt(n.created_at)} · From Zeynep</small><strong>${esc(n.title)}</strong>${n.body ? `<span style="white-space:pre-line">${esc(n.body)}</span>` : ""}${isAdmin ? `<button class="linkbtn" data-del-news="${n.id}" style="font-size:13px">Delete</button>` : ""}</div>`).join("")
      : `<div class="news empty">No announcements yet. New updates from the team will show up here.</div>`;
  }

  // ---------- My to-dos ----------
  async function loadTasks() {
    const { data } = await sb.from("tasks").select("*").eq("rep_id", me.id).order("created_at");
    $("tasks").innerHTML = data && data.length
      ? data.map((t) => `<label class="todo${t.done ? " done" : ""}"><input type="checkbox" data-task="${t.id}" ${t.done ? "checked" : ""}><span class="t">${esc(t.title)}</span><span class="chip">Assigned by Zeynep</span></label>`).join("")
      : `<div class="empty">No tasks right now.</div>`;
  }
  $("tasks").addEventListener("change", async (e) => {
    const id = e.target.dataset.task;
    if (!id) return;
    await sb.from("tasks").update({ done: e.target.checked }).eq("id", id);
    e.target.closest(".todo").classList.toggle("done", e.target.checked);
  });

  // ---------- My events ----------
  async function loadMyEvents() {
    const { data } = await sb.from("events").select("*").eq("rep_id", me.id).order("event_date", { nullsFirst: false });
    $("events").innerHTML = data && data.length
      ? data.map((ev) => `<tr><td><strong>${esc(ev.name)}</strong></td><td>${fmt(ev.event_date)}</td><td>${esc(ev.type)}</td><td><span class="chip ${ev.status === "Done" ? "blue" : ""}">${esc(ev.status)}</span></td></tr>`).join("")
      : `<tr><td colspan="4" class="empty">No events yet. The team adds them here once they're planned.</td></tr>`;
  }

  // ---------- Event report ----------
  $("rf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const go = $("r_go"); go.disabled = true;
    const { error } = await sb.from("event_reports").insert({
      rep_id: me.id,
      event_name: $("r_name").value.trim(),
      event_date: $("r_date").value || null,
      attendees: $("r_att").value ? parseInt($("r_att").value, 10) : null,
      instagram_url: $("r_ig").value.trim() || null,
      notes: $("r_notes").value.trim() || null,
    });
    go.disabled = false;
    if (error) return mhz.show($("r_msg"), "Couldn't send the report: " + error.message);
    $("rf").reset();
    mhz.show($("r_msg"), `Report sent! Now email your photos, video and slides to ${S.report_email || "Zeynep"}.`, true);
    if (isAdmin) loadReports();
  });

  // ---------- Admin ----------
  let reps = [];
  async function loadReps() {
    const { data } = await sb.from("profiles").select("*").order("created_at");
    reps = data || [];
    $("reps").innerHTML = reps.map((r) => `<tr><td><strong>${esc(r.full_name)}</strong>${r.is_admin ? ' <span class="chip admin-tag">admin</span>' : ""}</td><td>${esc(r.school)}</td><td>${esc([r.city, r.country].filter(Boolean).join(", "))}</td><td>${esc(r.email)}</td><td>${esc(r.phone)}</td></tr>`).join("");
    const opts = reps.map((r) => `<option value="${r.id}">${esc(r.full_name || r.email)} (${esc(r.school || "no school")})</option>`).join("");
    $("t_rep").innerHTML = `<option value="ALL">All reps</option>` + opts;
    $("e_rep").innerHTML = opts;
  }
  const repName = (id) => { const r = reps.find((x) => x.id === id); return r ? r.full_name || r.email : "—"; };

  async function loadAllEvents() {
    const { data } = await sb.from("events").select("*").order("event_date", { nullsFirst: false });
    const statuses = ["Planning", "Scheduled", "Helping", "Done"];
    $("all_events").innerHTML = data && data.length
      ? data.map((ev) => `<tr><td><strong>${esc(ev.name)}</strong><br><span style="color:#5E6268;font-size:13px">${esc(ev.type)}</span></td><td>${esc(repName(ev.rep_id))}</td><td><input type="date" value="${ev.event_date || ""}" data-ev-date="${ev.id}" style="height:38px;border-radius:10px;border:1.5px solid #E3D3D3;padding:0 8px;font:inherit"></td><td><select data-ev-status="${ev.id}">${statuses.map((s) => `<option ${s === ev.status ? "selected" : ""}>${s}</option>`).join("")}</select></td><td><button class="linkbtn" data-ev-del="${ev.id}">Delete</button></td></tr>`).join("")
      : `<tr><td colspan="5" class="empty">No events yet.</td></tr>`;
  }

  async function loadReports() {
    const { data } = await sb.from("event_reports").select("*").order("created_at", { ascending: false });
    $("reports").innerHTML = data && data.length
      ? data.map((r) => `<div class="news"><small>${fmt(r.created_at)} · ${esc(repName(r.rep_id))}</small><strong>${esc(r.event_name)} · ${fmt(r.event_date)}${r.attendees != null ? ` · ${r.attendees} people` : ""}</strong>${r.instagram_url ? `<a href="${esc(r.instagram_url)}" target="_blank" rel="noopener">Instagram post</a>` : ""}${r.notes ? `<span style="white-space:pre-line">${esc(r.notes)}</span>` : ""}</div>`).join("")
      : `<div class="empty">No reports yet.</div>`;
  }

  if (isAdmin) {
    $("admin").hidden = false;
    $("news").addEventListener("click", async (e) => {
      const id = e.target.dataset.delNews;
      if (!id || !confirm("Delete this announcement?")) return;
      await sb.from("announcements").delete().eq("id", id);
      loadNews();
    });
    $("af").addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await sb.from("announcements").insert({ title: $("a_title").value.trim(), body: $("a_body").value.trim() || null });
      if (error) return mhz.show($("a_msg"), error.message);
      $("af").reset(); mhz.show($("a_msg"), "Posted!", true); loadNews();
    });
    $("tf").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = $("t_title").value.trim();
      const target = $("t_rep").value;
      const rows = (target === "ALL" ? reps.filter((r) => !r.is_admin) : reps.filter((r) => r.id === target)).map((r) => ({ rep_id: r.id, title }));
      if (!rows.length) return mhz.show($("t_msg"), "No reps to assign to yet.");
      const { error } = await sb.from("tasks").insert(rows);
      if (error) return mhz.show($("t_msg"), error.message);
      $("tf").reset(); mhz.show($("t_msg"), `Assigned to ${rows.length} rep${rows.length > 1 ? "s" : ""}.`, true); loadTasks();
    });
    $("ef").addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await sb.from("events").insert({ name: $("e_name").value.trim(), event_date: $("e_date").value || null, type: $("e_type").value, rep_id: $("e_rep").value });
      if (error) return mhz.show($("e_msg"), error.message);
      $("ef").reset(); mhz.show($("e_msg"), "Event added.", true); loadAllEvents(); loadMyEvents();
    });
    $("all_events").addEventListener("change", async (e) => {
      const s = e.target.dataset.evStatus, d = e.target.dataset.evDate;
      if (s) await sb.from("events").update({ status: e.target.value }).eq("id", s);
      if (d) await sb.from("events").update({ event_date: e.target.value || null }).eq("id", d);
      loadMyEvents();
    });
    $("all_events").addEventListener("click", async (e) => {
      const id = e.target.dataset.evDel;
      if (!id || !confirm("Delete this event?")) return;
      await sb.from("events").delete().eq("id", id);
      loadAllEvents(); loadMyEvents();
    });
    await loadReps();
    await Promise.all([loadAllEvents(), loadReports()]);
  }

  await Promise.all([loadNews(), loadTasks(), loadMyEvents()]);
  mhz.show(topMsg, "");
  $("app").hidden = false;
})();
