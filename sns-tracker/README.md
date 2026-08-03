# SNS Tracker

A tiny, database-free log for tracking SNS entries among coworkers. rSNS (remote) counts as 0.5 SNS.

No backend, no database. Submissions go through a GitHub Issue form; a GitHub Action parses the issue and appends the entry to `data/log.json`, which the static site reads directly.

## How it works

1. Someone clicks "Log a SNS" or "Log a rSNS" on the site.
2. That opens a pre-filled GitHub Issue (using the template in `.github/ISSUE_TEMPLATE/log-entry.yml`) with the `type` field already set. They type a nickname (no real names) and submit.
3. The `.github/workflows/log-entry.yml` workflow triggers on the new issue, parses the nickname/type/note, appends a record to `data/log.json`, commits it, comments on the issue, and closes it.
4. GitHub Pages redeploys automatically since it's serving straight from the branch. The site fetches `data/log.json` on load and renders the leaderboard + recent activity.

## Setup

1. Create a **public** GitHub repo and push this folder's contents to it (root of the default branch).
2. In repo Settings → Pages, set source to "Deploy from a branch", branch = your default branch, folder = `/ (root)`.
3. In repo Settings → Actions → General → Workflow permissions, make sure "Read and write permissions" is enabled (needed so the Action can commit back to the repo).
4. Edit [app.js](app.js) — set `REPO` at the top to `"your-username/your-repo-name"`.
5. Commit/push that change. Visit the Pages URL GitHub gives you.
6. Share the link with your coworkers. Everyone needs a GitHub account to submit (they just need to be able to open an issue on the repo).

## Data format

Each entry in `data/log.json`:

```json
{
  "id": 12,
  "nickname": "Falcon",
  "type": "SNS",
  "value": 1,
  "note": "",
  "timestamp": "2026-08-03T15:04:00Z"
}
```

`value` is `1` for SNS and `0.5` for rSNS.

## Notes

- Nicknames are free text and case-sensitive — agree on one spelling per person or stats will fragment across variants.
- Since the repo is public, anyone with the link can see the leaderboard and issue history. Don't put real names or anything sensitive in the nickname/note fields.
