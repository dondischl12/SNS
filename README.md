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
2. In repo Settings → Pages, set source to "Deploy from a branch", branch = your default branch, folder = `/ (root)`.
3. In repo Settings → Actions → General → Workflow permissions, make sure "Read and write permissions" is enabled (needed so the Action can commit back to the repo).
4. Edit [data/roster.json](data/roster.json) with your coworkers' nicknames (no real names).
5. Create a **fine-grained personal access token** at https://github.com/settings/personal-access-tokens/new:
   - Resource owner: your account
   - Repository access: "Only select repositories" → this repo
   - Permissions → Repository permissions:
     - **Actions: Read and write**
     - **Contents: Read-only**
   - Set an expiration (30–90 days) — you'll need to regenerate and re-paste it when it expires.
6. Edit [app.js](app.js) at the top:
   - `REPO` → `"your-username/your-repo-name"` (already set to `dondischl12/SNS`)
   - `BRANCH` → your default branch name (already set to `main`)
   - `GH_TOKEN` → paste the token from step 5
7. Commit/push. Visit the Pages URL GitHub gives you.
8. Share the link with your coworkers — no GitHub account needed to use it.

## ⚠️ Security tradeoff, read this

`GH_TOKEN` lives in a plain-text client-side file that anyone visiting the public site can view (view-source, dev tools, or just browsing the repo). That's unavoidable without standing up a real backend. To limit the damage:

- The token is scoped to **only this repo**, with **Actions: write** and **Contents: read-only** — it can trigger the logging workflow but **cannot push commits or edit any file**, including this site's own code. Worst case if it leaks: someone spams fake entries into `data/log.json` or burns your Actions minutes. They can't deface the site or run arbitrary code on anyone's machine.
- The workflow itself re-validates the nickname against `data/roster.json` and the type against `SNS`/`rSNS` server-side, so a leaked token can't inject arbitrary nicknames or values, only spam existing valid combinations.
- Rotate the token occasionally (delete + regenerate at the same settings URL, then update `GH_TOKEN` in `app.js`) if you ever suspect abuse.

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
