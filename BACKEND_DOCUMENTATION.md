# Al-Muwafiq Backend Documentation

## Overview

The backend is a small Express + MongoDB API that serves the Al-Muwafiq mobile app. It is designed around three user data domains:

- `tasks`: to-do items and reminders
- `deen`: daily prayer logging
- `gym`: workout logs and a reusable gym program template

The API is primarily sync-oriented rather than CRUD-oriented. Instead of exposing separate create, update, and delete endpoints for most entities, the mobile app batches local changes and sends them through bulk sync endpoints. Each synced record is keyed by a frontend-generated `clientSideId`, and all data is scoped per authenticated user.

## Stack

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT for authentication
- `bcryptjs` for password hashing
- `cors` and `express.json()` middleware

Backend package file: [package.json](/f:/Al-muwafiq1/Backend/package.json)

## Directory Structure

```text
Backend/
├── controllers/
│   ├── authController.js
│   ├── deenController.js
│   ├── gymController.js
│   ├── gymProgramController.js
│   └── taskController.js
├── middleware/
│   └── authMiddleware.js
├── models/
│   ├── DeenLog.js
│   ├── GymProgram.js
│   ├── Task.js
│   ├── User.js
│   └── Workout.js
├── routes/
│   ├── auth.js
│   ├── deen.js
│   ├── gym.js
│   └── tasks.js
├── package-lock.json
├── package.json
└── server.js
```

## Runtime Flow

Entry point: [server.js](/f:/Al-muwafiq1/Backend/server.js)

Startup sequence:

1. Load environment variables with `dotenv`.
2. Create an Express app.
3. Register global middleware:
   - `cors()`
   - `express.json({ limit: '10mb' })`
4. Mount route groups:
   - `/api/auth`
   - `/api/tasks`
   - `/api/gym`
   - `/api/deen`
5. Expose a health route at `/api/health`.
6. Connect to MongoDB with `mongoose.connect(process.env.MONGO_URI)`.
7. Start listening on `process.env.PORT || 5000`.

Important behavior:

- If MongoDB connection fails, the process logs the error and exits with code `1`.
- The JSON body limit is raised to `10mb` to support larger sync payloads.

## Environment Variables

The backend expects these values in `Backend/.env`:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

Usage in code:

- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: used to sign and verify JWTs
- `PORT`: optional server port override

## Authentication Model

Auth middleware: [authMiddleware.js](/f:/Al-muwafiq1/Backend/middleware/authMiddleware.js)

The protected endpoints use JWT bearer tokens:

- Header format: `Authorization: Bearer <token>`
- Tokens are signed with payload `{ userId }`
- Token lifetime: `30d`

Protected route groups:

- `/api/tasks/*`
- `/api/deen/*`
- `/api/gym/*`
- `/api/auth/profile`
- `/api/auth/change-password`

Middleware behavior:

- Missing or malformed bearer token returns `401`
- Invalid or expired token returns `401`
- On success, the decoded `userId` is attached to `req.user`

## API Design Pattern

Most feature modules follow this pattern:

- `GET /api/<module>` returns all non-deleted records for the current user
- `POST /api/<module>/sync` bulk upserts records sent by the client

The mobile app keeps local state in `AsyncStorage`, queues writes, and pushes batched changes later. The backend trusts the client-generated `clientSideId` and uses compound unique indexes like `{ userId, clientSideId }` to decide whether to insert or update.

Soft deletion is supported with `isDeleted`. Read endpoints filter out soft-deleted records using:

```js
isDeleted: { $ne: true }
```

## Route Summary

### Auth

Routes file: [routes/auth.js](/f:/Al-muwafiq1/Backend/routes/auth.js)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Create a user and return a JWT |
| `POST` | `/api/auth/login` | No | Authenticate and return a JWT |
| `GET` | `/api/auth/profile` | Yes | Return current user profile |
| `POST` | `/api/auth/change-password` | Yes | Change the current user password |

### Tasks

Routes file: [routes/tasks.js](/f:/Al-muwafiq1/Backend/routes/tasks.js)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/tasks` | Yes | Return all non-deleted user tasks |
| `POST` | `/api/tasks/sync` | Yes | Bulk upsert tasks |

### Deen

Routes file: [routes/deen.js](/f:/Al-muwafiq1/Backend/routes/deen.js)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/deen` | Yes | Return all non-deleted user prayer logs |
| `POST` | `/api/deen/sync` | Yes | Bulk upsert prayer logs |

### Gym

