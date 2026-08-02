# Project reorganisation

**Date:** 26–27 July 2026
**From:** `C:\Users\hassa\ride-hailing`
**To:** `C:\Users\hassa\OneDrive\Documents\A2 Projects\Taxi App\AC7 Taxi`

> The project briefly passed through a `Downloads\A2 Projects\...` path because I
> misread the destination. That folder has been removed. This document describes
> the final OneDrive location.

Git history preserved: **615 renames detected, 0 deletions, 211 commits intact.**

---

## What was actually wrong

The audit found five real problems, not the "many duplicated files" the brief assumed.

**1. Three competing frontends.** A vanilla-JS hash-router app (`src/`, `lib/`, `style/`), a standalone `driver_dashboard.html`, and an untouched `create-next-app` scaffold in `taxi-platform/`. None built. None talked to the backend.

**2. Two entry points, both broken.** Root `main.js` and `src/main.js` were near-identical copies importing paths that did not exist (`./components/lib/icons.js` when the file was at `lib/icons.js`).

**3. Duplicate stylesheets.** `style/*.css` (1,928 hand-written lines) and `src/styles/main.css` (Tailwind entry) both defined the same palette. Neither was fully wired.

**4. Config at the wrong level.** `.env.example` (backend secrets template) sat at the repo root alongside frontend files, inviting confusion about which environment file feeds which process.

**5. A `.gitignore` rule that silently untracked a real file.** A blanket `/config` entry meant `config/vault-policy.hcl` was invisible to git. Caught during verification and fixed.

**Not found:** duplicated Go code, unnecessary backend folders, or misplaced backend source. The Go codebase was already well organised.

---

## Final structure

```
AC7 Taxi/
├── backend/            Go module — cmd, internal, pkg, api, test, third_party
│   ├── database/migrations/   (was db/migrations)
│   ├── go.mod  go.sum  Makefile  Dockerfile
│   └── .env.example  .env.development.local
├── frontend/           React + TypeScript + Vite
├── deploy/             docker-compose ×3, k8s, kong, monitoring, observability, cron
├── config/             vault-policy.hcl
├── docs/               24 documents
├── scripts/            setup, migrations, git hooks
├── .github/workflows/  ci.yml, docker.yml
├── package.json        npm workspace root
└── README.md
```

---

## The key decision: why imports did not break

Moving Go source usually means rewriting every import. It did not here, because **`go.mod` moved with the source**.

The module is declared as `github.com/richxcame/ride-hailing`. When `go.mod` sits at `backend/go.mod`, the path `backend/pkg/common` still resolves as `github.com/richxcame/ride-hailing/pkg/common`. The module root moved; the module path did not.

**Zero import statements were changed across 356 Go files.** Verified: every internal import prefix (`internal`, `pkg`, `test`) maps to a directory that exists.

---

## What did break, and the fixes

| Broken by the move | Fix |
|---|---|
| `docker-compose*.yml` build contexts (`context: .`) | → `context: ../backend`, 13 services across 3 files |
| Observability volume mounts (`./deploy/tempo.yml`) | → `./observability/tempo.yml` |
| `Makefile` migration paths (5 refs) | `db/migrations` → `database/migrations` |
| `test/helpers/db.go` migration path | `file://db/migrations` → `file://database/migrations` |
| `scripts/` migration paths (3 files) | same rename |
| `.github/workflows/ci.yml` — Go jobs ran at repo root | added `defaults.run.working-directory: backend` to lint, security, test, build |
| `.github/workflows/*` Docker contexts | `context: .` → `context: ./backend` |
| `.gitignore` blanket `/config` | narrowed to `config/jwt_keys.json` and `config/*.generated.*` |

Checked and confirmed safe: the single `go:embed` directive (`pkg/swagger/openapi.yaml`) is package-relative, and the `go.mod` replace target (`./third_party/gobreaker`) moved alongside `go.mod`.

---

## Verification

| Check | Result |
|---|---|
| Frontend `tsc -b --noEmit` | Pass |
| Frontend `vite build` | Pass — 20 chunks, largest app bundle 29 kB gzipped |
| Go import prefixes resolve | Pass — `internal`, `pkg`, `test` all present |
| `go.mod` module path unchanged | Pass |
| `go:embed` target present | Pass |
| Replace directive target present | Pass |
| Git rename detection | 615 renames, 0 deletions |
| File parity source vs destination | 0 missing |

**Not verified in the sandbox:** `go build ./...`. Go is not installable in this environment (the network is allowlisted). Please run it once:

```bash
cd "C:\Users\hassa\Downloads\A2 Projects\Taxi app\AC7 Taxi\backend"
go build ./...
```

The reasoning above says it should compile unchanged, but that is an argument, not a test result.

---

## Archived, not deleted

Moved to `Downloads\_AC7-archive\` rather than removed, so nothing is unrecoverable:

- `legacy-frontend/` — the old vanilla-JS app, its CSS, and `driver_dashboard.html` (24 files)
- `taxi-platform/` — the unused Next.js scaffold

Neither was ever imported by the working application. Delete them when you are satisfied nothing is needed.

---

## Still to do

**1. The old folder.** `C:\Users\hassa\ride-hailing` still exists and is now a duplicate. Delete it once you have confirmed the new location works — but not before running `go build ./...` there.

**2. Reopen in VS Code.** The window still points at the old path. Open the new folder, and note the WSL path is now:

```
/mnt/c/Users/hassa/OneDrive/Documents/A2 Projects/Taxi App/AC7 Taxi
```

The spaces will need quoting in every shell command.

**OneDrive caveat.** `node_modules/` and `.git/` contain tens of thousands of small files. If OneDrive syncs them it will churn constantly and can corrupt a git index mid-write. Right-click each and choose **Always keep on this device → off**, or better, exclude them:

- `node_modules/` is already git-ignored and is regenerated by `npm install`
- Consider excluding the whole folder from OneDrive sync while developing

**3. Reinstall frontend dependencies.**

```bash
cd frontend && npm install
```

`node_modules` was deliberately not copied.

**4. Commit.** Everything is staged but nothing is committed — that is your call:

```bash
git commit -m "refactor: reorganise into backend/, frontend/, deploy/ structure"
```

---

## One security item

Unrelated to the restructure, but found while listing `Downloads`:

```
ac7-group-firebase-adminsdk-fbsvc-1287764f92.json
ac7-group-firebase-adminsdk-fbsvc-3e7e2047e6.json
ac7-group-firebase-adminsdk-fbsvc-4aa937a641.json
ac7-group-firebase-adminsdk-fbsvc-f5f6facf51.json
Backup-codes-ghaalabh10.txt
```

Each Firebase file contains a private key granting **full admin access to the `ac7-group` project, bypassing all security rules**. They are sitting unencrypted in a folder that also holds browser downloads.

Recommended: revoke all four in Firebase Console → Project Settings → Service Accounts → Manage keys, then issue one replacement stored outside `Downloads`. I did not open or move them.
