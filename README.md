# NEXORA

> Full-stack professional networking and career platform — built on the MERN stack.

NEXORA is a serious, production-quality platform inspired by the information architecture and workflows of LinkedIn, with its own product identity. It is being built phase-by-phase on top of a deliberately designed foundation.

---

## Current Status — Phase 2: Authentication

Phase 1 established the MERN foundation. Phase 2 Prompt 1 wired up the backend authentication surface (User model, JWT, register / login / me). **Phase 2 Prompt 2 — the one documented here — adds the React authentication UX:**

- Centralized Axios client automatically attaches the JWT as `Authorization: Bearer <token>`.
- `AuthContext` owns the current user, login, register, logout, and session bootstrap.
- JWT persists in `localStorage` under `nexora_token`. The token is cleared on logout and on every 401 the backend returns.
- `/` is the authenticated home (`ProtectedRoute`). `/login` and `/register` are public-only.
- Login and registration are real backend flows — no mock authentication.
- Backend secrets (`JWT_SECRET`, `MONGO_URI`, `BCRYPT_ROUNDS`) are never exposed to the frontend.

See [`PROJECT_CONSTITUTION.md`](./PROJECT_CONSTITUTION.md) for the engineering contract that governs this project.

---

## Frontend Authentication Flow

| Concern              | Where it lives                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Token persistence    | `client/src/utils/authStorage.js` (`nexora_token` in `localStorage`)                                                  |
| Centralized HTTP     | `client/src/services/api.js` (request interceptor attaches the JWT; response interceptor emits `unauthorized` on 401) |
| Backend calls        | `client/src/services/authService.js` (`registerUser`, `loginUser`, `getCurrentUser`)                                  |
| Auth state           | `client/src/context/AuthContext.jsx` (the only place auth state lives)                                                |
| Route guards         | `client/src/routes/ProtectedRoute.jsx`, `client/src/routes/PublicOnlyRoute.jsx`                                       |
| 401 → context bridge | `client/src/utils/authEvents.js` (pub/sub, breaks the Axios ↔ Context circular dep)                                   |
| Pages                | `client/src/pages/LoginPage.jsx`, `RegisterPage.jsx`, `AuthenticatedHomePage.jsx`                                     |

**Routes**

| Path               | Guard             | Description                                                                                           |
| ------------------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `/`                | `ProtectedRoute`  | Authenticated home (temporary success view)                                                           |
| `/login`           | `PublicOnlyRoute` | Email + password; redirects authed users to `/`                                                       |
| `/register`        | `PublicOnlyRoute` | First / last name, email, password, confirm; redirects authed users to `/`                            |
| `/profile/me`      | `ProtectedRoute`  | Owner's profile (read + edit) — declared before the public route so it is never captured as a userId. |
| `/profile/:userId` | none              | Public profile. Anyone (authenticated or not) can view.                                               |
| `/health-test`     | none              | Existing foundation page, still available                                                             |

**Profile editing.** The owner page exposes an **Edit profile** modal that PATCHes `/api/v1/profile/me`. Public pages do not show the edit affordance — the backend enforces ownership independently. Photo URLs are http(s) only; uploads arrive in a later phase.

**Session bootstrap.** When the app loads, `AuthProvider` checks `localStorage` for a token. If one exists, it calls `GET /api/v1/auth/me`; on success the user is restored, on failure the token is removed. While this is happening, route guards render a lightweight loading state.

**Logout.** Removes the token from `localStorage` and clears React state. There is intentionally no backend logout endpoint yet — JWT invalidation is not implemented in this phase.

**Token storage tradeoff.** We deliberately store the JWT in `localStorage`. This is the standard JWT-bearer pattern for SPAs but is **not** immune to XSS. The constitution documents that a future phase may evaluate HttpOnly cookies + refresh tokens.

---

## Technology Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | React 18, React Router, Axios           |
| Build tool | Vite                                    |
| Backend    | Node.js, Express.js                     |
| Database   | MongoDB, Mongoose                       |
| HTTP       | REST (`/api/v1`)                        |
| Real-time  | Socket.IO (later phases)                |
| Tooling    | ESLint, Prettier, nodemon, concurrently |

---

## Architecture

```
┌────────────────────────────┐
│  React frontend (client/)  │
│  React Router + Axios      │
└─────────────┬──────────────┘
              │  HTTP (REST)
              ▼
┌────────────────────────────┐
│  Express backend (server/) │
│  Routes → Controllers →    │
│  Services → Models         │
└─────────────┬──────────────┘
              │  Mongoose
              ▼
┌────────────────────────────┐
│   MongoDB (via MONGO_URI)  │
└────────────────────────────┘
```

