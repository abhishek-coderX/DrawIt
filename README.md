
# DrawIt — Real-Time Collaborative Whiteboard

> A production-grade collaborative whiteboard with live cursors, infinite canvas, and real-time sync across all connected users.

🔗 **Live Demo:** [https://draw-it-frontend-peach.vercel.app](https://draw-it-frontend-peach.vercel.app)  
📦 **Repository:** [https://github.com/abhishek-coderX/DrawIt](https://github.com/abhishek-coderX/DrawIt)

---

## ✨ Features

- 🎨 **Real-time collaborative drawing** — multiple users draw together simultaneously
- 🖱️ **Live cursor presence** — see every collaborator's cursor with their name in real time
- ♾️ **Infinite canvas** — pan and zoom freely with smooth 60fps rendering
- ✏️ **Drawing tools** — rectangle, ellipse, line, pencil, text, eraser
- ↩️ **Undo/Redo** — full history stack with Ctrl+Z / Ctrl+Y
- 💾 **Auto-persistence** — shapes saved to PostgreSQL, reload and they're still there
- 📤 **Export as PNG** — download your canvas as an image
- 🔄 **Offline resilience** — auto-reconnects with exponential backoff, queues shapes while offline
- 🏠 **Room management** — create, join, rename, delete rooms with shareable links
- 🔐 **Authentication** — JWT-based auth with bcrypt password hashing

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| State Management | Zustand |
| Canvas Rendering | HTML Canvas API + rough.js |
| HTTP API | Express.js + TypeScript |
| WebSocket | ws library + TypeScript |
| Message Broker | Redis Pub/Sub (Upstash + ioredis) |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Authentication | JWT + bcrypt |
| Monorepo | Turborepo + pnpm workspaces |
| Deployment | Vercel (frontend) + Railway (backends) |

---

## 🏛️ Architecture

```
DrawIt/
├── apps/
│   ├── frontend/          ← Next.js 14 App Router (Vercel)
│   ├── http-backend/      ← Express REST API (Railway)
│   └── ws-backend/        ← WebSocket server (Railway)
├── packages/
│   ├── db/                ← Prisma client + schema
│   ├── common/            ← Zod validation schemas
│   └── backend-common/    ← JWT config
├── turbo.json
└── pnpm-workspace.yaml
```

### System Design

```
Client (Next.js)
     │
     ├── REST (HTTP) ──────► Express :3001 ──► PostgreSQL (Neon)
     │
     └── WebSocket ────────► WS Server :8080
                                  │
                             Redis Pub/Sub (Upstash)
                                  │
                          All WS instances receive
                          and fan out to local users
```

### Real-time Data Flow

1. User draws a shape → added to local Zustand store (optimistic UI)
2. Shape serialized to JSON → sent via WebSocket `chat` event
3. WS server upserts shape to PostgreSQL via Prisma
4. WS server publishes to Redis channel `room:{id}`
5. All WS server instances subscribed to that channel receive it
6. Each instance fans out to locally connected users in that room
7. Peers deduplicate by shape ID → add to their Zustand store

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm 9+
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/abhishek-coderX/DrawIt.git
cd DrawIt

# Install dependencies
pnpm install

# Set up environment variables
cp apps/http-backend/.env.example apps/http-backend/.env
cp apps/ws-backend/.env.example apps/ws-backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

### Environment Variables

**`apps/http-backend/.env`**
```env
DATABASE_URL=postgresql://user:password@host:5432/drawit
JWT_SECRET=your-super-secret-jwt-key
```

**`apps/ws-backend/.env`**
```env
DATABASE_URL=postgresql://user:password@host:5432/drawit
JWT_SECRET=your-super-secret-jwt-key
REDIS_URL=rediss://default:token@host:6379
```

**`apps/frontend/.env.local`**
```env
NEXT_PUBLIC_HTTP_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Database Setup

```bash
cd packages/db
npx prisma migrate deploy
npx prisma generate
```

### Run Development Servers

```bash
# Run all services simultaneously
pnpm dev

# Or run individually
pnpm --filter http-backend dev    # HTTP API on :3001
pnpm --filter ws-backend dev      # WebSocket on :8080
pnpm --filter frontend dev        # Next.js on :3000
```

---

## 📡 API Reference

### HTTP Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/signup` | No | Create a new user account |
| POST | `/signin` | No | Sign in and receive JWT token |
| POST | `/room` | Yes | Create a new room |
| GET | `/room/:slug` | No | Get room details by slug |
| PUT | `/room/:roomId` | Yes | Rename a room (admin only) |
| DELETE | `/room/:roomId` | Yes | Delete a room (admin only) |
| GET | `/chats/:roomId` | No | Load all shapes for a room |
| DELETE | `/chats/:roomId` | Yes | Clear all shapes in a room |
| GET | `/user/me` | Yes | Get current user profile |

### WebSocket Events

| Event | Direction | Persisted | Description |
|-------|-----------|-----------|-------------|
| `join_room` | Client → Server | No | Join a collaboration room |
| `leave_room` | Client → Server | No | Leave a room |
| `ping` | Client → Server | No | Heartbeat keepalive |
| `chat` | Client → Server | Yes | Broadcast a shape |
| `delete_shape` | Client → Server | Yes | Delete a specific shape |
| `clear_canvas` | Client → Server | Yes | Clear all shapes |
| `background_change` | Client → Server | No | Sync background color |
| `cursor_move` | Client → Server | No | Broadcast cursor position |
| `user_left` | Server → Client | No | User disconnected |

---

## 🔧 Key Engineering Decisions

### Redis Pub/Sub for Horizontal Scaling
The WebSocket server stores active connections in memory. Without Redis, users on different server instances can't communicate. Redis Pub/Sub decouples broadcast from server instance state — any server publishes to a channel, all servers subscribed receive it and fan out locally.

### 60fps Canvas Rendering
All drawing state lives in `useRef` — not React state. A continuous `requestAnimationFrame` loop reads from refs and renders, achieving zero React re-renders during drawing. The viewport transform matrix (`ctx.setTransform()`) handles pan/zoom in O(1) regardless of shape count.

### Optimistic UI
Shapes render instantly before server acknowledgment. Incoming shapes are deduplicated by ID — if the shape already exists locally, it's skipped. This makes drawing feel instant even with network latency.

### Live Cursors via CSS Transforms
Cursor overlays are absolutely positioned `<div>` elements updated via `transform: translate3d(x, y, 0)` in a rAF loop that directly mutates DOM. Zero canvas redraws on cursor movement — GPU compositor handles it entirely.

### Offline Resilience
The WSClient class sends a ping every 25 seconds and expects a pong. On missed pong or connection drop, exponential backoff reconnection begins (1s → 2s → 4s → 16s max). Shapes drawn while offline are queued and flushed automatically on reconnect.

---

## 📁 Database Schema

```prisma
model User {
  id       String  @id @default(uuid())
  email    String  @unique
  password String
  name     String
  rooms    Room[]
  shapes   Shape[]
}

model Room {
  id        Int      @id @default(autoincrement())
  slug      String   @unique
  adminId   String
  admin     User     @relation(fields: [adminId], references: [id])
  createdAt DateTime @default(now())
  shapes    Shape[]
}

model Shape {
  id      Int    @id @default(autoincrement())
  roomId  Int
  message String  // JSON serialized shape data
  userId  String
  room    Room   @relation(fields: [roomId], references: [id])
  user    User   @relation(fields: [userId], references: [id])
}
```

---

## 🚢 Deployment

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | https://draw-it-frontend-peach.vercel.app |
| HTTP Backend | Railway | Auto-deployed from main branch |
| WS Backend | Railway | Auto-deployed from main branch |
| PostgreSQL | Neon | Managed cloud database |
| Redis | Upstash | Managed cloud Redis |

### Deploy Your Own

1. Fork this repository
2. Create accounts on Vercel, Railway, Neon, and Upstash
3. Set up PostgreSQL on Neon — copy `DATABASE_URL`
4. Set up Redis on Upstash — copy `REDIS_URL`
5. Deploy `apps/http-backend` on Railway — add env vars
6. Deploy `apps/ws-backend` on Railway — add env vars
7. Deploy `apps/frontend` on Vercel:
   - Root Directory: `apps/frontend`
   - Install Command: `cd ../.. && npx pnpm@9.15.4 install`
   - Build Command: `pnpm build`
   - Add `NEXT_PUBLIC_HTTP_URL` and `NEXT_PUBLIC_WS_URL` env vars

---

## 🎯 Resume Highlights

- Built a **real-time collaborative whiteboard** with live cursor presence, infinite canvas pan/zoom at 60fps via viewport transform matrix, and WebSocket sync across peers — achieving zero React re-renders during drawing using requestAnimationFrame with ref-based state
- Scaled **WebSocket broadcasting horizontally using Redis Pub/Sub** (ioredis), decoupling real-time events from server instance memory, with an offline-resilient client featuring exponential backoff reconnection and shape queue buffering
- Engineered **full-stack monorepo** (Turborepo + pnpm) with JWT auth, bcrypt, admin-protected room actions, Command pattern Undo/Redo, optimistic UI with deduplication, and PostgreSQL shape persistence via Prisma

---

## 📄 License

MIT License — feel free to use this project as a reference or starting point.

---

<div align="center">
  Built with ❤️ for learning and resume projects
  <br/>
  <a href="https://draw-it-frontend-peach.vercel.app">Live Demo</a> •
  <a href="https://github.com/abhishek-coderX/DrawIt">GitHub</a>
</div>