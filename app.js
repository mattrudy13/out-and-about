// Out & About: draws data/events.json as a day-by-day list with kind filters, plus the "Running for a
// while" and "Farmers markets" boxes. Plain browser JS, no build step.

const KIND_LABEL = { Music: "Music", Theater: "Theater", Art: "Art", Market: "Market" };
const STORE_KEY = "outabout:kind";
// Four weeks is a long scroll on a phone, so the last two sit behind a button.
const FIRST_DAYS = 14;

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Dates are "YYYY-MM-DD" in Eastern time; the page treats them as local calendar days.
const pad = (n) => String(n).padStart(2, "0");
const localYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const asDate = (ymd) => new Date(`${ymd}T12:00:00`);
const daysBetween = (a, b) => Math.round((asDate(b) - asDate(a)) / 86400000);

function timeLabel(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const hour = h % 12 || 12, ampm = h < 12 ? "AM" : "PM";
  return m ? `${hour}:${pad(m)} ${ampm}` : `${hour} ${ampm}`;
}

const dayLabel = (ymd) => asDate(ymd).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const shortDate = (ymd) => asDate(ymd).toLocaleDateString("en-US", { month: "short", day: "numeric" });

function daySub(ymd, today) {
  const diff = daysBetween(today, ymd);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  const dow = asDate(ymd).getDay();
  if (diff < 7 && (dow === 5 || dow === 6 || dow === 0)) return "This weekend";
  return "";
}

let data = null, markets = [], kind = "All", showAll = false;

try { kind = localStorage.getItem(STORE_KEY) || "All"; } catch {}

function card(e) {
  const t = timeLabel(e.time);
  return `<a class="card" href="${esc(e.url)}">
    <span class="time${t ? "" : " none"}">${t ? esc(t) : "See times"}</span>
    <span class="body">
      <span class="title">${esc(e.title)}</span>
      <span class="place">${esc(e.place)} · ${esc(e.city)}</span>
      <span class="meta"><span class="tag k-${esc(e.kind)}">${esc(KIND_LABEL[e.kind] ?? e.kind)}</span>${e.note ? `<span class="note">${esc(e.note)}</span>` : ""}</span>
    </span>
  </a>`;
}

// Several markets on one Saturday would be three near-identical cards, so they share one card with a
// link per market (a div, since links can't nest inside the card's own link).
function marketsCard(list) {
  const t = timeLabel(list[0].time);
  const rows = list.map((m) => {
    const extra = m.note && m.note !== "Free" ? ` · ${m.note.replace(/^Free · /, "")}` : "";
    return `<span class="place"><a href="${esc(m.url)}">${esc(m.title)}</a> · ${esc(m.city)}${esc(extra)}</span>`;
  }).join("");
  return `<div class="card">
    <span class="time${t ? "" : " none"}">${t ? esc(t) : "See times"}</span>
    <span class="body">
      <span class="title">Farmers markets</span>
      ${rows}
      <span class="meta"><span class="tag k-Market">Market</span><span class="note">Free</span></span>
    </span>
  </div>`;
}

function dayCards(events) {
  const markets = events.filter((e) => e.kind === "Market");
  if (markets.length < 2) return events.map(card).join("");
  let html = "", done = false;
  for (const e of events) {
    if (e.kind !== "Market") html += card(e);
    else if (!done) { html += marketsCard(markets); done = true; }
  }
  return html;
}

function renderList() {
  const list = $("#list");
  const now = new Date(), today = localYmd(now);
  // Hide what's over: past days, and today's events that started more than 3 hours ago.
  const upcoming = data.events.filter((e) => {
    if (e.date < today) return false;
    if (e.date === today && e.time) {
      const [h, m] = e.time.split(":").map(Number);
      const start = new Date(now); start.setHours(h, m, 0, 0);
      return now - start < 3 * 3600000;
    }
    return true;
  });
  const shown = upcoming.filter((e) => kind === "All" || e.kind === kind);

  if (!shown.length) {
    const what = kind === "All" ? "events" : kind === "Market" ? "farmers markets" : `${kind.toLowerCase()} events`;
    list.innerHTML = `<p class="status">No ${what} listed for the next four weeks.</p>`;
    return;
  }

  const days = new Map();
  for (const e of shown) {
    if (!days.has(e.date)) days.set(e.date, []);
    days.get(e.date).push(e);
  }
  let html = "", hidden = 0;
  for (const [date, events] of days) {
    if (!showAll && daysBetween(today, date) >= FIRST_DAYS) { hidden += events.length; continue; }
    const sub = daySub(date, today);
    html += `<section class="day">
      <div class="day-head"><h2>${esc(dayLabel(date))}</h2>${sub ? `<span class="day-sub">${sub}</span>` : ""}</div>
      ${dayCards(events)}
    </section>`;
  }
  if (hidden) html += `<button type="button" class="more" id="more">Show ${hidden} more event${hidden === 1 ? "" : "s"}</button>`;
  list.innerHTML = html || `<p class="status">Nothing in the next two weeks.</p>`;
  $("#more")?.addEventListener("click", () => { showAll = true; renderList(); });
}

function renderSide() {
  const today = localYmd(new Date());
  const runs = (data.running ?? []).filter((r) => r.to >= today && (kind === "All" || r.kind === kind));
  $("#running").innerHTML = runs.map((r) => {
    const when = r.from <= today ? `Through ${shortDate(r.to)}` : `${shortDate(r.from)} – ${shortDate(r.to)}`;
    return `<a class="item" href="${esc(r.url)}"><strong>${esc(r.title)}</strong><span>${esc(r.place)} · ${esc(when)}</span></a>`;
  }).join("");
  $("#running-box").hidden = !runs.length;

  const showMarkets = (kind === "All" || kind === "Market") && markets.length;
  $("#markets").innerHTML = markets.map((m) =>
    `<a class="item" href="${esc(m.url)}"><strong>${esc(m.name)}</strong><span>${esc(m.place)}, ${esc(m.city)}</span><span>${esc(m.summary)}</span></a>`).join("");
  $("#markets-box").hidden = !showMarkets;
}

function renderChips() {
  document.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
}

function renderUpdated() {
  const u = new Date(data.updated);
  const when = u.toLocaleString("en-US", { weekday: "long", hour: "numeric", minute: "2-digit" });
  const stale = Date.now() - u > 2 * 86400000 ? " These listings may be out of date." : "";
  $("#updated").textContent = `Updated ${when}.${stale}`;
}

function render() {
  renderChips();
  renderList();
  renderSide();
}

document.querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => {
  kind = b.dataset.kind;
  try { localStorage.setItem(STORE_KEY, kind); } catch {}
  render();
}));

Promise.all([
  fetch("data/events.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
  fetch("data/markets.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : { markets: [] })).catch(() => ({ markets: [] })),
]).then(([events, mk]) => {
  data = events;
  markets = mk.markets ?? [];
  if (!(kind in KIND_LABEL) && kind !== "All") kind = "All";
  render();
  renderUpdated();
}).catch(() => {
  $("#list").innerHTML = `<p class="status">The events couldn't be loaded. Please try again in a few minutes.</p>`;
});