---

## Repository Layout

```
NEXORA/
├── client/                       React application (Vite)
│   ├── eslint.config.js
│   └── ...
├── server/                       Express + Mongoose application
│   ├── eslint.config.js
│   └── ...
├── .env.example                  Environment variable template
├── .gitignore
├── .prettierrc.json              Prettier configuration (root)
├── .prettierignore
├── package.json                  Root workspace + dev orchestration
├── PROJECT_CONSTITUTION.md
└── README.md
```

---

## Local Development

### 1. Prerequisites

- Node.js `>= 18`
- npm `>= 9`
- A running MongoDB instance (local install or MongoDB Atlas)

### 2. Clone & install

```bash
git clone https://github.com/think11723/NEXORA.git
cd NEXORA
npm install
```

The root `npm install` uses npm workspaces and installs dependencies for both `client/` and `server/`.

### 3. Configure environment

```bash
cp .env.example server/.env
```

Edit `server/.env` and set at minimum:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/nexora
CLIENT_URL=http://localhost:5173
JWT_SECRET=<generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))`>
```

> A real `.env` file must never be committed. The `.gitignore` enforces this.

If you want to override the frontend's API base URL, create `client/.env.local`:

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

If unset, the client falls back to `http://localhost:5000/api/v1`.

> Only `VITE_`-prefixed variables are exposed to the React bundle. Never put backend secrets (`JWT_SECRET`, `MONGO_URI`, `BCRYPT_ROUNDS`) in any `VITE_*` variable.

### 4. Start the dev servers

```bash
npm run dev
```

This uses `concurrently` to run:

- the **backend** on `http://localhost:5000`
- the **frontend** on `http://localhost:5173`

To run them separately:

```bash
npm run dev:server    # backend only
npm run dev:client    # frontend only
```

### 5. Verify the foundation

- Open `http://localhost:5173` — the unauthenticated root redirects to `/login`. After signing in or registering, you land on the authenticated home.
- Visit `http://localhost:5173/health-test` — a frontend page that calls the backend.
- `GET http://localhost:5000/api/v1/health` should return:

  ```json
  {
    "success": true,
    "message": "NEXORA API is running",
    "data": { "uptime": 12.34, "timestamp": "..." }
  }
  ```

### 6. Production frontend build

```bash
npm run build
```

Outputs the optimized frontend bundle to `client/dist`.

---

## Development Commands

| Command                | What it does                                            |
| ---------------------- | ------------------------------------------------------- |
| `npm run dev`          | Run backend and frontend together (concurrently)        |
| `npm run dev:server`   | Run only the backend (nodemon)                          |
| `npm run dev:client`   | Run only the frontend (Vite)                            |
| `npm run build`        | Production build of the frontend                        |
| `npm run start:server` | Run the backend in production mode (no nodemon)         |
| `npm run lint`         | Run ESLint over both `client/` and `server/`            |
| `npm run format`       | Apply Prettier to `.js`, `.jsx`, `.json`, `.md`, `.css` |
| `npm run format:check` | Verify formatting without modifying files               |

---

## API Versioning

All endpoints are namespaced under `/api/v1`. The prefix is established in `server/app.js` and centralized so future versions can be added without rewrites.

---

## Implemented Endpoints

### Foundation

| Method | Path             | Auth | Purpose        |
| ------ | ---------------- | ---- | -------------- |
| GET    | `/api/v1/health` | none | Liveness probe |
| GET    | `/api/v1`        | none | API metadata   |

### Authentication (Phase 2 — Prompt 1)

| Method | Path                    | Auth | Purpose                        |
| ------ | ----------------------- | ---- | ------------------------------ |
| POST   | `/api/v1/auth/register` | none | Create a new user account      |
| POST   | `/api/v1/auth/login`    | none | Exchange credentials for a JWT |
| GET    | `/api/v1/auth/me`       | JWT  | Return the authenticated user  |

Anything outside the implemented routes returns a structured `404` from the centralized not-found middleware.

#### Auth request/response shapes

