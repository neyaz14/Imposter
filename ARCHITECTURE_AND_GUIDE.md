# Imposter Game — Complete Architectural Blueprint & Coding Guide

---

## 1. Executive Summary & Architecture Overview

The **Imposter Game** is a multiplayer social deduction game (inspired by games like *Undercover* / *Spyfall* / *Among Us*). Players are placed in a room where regular players receive a secret word (e.g. `বাঘ`), and one or more imposters receive a slightly different secret word (e.g. `সিংহ`). Through discussion and deduction, players vote to identify and eliminate the imposters.

```mermaid
flowchart TB
    subgraph Client ["Frontend (apps/fe) - React / Vite / Zustand"]
        UI["React UI (Lobby, Cards, Timer, Voting)"]
        Store["Zustand Store (gameStore.ts)"]
        WSClient["WebSocket Client (socket.ts + eventHandlers.ts)"]
        UI --> Store
        UI --> WSClient
        WSClient --> Store
    end

    subgraph AuthServer ["HTTP Auth API (apps/be) - Express"]
        OAuth["Google OAuth / Auth Endpoints"]
        CookieEngine["Issue httpOnly JWT Cookie"]
        OAuth --> CookieEngine
    end

    subgraph WSServer ["WebSocket Server (apps/ws) - Node.js + ws"]
        Reception["index.ts (Auth & Connection)"]
        Router["router.ts (Event Routing)"]
        RoomMgr["RoomManager & Room (RAM State)"]
        Engine["GameEngine (State Machine)"]
        Services["WordService | VoteService | TimerService"]
        Persist["persistence.ts"]
        
        Reception --> Router
        Router --> RoomMgr
        Router --> Engine
        Engine --> Services
        Engine --> Persist
    end

    subgraph Database ["Database Layer (packages/db) - PostgreSQL + Prisma"]
        Prisma["Prisma ORM"]
        DB[(PostgreSQL)]
        Prisma --> DB
    end

    subgraph Shared ["Shared Library (packages/common)"]
        Types["Event Schemas & DTO Types"]
    end

    CookieEngine -.->|Sets accessToken cookie| Client
    Client <==>|Bi-directional WebSocket (ws://)| Reception
    Persist -.->|Save Finished Games| Prisma
    OAuth -.->|User CRUD| Prisma
    Types -.-> Client
    Types -.-> WSServer
    Types -.-> AuthServer
```

---

## 2. Core Architectural Principles & Security Rules

1. **State Partitioning (In-Memory vs. Database):**
   - **In-Memory (RAM):** Real-time room states, active timers, live votes, and active WebSocket connections reside in `RoomManager` and `Room` instances for sub-millisecond response times.
   - **PostgreSQL Database:** Used only for persistent identity (users, profiles, stats) and permanent game history (saved only once when status reaches `FINISHED` via `persistence.ts`).

2. **Zero-Trust Information Exposure:**
   - **Public Events (`room.broadcast`)**: Only send sanitized data generated via `getPublicRoomState()`. Never include `imposterIds`, secret words, or individual votes during active phases.
   - **Private Events (`room.sendTo`)**: Secret cards (`YOUR_CARD`) and personalized sync states are sent exclusively to the target player's socket.
   - **Live Vote Redaction**: During the `VOTING` phase, the server broadcasts only the aggregated number of votes cast (`votedCount` / `total`), never who voted for whom.

3. **Authoritative Clock:**
   - The countdown timer runs strictly on the server (`TimerService.ts`). Clients merely render the `secondsLeft` dispatched via `TIMER_UPDATE` events.

---

## 3. Complete Game State Machine & Data Flow

