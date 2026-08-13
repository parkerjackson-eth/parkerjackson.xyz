# Survivor Fantasy League

Fantasy sports for Survivor. Instead of drafting quarterbacks you draft castaways, and
instead of touchdowns you score immunity wins, idols, blindsides, and jury votes.

Everyone in a league drafts a handful of castaways before the premiere. After each
episode airs the commissioner ticks off what happened, the app applies the league's
scoring table, and the standings move. Highest cumulative total when someone wins Sole
Survivor takes the league.

Built to be run by one person on their own domain, with as little upkeep as possible.

---

## What is in here

| Screen | Who sees it | What it does |
| --- | --- | --- |
| Landing | everyone | Explains the game and shows the default scoring table |
| Sign up / log in | everyone | Email and password |
| Dashboard | members | Your leagues, your rank in each, next episode date |
| League home | members | Full standings, latest episode recap, join code |
| Cast hub | members | Every castaway with photo, bio, tribe, status, and fantasy points. Filter by tribe or status |
| Draft room | members | Snake draft with a live board. Members pick on their turn; the commissioner can enter picks for whoever is on the clock |
| My team | members | Your roster with running totals and a per-episode breakdown for each castaway |
| Episode entry | commissioner | Tick what happened, with a live point preview before saving |
| League settings | commissioner | Scoring table, roster size, join code, members, draft order |
| Season archive | members | Completed seasons and final standings |
| Admin | site owner | Create seasons, bulk-import casts, schedule episodes, see every league |

### Roles

- **Site owner (super admin)** — creates seasons, enters the cast, can view every league.
  The first account to sign up becomes the site owner automatically. You can also name a
  specific address with `SUPER_ADMIN_EMAIL`.
- **Commissioner** — created a league. Sets the scoring, runs the draft, logs episodes,
  manages membership.
- **Member** — joined with a code, drafted a team, reads the standings.

---

## Setup

### 1. Get the code running locally

```bash
cd survivor
npm install
cp .env.example .env
```

Fill in `.env`:

```bash
DATABASE_URL="postgresql://..."          # from Supabase / Neon (see below)
AUTH_SECRET="..."                        # openssl rand -base64 32
SUPER_ADMIN_EMAIL="you@example.com"      # this account becomes site owner
```

### 2. Create the database

