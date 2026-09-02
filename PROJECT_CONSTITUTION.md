# NEXORA — Project Constitution

> The permanent engineering contract for the NEXORA project.
> Every contributor (human or AI) must respect these rules.

---

## 1. Project Name

**NEXORA** — a full-stack professional networking and career platform.

## 2. Project Purpose

NEXORA is a serious, production-quality professional networking platform inspired by the information architecture and workflows of LinkedIn, with its own polished product identity. It is not a tutorial clone. It is not a frontend mock. Every feature that ships must work end-to-end across the real stack.

## 3. Core Stack (MERN — non-negotiable)

| Layer       | Technology               |
| ----------- | ------------------------ |
| Frontend    | React (JavaScript / JSX) |
| Routing     | React Router             |
| HTTP client | Axios                    |
| Backend     | Node.js + Express.js     |
| Database    | MongoDB + Mongoose       |
| Real-time   | Socket.IO (later phases) |
| API style   | REST                     |
| Auth        | JWT (later phases)       |

## 4. MERN-Only Restriction

The project MUST remain MERN-based. Architecture, tooling, and package choices must be justified against this rule. Introducing an out-of-stack technology requires explicit written approval and an updated constitution.

## 5. Prohibited Technologies

Do not introduce any of the following under any circumstance:

- Next.js, Nuxt, Angular, Vue, Svelte
- Django, Flask, Laravel, Spring Boot, Ruby on Rails
- Firebase, Supabase, Appwrite
- PostgreSQL, MySQL, SQLite (as primary DB)
- Prisma, Sequelize, TypeORM
- GraphQL, tRPC
- TypeScript (unless explicitly approved later)
- Any alternative backend framework or database
- Any alternative full-stack framework

## 6. Architectural Principles

- **Simple, not simplistic.** The foundation must be easy to read and easy to extend.
- **Modular boundaries.** Frontend and backend live in clearly separated folders but one repository.
- **One source of truth.** Configuration, environment handling, and shared identifiers live in dedicated modules, not scattered across files.
- **Predictable API contracts.** All endpoints return a consistent JSON envelope.
- **Defensive defaults.** Middleware order, error handling, and CORS are deliberate, not accidental.

## 7. Code Quality Principles

- **Naming:** `camelCase` for variables/functions, `PascalCase` for React components and classes, `UPPER_SNAKE_CASE` for constants.
- **Files:** small, single-purpose, no dead code, no commented-out experiments.
- **Functions:** short and focused; prefer composition over deep nesting.
- **Comments:** explain _why_, not _what_. Avoid line-by-line narration.
- **No magic values:** environment-derived configuration and named constants only.
- **No copy-paste duplication:** if a pattern repeats three times, extract it.
- **Linting:** ESLint is the project linter. Run with `npm run lint` (root) before opening a PR. Stylistic preferences are not linted — they belong to Prettier.
- **Formatting:** Prettier owns formatting for `.js`, `.jsx`, `.json`, `.md`, and `.css`. Run `npm run format` to apply, `npm run format:check` to verify. CI must not be the first place formatting is enforced.

## 8. Security Principles

- Secrets belong in `.env`, never in source. `.env.example` documents the shape; no real values are committed.
- `.gitignore` must keep `node_modules`, `.env`, and build artifacts out of version control.
- CORS is configured explicitly per environment, never `origin: "*"` in a permanent way.
- Authentication uses hashed credentials (bcrypt) and signed tokens (JWT). Implemented in the Node/Express backend — no third-party identity provider.
- Passwords are **never** stored in plaintext. The Mongoose `password` field uses `select: false` and a `pre('save')` hook hashes it. Auth flows that need the hash explicitly select it.
- JWTs carry a minimal payload (user id). Personal data lives in the database, not in the token.
- JWT secrets are environment-derived. No hardcoded fallback secret exists anywhere in source.
- Public registration always creates a `user`-role account. `role` and `isActive` are server-controlled.
- API responses never include password hashes, raw JWT error messages, or other sensitive internals.
- Express responses never leak stack traces in production.

## 9. API Design Principles

- All endpoints are namespaced under `/api/v1`.
- All responses follow a consistent JSON envelope: `{ success, message, data }` (and optional `errors`).
- Errors are thrown, not constructed inline in controllers. A central error middleware formats them.
- Validation is handled by a dedicated middleware layer; controllers do not reinvent parsing.
- Future additions should remain backward-compatible whenever reasonably possible.

## 10. Database Design Principles