```mermaid
stateDiagram-v2
    [*] --> LOBBY : CREATE_ROOM / JOIN_ROOM
    
    LOBBY --> LOBBY : PLAYER_READY (all players ready)
    LOBBY --> REVEAL : Host triggers START_GAME (min 3 players)
    
    state REVEAL {
        [*] --> PickSecrets : WordService.pick() + GameEngine.pickImposters()
        PickSecrets --> SendCards : room.sendTo(userId, YOUR_CARD)
        SendCards --> CountdownReveal : 15s TimerService
    }
    
    REVEAL --> DISCUSSION : 15s expires
    
    state DISCUSSION {
        [*] --> DiscussionTimer : discussionDuration (e.g. 60s)
        DiscussionTimer --> [*] : Timer expires OR Host triggers START_VOTE
    }
    
    DISCUSSION --> VOTING : Discussion ends / Skipped
    
    state VOTING {
        [*] --> VotingTimer : votingDuration (e.g. 30s)
        VotingTimer --> CastVote : Player sends VOTE_IMPOSTER
        CastVote --> CheckAllVoted : VoteService.cast()
        CheckAllVoted --> [*] : All online players voted OR Timer expires
    }
    
    VOTING --> RESULT : Tally Votes & Determine Elimination
    
    state RESULT {
        [*] --> BroadcastResult : Reveal words & imposter IDs (10s timer)
    }
    
    RESULT --> REVEAL : currentRound == 0 (Transition to Round 2)
    RESULT --> FINISHED : currentRound == 1 (Game Over)
    
    FINISHED --> [*] : saveGameResult() to Database
```

---

## 4. Database Schema (Prisma / PostgreSQL)

Add a `packages/db` workspace package with the following schema:

```prisma
// packages/db/prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

enum GameRole {
  PLAYER
  IMPOSTER
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String
  avatarUrl     String?
  role          Role           @default(USER)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  // Game relations
  gamePlayers   GamePlayer[]
  hostedGames   Game[]         @relation("HostedGames")
  votesCast     VoteHistory[]  @relation("Voter")
  votesReceived VoteHistory[]  @relation("Suspect")
}

model Category {
  id        String     @id @default(cuid())
  slug      String     @unique // "animals", "food", "sports"
  name      String     // "প্রাণী", "খাবার", "খেলাধুলা"
  words     WordPair[]
  createdAt DateTime   @default(now())
}

model WordPair {
  id           String   @id @default(cuid())
  categoryId   String
  category     Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  normalWord   String
  imposterWord String
  language     String   @default("bn") // bn, en
  createdAt    DateTime @default(now())

  @@unique([categoryId, normalWord, imposterWord])
}

model Game {
  id          String        @id @default(cuid())
  roomCode    String
  hostId      String
  host        User          @relation("HostedGames", fields: [hostId], references: [id])
  totalRounds Int           @default(2)
  startedAt   DateTime      @default(now())
  endedAt     DateTime?
  
  players     GamePlayer[]
  rounds      RoundRecord[]
}

model GamePlayer {
  id        String   @id @default(cuid())
  gameId    String
  game      Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  score     Int      @default(0)
  
  @@unique([gameId, userId])
}

model RoundRecord {
  id           String        @id @default(cuid())
  gameId       String
  game         Game          @relation(fields: [gameId], references: [id], onDelete: Cascade)
  roundNumber  Int           // 1 or 2
  category     String
  normalWord   String
  imposterWord String
  eliminatedId String?
  wasImposter  Boolean?
  
  votes        VoteHistory[]
}

model VoteHistory {
  id        String      @id @default(cuid())
  roundId   String
  round     RoundRecord @relation(fields: [roundId], references: [id], onDelete: Cascade)
  voterId   String
  voter     User        @relation("Voter", fields: [voterId], references: [id])
  suspectId String
  suspect   User        @relation("Suspect", fields: [suspectId], references: [id])
}
```

---

## 5. Event & Protocol Specifications

Defined in `packages/common/src/index.ts`:

### Client to Server (`ClientEvent`)
| Event Type | Payload | Trigger / Purpose |
|---|---|---|
| `CREATE_ROOM` | `{ settings: RoomSettings }` | Host initializes a new lobby |
| `JOIN_ROOM` | `{ roomCode: string }` | Player enters existing room code |
| `PLAYER_READY` | *(none)* | Player toggles ready status in lobby |
| `START_GAME` | *(none)* | Host starts game (all players must be ready, min 3) |
| `START_VOTE` | *(none)* | Host skips remaining discussion time to start voting |
| `VOTE_IMPOSTER`| `{ suspectId: string }` | Player casts vote for a suspect |
| `LEAVE_ROOM` | *(none)* | Player exits lobby or room |

