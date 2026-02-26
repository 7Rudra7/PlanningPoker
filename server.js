const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// pure in-memory, no DB needed for a team of 8-10
// structure: { [groupId]: { users: { [username]: { vote: null|string, ws } }, revealed: bool } }
const rooms = {};

function getRoomState(groupId) {
  const room = rooms[groupId];
  if (!room) return null;
  const users = Object.entries(room.users).map(([name, data]) => ({
    name,
    hasVoted: data.vote !== null,
    vote: room.revealed ? data.vote : null,
  }));
  return { users, revealed: room.revealed };
}

function broadcastRoom(groupId) {
  const room = rooms[groupId];
  if (!room) return;
  const state = getRoomState(groupId);
  const msg = JSON.stringify({ type: 'room_state', data: state });
  Object.values(room.users).forEach(({ ws }) => {
    if (ws && ws.readyState === 1) ws.send(msg);
  });
}

// single REST endpoint — just validates the group exists or creates it
// frontend uses this to "join" before upgrading to WS
app.post('/api/join', (req, res) => {
  const { groupId, username } = req.body || {};

  if (!groupId || !username) {
    return res.status(400).json({ ok: false, error: 'groupId and username are required' });
  }

  if (!rooms[groupId]) {
    rooms[groupId] = { users: {}, revealed: false };
  }

  if (rooms[groupId].users[username]) {
    return res.status(409).json({ ok: false, error: 'Username already taken in this room' });
  }

  // slot is reserved; WS will fill in the ws reference
  rooms[groupId].users[username] = { vote: null, ws: null };

  return res.json({ ok: true, groupId, username });
});

wss.on('connection', (ws) => {
  let currentGroup = null;
  let currentUser = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    const { type, groupId, username, vote } = msg;

    if (type === 'register') {
      if (!rooms[groupId] || !rooms[groupId].users[username]) {
        ws.send(JSON.stringify({ type: 'error', message: 'Join via HTTP first' }));
        return;
      }
      currentGroup = groupId;
      currentUser = username;
      rooms[groupId].users[username].ws = ws;
      broadcastRoom(groupId);
      return;
    }

    if (!currentGroup || !currentUser) return;

    if (type === 'vote') {
      if (rooms[currentGroup].revealed) return; // voting locked after reveal
      rooms[currentGroup].users[currentUser].vote = vote;
      broadcastRoom(currentGroup);
      return;
    }

    if (type === 'reveal') {
      rooms[currentGroup].revealed = true;
      broadcastRoom(currentGroup);
      return;
    }

    if (type === 'reset') {
      rooms[currentGroup].revealed = false;
      Object.keys(rooms[currentGroup].users).forEach(u => {
        rooms[currentGroup].users[u].vote = null;
      });
      broadcastRoom(currentGroup);
      return;
    }
  });

  ws.on('close', () => {
    if (!currentGroup || !currentUser) return;
    if (rooms[currentGroup] && rooms[currentGroup].users[currentUser]) {
      delete rooms[currentGroup].users[currentUser];
      if (Object.keys(rooms[currentGroup].users).length === 0) {
        delete rooms[currentGroup];
      } else {
        broadcastRoom(currentGroup);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Planning poker server up on http://localhost:${PORT}`);
});
