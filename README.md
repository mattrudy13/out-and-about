# Out & About

Concerts, theater, art shows and farmers markets in Virginia Beach and Norfolk for the next four weeks,
on one phone-friendly page: https://mattrudy13.github.io/out-and-about/

Listings come from Ticketmaster, The Z, Virginia MOCA, the Virginia Symphony, Norfolk Arts and Little
Theatre of Virginia Beach, refreshed a few times a day by a GitHub Action. Farmers markets and long-running
exhibitions are kept by hand in `data/markets.json` and `data/running.json`.

## Run it locally

```sh
TICKETMASTER_KEY=… node scripts/events.mjs   # writes data/events.json (Ticketmaster is skipped without the key)
python3 -m http.server 8766                  # then open http://localhost:8766/
```

Node 22+, no packages.
