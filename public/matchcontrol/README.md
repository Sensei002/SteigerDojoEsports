# STGRMatchControl

A free, self-hosted **Rainbow Six Siege esports overlay system** — like [mapban.gg](https://mapban.gg), but you run it yourself on **GitHub Pages** for $0.

Drive a live broadcast from one control panel:

- 🟧 **Scorebug** — top-center match bar: team names, logos, score, ATK/DEF side, current map, best-of.
- 🟦 **Roster** — full-screen team line-up with logos, IGNs and roles.
- 🎙️ **Lower third** — caster names / handles, shown in **real time**.
- 🗺️ **Map ban / veto** — pick & ban sequence overlay.

Everything updates **live** in OBS as you click in the Match Control panel.

---

## How the live sync works

GitHub Pages is static (no server), so real-time updates use one of two backends — chosen automatically:

| Mode | When | Control from |
|------|------|--------------|
| **Firebase** (recommended) | When you fill in `firebase-config.js` | Any device / phone / 2nd PC → OBS |
| **Local** (zero setup) | Default, no config | Same browser only (open the panel as an OBS *Custom Browser Dock*) |

You can try everything in **Local mode** immediately, then add Firebase for true remote control.

---

## 1. Run it locally (try before deploying)

Because the overlays load shared JS files, open the folder with any static server (not `file://`):

```powershell
# from inside the STGRMatchControl folder
python -m http.server 8080
#   or:  npx serve .
```

Then visit <http://localhost:8080>. Add teams → open Match Control → open an overlay URL from the **Sources** page in another tab. Changes sync live (Local mode, same browser).

---

## 2. Enable remote control with Firebase (free)

Do this so you can control overlays from any device and so OBS (a separate browser) stays in sync.

1. Go to <https://console.firebase.google.com> → **Add project** (disable Analytics, it's not needed).
2. **Build → Realtime Database → Create Database** → choose a location → **Start in test mode**.
3. ⚙️ **Project settings → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` values.
4. Paste them into **`firebase-config.js`** (replace every `PASTE_…` value), save, and redeploy.
   - *Or* paste the config in the app's **Settings** page (saved to that browser only — handy for testing).

### Recommended database rules

Test mode expires and is world-writable. For a small private overlay this is fine short-term; to lock writes to your room while keeping overlays public-readable, use **Realtime Database → Rules**:

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true
    }
  }
}
```

> The Firebase web config is **not secret** — it's safe to commit. Access is controlled by these rules. For a fully private setup, add Firebase Anonymous Auth and require `auth != null` on `.write` (optional, advanced).

---

## 2.5 Lock the control panel behind a login (optional)

By default anyone with the URL can open the control panel. To require a **shared
username + password**, the project ships a login layer built on **Firebase
Authentication**:

- The **control pages** (`index`, `control`, `teams`, `settings`, `sources`) load
  `js/auth.js` and redirect to **`login.html`** when nobody is signed in.
- The **OBS overlays** (`overlay/*.html`) are deliberately left public so OBS
  browser sources keep working without a login.
- Real protection comes from the **database rules** (writes require a signed-in
  user), not from the JavaScript — the rules are enforced server-side by Firebase.

**One-time setup in the [Firebase console](https://console.firebase.google.com):**

1. **Authentication → Get started → Sign-in method →** enable **Email/Password**.
2. **Authentication → Users → Add user.** Email = `crew@stgr.local` (any name + the
   fixed `@stgr.local` domain), set a password. Your crew signs in by typing just
   the username (`crew`) and that password. Add more users for more logins.
3. **Realtime Database → Rules →** publish these (public read so overlays render,
   authenticated write so only logged-in operators can change the match):

   ```json
   {
     "rules": {
       "rooms": {
         ".read": true,
         "$room": { ".write": "auth != null" }
       }
     }
   }
   ```

4. **Authentication → Settings → Authorized domains →** make sure your hosts are
   listed: `localhost`, your `*.onrender.com` URL, and your custom domain.

The login uses Firebase's `stgr.local` email-domain mapping, so usernames stay
clean. To change the domain, edit `EMAIL_DOMAIN` in `js/auth.js` (and create the
matching user email in step 2).

> **Want the overlays private too?** That needs a secret token baked into each
> overlay URL plus a rule change — not covered here, since it complicates the OBS
> setup.

---

## 3. Deploy free on GitHub Pages

1. Create a new GitHub repo (e.g. `stgr-match-control`) and upload **all files in this folder** (keep the structure).
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch** → branch `main`, folder `/ (root)` → **Save**.
3. Wait ~1 minute. Your site is live at:
   `https://<your-username>.github.io/<repo-name>/`
4. The `.nojekyll` file (included) makes sure GitHub serves all files as-is.

> Commit `firebase-config.js` **with your real values** so the overlays work inside OBS (OBS can't read your browser's Settings override).

---

## 4. Add the overlays to OBS

1. Open the deployed site → **Sources** page → **Copy** each overlay URL.
2. In OBS: **Sources → + → Browser**.
3. Paste the URL. Set **Width 1920 / Height 1080**. ✔ *Shutdown source when not visible* and ✔ *Refresh browser when scene becomes active* are both fine.
4. Repeat for each overlay you want (scorebug, roster, lower third, map ban).

Each overlay has a transparent background and positions itself inside the 1920×1080 frame.

---

## 5. Run a match

1. **Teams** — add your teams (name, tag, color, logo, roster).
2. **Match Control** — pick the **Game** (Rainbow Six Siege by default, or VALORANT), then pick Team A & Team B, drive score with **+ / −** or **Round win**, set side / map / best-of / phase.
   - The **Game** selector at the top sets the map pool and round-history objectives (R6 bomb sites / Valorant plant sites). Switching loads that game's maps and clears the current map & veto; the round-history log is kept. R6 is the focus and stays the default.
3. **Roster / Lower third / Map ban** — toggle **Show on stream**; edit casters and veto steps live.
4. Use **rooms** (Settings) to run more than one match at once — the room is added to every overlay URL automatically.

---

## 6. Live player stats on the Roster overlay (optional)

The Roster overlay can show each player's **K/D · Headshot % · Win %** pulled live
from **Ubisoft's own R6 API** (the same backend the stats sites use). Because the
site is static and Ubisoft can't be called from a browser, a tiny free **proxy**
does the fetch server-side. The proxy logs into Ubisoft with a throwaway account
and reads the *public* stats of the IGNs you query.

> **Why not tracker.network?** It now hard-blocks all server-side requests with a
> Cloudflare challenge (HTTP 403), so a simple proxy can't read it. Ubisoft direct
> is the reliable path.

**One-time setup:**

1. **Make a burner Ubisoft account** — free, at <https://account.ubisoft.com>, with a
   fresh email and **2-factor auth OFF** (the worker can't pass a 2FA prompt). It
   only needs to be a valid account; it reads other players' public stats, not its own.
2. **Deploy the worker**: <https://dash.cloudflare.com> → **Workers & Pages → Create →
   Worker** (start from *Hello World* to get the in-browser editor) → **Edit code** →
   paste all of [`stats-proxy/worker.js`](stats-proxy/worker.js) → **Deploy**.
3. **Add the login as secrets** (encrypted — never in the code): in the worker →
   **Settings → Variables and Secrets → Add**, type **Secret**, add two:
   - `UBI_EMAIL` = the burner account email
   - `UBI_PASSWORD` = its password

   Then **Deploy** again so the secrets take effect.
4. **Connect it**: copy the worker URL (`https://NAME.YOU.workers.dev`, *with* the
   `https://`) → app **Settings → Player stats (Ubisoft)** → paste → **Test** with a
   known IGN (e.g. `Pengu`) → **Save**.
5. **Enter IGNs**: on the **Teams** page, type each player's exact Ubisoft IGN and pick
   their platform (PC / PSN / Xbox).
6. Show the **Roster** overlay — stats appear under each player and fill in live.

> **Caveats:**
> - **KOST** is a per-match esports metric Ubisoft doesn't expose here, so its slot
>   shows `—`. K/D, HS% and Win% are reliable lifetime stats.
> - Keep the burner credentials out of the repo and out of chat — they live only as
>   Cloudflare Worker Secrets.
> - Troubleshooting: add `&debug=1` to a worker request
>   (`…workers.dev/?name=Pengu&debug=1`) to see the raw Ubisoft payload. A
>   `no_creds` error means the secrets aren't set; `auth_failed` means the login or
>   2FA is the problem.
> - Leave the proxy URL blank in Settings to turn the feature off entirely; the
>   Roster overlay then renders exactly as before.

---

## File structure

```
index.html            Hub / quick start
teams.html            Team & roster manager
control.html          Match Control panel
sources.html          OBS browser-source URLs (copy buttons)
settings.html         Firebase config, theme colors, room
firebase-config.js    <-- EDIT THIS with your Firebase project
overlay/
  scorebug.html       Top-center match bar
  roster.html         Full team line-up
  lowerthird.html     Caster lower third
  mapban.html         Map pick/ban veto
  bracket.html        Tournament bracket (groups + playoffs)
css/  app.css overlay.css
js/   store.js ui.js control.js teams.js overlay-common.js
stats-proxy/
  worker.js           Cloudflare Worker — tracker.network stats proxy (optional)
```

## Tech

Plain HTML/CSS/JS — no build step. Firebase Realtime Database (compat SDK via CDN) for sync, with a localStorage + BroadcastChannel fallback. Hosts anywhere static.