Routes file: [routes/gym.js](/f:/Al-muwafiq1/Backend/routes/gym.js)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/gym` | Yes | Return all non-deleted workout logs |
| `POST` | `/api/gym/sync` | Yes | Bulk upsert workout logs |
| `GET` | `/api/gym/program` | Yes | Return the latest non-deleted gym program |
| `POST` | `/api/gym/program/sync` | Yes | Upsert a gym program |
| `DELETE` | `/api/gym/program` | Yes | Soft delete a gym program |

### Health

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Basic health check |

Response shape:

```json
{
  "status": "ok",
  "timestamp": "2026-05-25T10:00:00.000Z"
}
```

## Controller Behavior

### `AuthController`

File: [controllers/authController.js](/f:/Al-muwafiq1/Backend/controllers/authController.js)

#### `POST /api/auth/register`

Request body:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "secret123"
}
```

Behavior:

- Validates that `name`, `email`, and `password` are present
- Rejects duplicate emails with `409`
- Creates the user document
- Returns a signed JWT and a user summary

Response:

```json
{
  "token": "<jwt>",
  "user": {
    "id": "mongodb_object_id",
    "name": "User Name",
    "email": "user@example.com",
    "createdAt": "2026-05-25T10:00:00.000Z"
  }
}
```

#### `POST /api/auth/login`

Request body:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Behavior:

- Validates required fields
- Finds the user by email
- Checks password with `user.comparePassword()`
- Returns JWT and user summary

#### `GET /api/auth/profile`

Behavior:

- Loads the authenticated user by `req.user`
- Excludes `password`
- Returns a compact user object

#### `POST /api/auth/change-password`

Request body:

```json
{
  "currentPassword": "old-secret",
  "newPassword": "new-secret"
}
```

Behavior:

- Requires both fields
- Enforces `newPassword.length >= 6`
- Validates the current password
- Saves the new password, which triggers hashing in the `User` model pre-save hook

### `TaskController`

File: [controllers/taskController.js](/f:/Al-muwafiq1/Backend/controllers/taskController.js)

#### `GET /api/tasks`

Returns all tasks for `req.user` where `isDeleted !== true`, sorted by `updatedAt` descending.

#### `POST /api/tasks/sync`

Request body:

```json
{
  "items": [
    {
      "clientSideId": "uuid",
      "title": "Read Quran",
      "isCompleted": false,
      "category": "Deen",
      "priority": "medium",
      "repeat": "Daily",
      "reminderTime": "07:00",
      "date": "2026-05-25",
      "lastCompletedAt": "2026-05-24T20:00:00.000Z",
      "isDeleted": false
    }
  ]
}
```

Behavior:

- Rejects missing or empty `items`
- Upserts each item by `{ userId, clientSideId }`
- Overwrites/sets `userId` from the authenticated token
- Forces `updatedAt` to the current server time
- Returns the synced records

Response shape:

```json
{
  "synced": 1,
  "items": [
    {
      "_id": "mongodb_object_id",
      "userId": "mongodb_object_id",
      "clientSideId": "uuid",
      "title": "Read Quran"
    }
  ]
}
```

### `DeenController`

File: [controllers/deenController.js](/f:/Al-muwafiq1/Backend/controllers/deenController.js)

#### `GET /api/deen`

Returns all non-deleted prayer logs for the current user, sorted by `date` descending.

#### `POST /api/deen/sync`

Request body:

```json
{
  "items": [
    {
      "clientSideId": "2026-05-25",
      "date": "2026-05-25",
      "prayers": {
        "Fajr": { "state": "prayed", "loggedAt": "2026-05-25T05:30:00.000Z" },
        "Dhuhr": { "state": "pending" }
      },
      "isDeleted": false
    }
  ]
}
```

Behavior matches task sync:

- validates non-empty `items`
- upserts by `{ userId, clientSideId }`
- stamps `updatedAt`
- returns synced documents

### `GymController`

File: [controllers/gymController.js](/f:/Al-muwafiq1/Backend/controllers/gymController.js)

#### `GET /api/gym`

Returns all non-deleted workout log documents for the current user, sorted by `updatedAt` descending.

#### `POST /api/gym/sync`

Request body:

```json
{
  "items": [
    {
      "clientSideId": "gym-day-2026-05-25",
      "dayOfWeek": "Push",
      "exercises": [
        {
          "name": "Bench Press",
          "exerciseId": "bench-1",
          "sets": [10, 8, 6],
          "reps": "10-8-6"
        }
      ],
      "isDeleted": false
    }
  ]
}
```

Behavior matches the other sync controllers.

### `GymProgramController`

File: [controllers/gymProgramController.js](/f:/Al-muwafiq1/Backend/controllers/gymProgramController.js)

This controller handles gym program templates separately from workout history.

#### `GET /api/gym/program`

Behavior:

