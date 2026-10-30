# Out & About: project notes

An events page for Rudy's mom (in her 60s, mostly on her phone): concerts, theater, art and farmers markets
in Virginia Beach and Norfolk for the next 4 weeks. Live at https://mattrudy13.github.io/out-and-about/ (repo
`mattrudy13/out-and-about`, GitHub Pages from `main` at the root). Mockups (layout A, "day by day", was
picked): https://claude.ai/artifact/RYwzd87JHpqLjXN3HPG6Wj. Ideas for later: `ENHANCEMENTS.md`.

## Versions

- **v0.1** (2026-10-29): first build and launch. Day-by-day list, kind filters, Running for a while and Farmers
  markets boxes; Ticketmaster + 4 venue feeds + Little Theatre's season page + hand-kept markets/exhibitions.
- **v0.2** (same night, PRs #1–#4): The Z and Little Theatre refreshed from Rudy's Mac (Cloudflare blocks
  GitHub); duplicate listings matched on venue + start time; kids' shows caught by Ticketmaster sub-genre and
  `data/hide.json`; "(Touring)" dropped from titles; 3+-night runs collapsed into one card.

## Rudy's choices (ask before changing)

- Cities: Virginia Beach and Norfolk only.
- Kinds: Music, Theater (plays, opera, dance), Art, Market. **No sports, comedy or kids/family events.**
- 18+/21+ events are hidden (`ADULTS_ONLY` in the script).
- 4 weeks ahead; the page shows 2 weeks, then a "Show N more events" button.
- Tapping an event opens the venue's or Ticketmaster's own page (no detail pages, no expand-in-place).
- Website only: no email digest or calendar buttons.
- A show with 3+ nights at one venue is one card ("8 shows through Nov 15") plus a Running for a while entry.
- The Z and Little Theatre are refreshed from his Mac, not worked around (see below).
- Phone first, large type (Atkinson Hyperlegible, 17px+), light theme only.

## Files

- `index.html`, `style.css`, `app.js`: the page. Plain JS, no build. The kind filter is remembered in
  `outabout:kind` (localStorage). Several markets on one day share one card. Today's events drop off 3 hours
  after they start; the footer says when the data was updated and warns if it's over 2 days old.
- `scripts/events.mjs`: writes `data/events.json`: `events`, `running`, and `sources` (each source's `ok`,
  `events`, `error`, `checked` = last success, `macOnly`). A failed source keeps its upcoming events from the
  last run, so an outage never empties the page.
