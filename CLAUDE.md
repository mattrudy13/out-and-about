# Out & About: project notes

An events page for Rudy's mom (in her 60s, mostly on her phone): concerts, theater, art and farmers markets
in Virginia Beach and Norfolk for the next 4 weeks. Repo `mattrudy13/out-and-about`, GitHub Pages from `main`
at the root. Started 2026-10-29, v0.1. Mockups (layout A was picked):
https://claude.ai/artifact/RYwzd87JHpqLjXN3HPG6Wj

## Rudy's choices (ask before changing)

- Cities: Virginia Beach and Norfolk only.
- Kinds: Music, Theater (plays, opera, dance), Art, Market. **No sports, comedy or kids/family events.**
- 18+/21+ events are hidden (`ADULTS_ONLY` in the script).
- 4 weeks ahead; the page shows 2 weeks, then a "Show N more events" button.
- Tapping an event opens the venue's or Ticketmaster's own page (no detail pages).
- Website only: no email digest or calendar buttons.
- Phone first, large type (Atkinson Hyperlegible, 17px+), light theme only.

## Files

- `index.html`, `style.css`, `app.js`: the page. Plain JS, no build. The kind filter is remembered in
  `outabout:kind` (localStorage). Several markets on one day share one card.
- `scripts/events.mjs`: writes `data/events.json` (`events`, `running`, and `sources` with each source's
  status). A failed source keeps its upcoming events from the last run.
- `data/markets.json`, `data/running.json`: **hand-kept**, see their `about` lines.
- `.github/workflows/update.yml`: runs the script 4×/day (GitHub skips some scheduled runs), commits only when
  something besides `updated` changed, then fails the run (GitHub emails) if any source failed, or if the
  Mac-only sources haven't been refreshed for 14 days.
- `scripts/refresh-local.sh` + `scripts/com.mattrudy13.out-and-about.plist`: the weekly Mac job (below).

## Mac-only sources (The Z, Little Theatre)

Both sites are behind Cloudflare, which answered GitHub's servers with HTTP 403 on 2026-10-30 but serves a
home connection. Rudy's choice: refresh them from his Mac. Don't try to get around the block (browser
User-Agent, proxies): it's the sites' choice.

- On Actions (`GITHUB_ACTIONS=true`) the script skips them and keeps their last listings; `sources[...].checked`
  is each source's last success and `macOnly: true` marks them.
- `scripts/refresh-local.sh` (Sundays 10 AM via launchd; on the next wake if the Mac was asleep) pulls main, runs
  `node scripts/events.mjs --local` (only these two; everything else is kept as is), and commits + pushes
  `data/events.json` if it changed. Log: `~/Library/Logs/out-and-about-refresh.log`. Try it without pushing:
  `scripts/refresh-local.sh --no-push`. Run it now: `launchctl kickstart gui/$(id -u)/com.mattrudy13.out-and-about`.
- Install (done once): `cp scripts/com.mattrudy13.out-and-about.plist ~/Library/LaunchAgents/ && launchctl
  bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.mattrudy13.out-and-about.plist`.

## Sources

| Source | How | Filter |
|---|---|---|
| Ticketmaster | Discovery API, 20 mi from 36.86,−76.15, repo secret `TICKETMASTER_KEY` (the same Consumer Key as the hub's) | City must be VB or Norfolk. Music segment → Music; Arts & Theatre → Theater, except Classical → Music and Fine Art → Art; comedy, children's, family, magic, circus and "Miscellaneous" (themed parties) dropped |
| The Z (thez.org) | Events Calendar feed `/wp-json/tribe/events/v1/events` | Drop categories family/education/comedy/open mic/camp. "Music" categories → Music, else Theater |
| Virginia MOCA | same feed | Drop classes, workshops, camps, age-grouped and family events. Exhibitions aren't in the feed: put them in `running.json` |
| Virginia Symphony | same feed (includes Virginia Opera) | City filter drops Newport News, Williamsburg, Richmond, Fairfax. "Opera" → Theater |
| Norfolk Arts | same feed | Weekly "open hours" dropped; titles trimmed of dates and "Free" |
| Little Theatre of VB | parses `ltvb.com/seasons/<yyyy-yyyy>/` ("Show Dates" lines) | Each show → a "Running for a while" item plus an "opens" event |
| Markets / running | hand-kept JSON | Markets with `check: true` say "check the date before you go" |

A feed event spanning several days (a play's run) becomes an event on its first day ("Runs through …") and a
"Running for a while" item. The same show from Ticketmaster and a venue feed is merged (same day, one title
contains the other); the venue's listing wins because venue feeds run first.

Checked 2026-10-29 and left out: visitvirginiabeach.com (Cloudflare bot check blocks scripts), Eventbrite (no
public search API), Virginia Stage Company and Virginia Arts Festival (no feed), Chrysler Museum (feed exists
but listed nothing), Norfolk's Ghent / MacArthur / Five Points markets (no 2026 schedule found).

## Dev notes

- Preview: `python3 -m http.server 8766`. Phone check at 360 and 375 px: load the page in an iframe of that
  width and compare `scrollWidth` (headless Chrome won't go below ~500 px).
- No tooltips (Rudy's rule).
- Commits: Conventional Commits. No commits or pushes 8am–5pm ET on weekdays unless asked.