- Finds the latest non-deleted program for the current user
- Returns `null` if none exists
- Converts `routineTemplates` from a Mongoose `Map` into a plain object before responding

Response shape:

```json
{
  "clientSideId": "gym_program_123",
  "programName": "Push, Pull, Legs",
  "anchorDate": "2026-05-20",
  "sequence": ["Push", "Pull", "Legs", "Rest"],
  "routineTemplates": {
    "Push": {
      "isRestDay": false,
      "name": "Push",
      "exercises": []
    }
  }
}
```

#### `POST /api/gym/program/sync`

Request body:

```json
{
  "clientSideId": "gym_program_123",
  "programName": "Push, Pull, Legs",
  "anchorDate": "2026-05-20",
  "sequence": ["Push", "Pull", "Legs", "Rest"],
  "routineTemplates": {
    "Push": {
      "isRestDay": false,
      "name": "Push",
      "exercises": [
        {
          "id": "bench-1",
          "name": "Bench Press",
          "sets": [10, 8, 6],
          "reps": "10-8-6"
        }
      ]
    }
  }
}
```

Behavior:

- Requires `clientSideId`
- Converts `routineTemplates` plain object into a `Map`
- Upserts by `{ userId, clientSideId }`
- Returns a normalized plain-object response

#### `DELETE /api/gym/program`

Request body:

```json
{
  "clientSideId": "gym_program_123"
}
```

Behavior:

- Requires `clientSideId`
- Soft deletes the matching record by setting `isDeleted: true`

## Data Models

### `User`

File: [models/User.js](/f:/Al-muwafiq1/Backend/models/User.js)

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `name` | `String` | Required, trimmed |
| `email` | `String` | Required, unique, lowercase, trimmed |
| `password` | `String` | Required, min length 6 |
| `createdAt` | `Date` | Added by timestamps |
| `updatedAt` | `Date` | Added by timestamps |

Special behavior:

- Passwords are hashed in a `pre('save')` hook
- Hashing only runs when `password` is modified
- `comparePassword(candidatePassword)` wraps `bcrypt.compare`

### `Task`

File: [models/Task.js](/f:/Al-muwafiq1/Backend/models/Task.js)

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | `ObjectId` | Required, references `User` |
| `title` | `String` | Required |
| `isCompleted` | `Boolean` | Default `false` |
| `category` | `String` | Enum: `Personal`, `Deen`, `Gym`, `Work` |
| `priority` | `String` | Enum: `low`, `medium`, `high` |
| `repeat` | `String` | Enum: `None`, `Daily`, `Weekly` |
| `reminderTime` | `String` | Optional, `HH:MM` style |
| `date` | `String` | Optional, `YYYY-MM-DD` style |
| `lastCompletedAt` | `String` | Optional ISO date string |
| `clientSideId` | `String` | Required |
| `isDeleted` | `Boolean` | Default `false` |
| `createdAt` | `Date` | Added by timestamps |
| `updatedAt` | `Date` | Added by timestamps |

Indexes:

- Unique compound index on `{ userId, clientSideId }`

### `DeenLog`

File: [models/DeenLog.js](/f:/Al-muwafiq1/Backend/models/DeenLog.js)

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | `ObjectId` | Required |
| `date` | `String` | Required, `YYYY-MM-DD` style |
| `prayers` | `Mixed` | Flexible prayer-state payload |
| `clientSideId` | `String` | Required |
| `isDeleted` | `Boolean` | Default `false` |
| `createdAt` | `Date` | Added by timestamps |
| `updatedAt` | `Date` | Added by timestamps |

Indexes:

- Unique compound index on `{ userId, clientSideId }`

### `Workout`

File: [models/Workout.js](/f:/Al-muwafiq1/Backend/models/Workout.js)

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | `ObjectId` | Required |
| `dayOfWeek` | `String` | Required |
| `exercises` | `Exercise[]` | Embedded documents |
| `clientSideId` | `String` | Required |
| `isDeleted` | `Boolean` | Default `false` |
| `createdAt` | `Date` | Added by timestamps |
| `updatedAt` | `Date` | Added by timestamps |

Embedded `Exercise` shape:

| Field | Type | Notes |
| --- | --- | --- |
| `name` | `String` | Optional |
| `exerciseId` | `String` | Optional |
| `sets` | `Mixed` | Default `[]` |
| `reps` | `Mixed` | Default `''` |

Indexes:

- Unique compound index on `{ userId, clientSideId }`

### `GymProgram`

File: [models/GymProgram.js](/f:/Al-muwafiq1/Backend/models/GymProgram.js)

Fields:

| Field | Type | Notes |
| --- | --- | --- |
| `userId` | `ObjectId` | Required |
| `clientSideId` | `String` | Required |
| `programName` | `String` | Default `''` |
| `anchorDate` | `String` | Default `''` |
| `sequence` | `String[]` | Default `[]` |
| `routineTemplates` | `Map<string, RoutineTemplate>` | Default `{}` |
| `isDeleted` | `Boolean` | Default `false` |
| `createdAt` | `Date` | Added by timestamps |
| `updatedAt` | `Date` | Added by timestamps |

`RoutineTemplate` shape:

| Field | Type | Notes |
| --- | --- | --- |
| `isRestDay` | `Boolean` | Default `false` |
| `name` | `String` | Required |
| `exercises` | `Exercise[]` | Default `[]` |

Embedded program `Exercise` shape:

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | Optional |
| `name` | `String` | Optional |
| `sets` | `Mixed` | Default `[]` |
| `reps` | `Mixed` | Default `''` |

Indexes:

- Unique compound index on `{ userId, clientSideId }`

## Sync Semantics

The backend is written to support offline-first mobile behavior.

Observed client flow from the app:

1. The frontend writes locally first.
2. It pushes an entry into a sync queue.
3. It batches queued items by module.
4. It calls `/api/<module>/sync` with `{ items: [...] }`.
5. The server upserts everything and returns the saved documents.
6. On login/register, the app also performs a full pull from `/api/tasks`, `/api/gym`, and `/api/deen`.

Important sync details:

- Server-side conflict resolution is minimal.
- The sync controllers do not compare timestamps before updating.
- The server simply upserts the incoming payload and sets `updatedAt` to the current time.
- In practice, the mobile app is doing most of the merge logic on the client.

## Error Handling

Common patterns across controllers:

- `400` for missing required input
- `401` for invalid credentials or invalid JWT
- `404` for missing user in some auth flows
- `409` for duplicate email on registration
- `500` for unexpected server/database errors

Error responses generally use:

```json
{
  "error": "Human-readable message"
}
```

Password change success uses:

```json
{
  "message": "Password changed successfully."
}
```

## Integration Notes with the Mobile App

Relevant frontend files:

- [syncService.ts](/f:/Al-muwafiq1/Al-Muwafiq/services/syncService.ts)
- [gymDataService.ts](/f:/Al-muwafiq1/Al-Muwafiq/services/gymDataService.ts)
- [AuthContext.tsx](/f:/Al-muwafiq1/Al-Muwafiq/context/AuthContext.tsx)

What the frontend expects:

- Auth endpoints return `token` plus a `user` object
- Protected routes accept bearer tokens
- Sync endpoints accept batched `items`
- Read endpoints return arrays except `/api/gym/program`, which returns either a single object or `null`

The main app base URL is driven by `EXPO_PUBLIC_API_URL` with a fallback to `http://localhost:5000`. One gym service currently hardcodes `http://localhost:5000`, which matters for real-device deployments.

## Strengths

- Very simple architecture
- Easy-to-follow route and controller separation
- Consistent auth enforcement on protected modules
- Compound indexes support frontend-generated IDs well
- Soft deletion avoids destructive deletes for synced records

## Known Gaps and Quirks

These are not necessarily broken, but they are important to know when maintaining the backend.

1. There are no automated tests in the backend package.
2. There is no centralized validation layer beyond Mongoose and controller checks.
3. Sync endpoints accept flexible payloads and mostly trust the client.
4. Conflict resolution is effectively client-driven rather than server-driven.
5. `cors()` is fully open; there is no environment-based origin restriction.
6. There is no refresh-token flow, logout endpoint, rate limiting, or account lockout.
7. `DELETE /api/gym/program` expects `clientSideId` in the request body, which some HTTP clients handle inconsistently.
8. The frontend `gymDataService.deleteProgramSetup()` removes local storage before trying to read the stored `clientSideId`, so remote deletion may never happen unless the ID is available elsewhere.
9. The frontend gym service hardcodes `http://localhost:5000` instead of using the same env-based base URL pattern as the other services.
10. `GET /api/gym/program` returns the latest non-deleted program, so multiple program records per user are possible even though the app appears to treat the program as a singleton.

## Local Development

From the `Backend/` directory:

```bash
npm install
npm start
```

The current scripts are:

- `npm start`
- `npm run dev`

Both start `node server.js`.

## Suggested Next Improvements

If this backend evolves further, the highest-value improvements would likely be:

1. Add request validation with a library such as Zod, Joi, or express-validator.
2. Add automated tests for auth and sync flows.
3. Introduce a real conflict-resolution strategy for sync.
4. Add pagination or date filtering if datasets grow.
5. Add structured logging and environment-specific CORS configuration.
6. Normalize the gym program lifecycle if only one active program should exist per user.