Sign up for a free Postgres tier — [Neon](https://neon.tech) or
[Supabase](https://supabase.com) both work and neither needs a server to maintain. Copy
the connection string into `DATABASE_URL`.

> On Supabase, use the **connection pooling** (transaction mode) URI for the app.

Then create the tables:

```bash
npm run db:push      # creates the tables from prisma/schema.prisma
npm run db:seed      # optional: a sandbox season with 18 castaways to click around in
```

### 3. Run it

```bash
npm run dev
```

Open http://localhost:3000 and sign up. That first account is the site owner.

### 4. Set up your first real league

1. **Admin → New season.** Name it, set the premiere date, and note any twists
   (Edge of Extinction, Redemption Island) in the notes field.
2. **Bulk import the cast.** Paste one castaway per line, comma or tab separated:
   `Name, Age, Hometown, Occupation, Starting tribe, Photo URL`. Only the name is
   required, so a spreadsheet copy-paste works. A header row is skipped automatically.
3. **Switch on any twist scoring rules** for that season — they ship disabled.
4. **Create a league** on that season, pick a roster size, and set a draft lock just
   before the premiere.
5. **Share the join code** with your friends. They sign up and enter it.
6. **Draft.** Randomize the order in settings, then everyone picks on their turn in the
   draft room. If you would rather run the draft over a group chat, the commissioner can
   enter every pick manually from the same screen.
7. **After each episode**, add the episode and log the results. Standings update
   immediately for everyone.

---

## Deploying

### Vercel (the easy path)

1. Push this repo to GitHub.
2. Import it at [vercel.com/new](https://vercel.com/new).
3. **Set the Root Directory to `survivor`** — this app lives in a subdirectory so it can
   share a repo with the static site at the repo root.
4. Add environment variables: `DATABASE_URL`, `AUTH_SECRET`, `SUPER_ADMIN_EMAIL`.
5. Deploy. `npm run build` runs `prisma generate` first, so nothing else is needed.

After the first deploy, run the migration against your production database once:

```bash
DATABASE_URL="<your production url>" npm run db:push
```

From then on, deploying is a `git push`.

### Pointing your own domain at it

In **Vercel → Project → Settings → Domains**, add the domain or subdomain you want
(e.g. `survivor.yourdomain.com`). Vercel shows you the DNS record to create. At your DNS
provider:

- **Subdomain** (recommended): add a `CNAME` record for `survivor` pointing at
  `cname.vercel-dns.com`.
- **Apex domain** (`yourdomain.com`): add the `A` record Vercel gives you, usually
  `76.76.21.21`.

DNS usually propagates in a few minutes. Vercel issues the HTTPS certificate itself.

> If the repo root already serves another site on your apex domain, use a subdomain for
> this app so the two do not collide.

### Other hosts

Nothing here is Vercel-specific. It is a standard Next.js app, so Render, Railway, Fly,
or a VPS behind nginx all work. Build with `npm run build`, run with `npm start`, and set
the same environment variables. On a non-Vercel host also set `AUTH_URL` to your public
URL.

---

## Running on SQLite instead

For a single small league you do not need hosted Postgres. Change one line in
`prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"      // was "postgresql"
  url      = env("DATABASE_URL")
}
```

and set `DATABASE_URL="file:./dev.db"`. Then `npm run db:push`. The schema deliberately
avoids native enums and arrays so it moves between the two without any other change.

**The tradeoff:** SQLite is a file on one disk. That is fine for one league on one
server, but it rules out running more than one instance of the app, and it does not
survive a host with an ephemeral filesystem — Vercel's serverless functions have no
persistent disk, so **SQLite will not work on Vercel**. Use it for local development or a
single long-lived VPS, and use Postgres for anything you want to keep.

---

## How scoring works

Two tables, kept deliberately separate:

- **`EpisodeEvent`** records *what happened* — "Alina won individual immunity in
  episode 4".
- **`ScoringRule`** records *what it is worth* — "individual immunity is 8 points".

Because they are separate, a commissioner can change a point value mid-season and every
episode already logged is re-scored automatically. Nothing about the history is rewritten.

Rules resolve in this order, most specific first:

1. **League rule** — this league's own saved table.
2. **Season rule** — the default every league on the season inherits.
3. **Built-in default** — the catalog in `src/lib/scoring.ts`.

So two leagues watching the same season can score it completely differently.

A single event can also carry a **point override**, which sets the value of that one
instance without touching any table — handy for a judgment call you do not want to make
permanent.

### Default scoring

| Event | Points |
| --- | --- |
| Wins individual immunity | 8 |
| Wins individual reward | 3 |
| Wins tribal immunity (per person on the winning side) | 4 |
| Wins tribal reward (per person on the winning side) | 2 |
| Finds a hidden immunity idol | 5 |
| Finds any other advantage | 3 |
| Plays an idol that changes the vote | 6 |
| Plays an idol or advantage with no effect | 1 |
| Voted out holding an unplayed idol or advantage | −3 |
| Votes with the tribal majority | 2 |
| Driving force behind a blindside | 4 |
| Reaches the merge (once) | 5 |
| Reaches the final tribal council | 10 |
| Wins the final-three fire making challenge | 6 |
| Receives a jury vote (each) | 2 |
| Wins Sole Survivor | 25 |
| Wins a duel on Redemption Island / Edge of Extinction | 3 *(off by default)* |
| Returns to the main game | 8 *(off by default)* |
| Voted out | 0 — the roster slot is dead from here on |
| Quits, or leaves for medical or personal reasons | −5 |

Every value is editable in the app. Twist rules ship switched off; turn them on for the
seasons that use them.

### Castaway status is derived

Logging a vote-out marks the castaway eliminated and records the episode. Reaching the
merge sets where the jury starts, so anyone leaving from that episode on is marked jury
rather than eliminated. `REACH_FTC` marks a finalist and `SOLE_SURVIVOR` marks the winner.
Removing a logged elimination puts them back to active. Events are the source of truth —
anything you set by hand on the admin cast page is overwritten next time an episode is
saved.

---

## Roster size

Pick a size that gets most of the cast drafted. For an 18–20 person cast:

- 4 teams × 4 castaways
- 6 teams × 3 castaways
- 8–10 teams × 2 castaways

The league creation screen does this arithmetic for you as you type. Leaving a few
castaways undrafted is better than forcing an odd split.

---

## Project layout

```
survivor/
├── prisma/
│   ├── schema.prisma        # the whole data model
│   └── seed.ts              # sandbox season
└── src/
    ├── actions/             # server actions (all writes go through these)
    ├── app/                 # routes
    ├── components/          # UI
    ├── lib/
    │   ├── scoring.ts       # the event catalog and rule resolution
    │   ├── scoreboard.ts    # scores a whole league in one pass
    │   ├── draft.ts         # snake draft order
    │   ├── session.ts       # who is signed in, and what they may do
    │   └── db.ts            # Prisma client
    └── auth.ts              # Auth.js config
```

Every page reads permissions through `src/lib/session.ts`, and every write re-checks them
inside the server action — the UI hiding a button is never the only thing stopping
someone.

### Useful commands

```bash
npm run dev         # development server
npm run build       # production build (runs prisma generate first)
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run db:push     # sync schema to the database
npm run db:studio   # browse the data
npm run db:seed     # sandbox season
```

---

## Notes on data integrity

- A castaway cannot be drafted twice in one league. This is a unique index on
  `(leagueId, castawayId)`, not just a UI check, so two people clicking at the same
  instant cannot both get them.
- Pick numbers are unique per league for the same reason.
- Once the draft lock passes, no picks can be recorded and nobody new can join.
- Saving an episode replaces that episode's results wholesale, so re-opening it to fix a
  mistake behaves the way you expect.
- Episodes belong to the **season**, not to a league. Two leagues watching the same season
  share one set of results and still score them with their own tables.

---

## Roadmap

Phase 1 is complete: auth, seasons and casts, leagues and join codes, drafting, episode
entry with automatic scoring, and standings.

Still open from the original brief:

- Per-castaway stat pages with charts
- Reminders for draft deadlines and episode entry
- Cross-season stats per league
- CSV export of standings

---

## One note on cast photos

This is a personal project for a private friend group, not affiliated with or endorsed by
CBS or Survivor Productions. The `photoUrl` field takes any URL. Using official show
photography is a small risk for a private, non-commercial tool; your own cropped
screenshots or plain avatars remove the question entirely. Castaways with no photo get an
initial-letter avatar automatically.
