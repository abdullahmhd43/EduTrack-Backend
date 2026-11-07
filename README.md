# EduTrack Backend (Node.js · Express · MongoDB Atlas)

## Setup
```bash
cd backend
npm install
cp .env.example .env      # then fill MONGODB_URI and JWT_SECRET (never commit .env)
npm run dev               # http://localhost:5000/api/health
```
**MongoDB Atlas:** create a free cluster -> Database Access (user/password) -> Network Access (allow your IP, or 0.0.0.0/0 for a demo) -> Connect -> Drivers -> copy the connection string into `MONGODB_URI`.

## Tests
```bash
npm run test:unit          # no database needed (User model mocked)
npm run test:integration   # needs MongoDB: downloads an in-memory server, or set TEST_MONGODB_URI
```

## API (all responses are JSON: `{ success, data | message, errors? }`)
All routes except `register`, `login` and `health` need `Authorization: Bearer <JWT>`. Data is always scoped to the logged-in user.

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | /api/health | reachability probe | 200 |
| POST | /api/auth/register | `{name,email,password,studentId?,program?}` | 201 `{token,user}` |
| POST | /api/auth/login | `{email,password}` | 200 `{token,user}` |
| GET | /api/auth/me | current user | 200 |
| GET/PUT | /api/users/profile | read / update `{name,studentId?,program?}` | 200 |
| GET | /api/{resource} | list (optional `?updatedSince=ISO`) | 200 |
| GET | /api/{resource}/:id | one record | 200 |
| POST | /api/{resource} | create (body includes `clientId`) | 201, or 200 + `duplicate:true` if `clientId` already exists |
| PUT | /api/{resource}/:id | update (optional `baseUpdatedAt`, `force`) | 200, 409 if server copy is newer |
| DELETE | /api/{resource}/:id | delete (courses cascade) | 200 |

`{resource}` = `courses`, `assignments`, `study-sessions`, `notes`, `events`.

Error codes: 400 validation/invalid id, 401 missing/invalid token or bad login, 404 not found (also for other users' records), 409 duplicate email or sync conflict (`serverVersion` returned), 500 server error.

### Request bodies
- **course**: `clientId, name, code, lecturer?, description?, startDate, endDate` (ISO dates, end >= start)
- **assignment**: `clientId, courseClientId, title, description?, dueDate, priority(low|medium|high), status(not_started|in_progress|completed)`
- **study-session**: `clientId, courseClientId, topic, date(yyyy-MM-dd), startTime(HH:mm), endTime, description?, completed?`
- **note**: `clientId, courseClientId?, title, content`
- **event**: `clientId, title, type(exam|class|event), date, startTime, endTime?, location?, description?`

### Why `clientId` and `baseUpdatedAt`?
`clientId` is the UUID the app generated offline. A unique index on `(userId, clientId)` makes POST idempotent, so a retried sync can never create duplicates. `baseUpdatedAt` is the server version the client last saw; if the server copy is newer the API answers 409 instead of overwriting it.

Note: passwords are hashed with **bcryptjs** (pure-JS bcrypt implementation, same algorithm and hash format as `bcrypt`, avoids native compilation).