- Models are designed phase-by-phase against real feature requirements, never speculatively.
- Mongoose schemas use clear field-level constraints, indexes where required, and timestamps.
- Connections are managed in a single dedicated module with a clean lifecycle (connect / disconnect / error).
- No ad-hoc `mongoose.connect()` calls outside the connection module.

## 11. Frontend Architecture Principles

- `pages/` holds route-level views. `components/` holds reusable UI. `layouts/` holds shell structures. `services/` holds API and external integrations. `hooks/`, `context/`, `utils/`, `constants/`, and `styles/` have single responsibilities.
- `App.jsx` is a thin composition root. It does not contain business logic.
- The Axios API client is centralized; raw `axios.create()` does not appear inside components.
- React Router owns navigation. Global state uses React's native primitives until a real need for a state library appears.
- **Authentication state is centralized in `AuthContext`.** Pages and route guards consume it via `useAuth()`; they do not read `localStorage` directly and do not attach JWTs by hand.
- **JWT persistence is centralized in `authStorage`.** All access goes through `getToken` / `setToken` / `removeToken` / `hasToken`. The token key (`nexora_token`) is a single constant.
- **No fake authentication.** Successful auth always comes from the real backend. No mock users, no `setTimeout`-driven fake logins, no env-driven test users.
- **Backend secrets never reach the frontend.** Only `VITE_`-prefixed environment variables are exposed to the React bundle. `JWT_SECRET`, `MONGO_URI`, `BCRYPT_ROUNDS` must never appear in any `VITE_*` variable.

## 12. Backend Architecture Principles

- `server.js` boots the HTTP server and owns process lifecycle.
- `app.js` builds the Express application (middleware, routes, error handling).
- Controllers translate HTTP <-> service calls. Services contain business logic. Models own persistence. Routes declare endpoints.
- Middleware lives under `middleware/`. Utilities and helpers live under `utils/`. Configuration lives under `config/`.

### Profile System Principles

- **User and Profile are separate collections.** The User document is reserved for authentication identity (email, password, role, isActive). Professional profile data lives in `Profile`, referenced by a unique `user` field. Reasons: keeps the auth hot path small, prevents document bloat as Experience / Education / Skills arrive, allows independent lifecycles.
- **One profile per user.** Enforced by a unique index on `Profile.user`. Duplicate-key errors from concurrent creation are translated into a 409 envelope by the service layer.
- **Profile creation is lazy.** `GET /profile/me` lazily creates an empty profile for the authenticated caller; `PATCH /profile/me` is an upsert. This avoids writing empty documents at registration and avoids needing a MongoDB transaction during signup.
- **Experience / Education / Skills are deferred.** They will be separate collections (one-to-many against `Profile.user`) so future search and endorsements can query them directly. They are intentionally NOT introduced in Phase 3 — Prompt 1; the architecture leaves a documented seam.
- **Media references are URL strings, not uploads.** `profilePhoto` and `coverPhoto` point at a future media service. No upload pipeline is introduced in this phase.
- **Public profile responses are narrower than owner responses.** The public projection omits `updatedAt`. Passwords, password hashes, JWT secrets, and account-security metadata are **never** exposed through any profile endpoint.
- **Profile ownership comes from `req.user.id`, not the request body.** Client-supplied user ids on PATCH are ignored; the only way to mutate a profile is to be authenticated as its owner.

### Connection System Principles

- **One document per relationship, with a canonical pair.** Each Connection document has `userA` and `userB` (where `userA < userB` lexicographically) plus separate `requester` / `recipient` fields for direction. The canonical pair is internal — it exists only to enforce uniqueness — and is not exposed by the API serializer. Direction is the only thing the consumer needs.
- **A single unique compound index `{ userA: 1, userB: 1 }` enforces pair uniqueness at the database level.** This makes the simultaneous A→B / B→A race and the double-send race safe: the loser catches `E11000` and the service translates it into a clean 409.
- **Five indexes, all justified by a documented query pattern:**
  - `{ userA: 1, userB: 1 }` unique — pair lookup and uniqueness.
  - `{ userA: 1, status: 1, updatedAt: -1 }` — half of the `$or` in `listAcceptedForUser` when the caller is the smaller id.
  - `{ userB: 1, status: 1, updatedAt: -1 }` — the other half of that `$or`.
  - `{ recipient: 1, status: 1, updatedAt: -1 }` — `listIncomingPendingForUser`.
  - `{ requester: 1, status: 1, updatedAt: -1 }` — `listOutgoingPendingForUser`.
    These are documented inline in `server/models/Connection.js`.