### Server to Client (`ServerEvent`)
| Event Type | Data Payload | Scope | Purpose |
|---|---|---|---|
| `ROOM_STATE` | `PublicRoomState` | Broadcast | Dispatches complete public room snapshot |
| `PLAYER_JOINED` | `PublicRoomState` | Broadcast | Notifies room of a new joiner |
| `PLAYER_STATUS_CHANGED` | `{ userId, isOnline }` | Broadcast | Disconnect / Reconnect status update |
| `GAME_STARTED` | `{ round: number }` | Broadcast | Game round starts, transitions to REVEAL |
| `YOUR_CARD` | `{ role, word, category }` | **Private (`sendTo`)** | Secret word and role sent to each player |
| `TIMER_UPDATE` | `{ secondsLeft: number }` | Broadcast | 1-second interval clock ticks |
| `DISCUSSION_STARTED` | `{ duration: number }` | Broadcast | DISCUSSION phase commences |
| `VOTING_OPEN` | `{ players: [...], duration }` | Broadcast | VOTING phase begins; list of eligible candidates |
| `VOTING_UPDATE` | `{ votedCount, total }` | Broadcast | Aggregated count of votes submitted |
| `ROUND_RESULT` | `{ round, eliminatedId, wasImposter, imposterIds, voteCounts, normalWord, imposterWord }` | Broadcast | Full revelation of words, imposters, and votes |
| `GAME_FINISHED` | `{}` | Broadcast | Final game over state |
| `ERROR` | `{ message: string }` | Single Socket | Validation failure or error message |

---

## 6. Comprehensive File-by-File Codebase Tour

### 📦 `packages/common/`
- `src/index.ts`: The single source of truth for all TypeScript types, event contracts, and interfaces shared between backend, WebSocket, and frontend.

### 🔌 `apps/ws/` (WebSocket Server)
- `src/index.ts`: WebSocket entry point. Authenticates cookies via `authenticate()`, mounts heartbeat, handles reconnection, parses incoming JSON, routes to `handleEvent()`, and manages disconnects.
- `src/auth/authenticate.ts`: Parses the HTTP upgrade request cookies for `accessToken` and verifies it using `jsonwebtoken` against `JWT_SECRET`.
- `src/connection/socket.ts`: Defines `AuthenticatedSocket` and helper functions `sendJson()` and `sendError()`.
- `src/connection/heartbeat.ts`: 30-second ping/pong sweep that terminates zombie connections.
- `src/events/router.ts`: Switchboard that forwards events to `roomHandlers` or `gameHandlers`.
- `src/handlers/roomHandlers.ts`: Implements `createRoom`, `joinRoom`, `leaveRoom`, `disconnect`, and `reconnect`.
- `src/handlers/gameHandlers.ts`: Implements `ready`, `startGame`, `startVote`, and `vote`.
- `src/handlers/helpers.ts`: `getRoomOf(ws)` utility to fetch the caller's active room.
- `src/room/Room.ts`: In-memory Room entity holding player map, active round info, secret game words, and socket connections.
- `src/room/RoomManager.ts`: Singleton registry for all active rooms with lookup by `roomCode` or `userId`.
- `src/room/roomState.ts`: Sanitizes in-memory `Room` data into safe `PublicRoomState`.
- `src/game/GameEngine.ts`: State machine managing phase transitions, imposter assignment, secret cards, vote counting, round chaining, and database trigger.
- `src/game/TimerService.ts`: Authoritative server-side 1-second countdown scheduler.
- `src/game/VoteService.ts`: Validates vote eligibility, counts tallies, handles ties, and identifies eliminated players.
- `src/game/WordService.ts`: Randomly selects matching normal & imposter word pairs based on room category settings.
- `src/game/persistence.ts`: Writes completed game summaries to PostgreSQL upon game completion.
- `src/utils/errors.ts`: Custom `GameError` class.
- `src/utils/roomCode.ts`: Generates human-friendly 6-character room codes excluding ambiguous characters.

### 💻 `apps/fe/` (Frontend)
- `src/store/gameStore.ts`: Zustand state store tracking connection, current room, private card, voting players, timers, and errors.
- `src/websocket/socket.ts`: Maintains WebSocket connection, handles reconnection, and exports `sendEvent()`.
- `src/websocket/eventHandlers.ts`: Reducer mapping server events to Zustand store updates.

---

## 7. Step-by-Step Coding Roadmap (From Scratch to Production)

Follow this order to complete your project:

```mermaid
flowchart LR
    S1["1. Monorepo Setup"] --> S2["2. Database & Prisma"]
    S2 --> S3["3. Express Auth API"]
    S3 --> S4["4. WebSocket Integration"]
    S4 --> S5["5. Frontend UI Screens"]
    S5 --> S6["6. Audio / Polish / Deploy"]
```

