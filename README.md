# LUMINA
A gamified productivity app: real tasks earn real XP, XP levels you up (1→100),
and a streak tracks daily consistency. Same calm, single-hue visual system as
Lumen — vanilla HTML/CSS/JS, ES modules, no build step, deployable straight
to GitHub Pages.

## Status: Phase 1 (local-only, fully playable)

Everything works right now with **zero setup** — auth, tasks, XP, leveling,
streaks, achievements, dashboard — all persisted to `localStorage` on one
device. Open `index.html` (or serve the folder — see below) and go.

Phase 2 adds real accounts and cross-device sync via Supabase. The code is
already structured for that swap (see "Phase 2" below) — it just isn't wired
in yet, so you can start using the app today and upgrade later without a
rewrite.

## Running it locally

Browsers block ES module imports over `file://`, so serve the folder instead
of double-clicking `index.html`:

```bash
cd lumen-rpg
python3 -m http.server 8000
# then open http://localhost:8000
```

(Any static server works — `npx serve`, VS Code's Live Server, etc.)

## Deploying to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo Settings → Pages → Deploy from branch → `main` / root.
3. Done — it's a static site, no build step required.

## Project structure

```
index.html
css/
  tokens.css       design tokens (colors, spacing, type — single --theme-hue)
  base.css         resets, global element styles
  layout.css       app shell, dock nav, dashboard grid
  components.css   buttons, XP bar, task cards, achievements, modals, toasts

js/
  main.js          entry point — wires everything together
  auth/            phase 1 guest-mode "auth" (same function shapes as phase 2)
  database/        local-store.js (localStorage + event bus) and the
                    supabase-client.js scaffold for phase 2
  xp-system/       leveling.js — the XP curve and level-progress math
  task-system/      task CRUD, filtering, sorting, completion
  achievements/    achievement definitions + unlock checking
  streaks/         daily streak logic
  components/      reusable UI pieces (xp bar, nav, modals, task list, ...)
  pages/           dashboard + tasks/achievements/profile views
  utils/           small DOM/formatting helpers

supabase/
  schema.sql       phase 2 database schema (tables, RLS policies, indexes)
```

## The XP / leveling curve

```
requiredXp(level) = floor(BASE_XP * level ^ GROWTH_FACTOR)
```

With `BASE_XP = 100` and `GROWTH_FACTOR = 1.35` (both in
`js/xp-system/leveling.js`):

| Transition   | XP required |
|--------------|-------------|
| Level 1 → 2  | 100 |
| Level 10 → 11| 2,238 |
| Level 50 → 51| 19,661 |
| Level 99 → 100| 49,443 |

Early levels come fast; the climb from 50 to 100 is a long-term project —
reaching Level 100 takes just over **2.1M** lifetime XP. To rebalance the
whole curve, change those two constants — everything else (the progress
bar, the level-up modal, the dashboard) reads from `getLevelProgress()` and
updates automatically. Per-task XP rewards live in `DIFFICULTY_XP` in the
same file.

## Achievements

Defined declaratively in `js/achievements/achievements-data.js` as
`{ key, title, condition(state) }`. Adding a new one is a one-line addition
to that array — `checkAchievements()` re-evaluates every condition after
each task completion and unlocks anything newly satisfied.

## Phase 2: turning on Supabase accounts

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Add the Supabase client to `index.html` (or install it if you move to a
   bundler) and fill in the URL/anon key at the top of
   `js/database/supabase-client.js`.
3. Swap `main.js`'s imports from `auth/auth.js` + `database/local-store.js`
   over to the Supabase equivalents. The function names deliberately match
   (`signUp`, `signIn`, `signOut`, `fetchTasks`, `upsertTask`, ...) so this
   is a substitution, not a rewrite — `task-system`, `xp-system`,
   `achievements`, and `streaks` never talk to storage directly, they only
   go through whichever module you plug in.
4. Field names in `local-store.js`'s state already match the SQL column
   names (snake_case) for exactly this reason.

## A few gotchas worth knowing (carried over from building Lumen)

- `.hidden` needs `!important` (see `base.css`) — otherwise a more specific
  component rule can silently win and break a visibility toggle.
- The XP bar is mounted **once** and updated in place (`xpBar.render(...)`),
  never rebuilt from scratch — that's what makes the width transition and
  the "+XP" float animation actually animate instead of jumping.
- The ambient background (`components/glow-background.js`) pre-renders each
  blurred orb to an offscreen sprite canvas once, then just `drawImage()`s
  it every frame. Per-frame `shadowBlur` is the tempting shortcut here and
  it will visibly lag, especially at high `devicePixelRatio`.
- If you wire up Supabase auth in Phase 2, remember dropdowns/selects that
  depend on user data need to refresh on auth state change, not just on
  navigation, or they can load empty for whoever's on the active page when
  auth resolves.

## Future expansion (not built yet, architecture leaves room for it)

Custom themes beyond the 7-hue picker, avatars, a rewards shop, daily
quests, calendar-based planning, a study-time tracker, leaderboards (would
need a `shared`/public read policy on a leaderboard view in Supabase), and
an AI productivity assistant.
