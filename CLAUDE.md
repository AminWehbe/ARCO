# ARCO — Claude Context File

Use this to get up to speed on the project before helping.

---

## What is ARCO?

Retro arcade web app. React + Vite SPA with 4 games, AWS backend. Styled like a CRT arcade cabinet. No top navigation — all navigation is in-screen via keyboard shortcuts and buttons.

**Live URL:** https://dmlg1bi4iczn7.cloudfront.net  
**GitHub:** https://github.com/amine-wehbe/ARCO

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite, custom CSS (CRT/arcade aesthetic) |
| Auth | AWS Cognito (User Pool, SPA client, email + preferred_username) |
| Backend | Node.js + Express on EC2 (t3.micro, eu-west-1) |
| Database | DynamoDB (arco-users, arco-scores) |
| Hosting | S3 + CloudFront (frontend), CloudFront behaviors route API paths to EC2 |
| Process mgr | PM2 on EC2 |

---

## AWS Resources

| Resource | Value |
|---|---|
| CloudFront domain | dmlg1bi4iczn7.cloudfront.net |
| CloudFront dist ID | E1M9LV0FD1BNYU |
| EC2 Elastic IP | 54.195.242.3 |
| EC2 origin (nip.io) | 54.195.242.3.nip.io |
| Cognito User Pool ID | eu-west-1_nrzuVJfok |
| Cognito Client ID | 30o582cpokj509g1fk135mka20 |
| DynamoDB table: users | arco-users (PK: userId) |
| DynamoDB table: scores | arco-scores (PK: gameId, SK: timestamp#userId, GSI: gameId-score-index) |
| IAM role on EC2 | arco-ec2-role (DynamoDBFullAccess + CognitoPowerUser) |
| Region | eu-west-1 (Ireland) |
| SSH key | ~/.ssh/arco-key.pem |

---

## Project Structure

```
arco/
├── src/
│   ├── api/client.js          # All fetch calls to backend (BASE = VITE_API_BASE_URL)
│   ├── config/admins.js       # ADMIN_IDS array — single source of truth for admin access
│   ├── context/AppContext.jsx # Global state: user, isAdmin, navigate, prevScreen, tweaks
│   ├── screens/
│   │   ├── Landing.jsx        # Sign in / Sign up / Confirm (email code) screens
│   │   ├── Library.jsx        # Game selection grid, nav pills (P/L/S/A keys)
│   │   ├── InGame.jsx         # Game wrapper — fetches DynamoDB hi score, calls submitScore
│   │   ├── Leaderboard.jsx    # Per-game top 10, ADMIN badge for admin entries
│   │   ├── Profile.jsx        # Real stats, per-game bests, level bar, EDIT mode + avatar picker
│   │   ├── Admin.jsx          # Ops dashboard — hard-gated to ADMIN_IDS, real data
│   │   └── Settings.jsx       # Music, sound, CRT scanlines, ESC returns to prevScreen
│   └── games/
│       ├── snake/             # Snake (canvas)
│       ├── flappy/            # Flappy Bird (canvas)
│       ├── memory/            # Memory card matching (React)
│       └── battleship/        # Local 2-player Battleship (React)
├── server/
│   ├── index.js               # Express entry, CORS, mounts all routes
│   ├── middleware/auth.js     # Cognito JWT verify → req.userId, req.username
│   ├── routes/auth.js         # POST /auth/signup, /confirm, /login, /logout
│   ├── routes/scores.js       # POST /scores, GET /scores/:gameId
│   ├── routes/users.js        # POST /users, GET /users/:id, PATCH /users/:id
│   ├── routes/admin.js        # GET /admin/stats — requireAdmin middleware, server-side gated
│   └── db/dynamo.js           # DynamoDB DocumentClient
├── .env                       # VITE_API_BASE_URL (not committed)
└── .env.example
```

---

## API Reference

All routes go through CloudFront → EC2 (`http://54.195.242.3:3000`).

### Auth
| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | /auth/signup | — | `{ email, password, username }` | `{ message }` |
| POST | /auth/confirm | — | `{ email, code }` | `{ message }` |
| POST | /auth/login | — | `{ email, password }` | `{ token, userId, email }` |
| POST | /auth/logout | Bearer | — | `{ message }` |

### Scores
| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | /scores | Bearer | `{ gameId, score }` | `{ message }` |
| GET | /scores/:gameId | — | — | `{ leaderboard: [...] }` |

Valid gameIds: `snake`, `flappy`, `memory`, `battleship`

### Users
| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | /users | Bearer | `{ username }` | `{ message }` |
| GET | /users/:id | Bearer | — | `{ userId, username, avatar, gamesPlayed, best_snake, best_flappy, best_memory, best_battleship, ... }` |
| PATCH | /users/:id | Bearer | `{ username?, avatar? }` | `{ message }` |

### Admin
| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | /admin/stats | Bearer + ADMIN_IDS | `{ totalUsers, games: [{ gameId, totalScores, topScore, topPlayer }] }` |

---

## DynamoDB Data Model

**arco-users** — one item per user
```
userId (PK)       — Cognito sub
username          — display name
avatar            — "1"–"10" (color scheme id)
email
createdAt
gamesPlayed       — incremented on every score submit
best_snake        — personal best per game (flat attrs)
best_flappy
best_memory
best_battleship
```

**arco-scores** — one item per game run
```
gameId (PK)       — "snake" | "flappy" | "memory" | "battleship"
sk (SK)           — "timestamp#userId"
userId
username          — denormalized at write time
score
timestamp
GSI: gameId-score-index (gameId PK, score SK) — used for leaderboard queries
```

---

## Auth Flow

1. Sign up → Cognito sends verification email
2. User enters 6-digit code → POST /auth/confirm
3. POST /auth/login → returns Cognito id token (JWT)
4. Token stored in `localStorage` as `arco_id_token`
5. POST /users creates DynamoDB profile entry (once, on first login)
6. All subsequent requests attach `Authorization: Bearer <token>`

---

## Admin Access

- Admin user IDs are hardcoded in `src/config/admins.js` (frontend) and `server/routes/admin.js` (backend)
- Currently: Aminso — `f2055494-b001-70ad-abee-854469c2869e`
- Non-admins: no admin button shown anywhere, Admin screen bounces to library immediately, `/admin/stats` returns 403
- Admin badge appears next to admin names on the Leaderboard

---

## Navigation (no top nav bar)

| Screen | How to get there |
|---|---|
| Library | After login, or ESC from any screen |
| Profile | P key or pill in Library |
| Leaderboard | L key or pill in Library |
| Settings | S key or pill in Library; ESC returns to prevScreen |
| Admin | A key or pill in Library (admins only) |
| In-game | ENTER on a cabinet in Library |

`prevScreen` is tracked in AppContext so Settings/etc. always return to where you came from.

---

## Profile Features

- Real `gamesPlayed` + `best_*` from DynamoDB
- Level derived via triangular progression: level N needs N games (total to reach level N = N*(N-1)/2)
- Level progress bar shown under badges
- Badge tiers: BRONZE (lvl < 5), SILVER (lvl < 15), GOLD (lvl ≥ 15)
- EDIT mode: change username + pick from 10 pixel avatar color schemes
- Avatar stored as id "1"–"10" in DynamoDB, color map in Profile.jsx
- Guests: EDIT button visible but disabled

---

## Hi Score Source of Truth

- **Logged-in users:** hi scores come from DynamoDB (`best_*` attrs on user record)
- **Guests:** hi score is always 0, nothing written to localStorage
- localStorage is still written during a session for intra-game tracking but is NOT read back — DynamoDB is the source
- InGame.jsx fetches stats before mounting game canvas so hi score is correct from frame 1

---

## CloudFront Behaviors (in order)

- `/auth*` → EC2
- `/scores*` → EC2
- `/users*` → EC2
- `/admin*` → EC2
- `/health` → EC2
- `/*` (default) → S3

CloudFront doesn't accept raw IPs as origin — EC2 uses `54.195.242.3.nip.io`.

---

## Deploying Changes

### Frontend
```bash
npm run build
aws s3 sync dist/ s3://arco-frontend-bucket --delete
aws cloudfront create-invalidation --distribution-id E1M9LV0FD1BNYU --paths "/*"
```

### Backend (single file)
```bash
scp -i ~/.ssh/arco-key.pem server/routes/scores.js ec2-user@54.195.242.3:~/server/routes/
ssh -i ~/.ssh/arco-key.pem ec2-user@54.195.242.3 "pm2 restart arco-server"
```

### Backend (all files)
```bash
scp -i ~/.ssh/arco-key.pem -r server/ ec2-user@54.195.242.3:~/
ssh -i ~/.ssh/arco-key.pem ec2-user@54.195.242.3 "cd ~/server && npm install && pm2 restart arco-server"
```

---

## Restarting EC2 After Stop

1. AWS Console → EC2 → Instances → Start
2. Wait ~30s
3. `ssh -i ~/.ssh/arco-key.pem ec2-user@54.195.242.3`
4. `pm2 status` — if stopped: `pm2 restart arco-server`
5. `curl http://localhost:3000/health`

Elastic IP stays the same — CloudFront needs no update.

---

## Current State (April 2026)

**Fully working:**
- Auth flow (signup → email confirm → login → logout)
- Score submission on game over for all 4 games
- Leaderboard with real DynamoDB data + ADMIN badge
- Profile: real stats, level progression, avatar picker, EDIT mode
- Settings: music, sound, CRT scanlines, back to prevScreen
- Admin dashboard: real EC2 health, user count, score count, per-game top scores (admin-only)
- Library: keyboard nav (P/L/S/A), hi scores from DynamoDB
- In-game hi scores from DynamoDB, guests see nothing

**Pending / stretch goals:**
- Battleship online multiplayer via WebSocket
- Auto Scaling Group + ALB (teammate working on this)
- Button press sound effects (SOUND toggle in Settings is wired but no audio yet)
