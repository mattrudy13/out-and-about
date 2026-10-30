// Concerts, theater, art and farmers markets in Virginia Beach and Norfolk for the next 4 weeks, for the
// Out & About page. Writes data/events.json. Node 22, no packages.
// Usage: TICKETMASTER_KEY=… node scripts/events.mjs   (without the key, Ticketmaster is skipped)
//
// Sources: Ticketmaster (the big venues), the WordPress "Events Calendar" feeds of The Z, Virginia MOCA,
// the Virginia Symphony and Norfolk Arts, Little Theatre of Virginia Beach's season page, and the
// hand-kept data/markets.json and data/running.json. Each source is fetched on its own; if one fails, its
// events from the last good run are kept so an outage doesn't empty the page.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const OUT = "data/events.json";
const DAYS = 28; // Rudy's choice: enough notice to buy tickets
const CITIES = new Set(["Virginia Beach", "Norfolk"]);
const UA = "Mozilla/5.0 (compatible; out-and-about/0.1; +https://mattrudy13.github.io/out-and-about/)";

// Rudy's choices: no 18+/21+ club nights, no kids' or family events, no comedy or sports.
const ADULTS_ONLY = /\b(18|21)\s*(\+|&\s*(over|up)|and\s+(over|up))/i;
const KIDS = /\b(kids?|children'?s?|family|families|toddlers?|teens?|youth|storytime|camp|girl scouts?|pb&j|ages?\s*\d+\s*[-–]\s*\d+)\b/i;

// ---------- dates (all in Eastern time; the workflow runs in UTC) ----------

const ymd = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
const addDays = (date, n) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const TODAY = ymd(new Date());
const LAST = addDays(TODAY, DAYS - 1);
const inWindow = (date) => date >= TODAY && date <= LAST;

// ---------- helpers ----------

async function get(url, type = "json") {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return type === "json" ? res.json() : res.text();
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…" };
function clean(s) {
  return String(s ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Ticketmaster ----------

// Ticketmaster lists parking passes, upgrades and add-ons as their own events.
const NOT_AN_EVENT = /\b(parking|lot pass|upgrade|vip package|vip experience|souvenir|merch|add-on|suite)\b/i;

// Segment/genre → the page's kinds; null drops it. "Miscellaneous" under Arts is mostly themed parties.
function tmKind(c) {
  if (!c || c.family) return null;
  const seg = c.segment?.name, genre = c.genre?.name ?? "";
  if (seg === "Music") return "Music";
  if (seg !== "Arts & Theatre") return null;
  if (/comedy|children|family|magic|circus|miscellaneous|undefined/i.test(genre)) return null;
  if (/classical/i.test(genre)) return "Music";
  if (/fine art/i.test(genre)) return "Art";
  return "Theater";
}

async function ticketmaster() {
  const key = process.env.TICKETMASTER_KEY;
  if (!key) throw new Error("TICKETMASTER_KEY isn't set");
  const iso = (date, end) => `${date}T${end ? "23:59:59" : "00:00:00"}Z`;
  const raw = [];
  for (let n = 0; n < 5; n++) {
    // Between Norfolk and Virginia Beach; 20 miles reaches the Oceanfront and Ocean View. Cities are
    // filtered below, so Chesapeake and Portsmouth venues inside the circle drop out.
    const params = new URLSearchParams({
      apikey: key, latlong: "36.86,-76.15", radius: 20, unit: "miles", locale: "*",
      startDateTime: iso(TODAY), endDateTime: iso(addDays(LAST, 1), true), size: 200, page: n, sort: "date,asc",
    });
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, { signal: AbortSignal.timeout(25000) });
    // The error names the status only, never the URL, so the key can't end up in a log.
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    raw.push(...(body._embedded?.events ?? []));
    if (n + 1 >= (body.page?.totalPages ?? 0)) break;
  }
  const out = [];
  for (const e of raw) {
    const v = e._embedded?.venues?.[0];
    const date = e.dates?.start?.localDate;
    const c = e.classifications?.find((x) => x.primary) ?? e.classifications?.[0];
    const kind = tmKind(c);
    if (!kind || !date || !CITIES.has(v?.city?.name)) continue;
    if (NOT_AN_EVENT.test(e.name) || ADULTS_ONLY.test(e.name) || KIDS.test(e.name)) continue;
    if (e.dates?.status?.code === "cancelled") continue;
    const s = e.dates.start;
    out.push({
      title: e.name.trim(),
      date,
      time: s.timeTBA || s.noSpecificTime ? null : s.localTime?.slice(0, 5) ?? null,
      kind,
      place: v.name,
      city: v.city.name,
      url: e.url ?? null,
      note: e.dates?.status?.code === "postponed" ? "Postponed" : e.dates?.status?.code === "rescheduled" ? "Rescheduled" : null,
    });
  }
  return { events: out };
}

// ---------- WordPress "The Events Calendar" feeds ----------

async function tribe(host) {
  const out = [];
  const range = `start_date=${TODAY}&end_date=${encodeURIComponent(`${LAST} 23:59:59`)}`;
  let url = `https://${host}/wp-json/tribe/events/v1/events?per_page=50&${range}`;
  for (let n = 0; url && n < 6; n++) {
    const body = await get(url);
    out.push(...(body.events ?? []));
    url = body.next_rest_url ?? null;
  }
  return out;
}

// Turns one feed event into a day event, plus a "running" item when it spans several days (a play's run,
// an artist residency). `rules` decides per host: { skip(e, cats), kind(e, cats), place, city }.
function fromTribe(list, rules) {
  const events = [], running = [];
  for (const e of list) {
    const title = rules.title ? rules.title(clean(e.title)) : clean(e.title);
    const cats = (e.categories ?? []).map((c) => clean(c.name)).join(", ");
    const venue = Array.isArray(e.venue) ? {} : e.venue ?? {};
    const city = clean(venue.city) || rules.city;
    if (!CITIES.has(city) || ADULTS_ONLY.test(title) || KIDS.test(title) || rules.skip(title, cats)) continue;
    const date = e.start_date.slice(0, 10), endDate = (e.end_date ?? e.start_date).slice(0, 10);
    const time = e.all_day ? null : e.start_date.slice(11, 16);
    const item = {
      title,
      kind: rules.kind(title, cats),
      place: rules.place ?? titleCase(clean(venue.venue)),
      city,
      url: e.url,
      free: /\bfree\b/i.test(`${clean(e.title)} ${e.cost ?? ""}`),
    };
    if (endDate > date) running.push({ ...item, from: date, to: endDate });
    if (inWindow(date)) {
      events.push({
        ...item,
        date,
        time: time === "00:00" ? null : time,
        note: [item.free ? "Free" : null, endDate > date ? `Runs through ${shortDate(endDate)}` : null].filter(Boolean).join(" · ") || null,
      });
    }
  }
  return { events, running };
}

// Some venues are typed in all caps ("ATTUCKS THEATRE").
const titleCase = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()) : s);

const shortDate = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const theZ = async () => fromTribe(await tribe("thez.org"), {
  city: "Virginia Beach",
  place: "The Z (Zeiders American Dream Theater)",
  skip: (t, cats) => /famil|education|comedy|open mic|camp/i.test(cats),
  kind: (t, cats) => (/music/i.test(cats) ? "Music" : "Theater"),
});

// Mostly kids' and adult studio classes; only receptions, talks and evening programs are kept.
const moca = async () => fromTribe(await tribe("virginiamoca.org"), {
  city: "Virginia Beach",
  place: "Virginia MOCA",
  skip: (t, cats) => /class|ages|youth|teen|famil|camp|workshop/i.test(`${t} ${cats}`),
  kind: () => "Art",
});

// The symphony also plays Newport News, Williamsburg, Richmond and Fairfax; the city filter drops those.
const symphony = async () => fromTribe(await tribe("virginiasymphony.org"), {
  city: null,
  skip: () => false,
  kind: (t) => (/opera/i.test(t) ? "Theater" : "Music"),
});

// The city's arts office. Its titles carry the date ("…Reception: Friday, October 30, 5-8pm at…") and
// the price ("Free …", "…, a Free monthly series"), which the card already shows. The gallery's weekly
// open hours would fill every Saturday, so those are left out.
const norfolkArts = async () => fromTribe(await tribe("norfolkarts.net"), {
  city: "Norfolk",
  title: (t) => t
    .replace(/:\s*(mon|tues|wednes|thurs|fri|satur|sun)day\b.*$/i, "")
    .replace(/,\s+an?\s+free\b.*$/i, "")
    .replace(/^free\s+/i, "")
    .replace(/\s*free!\s*$/i, "")
    .trim()
    .replace(/^[a-z]/, (c) => c.toUpperCase()),
  skip: (t) => /open hours/i.test(t),
  kind: (t) => (/market/i.test(t) ? "Market" : "Art"),
});

// ---------- Little Theatre of Virginia Beach (season page, no feed) ----------

async function ltvb() {
  // Seasons run September–August.
  const [y, m] = TODAY.split("-").map(Number);
  const season = m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  const page = `https://ltvb.com/seasons/${season}/`;
  const html = await get(page, "text");
  const links = [...html.matchAll(/href="(https:\/\/ltvb\.com\/shows\/[^"]+)"/g)].map((x) => x[1]);
  const lines = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "").split(/<[^>]+>/).map(clean).filter(Boolean);
  const slug = (s) => s.toLowerCase().replace(/&/g, "").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const events = [], running = [];
  lines.forEach((line, i) => {
    if (line !== "Show Dates") return;
    const title = lines[i - 1];
    const m2 = lines[i + 1]?.match(/^([A-Z][a-z]+ \d{1,2}, \d{4})\s*[-–]\s*([A-Z][a-z]+ \d{1,2}, \d{4})$/);
    if (!title || !m2) return;
    const toYmd = (s) => new Date(`${s} 12:00 UTC`).toISOString().slice(0, 10);
    const from = toYmd(m2[1]), to = toYmd(m2[2]);
    const url = links.find((l) => l.includes(slug(title))) ?? page;
    const item = { title, kind: "Theater", place: "Little Theatre of Virginia Beach", city: "Virginia Beach", url, free: false };
    running.push({ ...item, from, to });
    if (inWindow(from)) events.push({ ...item, title: `${title} opens`, date: from, time: null, note: `Runs through ${shortDate(to)}` });
  });
  if (!running.length) throw new Error("no shows found on the season page");
  return { events, running };
}