### Phase 1: Workspace & Monorepo Setup
1. **Root `package.json`**: Create a root workspace configuring npm/pnpm workspaces:
   ```json
   {
     "name": "impostergame",
     "private": true,
     "workspaces": [
       "packages/*",
       "apps/*"
     ]
   }
   ```
2. **Root `tsconfig.base.json`**: Add shared TypeScript configuration with paths.
3. Verify `packages/common` compiles and is linkable across `apps/ws`, `apps/be`, and `apps/fe`.

### Phase 2: Database Layer (`packages/db`)
1. Run `npx prisma init` in `packages/db`.
2. Add the schema provided in **Section 4**.
3. Create seed script `packages/db/prisma/seed.ts` containing rich Bengali / English word banks across categories (`animals`, `food`, `sports`, `places`, `objects`).
4. Run migrations: `npx prisma migrate dev --name init` and `npx prisma db seed`.
5. Export the initialized `prisma` client from `packages/db/src/index.ts`.

### Phase 3: Express Backend API (`apps/be`)
1. Create Express server listening on port `5000`.
2. Configure middleware: `cors` with credentials, `cookie-parser`, `express.json()`.
3. Add Authentication routes:
   - `GET /auth/google` & `GET /auth/google/callback` (using Passport.js or Google OAuth2 client).
   - Or standard Email/Password authentication routes (`POST /auth/register`, `POST /auth/login`).
   - Set cookie:
     ```ts
     res.cookie("accessToken", token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === "production",
       sameSite: "lax",
       maxAge: 7 * 24 * 60 * 60 * 1000,
     });
     ```
4. Add user profile endpoint `GET /api/me` and leaderboard/stats endpoints.
5. In `WordService.ts`, update word loading to fetch from Prisma at startup or fallback to memory bank.

### Phase 4: WebSocket Server Finalization (`apps/ws`)
1. Wire `saveGameResult()` to Prisma:
   ```ts
   import { prisma } from "@imposter/db";
   // save game, players, rounds, and votes
   ```
2. Set up environment variables (`.env`):
   ```env
   WS_PORT=8080
   JWT_SECRET=your_super_secret_jwt_key
   DATABASE_URL=postgresql://user:pass@localhost:5432/imposter
   ```
3. Test WebSocket connection with authenticated cookie.

### Phase 5: Complete Frontend UI (`apps/fe`)
Build the React components using Tailwind CSS and Lucide icons:

1. **`App.tsx` & Router**:
   - `/login` — Login Screen (Google / Guest).
   - `/` — Home / Dashboard: "Create Game" modal & "Join Room" input code.
   - `/room/:code` — Main Game Container.
2. **Game Phase Screens (`apps/fe/src/components/`)**:
   - **`LobbyView.tsx`**: Shows player avatars, ready indicators, host settings, "Ready" and "Start Game" buttons.
   - **`RevealCardView.tsx`**: Animated flipping card with secret word, category, and 15-second countdown.
   - **`DiscussionView.tsx`**: Active speaker highlights, remaining timer, host "Start Voting" button.
   - **`VotingView.tsx`**: Grid of player cards with "Vote" action buttons and real-time voted count tracker.
   - **`ResultView.tsx`**: Dramatic reveal animations showing who was eliminated, if they were the imposter, vote breakdown, and original secret words.
   - **`GameOverView.tsx`**: Final scores, match recap, and "Play Again" button.

### Phase 6: Polish, Testing & Deployment
1. **Audio & Sound Effects**: Add sound triggers on timer tick, vote cast, reveal, and victory.
2. **Multi-device Testing**: Open multiple browser incognito tabs to test 3+ player games, reconnections upon page reload, and host migrations when host leaves.
3. **Deployment**:
   - Frontend: Vercel / Cloudflare Pages.
   - WebSocket & API: Railway, Render, or Docker container on VPS.
   - Database: Supabase / Neon / AWS RDS PostgreSQL.

---

## 8. Development Commands Quick Reference

```powershell
# 1. Install all dependencies across the monorepo
npm install

# 2. Run Database Migrations (in packages/db)
npx prisma migrate dev

# 3. Start WebSocket Server (apps/ws)
npm run dev --workspace=apps/ws

# 4. Start Backend API (apps/be)
npm run dev --workspace=apps/be

# 5. Start Frontend (apps/fe)
npm run dev --workspace=apps/fe
```