- **Status values: `pending`, `accepted`, `rejected`, `withdrawn`.** Status is persisted (Approach A in the brief) for auditability and future notifications; re-request after `rejected` / `withdrawn` updates the existing document back to `pending` with new direction.
- **Valid transitions:**

| Current                         | Action       | Actor       | Next                      | Result         |
| ------------------------------- | ------------ | ----------- | ------------------------- | -------------- |
| (none)                          | send request | either      | `pending`                 | new connection |
| `pending` (caller is requester) | send again   | requester   | —                         | 409 conflict   |
| `pending` (caller is recipient) | send again   | recipient   | —                         | 409 conflict   |
| `pending`                       | accept       | recipient   | `accepted`                | 200            |
| `pending`                       | reject       | recipient   | `rejected`                | 200            |
| `pending`                       | withdraw     | requester   | `withdrawn`               | 200            |
| `accepted`                      | remove       | either      | (deleted)                 | 200            |
| `accepted`                      | send request | either      | —                         | 409 conflict   |
| `rejected`                      | send request | either side | `pending` (new direction) | 201            |
| `withdrawn`                     | send request | either side | `pending` (new direction) | 201            |

- **Authorization is server-side and uses `req.user.id` only.** No body field is trusted for actor identity. Each transition has exactly one permitted actor (recipient for accept/reject, requester for withdraw, either party for remove) and the service throws `403` otherwise.
- **Self-connection is rejected with 400** before any DB write.
- **Inactive users:** the recipient's `isActive` is enforced by the existing `requireAuth` middleware (inactive users cannot authenticate). Existing connections persist if a user later becomes inactive; no cascade.
- **Removal is a hard delete.** Re-connection is supported by creating a new pending request.
- **No multi-document transactions are required** — the relationship is single-document atomic.
- **The internal `userA` / `userB` fields are never exposed**; only `requester`, `recipient`, `status`, `createdAt`, `updatedAt`, and a small public projection of the involved users appear in API responses.
- **Connection responses include a profile preview** for each participant (`headline`, `profilePhoto`). The full Profile document is never returned — only safe preview fields are projected through `safeConnection.js`.
- **Inactive-user policy:** the existing `requireAuth` middleware blocks inactive callers from authenticating, so they cannot be the actor on any connection endpoint. The _recipient_ in a new request may be inactive — the request is allowed so the relationship survives if the recipient is later reactivated.
- **Self-status:** `GET /connections/status/<ownUserId>` returns `"none"` — no document exists for the self-pair. The frontend treats this the same as "no relationship."
- **Missing-user safety:** if a connection references a User that has been removed, the serializer returns a placeholder (`user: null, profile: null, placeholder: true`) for that participant instead of throwing. Data integrity is preserved; the rest of the pipeline keeps working.
- **Batched user + profile lookup:** `loadParticipantMap(connections)` issues a single `User.find` and a single `Profile.find` for the entire batch, avoiding an N+1 pattern.

## 13. No Fake Business Functionality

Completed features must actually work. No fake authentication, no stubbed routes that pretend to do work, no console-logged "success" responses. The health endpoint is the only synthetic endpoint and is explicitly documented as such.

## 14. Backward Compatibility

New phases should integrate with existing code rather than rewrite it. If a refactor is genuinely required, it must be justified in the PR description and isolated to a small set of files.

## 15. Dependency Discipline

Every installed package must have a clear purpose in the MERN stack. No "popular but unused" packages. No silent upgrades to alternative frameworks.

## 16. No Premature Features

Phases ship only what their scope describes. The foundation phase establishes infrastructure — not features.

### Post System Principles

