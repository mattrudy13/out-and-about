#!/bin/zsh
# Weekly on Rudy's Mac (launchd, scripts/com.mattrudy13.out-and-about.plist): refreshes The Z and Little
# Theatre, whose Cloudflare blocks GitHub's servers, and pushes data/events.json if it changed.
# Run by hand: scripts/refresh-local.sh   (add --no-push to try it without committing)
set -euo pipefail

REPO="${0:A:h:h}"
cd "$REPO"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

echo "== $(date) =="
# Committing on another branch would strand the data there, so only refresh from main.
if [[ "$(git branch --show-current)" != "main" && "${1:-}" != "--no-push" ]]; then
  echo "Not on main (on $(git branch --show-current)); skipped"
  exit 1
fi
# The data file changes on GitHub several times a day, so start from the latest.
git pull --rebase -q origin main
node scripts/events.mjs --local

if git diff --quiet -- data/events.json; then
  echo "No change"
  exit 0
fi
if [[ "${1:-}" == "--no-push" ]]; then
  git diff --stat -- data/events.json
  echo "Changed (not committed: --no-push)"
  exit 0
fi
git add data/events.json
git commit -q -m "chore(data): refresh mac-only sources $(date -u +%Y-%m-%dT%H:%MZ)"
git pull --rebase -q origin main
git push -q origin main
echo "Pushed"