**Register**

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName":  "Doe",
  "email":     "jane@example.com",
  "password":  "secret123"
}
```

Successful response (`201`):

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "token": "<JWT>",
    "user": {
      "id": "...",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Login** — same envelope as register, returned on `200`.

**Current user** — requires `Authorization: Bearer <JWT>`. Returns `{ success, message, data: { user } }` on `200`.

### Connections (Phase 4 — Prompt 1, hardened in Prompt 2)

| Method | Path                                         | Auth | Purpose                                     |
| ------ | -------------------------------------------- | ---- | ------------------------------------------- |
| POST   | `/api/v1/connections/:userId/request`        | JWT  | Send a connection request to `:userId`      |
| POST   | `/api/v1/connections/:connectionId/accept`   | JWT  | Recipient accepts a pending request         |
| POST   | `/api/v1/connections/:connectionId/reject`   | JWT  | Recipient rejects a pending request         |
| POST   | `/api/v1/connections/:connectionId/withdraw` | JWT  | Requester withdraws a pending request       |
| DELETE | `/api/v1/connections/:connectionId`          | JWT  | Either party removes an accepted connection |
| GET    | `/api/v1/connections/status/:userId`         | JWT  | Caller's relationship status with `:userId` |
| GET    | `/api/v1/connections`                        | JWT  | Caller's accepted connections               |
| GET    | `/api/v1/connections/incoming`               | JWT  | Pending requests targeted at the caller     |
| GET    | `/api/v1/connections/outgoing`               | JWT  | Pending requests the caller has sent        |

**Connection response shape (each participant):**

```json
{
  "requester": {
    "user": {
      "id": "...",
      "firstName": "...",
      "lastName": "...",
      "fullName": "..."
    },
    "profile": { "headline": "...", "profilePhoto": "https://..." },
    "placeholder": false
  },
  "recipient": { "...": "..." }
}
```

If a referenced user has been removed, the participant projects with `placeholder: true` and `user` / `profile` as `null` rather than throwing.

**Key semantics:**

- A relationship is represented by a single Connection document with a canonical pair (`userA < userB`) plus separate `requester` / `recipient` for direction.
- The canonical pair is enforced as a **unique compound index** in MongoDB — A→B and B→A are the same pair, and concurrent inserts collapse to a single document with a clean 409 response on race loss.
- All transitions are enforced server-side. The actor is always `req.user.id`; no body field determines identity.
- Self-connection is rejected with **400** before any DB write.
- Status values: `pending`, `accepted`, `rejected`, `withdrawn`. After `rejected` / `withdrawn` a new request transitions the same document back to `pending` with new direction.
- Removal is a hard delete; re-connection is supported.
- Status response values from `GET /connections/status/:userId`: `none`, `outgoing_pending`, `incoming_pending`, `connected`. A caller querying their own userId receives `none`.
- **Inactive users** cannot authenticate (existing `requireAuth` middleware). A request to an inactive recipient is allowed; existing connections persist.
- **Missing-user safety:** if a participant's User is missing, the connection document is preserved and the serializer returns a `placeholder: true` projection.

**Indexes (every one is justified by a documented query pattern):**

| Index                                        | Purpose                                              |
| -------------------------------------------- | ---------------------------------------------------- |
| `{ userA: 1, userB: 1 }` unique              | Pair lookup and uniqueness invariant                 |
| `{ userA: 1, status: 1, updatedAt: -1 }`     | Accepted list — half of `$or` (caller is smaller id) |
| `{ userB: 1, status: 1, updatedAt: -1 }`     | Accepted list — other half of `$or`                  |
| `{ recipient: 1, status: 1, updatedAt: -1 }` | Incoming list                                        |
| `{ requester: 1, status: 1, updatedAt: -1 }` | Outgoing list                                        |

**Service-level smoke test:**

```bash
cd server
node scripts/connection.smoke.cjs
```

Verifies: validators, canonical pair, semantic status mapping, safe serialization with profile preview, all invalid state transitions, all authorization helpers, the full pending → accepted → removed lifecycle.

See [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) §12 (Connection System Principles) for the full state machine table.

### Posts (Phase 5 — Prompt 1)

| Method | Path                         | Auth | Purpose                                            |
| ------ | ---------------------------- | ---- | -------------------------------------------------- |
| POST   | `/api/v1/posts`              | JWT  | Create a new post (author = `req.user.id`)         |
| GET    | `/api/v1/posts/feed`         | JWT  | Chronological feed (caller + accepted connections) |
| GET    | `/api/v1/posts/me`           | JWT  | Caller's own posts                                 |
| GET    | `/api/v1/posts/user/:userId` | JWT  | A user's posts; 404 when user missing              |
| GET    | `/api/v1/posts/:postId`      | JWT  | Single post (404 if missing)                       |
| PATCH  | `/api/v1/posts/:postId`      | JWT  | Edit own post (403 for others, 404 missing)        |
| DELETE | `/api/v1/posts/:postId`      | JWT  | Delete own post (403 for others, 404 missing)      |

**Post response shape (safe serializer):**

```json
{
  "id": "...",
  "author": {
    "user": {
      "id": "...",
      "firstName": "...",
      "lastName": "...",
      "fullName": "..."
    },
    "profile": { "headline": "...", "profilePhoto": "https://..." },
    "placeholder": false
  },
  "content": "...",
  "visibility": "public",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Key semantics:**

- Author is **always** `req.user.id`. The body cannot override it; the service-level guard catches any attempt.
- Only the author may edit or delete. Authorization is enforced atomically (`findOneAndUpdate({_id, author: callerId}, ...)` and `findOneAndDelete({_id, author: callerId})`) so a user can never modify another user's post by manipulating an id.
- Visibility today is only `public`. Future values (connections-only, etc.) extend the find clauses without changing the signature.
- Content is plain text. The backend never HTML-renders content — the frontend will escape on render.
- Missing-author safety: if a User has been removed, the post still serializes with `author: { user: null, profile: null, placeholder: true }`. The whole feed does NOT crash.

**Pagination:**

`?page=&limit=` query parameters. Defaults: page 1, limit 20. Maximum limit 50 (silently clamped, not rejected). The response includes a `pagination` block:

```json
{
  "posts": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 123,
    "totalPages": 7,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

**Feed eligibility:**

Posts whose author is the caller OR whose author is the other side of an **accepted** connection. Pending / rejected / withdrawn connections NEVER contribute to the feed. The query plan is:

1. ONE `Connection.find({$or:[{userA},{userB}], status:'accepted'})` to gather partner ids.
2. Combine caller id + partner ids.
3. ONE `Post.find({author: {$in: authorIds}, visibility:'public'})` paginated + sorted.

No N+1. No per-connection subqueries.

**Sort order:** `createdAt` desc with `_id` desc as the deterministic tie-breaker. The compound index `{author:1, createdAt:-1, _id:-1}` covers the sort fully.

**Indexes (every one is justified by a documented query pattern):**

- `{ author: 1, createdAt: -1, _id: -1 }` — user-post listings + sort cover.
- `{ createdAt: -1, _id: -1 }` — feed base query + sort cover.
- `{ visibility: 1, createdAt: -1, _id: -1 }` — reserved for future visibility-based feeds.

**Run the smoke test yourself:**

```bash
cd server
node scripts/post.smoke.cjs
```

Expected: 41/41 passed. The connection smoke (`node scripts/connection.smoke.cjs`) should also continue to pass.

See [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) §12 (Post System Principles) for the architecture summary.

### Feed UI (Phase 5 — Prompt 2)

The authenticated home is the **Feed**. The route `/` (and the explicit alias `/feed`) renders a Tailwind-styled feed with:

- **PostComposer** at the top — textarea with character counter, validation, and disabled-during-request state. Server-confirmed create; never optimistically patches Redux.
- **PostCard** for each post — author block with avatar fallback + headline + timestamp + content (plain text only, no `dangerouslySetInnerHTML`).
- **PostActionsMenu** — kebab menu shown only on the caller's own posts. Edit / Delete actions.
- **EditPostModal** — local-state edit form, validation, character counter, server-confirmed update.
- **DeletePostDialog** — confirmation alertdialog, server-confirmed delete.
- **Load more** pagination gated by `pagination.hasNextPage` from the backend; in-flight requests are debounced locally.
- **Empty / error / loading / skeleton states** for every async surface.

**Redux architecture:**

- New `post` slice (see `client/src/store/slices/postSlice.js`) owns:
  - `feed` (paginated list + pagination + loading + error)
  - `myPosts` (paginated list + pagination + loading + error)
  - `userPostsByUserId` (per-user feed cache)
  - `mutations.create / .update / .delete` (loading + error flags per postId)
- Selectors: `selectFeedPosts`, `selectFeedPagination`, `selectFeedLoading`, `selectFeedError`, `selectMyPosts*`, `selectCreateMutationState`, `selectUpdateMutationState(postId)`, `selectDeleteMutationState(postId)`.

**Redux / local-state boundary (explicit):**

- In Redux: server-derived feed data, pagination metadata, async mutation state, shared post data.
- Local to each component: composer textarea content while typing, modal / dialog open/close state, dropdown / menu state, hover / focus state, local form drafts (edit modal text).
- The composer dispatches ONLY on submit, never on every keystroke.

**Routes:**

- `/` and `/feed` both render `FeedPage` (the authenticated home).
- The temporary `AuthenticatedHomePage` from Phase 2 was removed.

**Backend integration:**

Every API call goes through `postService.js` which uses the existing `apiClient` (so the JWT interceptor + 401 bridge apply transparently). The Phase 5 Prompt 1 backend contract is consumed as-is — the serializer, error envelope, and pagination block are used verbatim.

### Interactions (Phase 5 — Prompt 3)

| Method | Path                                       | Auth | Purpose                              |
| ------ | ------------------------------------------ | ---- | ------------------------------------ |
| POST   | `/api/v1/posts/:postId/reactions`          | JWT  | Like a post (idempotent)             |
| DELETE | `/api/v1/posts/:postId/reactions`          | JWT  | Unlike a post (idempotent)           |
| GET    | `/api/v1/posts/:postId/reactions`          | JWT  | Reaction summary: `{ count, likedByMe }` |
| POST   | `/api/v1/posts/:postId/comments`           | JWT  | Add a comment (oldest-first ordering) |
| GET    | `/api/v1/posts/:postId/comments?page=&limit=` | JWT  | List comments (paginated)            |
| PATCH  | `/api/v1/comments/:commentId`             | JWT  | Edit own comment (403 for others)     |
| DELETE | `/api/v1/comments/:commentId`             | JWT  | Delete own comment (403 for others)   |

**Key invariants:**

- One user + one post + one reaction type = at most one Reaction document (enforced by a unique compound index — duplicate likes return 200 idempotent, not 409).
- All comments on a post are returned oldest-first (natural conversation flow).
- The `interaction` block on a post response carries `{ likeCount, likedByMe, commentCount }` and is computed in batched aggregations — no N+1.

**Frontend architecture:**

- `client/src/store/slices/postSlice.js` extends the existing post slice with `interactions.byPostId` and `comments.byPostId` caches plus thunks for like / unlike / create / update / delete comment.
- `client/src/components/feed/PostInteractionBar.jsx`, `CommentsSection.jsx`, `CommentItem.jsx`, `CommentComposer.jsx` are the new feed-side components.

### Profile (Phase 3 — Prompt 1)

| Method | Path                      | Auth | Purpose                                 |
| ------ | ------------------------- | ---- | --------------------------------------- |
| GET    | `/api/v1/profile/me`      | JWT  | Read the authenticated user's profile   |
| PATCH  | `/api/v1/profile/me`      | JWT  | Update the authenticated user's profile |
| GET    | `/api/v1/profile/:userId` | none | Read a public profile by user id        |

**Profile response shape (owner or public)**: `{ success, message, data: { profile } }` where `profile` includes `user`, `headline`, `about`, `location`, `currentPosition`, `industry`, `profilePhoto`, `coverPhoto`, and timestamps. The public projection omits `updatedAt`. Passwords, password hashes, JWT secrets, and account security metadata are **never** exposed.

The **public** endpoint also returns `data.user = { id, firstName, lastName, fullName }` so callers do not need a second round-trip to display a profile card.

PATCH accepts only these fields: `headline`, `about`, `location`, `currentPosition`, `industry`, `profilePhoto`, `coverPhoto`. Any other key in the body is rejected with a per-field error. `profilePhoto` and `coverPhoto` must be `http(s)` URLs — `javascript:`, `data:`, and similar schemes are rejected at the validator.

The first `GET /api/v1/profile/me` call lazily creates an empty profile and returns **201**; subsequent reads return **200**. `PATCH /profile/me` is an upsert that returns **201** on first-time edit and **200** on subsequent edits. The public `/profile/:userId` returns **200** (with an empty profile) if the user exists but has no profile, or **404** if the user does not exist.

See [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) §11 for the User / Profile separation rationale.

---

## Environment Variables

Defined in [`.env.example`](./.env.example). The actual `.env` file is created inside `server/` (because the backend loads it via `dotenv`).

| Variable         | Purpose                                                     |
| ---------------- | ----------------------------------------------------------- |
| `NODE_ENV`       | `development` / `production` / `test`                       |
| `PORT`           | Backend HTTP port (defaults to `5000`)                      |
| `MONGO_URI`      | MongoDB connection string                                   |
| `CLIENT_URL`     | Frontend origin allowed by CORS (defaults to Vite)          |
| `JWT_SECRET`     | Secret used to sign JWTs. **Required** for `/api/v1/auth/*` |
| `JWT_EXPIRES_IN` | JWT lifetime (e.g. `7d`, `12h`, `30m`). Default `7d`.       |
| `BCRYPT_ROUNDS`  | Cost factor for password hashing. Default `10`.             |

---

## License

Private project. All rights reserved.