// ---------- hand-kept files ----------

// Expands data/markets.json's schedules into dated events. A rule: { months, weekday (0 = Sunday),
// weeks (which weekdays of the month, e.g. [1, 3]; omit for every week), start, end, from, to, check }.
function markets() {
  const { markets: list } = JSON.parse(readFileSync("data/markets.json", "utf8"));
  const events = [];
  for (const mk of list) {
    if (mk.list === false) continue;
    for (let i = 0; i < DAYS; i++) {
      const date = addDays(TODAY, i);
      const d = new Date(`${date}T12:00:00Z`);
      const nth = Math.ceil(d.getUTCDate() / 7);
      const rule = mk.rules.find((r) =>
        r.months.includes(d.getUTCMonth() + 1) && r.weekday === d.getUTCDay() && (!r.weeks || r.weeks.includes(nth))
        && (!r.from || date >= r.from) && (!r.to || date <= r.to));
      if (!rule) continue;
      events.push({
        title: mk.name, date, time: rule.start, kind: "Market", place: mk.place, city: mk.city, url: mk.url, free: true,
        note: rule.check ? "Free · check the date before you go" : "Free",
      });
    }
  }
  return { events };
}

function handRunning() {
  return { running: JSON.parse(readFileSync("data/running.json", "utf8")).running };
}

