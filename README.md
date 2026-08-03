# SNS Tracker

A tiny, database-free log for tracking SNS entries among coworkers. rSNS (remote) counts as 0.5 SNS.

No backend, no database, no login. You pick your nickname from a dropdown and hit submit — that calls the GitHub API directly from the page to trigger a GitHub Action, which validates the input and appends it to `data/log.json`. The static site reads that file to render the leaderboard and activity feed.

## How it works

1. Someone picks their nickname from the dropdown (`data/roster.json`), picks SNS or rSNS, optionally adds a note, and hits "Log it".
2. The page calls `POST /repos/{repo}/actions/workflows/log-entry.yml/dispatches` on the GitHub API, using a token embedded in `app.js`, to trigger the workflow with those inputs.
3. `.github/workflows/log-entry.yml` runs, checks the nickname is actually in `data/roster.json` and the type is `SNS`/`rSNS`, then appends a record to `data/log.json`, commits, and pushes.
4. GitHub Pages redeploys automatically. ~15 seconds after submitting, the page refetches `data/log.json` and the new entry shows up for everyone.

## Setup

1. Create a **public** GitHub repo and push this folder's contents to it (root of the default branch, e.g. `main`).
2. In repo Settings → Pages, set **Source** to **"GitHub Actions"** (not "Deploy from a branch" — the deploy workflow handles publishing).
3. In repo Settings → Actions → General → Workflow permissions, make sure "Read and write permissions" is enabled (needed so `log-entry.yml` can commit `data/log.json` back to the repo).
4. Edit [data/roster.json](data/roster.json) with your coworkers' nicknames (no real names).
5. Create a **fine-grained personal access token** at https://github.com/settings/personal-access-tokens/new:
   - Resource owner: your account
   - Repository access: "Only select repositories" → this repo
   - Permissions → Repository permissions:
     - **Actions: Read and write**
     - **Contents: Read-only**
   - Set an expiration (30–90 days).
6. Add that token as a **repo secret**, NOT in any file: Settings → Secrets and variables → Actions → "New repository secret" → name it `DISPATCH_TOKEN`, paste the value.
7. Confirm `REPO` and `BRANCH` at the top of [app.js](app.js) match your repo (already set to `dondischl12/SNS` / `main`). Leave `GH_TOKEN` as `"__GH_TOKEN__"` — the deploy workflow fills it in automatically.
8. Commit/push. The `deploy.yml` workflow builds and publishes the site, injecting the real token only into the deployed copy.
9. Share the Pages link with your coworkers — no GitHub account needed to use it.

## ⚠️ Security tradeoff, read this

The token is **never committed to git** — it's stored as an encrypted Actions secret (`DISPATCH_TOKEN`) and swapped into the placeholder in `app.js` only during the deploy step, by [.github/workflows/deploy.yml](.github/workflows/deploy.yml). This matters for a **public** repo specifically: GitHub's secret scanning auto-revokes any of its own tokens the moment it detects one committed to a public repo, even if you click through push protection — so pasting the real token directly into a tracked file simply doesn't work here, it'll die on the next push.

That said, the token is still visible in the **final deployed page's source** to anyone who visits the site — that part is unavoidable for a static site with no backend, since the browser itself needs the token to call the GitHub API. To limit the damage from that:

- The token is scoped to **only this repo**, with **Actions: write** and **Contents: read-only** — it can trigger the logging workflow but **cannot push commits or edit any file**, including this site's own code. Worst case if it leaks: someone spams fake entries into `data/log.json` or burns your Actions minutes. They can't deface the site or run arbitrary code on anyone's machine.
- The workflow itself re-validates the nickname against `data/roster.json` and the type against `SNS`/`rSNS` server-side, so a leaked token can't inject arbitrary nicknames or values, only spam existing valid combinations.
- Rotate the token occasionally: generate a new one, update the `DISPATCH_TOKEN` secret (Settings → Secrets and variables → Actions), then re-run the deploy workflow (or just push anything to `main`).

## Data format

Each entry in `data/log.json`:

```json
{
  "id": 1735921234567,
  "nickname": "Falcon",
  "type": "SNS",
  "value": 1,
  "note": "",
  "timestamp": "2026-08-03T15:04:00Z"
}
```

`value` is `1` for SNS and `0.5` for rSNS.

## Notes

- Nicknames must exactly match an entry in `data/roster.json` — add/remove people by editing that file and pushing.
- Since the repo is public, anyone with the link can see the leaderboard and activity feed. Don't put real names or anything sensitive in nicknames or notes.