- `data/markets.json`, `data/running.json`, `data/hide.json`: **hand-kept**, see each file's `about` line.
  `hide.json` is title words to leave off the page, for listings the filters miss (first entry: "Brains On!", a
  kids' podcast show Ticketmaster files under theater).
- `.github/workflows/update.yml`: runs the script 4×/day (GitHub skips some scheduled runs), commits only when
  something besides `updated` changed, then fails the run (GitHub emails) if a source failed, or if the Mac-only
  sources haven't been refreshed for 14 days.
- `scripts/refresh-local.sh` + `scripts/com.mattrudy13.out-and-about.plist`: the weekly Mac job (below).

## Sources

| Source | How | Filter |
|---|---|---|
| Ticketmaster | Discovery API, 20 mi from 36.86,−76.15, repo secret `TICKETMASTER_KEY` | City must be VB or Norfolk. Music segment → Music; Arts & Theatre → Theater, except Classical → Music and Fine Art → Art. Dropped: comedy, children's, family, magic, circus and "Miscellaneous" (themed parties) genres, children's/family/kids sub-genres, the `family` flag, parking/upgrade add-ons, cancelled shows. "(Touring)" is stripped from titles |
| The Z (thez.org) | Events Calendar feed `/wp-json/tribe/events/v1/events` (**Mac-only**) | Drop categories family/education/comedy/open mic/camp. "Music" categories → Music, else Theater |
| Virginia MOCA | same feed | Drop classes, workshops, camps, age-grouped and family events. Exhibitions aren't in the feed: put them in `running.json` |
| Virginia Symphony | same feed (includes Virginia Opera) | City filter drops Newport News, Williamsburg, Richmond, Fairfax. "Opera" → Theater |
| Norfolk Arts | same feed | Weekly "open hours" dropped; titles trimmed of dates and "Free" |
| Little Theatre of VB | parses `ltvb.com/seasons/<yyyy-yyyy>/` ("Show Dates" lines) (**Mac-only**) | Each show → a Running for a while item plus an "opens" event |
| Markets / running | hand-kept JSON | Markets with `check: true` say "check the date before you go" |

Every listing also goes through: `ADULTS_ONLY` and `KIDS` title patterns, `data/hide.json`, then these merges:

- **Multi-day feed events** (a play's run at The Z) become an event on the first day ("Runs through …") and a
  Running for a while item.
- **Duplicates:** the same show from Ticketmaster and a venue feed is merged when it's the same day and either
  one title contains the other or it's the same venue at the same start time (the symphony's "Benefit Concert
  for The Muse Writers Center" was Ticketmaster's "Musicians of the Virginia Symphony Orchestra"). The venue's
  listing wins because venue feeds run first.
- **Long runs:** 3+ performances on different days at one venue (title + venue match, markets excluded) keep
  only the first night, with "N shows through <date>", and add a Running for a while item.

Checked 2026-10-29 and left out: visitvirginiabeach.com (Cloudflare bot check blocks scripts), Eventbrite (no
public search API), Virginia Stage Company (no feed; check whether its Wells Theatre shows reach Ticketmaster),
Chrysler Museum (feed exists but listed nothing), Norfolk's Ghent / MacArthur / Five Points markets (no 2026
schedule found). The Virginia Arts Festival has no feed, but its Attucks Theatre shows come through Ticketmaster.

## Mac-only sources (The Z, Little Theatre)

Both sites are behind Cloudflare, which answered GitHub's servers with HTTP 403 on 2026-10-29 but serves a home
connection. Rudy's choice: refresh them from his Mac. **Don't try to get around the block** (browser
User-Agent, proxies): it's the sites' choice.

- On Actions (`GITHUB_ACTIONS=true`) the script skips them and keeps their last listings.
- `scripts/refresh-local.sh` (Sundays 10 AM via launchd; on the next wake if the Mac was asleep) resets and pulls
  main, runs `node scripts/events.mjs --local` (only these two; everything else is kept as is), and commits +
  pushes `data/events.json` if it changed. Log: `~/Library/Logs/out-and-about-refresh.log`. Try it without
  pushing: `scripts/refresh-local.sh --no-push`. Run it now: `launchctl kickstart gui/$(id -u)/com.mattrudy13.out-and-about`.
- **It runs from its own clone, `~/.local/share/out-and-about`**, not the working copy on the Desktop: macOS
  privacy protection doesn't let launchd jobs read `~/Desktop` (first install: exit 127, "can't open input
  file"). The script pulls before each run, so the clone keeps itself current; don't edit it by hand.
- Install (done 2026-10-29): `git clone https://github.com/mattrudy13/out-and-about.git ~/.local/share/out-and-about`,
  `cp ~/.local/share/out-and-about/scripts/com.mattrudy13.out-and-about.plist ~/Library/LaunchAgents/`, then
  `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.mattrudy13.out-and-about.plist`. To reinstall after
  a plist change, `launchctl bootout gui/$(id -u)/com.mattrudy13.out-and-about` first (bootstrapping a loaded job
  fails with "5: Input/output error").
- If GitHub emails "not refreshed from the Mac since …", the weekly job has stopped: check the log above and
  `launchctl print gui/$(id -u)/com.mattrudy13.out-and-about` (`last exit code`).

## Setup notes (2026-10-29)

- **Ticketmaster key:** the secret needs the **Consumer Key** from developer.ticketmaster.com → My Apps (the hub
  uses the same one). The first two values saved got HTTP 401; copying the key and running
  `pbpaste | gh secret set TICKETMASTER_KEY -R mattrudy13/out-and-about` fixed it. Free tier: 5,000 calls/day;
  this uses 1–3 a run.
- GitHub may still report Pages as "errored" from the first build, which was cancelled when the bot's data
  commit landed; later builds succeeded and the site serves fine.
- Pages and `raw.githubusercontent.com` cache files for several minutes. To see the data right after a run, use
  `gh api repos/mattrudy13/out-and-about/contents/data/events.json -H "Accept: application/vnd.github.raw"`.
- Merging a PR doesn't refresh the data; run `gh workflow run update.yml -R mattrudy13/out-and-about`.

## Dev notes

- Preview: `python3 -m http.server 8766`. Phone check at 360 and 375 px: load the page in an iframe of that
  width and compare `scrollWidth` (headless Chrome won't go below ~500 px).
- Ticketmaster can't run locally without the key; a run without it keeps the Ticketmaster listings already in
  `data/events.json`, so the merge rules (hide, dedupe, collapse) can still be tested on them. Restore the file
  after (`git checkout -- data/events.json`) so a PR doesn't fight the bot's data commits.
- Background Claude sessions work in worktrees under `.claude/` (git-ignored) and open PRs; Rudy merges.
- No tooltips (Rudy's rule).
- Commits: Conventional Commits. No commits or pushes 8am–5pm ET on weekdays unless asked.