- **One document per post** with `author` (ObjectId ref User), `content` (trimmed, bounded max length), `visibility` (enum, only `public` today), and timestamps.
- **Author is always `req.user.id`.** The body cannot override it. The service-layer guard catches any attempt.
- **Ownership is atomic.** Edit and delete use `findOneAndUpdate` / `findOneAndDelete` with `{ _id, author: callerId }` filters. A user can never modify another user's post by manipulating an id.
- **Safe serialization.** The serializer exposes only intentional fields: `id`, `author` (rich block: `{ user, profile, placeholder }`), `content`, `visibility`, `createdAt`, `updatedAt`. Password, role, isActive, email, full Profile are NEVER returned. Missing authors surface as `placeholder: true` rather than throwing.
- **Pagination at the database level.** Defaults: page 1, limit 20. Maximum limit 50, silently clamped. Invalid `page` / `limit` are rejected with 400.
- **Feed eligibility = caller + every accepted connection.** Pending / rejected / withdrawn connections NEVER contribute. The query plan is TWO batched queries (one for connection ids, one for posts with `$in`), not an N+1 loop.
- **Deterministic sort.** `createdAt` descending with `_id` descending as the tie-breaker.
- **Indexes are justified by query patterns, not added speculatively.** See `server/models/Post.js` for the per-index documentation.
- **HTML / script content is stored as plain text.** The backend never renders. The frontend is responsible for safe rendering — Phase 5 Prompt 2 will handle that.
- **No likes, comments, shares, reactions, media uploads, hashtags, mentions, notifications, or feed ranking.** Those belong to their own phases.

### Feed UI / Post Slice Principles

- **Redux owns server-derived state, NOT transient UI state.** The post slice owns `feed` (paginated list), `myPosts` (paginated list), `userPostsByUserId` (per-user cache), and `mutations.create / .update / .delete` (per-post loading + error flags). Selectors expose these to components.
- **Composer textarea, modal open/close, dropdown state, hover, animation state — all LOCAL to each component.** They never enter Redux. This prevents per-keystroke dispatches and unnecessary re-renders across the tree.
- **The feed is the authenticated home.** The temporary `AuthenticatedHomePage` was removed. `/` and `/feed` both render `FeedPage` (protected).
- **Server-confirmed state only.** The composer does NOT use optimistic updates — the new post is prepended to feed only after the backend confirms success. Similarly for edit / delete.
- **Post content is plain text.** Rendered with `whitespace-pre-wrap` and never with `dangerouslySetInnerHTML`. The frontend is responsible for safe text rendering.
- **Pagination is "Load more".** The backend's `hasNextPage` is the authority. In-flight page requests are debounced locally so the user can't trigger duplicate fetches.
- **Author spoofing is impossible.** The body cannot set `author` — it always comes from `req.user.id` (the auth middleware sets it; the slice never forwards it).
- **Ownership is enforced server-side.** Edit / delete return 403 (not 404) when the caller is not the author — the existing convention from Phase 4. Frontend hides the Edit / Delete menu when `post.author.user.id !== authUser.id`.
- **Existing functionality is preserved.** The connection slice / Network page / Profile page are untouched. ProfilePage still has its Phase 3 components (Avatar, Cover, About, Experience placeholder).

### Interaction System Principles (Phase 5 — Prompt 3)

- **Reactions are a separate collection**, not an unbounded array on Post. Each Reaction is a (post, user, type) tuple.
- **Database-level uniqueness:** the unique compound index `{ post, user, type }` prevents duplicate likes at the database level. Duplicate requests return 200 idempotent, not 409.
- **Only one reaction type is supported in this phase** (`like`). Multi-reaction types (celebrate, support, etc.) are explicitly out of scope; the enum is extensible for a future phase.
- **Comments are a separate collection**, not an unbounded array on Post. The brief explicitly avoided that anti-pattern.
- **No nested replies, no comment reactions, no mentions, no notifications, no edit history** in this phase. Each is documented as a future phase.
- **Comment ownership is enforced atomically:** edits and deletes use `findOneAndUpdate` / `findOneAndDelete` with `{ _id, author: callerId }`. Non-authors receive 403 (the project's existing convention), not 404.
- **Comments are returned oldest-first** (natural conversation flow) sorted by `createdAt` ASC with `_id` as a deterministic tie-breaker.
- **Comment content cap: 1000 characters.** Empty / whitespace-only / over-length content is rejected at the validator.
- **No `dangerouslySetInnerHTML` for comment content** — plain text only, rendered with `whitespace-pre-wrap` like Post content.
- **N+1 prevention on the Feed:** reaction summary + comment counts are computed in batched aggregations (`Reaction.aggregate` and `Comment.aggregate` grouped by postId) plus one per-caller `Reaction.find` for `likedByMe`. The Feed page does NOT generate one API request per post.
- **Redux / local state boundary:** the `post` slice owns `interactions.byPostId` and `comments.byPostId` caches plus mutation flags. Composer textarea content, modal open/close, edit-comment drafts are LOCAL state. The PostComposer dispatches ONLY on submit (no per-keystroke dispatch).

---

**Last updated:** Phase 5 — Prompt 3 (post interactions: reactions + comments).
