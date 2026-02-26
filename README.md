# Planning Poker

Simple real-time planning poker for small teams. No DB, no auth, no nonsense.

## How it works

- One REST endpoint (`POST /api/join`) to validate + join a room
- WebSocket for real-time state (votes, reveal, reset)
- Everything lives in memory — server restart clears all rooms
- Fibonacci cards: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, ?, ☕

---

## Backend setup

```bash
cd server
npm install
npm run dev        # nodemon, hot reload
# or
npm start          # plain node
```

Server runs on **http://localhost:3001**

### Dependencies
- `express` — single REST endpoint
- `ws` — WebSocket server
- `cors` — so the React dev server can talk to it

---

## Frontend setup

```bash
cd client
npm create vite@latest . -- --template react
# replace src/App.jsx with the provided App.jsx
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## Usage

1. Everyone opens the app and enters their **name** + the same **Room ID**
2. Each person clicks a card (no one sees each other's pick until reveal)
3. Anyone can hit **Reveal Cards** — everyone sees all votes at once
4. Average story point is calculated automatically
5. Hit **New Round** to reset and go again

---

## File structure

```
server/
  server.js       ← backend (Node + WS)
  package.json

client/
  src/
    App.jsx       ← entire frontend, one file
```

---

## WebSocket message protocol

| Direction | Type       | Payload                          |
|-----------|------------|----------------------------------|
| → server  | `register` | `{ groupId, username }`         |
| → server  | `vote`     | `{ vote: "5" \| null }`         |
| → server  | `reveal`   | —                                |
| → server  | `reset`    | —                                |
| ← client  | `room_state` | `{ users: [...], revealed }`  |

Users array: `{ name, hasVoted, vote }` — `vote` is null until revealed.