// ---------- merge ----------

// The same concert can come from Ticketmaster and the symphony's own feed: same day, and one title
// contains the other once the presenter's name is dropped. The venue's own listing (listed first) wins.
const norm = (s) => s.toLowerCase().replace(/\b(virginia symphony( orchestra)?|va opera|virginia opera|presents?)\b/g, "").replace(/[^a-z0-9]/g, "");
function dedupe(events) {
  const kept = [];
  for (const e of events) {
    const a = norm(e.title);
    const dup = kept.find((k) => k.date === e.date && (!k.time || !e.time || k.time === e.time) && (() => {
      const b = norm(k.title);
      return a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a));
    })());
    if (!dup) kept.push(e);
  }
  return kept;
}

const SOURCES = {
  "The Z": theZ,
  "Virginia MOCA": moca,
  "Virginia Symphony": symphony,
  "Norfolk Arts": norfolkArts,
  "Little Theatre of VB": ltvb,
  Ticketmaster: ticketmaster,
  "Farmers markets": markets,
  "Running (hand-kept)": handRunning,
};

let previous = null;
try { previous = JSON.parse(readFileSync(OUT, "utf8")); } catch {}

const events = [], running = [], status = {};
for (const [name, fn] of Object.entries(SOURCES)) {
  try {
    const r = await fn();
    for (const e of r.events ?? []) events.push({ ...e, source: name });
    for (const e of r.running ?? []) running.push({ ...e, source: name });
    status[name] = { ok: true, events: r.events?.length ?? 0 };
  } catch (err) {
    // Keep what this source had last time (still upcoming), so one outage doesn't blank its listings.
    const old = (previous?.events ?? []).filter((e) => e.source === name && e.date >= TODAY);
    const oldRunning = (previous?.running ?? []).filter((e) => e.source === name && e.to >= TODAY);
    events.push(...old);
    running.push(...oldRunning);
    status[name] = { ok: false, error: err.message, keptFromLastRun: old.length };
  }
}

const merged = dedupe(events.filter((e) => inWindow(e.date)))
  .sort((a, b) => (a.date + (a.time ?? "99")).localeCompare(b.date + (b.time ?? "99")) || a.title.localeCompare(b.title));
// "Running for a while": on now or starting within the window, soonest-ending first.
const runs = running
  .filter((r) => r.to >= TODAY && r.from <= LAST)
  .filter((r, i, all) => all.findIndex((x) => x.title === r.title && x.place === r.place) === i)
  .sort((a, b) => a.to.localeCompare(b.to));

mkdirSync("data", { recursive: true });
writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), from: TODAY, to: LAST, sources: status, events: merged, running: runs }, null, 2) + "\n");
const bad = Object.entries(status).filter(([, s]) => !s.ok).map(([n, s]) => `${n} (${s.error})`);
console.log(`${merged.length} events, ${runs.length} running, ${TODAY} to ${LAST}; was ${previous?.events?.length ?? "none"}`);
if (bad.length) console.log(`Failed: ${bad.join("; ")}`);
