# DOTS — Distributed Olympiad Testing System

A competitive programming contest platform rewritten from a PHP 5.3 monolith into a **Rust** backend and **Next.js** frontend. The new stack uses the existing MySQL database without schema changes and maintains full compatibility with the DDOTS testing bot service, enabling side-by-side operation with the legacy system.

## Quick Start

### Prerequisites

- Rust 1.94+ and Cargo
- Node.js 24+ and npm
- MySQL/MariaDB server

### 1. Database

Create the database and import data:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS qbit_olympkh CHARACTER SET utf8 COLLATE utf8_general_ci"
mysql -u root -p qbit_olympkh < /path/to/db-schema.sql
mysql -u root -p qbit_olympkh < /path/to/qbit_olympkh.sql   # optional: import production data
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # or edit .env directly
# .env contents:
#   DATABASE_URL=mysql://root:password@localhost/qbit_olympkh
#   UPLOAD_DIR=/path/to/php-app-root    (parent of var/ directory)
#   FRONTEND_URL=http://localhost:3000
#   LISTEN_ADDR=0.0.0.0:3001
#   BOT_FRIENDS=botname:botpassword

cargo run
```

The API server starts on port 3001.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on port 3000 and proxies `/api/*` requests to the backend.

### 4. Open the app

Visit **http://localhost:3000**. The contests page loads with data from the database.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────┐
│   Browser        │────▶│  Next.js (3000)   │────▶│  Rust API │
│                  │     │  /api/* proxy     │     │  (3001)   │
└─────────────────┘     └──────────────────┘     └─────┬─────┘
                                                       │
┌─────────────────┐                              ┌─────┴─────┐
│  DDOTS Bot       │─── HTTP Basic Auth ────────▶│  /bot/*    │
│  (testing svc)   │                              └─────┬─────┘
└─────────────────┘                                     │
                                                  ┌─────┴─────┐
                                                  │   MySQL    │
                                                  │ qbit_olympkh│
                                                  └─────┬─────┘
                                                        │
                                                  ┌─────┴─────┐
                                                  │   var/     │
                                                  │ (shared fs)│
                                                  └───────────┘
```

### Why this split

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Backend language | Rust (axum + sqlx) | Memory safety, performance for standings computation over 197K solutions, no GC pauses during contest |
| Frontend framework | Next.js 16 App Router | Server components for initial page loads, client components for interactivity, built-in API proxy |
| Database | Existing MySQL, unchanged | Zero-downtime migration; both PHP and Rust run side-by-side on the same DB |
| Auth | Session cookies (DSID) | Matches legacy session table; no JWT complexity; works through the Next.js proxy |
| API proxy | Next.js rewrites | Avoids CORS entirely in production; single origin for browser |
| Styling | Tailwind CSS v4 | Utility-first, no CSS module overhead, consistent design system |

---

## Backend Structure

```
backend/src/
├── main.rs                     # Server bootstrap, router composition, CORS
├── config.rs                   # Env config (DATABASE_URL, UPLOAD_DIR, etc.)
├── error.rs                    # AppError enum → JSON responses with HTTP codes
│
├── auth/
│   ├── access.rs               # Bitmask constants (ACCESS_READ_PROBLEMS..ACCESS_SYSTEM_ADMIN)
│   ├── password.rs             # MD5(email + ":" + password) — legacy compat
│   ├── session.rs              # CRUD on labs_sessions, PHP session_data parser
│   └── middleware.rs           # Extractors: OptionalUser, RequireAuth, RequireAdmin
│
├── models/                     # sqlx::FromRow structs, 1:1 with DB tables
│   ├── user.rs                 # User (lightweight) + UserFull (all 35 columns)
│   ├── contest.rs              # Contest + ContestData (deserialized from PHP serialize)
│   ├── solution.rs             # Decimal scores, nullable contest_id
│   ├── language.rs             # 30 hardcoded languages matching PHP config
│   └── ...                     # session, problem, test, message, group, cache, etc.
│
├── handlers/                   # Route handlers grouped by domain
│   ├── auth.rs                 # Login, logout, register, /me, password recovery
│   ├── contests.rs             # CRUD, registration, contest login, problem/solution mgmt
│   ├── standings.rs            # Dispatches to classic or ACM standings calculator
│   ├── bot.rs                  # DDOTS bot protocol (solution download, results upload)
│   ├── admin.rs                # Logs, su, batch register, groups, rejudge
│   └── ...                     # users, problems, solutions, messages
│
└── services/
    ├── contest_engine.rs       # Status computation: Wait/Going/Finished/GoingFrozen
    ├── standings/
    │   ├── classic.rs          # Best score per user per problem, sorted by total
    │   └── acm.rs              # First-accepted tracking, 20min penalty, freeze support
    ├── file_storage.rs         # PHP-compatible paths: var/sorted/, var/results/, etc.
    └── import.rs               # Parse DDOTS result files, bulk-insert test rows
```

### Key design decisions

**Session-based auth with the existing table.** The PHP app stores sessions in `labs_sessions` with PHP-serialized `session_data` containing `uid|i:1234;`. The Rust backend reads both PHP-serialized and JSON formats, and writes JSON for new sessions. This means both systems can authenticate against the same session table during migration.

**PHP serialize parser for contest data.** The `labs_contests.data` column contains PHP `serialize()` output like `a:1:{s:13:"duration_time";i:5184000;}`. A targeted deserializer handles the limited set of shapes used (string/int/bool values in associative arrays). New contests store JSON instead.

**MD5 password hashing.** The legacy format is `md5(email + ":" + password)`. This is preserved for backward compatibility with the 9,668 existing user accounts. The hash function is isolated in `auth/password.rs`.

**Bot API as a separate route group.** The `/bot/{action}/{param}` endpoints use HTTP Basic Auth (separate from session auth) and replicate the exact protocol that DDOTS testing bots expect: poll for solutions, download source files, upload results, download test archives.

**Shared `var/` filesystem.** Solution source files, test results, problem attachments, and test archives are stored on disk under a configurable `UPLOAD_DIR`. The path format (`var/sorted/{uid:04d}/{pid:04d}/{filename}`) matches the PHP layout exactly, so both systems can read/write the same files.

---

## Frontend Structure

```
frontend/src/
├── app/
│   ├── layout.tsx              # Root: <html>, Providers, Nav, Footer
│   ├── page.tsx                # Redirect to /contests
│   ├── providers.tsx           # QueryClientProvider + AuthProvider
│   │
│   ├── (auth)/                 # Centered card layout, no nav
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── (main)/                 # Full layout with nav
│   │   ├── contests/           # List, detail, problems, standings, solutions, submit
│   │   ├── problems/           # Archive, detail
│   │   ├── solutions/          # List, detail with test results
│   │   ├── users/              # List, profile
│   │   ├── messages/           # Inbox/sent, compose, detail
│   │   ├── profile/            # Edit, change password
│   │   └── about/
│   │
│   └── (admin)/admin/          # Admin-guarded routes
│       ├── page.tsx            # Dashboard with cards
│       ├── contests/           # Create, edit
│       ├── problems/           # Create, edit
│       ├── groups/             # CRUD with modal
│       ├── logs/               # System log viewer
│       └── rejudge/            # Bulk rejudge panel
│
├── components/
│   ├── nav.tsx                 # Dark header, responsive, auth-aware dropdown
│   ├── footer.tsx
│   ├── verdict-badge.tsx       # Maps result codes to colored labels
│   ├── standings/
│   │   ├── classic-standings.tsx   # Score matrix with color coding
│   │   └── acm-standings.tsx       # +/- attempts, penalty time
│   └── ui/                     # Button, Input, Select, Textarea, Badge, Card,
│                               # Table, Pagination, Spinner, Modal
│
├── lib/
│   ├── api.ts                  # Axios instance (withCredentials, proxy handles base URL)
│   ├── auth.tsx                # AuthContext: login/logout/register, fetches /auth/me
│   ├── constants.ts            # Contest types, verdict codes, access levels
│   └── utils.ts                # cn(), formatDate(), verdictCode()
│
└── types/index.ts              # Interfaces matching API responses
```

### Key design decisions

**Next.js rewrites as API proxy.** `next.config.ts` rewrites `/api/*` to `http://localhost:3001/api/*`. This means the browser only talks to one origin (port 3000), so session cookies set by the backend flow naturally without CORS complexity. In production, a reverse proxy (nginx) would serve the same role.

**Client components for interactive pages, server components for layout.** Contest lists, standings tables, and forms are client components using React Query for data fetching. Layouts, nav, and the root shell are server-rendered. This gives fast initial page loads with SPA-like interactivity.

**React Query for server state.** All API data is fetched via `@tanstack/react-query` hooks. This provides caching, background refetching, and loading/error states without manual state management. Standings can set `refetchInterval` for live updates during contests.

**Standings polymorphism via contest type.** The standings page fetches the contest type, then renders either `ClassicStandings` or `AcmStandings`. Each component receives the same `StandingsData` shape but renders different column structures (scores vs. attempts+penalty).

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login with `{login, password}`, sets DSID cookie |
| POST | `/api/v1/auth/logout` | Destroy session |
| POST | `/api/v1/auth/register` | Register with `{email, nickname}` |
| GET | `/api/v1/auth/me` | Current user from session |

### Contests
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/contests` | List with status, reg_status, user_count |
| GET | `/api/v1/contests/:id` | Detail + computed status + available pages |
| POST | `/api/v1/contests` | Create (admin) |
| PUT | `/api/v1/contests/:id` | Update (admin) |
| POST | `/api/v1/contests/:id/register` | Register for contest |
| GET | `/api/v1/contests/:id/problems` | Problems in contest |
| GET | `/api/v1/contests/:id/solutions` | User's solutions in contest |
| POST | `/api/v1/contests/:id/solutions` | Submit solution (multipart) |
| GET | `/api/v1/contests/:id/standings` | Standings (format depends on type) |
| GET | `/api/v1/contests/:id/users` | Registered participants |

### Problems, Solutions, Users, Messages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/problems` | Paginated archive |
| GET | `/api/v1/problems/:id` | Detail with description |
| GET | `/api/v1/solutions` | User's solutions |
| GET | `/api/v1/solutions/:id` | Detail with per-test results |
| GET | `/api/v1/users` | Paginated listing |
| GET | `/api/v1/users/:id` | Full profile |
| PUT | `/api/v1/users/:id` | Update profile |
| GET | `/api/v1/messages` | Inbox or sent (`?folder=sent`) |
| POST | `/api/v1/messages` | Send message |
| GET | `/api/v1/languages` | 30 supported programming languages |

### Bot (DDOTS compatible)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/bot/s/0` | Get next untested solution filename |
| GET | `/bot/s/:id` | Download solution source file |
| GET | `/bot/c/:id` | Safe checkout (mark as testing) |
| GET | `/bot/u/:id` | Unlock (rollback to untested) |
| POST | `/bot/r/:id` | Upload test results |
| GET | `/bot/t/:id` | Download problem test archive |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/logs` | System log viewer |
| POST | `/api/v1/admin/su/:uid` | Login as another user |
| POST | `/api/v1/admin/batch-register` | Bulk create users |
| POST | `/api/v1/admin/rejudge` | Re-test solutions |
| GET/POST/PUT/DELETE | `/api/v1/admin/groups` | Group CRUD |

---

## Database

The app uses the existing `qbit_olympkh` MySQL database with 13 tables prefixed `labs_`. No schema changes are required.

| Table | Rows | Purpose |
|-------|------|---------|
| `labs_users` | ~9,700 | User accounts with profile and institution fields |
| `labs_solutions` | ~197,000 | Solution submissions with scores and verdicts |
| `labs_tests` | ~6,000,000 | Per-test results (time, memory, verdict) |
| `labs_problems` | ~700 | Problem statements and attachments |
| `labs_contests` | ~155 | Contest definitions with type-specific config |
| `labs_contest_problems` | — | Contest ↔ problem mapping with max_score |
| `labs_contest_users` | — | Contest registration with status |
| `labs_sessions` | — | Session storage (shared with PHP) |
| `labs_messages` | — | Private messaging |
| `labs_groups` | — | Student groups |
| `labs_user_group_relationships` | — | User ↔ group many-to-many |
| `labs_user_teacher_relationships` | — | Student ↔ teacher many-to-many |
| `labs_cache` | — | Application cache |

---

## Side-by-Side Operation

The Rust backend and PHP monolith can run simultaneously against the same database and filesystem:

- **Database**: Both read/write the same `labs_*` tables. Sessions created by PHP (PHP-serialized format) are readable by Rust, and vice versa (JSON format).
- **Filesystem**: The `UPLOAD_DIR` config points to the PHP app's root. Solution files are stored under `var/sorted/{uid}/{pid}/`, results under `var/results/{sid/1000}/`, and test archives under `var/test_db/`. Both systems use identical path conventions.
- **Bot API**: The DDOTS testing bot can be pointed at either PHP (`/bot`) or Rust (`/bot`) — both respond to the same protocol with the same HTTP Basic Auth.
- **Session cookies**: Both use the `DSID` cookie name and the `labs_sessions` table. A user logged in via PHP can continue their session on the Rust backend.

---

## Contest Types

| Type | PHP module | Status states | Standings format |
|------|-----------|---------------|-----------------|
| `otbor` (Classic) | `classic.php` | Wait → Going → Finished | Best score per problem, sorted by total |
| `olympic` | `olympic.php` | Wait → Going → Finished | Same as classic + institution columns |
| `acm` | `acm.php` | Wait → Going → GoingFrozen → Finished | Attempts + penalty time, first-solve highlighting |
| `cert` | `cert.php` | Wait → Going → Finished | Same as classic (pass/fail scoring) |

Contest status is computed from `start_time + duration_time` (extracted from the PHP-serialized `data` column). ACM contests additionally support a frozen period where standings updates are hidden.
