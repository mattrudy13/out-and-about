# Out & About

Concerts, theater, art shows and farmers markets in Virginia Beach and Norfolk for the next four weeks,
on one phone-friendly page: https://mattrudy13.github.io/out-and-about/

Listings come from Ticketmaster, The Z, Virginia MOCA, the Virginia Symphony, Norfolk Arts and Little
Theatre of Virginia Beach, refreshed four times a day by a GitHub Action. The Z and Little Theatre block
GitHub's servers, so a weekly job on a Mac refreshes those two. Kids' shows, sports, comedy and 18+ events
are left out.

## Editing by hand

- `data/markets.json`: farmers markets and their schedules (no market publishes a feed).
- `data/running.json`: exhibitions and other long runs that no feed lists.
- `data/hide.json`: words from a title to keep a listing off the page.

Each file's `about` line explains its fields. Changes show up after the next refresh
(`gh workflow run update.yml -R mattrudy13/out-and-about` to run one now).

## Run it locally

```sh
TICKETMASTER_KEY=… node scripts/events.mjs   # writes data/events.json (Ticketmaster is skipped without the key)
node scripts/events.mjs --local              # only The Z and Little Theatre
python3 -m http.server 8766                  # then open http://localhost:8766/
```

Node 22+, no packages. Project notes for development: `CLAUDE.md`. Ideas for later: `ENHANCEMENTS.md`.
