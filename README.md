# 🥋 SteigerDojoEsports

A complete, production-structured **esports tournament management platform** — create and manage tournaments, register teams, generate brackets, report match results and follow the competitive scene. Built in the spirit of **Challengermode / FACEIT / Battlefy** under the original **SteigerDojoEsports** brand.

> React + TypeScript + Vite • Firebase (Auth / Firestore) • Cloudinary (image uploads) • Tailwind CSS • React Router • Dark esports theme • Fully responsive
>
> **100% free to run:** Firebase Auth + Firestore stay on the free Spark plan, and image uploads use Cloudinary's free tier instead of the now-paid Firebase Storage. No billing/credit card required.

---

## ✨ Features

| Area | Highlights |
|------|-----------|
| **Auth** | Email/password, Google sign-in, password reset, role system (Admin / Organizer / Captain / Player), avatar upload |
| **Home** | Banner slider, live / upcoming / completed tournaments, featured teams, latest news, sponsors, statistics |
| **Tournaments** | Create / edit / delete / publish, 5 formats, banners, rules, prize pools, registration windows, filtering |
| **Brackets** | Auto & manual seeding, single/double elimination + round-robin generation, winner advancement, bracket visualization |
| **Teams** | Create team, logo upload, invite players, accept/decline invites, leave, transfer captaincy, roster & stats |
| **Registration** | Eligibility checks (team size, deadline, duplicates, capacity), check-in, status tracking |
| **Matches** | Scoreboard, score reporting, real-time match chat, admin force-result / reschedule / disqualify |
| **Profiles** | Avatar, country, bio, main games, team, stats, win rate, achievements, pending invites |
| **Admin** | Stats dashboard, user/team/tournament/news/sponsor management, broadcast announcements |
| **News** | Publish/edit/delete articles, featured article, categories, search |
| **Games** | Dedicated R6 & Valorant hubs (operator bans / agent picks, rankings, schedule) with API integration placeholders |
| **System** | Real-time notifications, global search, toasts, skeletons, empty states, error boundary, protected & admin routes |

Supported games: **Rainbow Six Siege, Valorant, Counter-Strike 2, Apex Legends, PUBG, League of Legends.**

---

## 🏗️ Project structure

```
SteigerDojoEsports/
├─ public/
│  └─ assets/             # drop logo.png here (auto-used in navbar/login/footer)
├─ src/
│  ├─ components/
│  │  ├─ ui/              # Button, Card, Modal, Input, Avatar, Skeleton, Logo, …
│  │  ├─ layout/          # Navbar, Footer, Layout
│  │  ├─ routing/         # ProtectedRoute, AdminRoute
│  │  ├─ tournaments/     # TournamentCard
│  │  ├─ teams/           # TeamCard
│  │  ├─ brackets/        # Bracket visualization
│  │  ├─ games/           # GameHub
│  │  └─ ErrorBoundary.tsx
│  ├─ contexts/           # AuthContext, ToastContext
│  ├─ hooks/              # useTournaments, useTeams, useNotifications, useAsync
│  ├─ firebase/           # config.ts (env-driven)
│  ├─ services/           # auth, user, team, tournament, registration, match,
│  │                      #   bracket, news, sponsor, notification, storage
│  ├─ pages/              # Home, Login, Tournaments, TeamDetail, Profile, admin/…
│  ├─ types/              # all Firestore entity interfaces
│  ├─ utils/              # constants (games/roles), helpers, bracket logic
│  ├─ App.tsx             # routing
│  ├─ main.tsx            # entry + BrowserRouter
│  └─ index.css           # Tailwind + theme
├─ firestore.rules        # security rules
├─ storage.rules
├─ firestore.indexes.json
├─ firebase.json
├─ .github/workflows/deploy.yml   # GitHub Pages CI
└─ .env.example
```

---

## 🚀 Getting started

### 1. Prerequisites
- Node.js **18+**
- A Firebase project (free Spark plan is fine)

### 2. Install
```bash
npm install
```

### 3. Configure Firebase
1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method**: enable **Email/Password** and **Google**.
3. **Firestore Database**: create database (production mode).
4. **Project settings → Your apps → Web app**: copy the SDK config values.
   _(You no longer need to enable Firebase Storage — image uploads use Cloudinary, see step 3b.)_
5. Copy the env template and fill it in:
   ```bash
   cp .env.example .env
   ```
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...
   ```

### 3b. Configure Cloudinary (free image uploads)
Firebase Storage now requires a paid (Blaze) plan, so this project uses
**Cloudinary's free tier** for avatar / team logo / banner / news-cover uploads.
It runs entirely from the browser — no backend needed.

1. Create a free account at <https://cloudinary.com> (no credit card).
2. **Dashboard** → copy your **Cloud name**.
3. **Settings → Upload → Upload presets → Add upload preset**:
   - **Signing Mode: Unsigned**
   - Save, then copy the **preset name**.
4. Add both to your `.env`:
   ```env
   VITE_CLOUDINARY_CLOUD_NAME=...
   VITE_CLOUDINARY_UPLOAD_PRESET=...
   ```

> Free tier = 25 GB storage + 25 GB bandwidth/month, plenty for a community site.
> Note: deleting old images isn't done automatically (it needs a private API key
> that can't live in a static site), so replaced images are simply left orphaned
> in your Cloudinary library — harmless within the free quota.

### 4. Run locally
```bash
npm run dev
```
Open <http://localhost:5173>.

### 5. Deploy security rules (recommended)
```bash
npm install -g firebase-tools
firebase login
firebase use --add            # select your project
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 👑 Creating the first admin

New accounts default to the **Player** role. To bootstrap an admin:

1. Register an account in the app.
2. In **Firebase Console → Firestore → `users` → <your uid>**, set the `role` field to `admin`.
3. Reload the app — you now have access to **/admin**, tournament creation, and news/sponsor management.

Admins can promote other users from the **Admin Dashboard → Users** tab.

---

## 🗄️ Firestore collections

`users` · `teams` · `teamInvites` · `tournaments` · `registrations` · `matches` · `brackets` · `matchMessages` · `news` · `sponsors` · `notifications`

Full TypeScript interfaces for every entity live in [`src/types/index.ts`](src/types/index.ts).

---

## 🌐 Deploy to GitHub Pages

This repo ships with a ready CI workflow at `.github/workflows/deploy.yml`.

1. Push the project to a GitHub repo named **`SteigerDojoEsports`**
   (the Vite `base` and Router `basename` are preconfigured for this name —
   change both in `vite.config.ts` and `src/main.tsx` if you use a different name).
2. **Repo Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Repo Settings → Secrets and variables → Actions** — add each `VITE_FIREBASE_*`
   value **plus** `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET`
   as repository secrets.
4. Push to `main`. The workflow builds, adds a `404.html` SPA fallback, and deploys.

Your site will be live at `https://<username>.github.io/SteigerDojoEsports/`.

> **Manual deploy alternative:** `npm run deploy` (uses the `gh-pages` package).

---

## 🧩 Future API integrations

The R6 and Valorant hubs include clearly-marked placeholders for live data:
- **R6** → Ubisoft Stats / R6 match data
- **Valorant** → Riot Games API

Swap the static sample arrays in `src/pages/games/*` for live fetches when keys are available.

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Build & publish to GitHub Pages via `gh-pages` |

---

## 📝 License

Original implementation under the **SteigerDojoEsports** brand. Use freely for your community.
