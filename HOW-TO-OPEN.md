# How to open GALEYR in your browser

Two shells, two different commands. **Use the one that matches your window.**
A PowerShell command pasted into bash fails silently in a confusing way — bash
reads `$env:USERPROFILE` as a literal string and leaves you in the wrong folder,
which is exactly what happened.

---

## If your prompt looks like `abdalla17@LAPTOP-...:$` — that is **WSL / Ubuntu bash**

```bash
cd "/mnt/c/Users/hassa/OneDrive/Documents/A2 Projects/All in 1"
npm run dev
```

## If your prompt looks like `PS C:\Users\hassa>` — that is **PowerShell**

```powershell
cd "$env:USERPROFILE\OneDrive\Documents\A2 Projects\All in 1"
npm run dev
```

Either way: wait for `Local: http://localhost:3000/`, then open
**http://localhost:3000**.

**Leave the window open.** Closing it stops the site. `Ctrl+C` stops it.

---

### How to tell which shell you are in

| Prompt looks like | Shell | Path style |
|---|---|---|
| `abdalla17@LAPTOP-DV164FNG:/mnt/c/...$` | WSL / Ubuntu bash | `/mnt/c/Users/...` |
| `PS C:\Users\hassa>` | PowerShell | `C:\Users\...` |
| `C:\Users\hassa>` | Command Prompt | `C:\Users\...` |

WSL sees the C: drive as `/mnt/c/`. There are no drive letters and no
backslashes in bash.

---

## Where everything is

| Address | What |
|---|---|
| `localhost:3000` | Home |
| `localhost:3000/restaurants` | All restaurants |
| `localhost:3000/delivery` | Track order, support, complaints, settings |
| `localhost:3000/partners` | Register your restaurant |
| `localhost:3000/couriers/apply` | Become a courier |
| **`localhost:3000/control`** | **Control Centre** |
| **`localhost:3000/admin`** | **Admin** (inside the Control Centre) |
| `localhost:3000/portal` | Restaurant portal |

There is also a **Control Centre** link in the footer of every page.

---

## First visit plays an 18-second intro

The GR opening sequence, by design. It runs **once per browser** — press **Skip**
(appears after 2 seconds), **Escape**, or click anywhere.

To see it again: open a private window, or clear site data.

---

## "This site can't be reached"

### `10.255.255.254 took too long to respond` — ERR_CONNECTION_TIMED_OUT

**You opened the wrong address.** `10.255.255.254` is WSL's internal gateway. It
is not a website and Windows Chrome cannot reach it.

`npm run dev` runs `vite --host`, which prints **two** URLs:

```
  ➜  Local:    http://localhost:3000/     ←  USE THIS ONE
  ➜  Network:  http://10.255.255.254:3000/  ←  ignore, WSL-internal
```

**Always open `http://localhost:3000`.** WSL2 forwards localhost to Windows
automatically; the Network address is for other machines on your network and
does not work from the Windows side.

### Any other "can't be reached"

Nearly always means the server has not finished starting. Vite takes 10–20
seconds cold, and longer from a OneDrive folder over WSL. **Wait, then reload.**

If it persists, read the terminal — the reason is printed there.

---

## A note on running from WSL

The project lives on a Windows drive that WSL sees through `/mnt/c`. That mount
does not forward file-change events, so Vite's watcher would never fire and
edits would appear to do nothing.

`vite.config.ts` already sets `server.watch.usePolling: true` to work around it,
so hot reload works from WSL. It costs a little CPU; that is the trade.

---

## About START.bat

`START.bat` was pointing at `frontend/` — the **old taxi project** — instead of
the GALEYR app at the root. That is why double-clicking it showed the wrong
site. It is fixed, and now writes `start-log.txt` so failures are readable.

Double-clicking it from this OneDrive folder still proved unreliable on your
machine: it ran once, then stopped producing any output or log. **Use the
terminal commands above instead** — they work every time and show you errors.

---

## Verified

The dev server was started against this exact folder and returned **HTTP 200**,
and the production build compiles clean. The application is not broken — every
problem so far has been in how it was being launched.
