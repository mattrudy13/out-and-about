# Enhancements

Ideas for later, roughly most useful first. Items marked "declined" were offered and not picked for v0.1–v0.2;
ask Rudy before building them.

## For Mom

1. **Home Screen icon.** iOS ignores the SVG favicon for Add to Home Screen and uses a screenshot instead. A
   180×180 `apple-touch-icon.png` (and a `manifest.json` name/short_name) would give her a proper app icon.
2. **Directions link.** A small "Directions" link per card (Apple Maps on iPhone, Google Maps elsewhere) using
   the venue name and city. Declined as part of "expand in place" in v0.1; could come back as just a link.
3. **"Free" filter.** A sixth chip for free events (gallery receptions, markets, Norfolk Arts programs). The data
   already has `free`.
4. **This weekend jump.** A "This weekend" chip or anchor at the top, for the most common question.
5. **Add to calendar.** An .ics link per event so it lands in her phone's calendar. Declined in v0.1 (website
   only); no accounts needed if wanted later.
6. **Weekly email.** A Thursday "this weekend and next week" email (e.g. Resend's free tier, her address as a
   secret). Declined in v0.1.
7. **Dark mode.** Light only in v0.1; tokens are already on `:root`, so a `prefers-color-scheme` block is small.
8. **Adult art classes.** MOCA's adult classes and workshops (stained glass, glass fusing, portraits) are
   filtered out with the kids' classes. A "Classes" kind could bring the adult ones back if she'd like them.

## More listings

9. **Norfolk farmers markets.** Ghent, MacArthur and Five Points had no 2026 schedule on 2026-10-29; add them to
   `data/markets.json` when the 2027 season is posted (usually March–April).
10. **Confirm market dates.** Shore Drive Farm Market (Saturdays 9–noon) and Old Beach's Nov–Dec dates are
    unconfirmed (`check: true`). Rudy lives near Shore Drive.
11. **Chrysler Museum exhibitions.** Its events feed listed nothing in Nov–Dec 2026; its exhibitions could go in
    `data/running.json` by hand, like MOCA's.
12. **Virginia Stage Company.** No feed; check whether its Wells Theatre shows reach Ticketmaster before adding a
    page parser.
13. **Holiday and city events.** Holiday Lights at the Beach, tree lightings, Neptune Festival and other free city
    events aren't ticketed. visitvirginiabeach.com is blocked by its bot check, so a short hand-kept seasonal
    list is the realistic route.
14. **Event prices.** Ticketmaster rarely sends prices for local venues. SeatGeek's API (free client id) has a
    "lowest price" that could fill the gap.

## Upkeep

15. **Freshness line for The Z and Little Theatre.** Show "The Z and Little Theatre last checked Oct 29" in the
    footer from `sources[...].checked`, so a stopped Mac job is visible on the page, not just in GitHub's email.
16. **Cron Worker.** If GitHub skips too many of the 4 daily runs, reuse the hub's Cloudflare Worker approach
    (`hub/worker/`) to dispatch the workflow on time.
17. **Hide list from the page.** If Mom spots something she doesn't want, a way for Rudy to add it to
    `data/hide.json` without editing JSON (e.g. a GitHub issue template or a one-line command).
18. **Collapse threshold.** Long runs collapse at 3+ performances on 2+ days. If two-night runs (e.g.
    Pagliacci on Nov 6 and 8) feel repetitive, lower it to 2. Two shows on the same day stay as they are.
