import { useState, useEffect, useRef, useCallback } from "react";

const CARDS = [
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "34",
  "55",
  "89",
  "?",
  "☕",
];
const WS_URL = "ws://localhost:3001";
const API_URL = "http://localhost:3001/api";

function avg(votes) {
  const nums = votes.map(Number).filter((n) => !isNaN(n));
  if (!nums.length) return null;
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
}

// spread players evenly around an ellipse
// rx/ry are % offsets from center (50%, 50%)
function getCirclePositions(count, rx = 42, ry = 37) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: 50 + rx * Math.cos(angle),
      y: 50 + ry * Math.sin(angle),
    };
  });
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --felt: #1a3a2a;
    --felt-light: #1e4530;
    --felt-dark: #0f2419;
    --felt-border: #2d5c40;
    --gold: #c9a84c;
    --gold-light: #e8c96a;
    --cream: #f5f0e8;
    --text-dim: #7a9e8a;
    --card-bg: #faf6ee;
    --table-surface: #1c4a30;
    --table-rim: #3d7a52;
  }

  html, body, #root {
    height: 100%;
    width: 100%;
    font-family: 'DM Mono', monospace;
    background: var(--felt-dark);
    color: var(--cream);
    overflow: hidden;
  }

  /* felt grain overlay */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 999;
  }

  /* ─── LOGIN ─── */
  .login-wrap {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-card {
    background: rgba(0,0,0,0.42);
    border: 1px solid var(--felt-border);
    border-radius: 14px;
    padding: 48px 52px;
    width: 400px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05);
  }

  .login-card h1 {
    font-family: 'Playfair Display', serif;
    font-size: 1.9rem;
    color: var(--gold);
    margin-bottom: 4px;
  }

  .login-subtitle {
    color: var(--text-dim);
    font-size: 0.68rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 36px;
  }

  .field { margin-bottom: 18px; }

  .field label {
    display: block;
    font-size: 0.63rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 7px;
  }

  .field input {
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--felt-border);
    border-radius: 6px;
    padding: 11px 13px;
    color: var(--cream);
    font-family: 'DM Mono', monospace;
    font-size: 0.88rem;
    outline: none;
    transition: border-color 0.18s;
  }

  .field input:focus { border-color: var(--gold); }
  .field input::placeholder { color: #3a5e48; }

  .btn-join {
    width: 100%;
    margin-top: 8px;
    padding: 13px;
    background: var(--gold);
    color: #111;
    border: none;
    border-radius: 6px;
    font-family: 'DM Mono', monospace;
    font-size: 0.82rem;
    font-weight: 500;
    letter-spacing: 1.2px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .btn-join:hover:not(:disabled) { background: var(--gold-light); }
  .btn-join:active:not(:disabled) { transform: scale(0.98); }
  .btn-join:disabled { opacity: 0.35; cursor: not-allowed; }

  .login-err {
    color: #e07070;
    font-size: 0.72rem;
    text-align: center;
    margin-top: 10px;
  }

  /* ─── GAME SCREEN ─── */
  .game-wrap {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .topbar {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 22px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    background: rgba(0,0,0,0.32);
    flex-shrink: 0;
  }

  .topbar-left { display: flex; flex-direction: column; gap: 1px; }

  .room-label {
    font-size: 0.6rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  .room-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    color: var(--gold);
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .conn-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.62rem;
    color: var(--text-dim);
  }

  .conn-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .conn-dot.on  { background: #4ecb71; box-shadow: 0 0 5px #4ecb71; }
  .conn-dot.off { background: #c0392b; }

  .me-pill {
    background: rgba(201,168,76,0.1);
    border: 1px solid rgba(201,168,76,0.22);
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 0.68rem;
    color: var(--gold-light);
    letter-spacing: 0.4px;
  }

  .btn-leave {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    color: var(--text-dim);
    border-radius: 5px;
    padding: 4px 11px;
    font-family: 'DM Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;
  }
  .btn-leave:hover { border-color: #c0392b; color: #e07070; }

  /* ─── MAIN CONTENT AREA ─── */
  .center-area {
    flex: 1;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 14px 16px 10px;
    min-height: 0;
    box-sizing: border-box;
  }

  .center-area > * {
    margin-left: auto;
    margin-right: auto;
  }

  /* ─── THE TABLE ─── */
  .table-container {
    position: relative;
    /* responsive: takes up as much space as fits without crowding cards */
    width: min(520px, 85vw);
    aspect-ratio: 1 / 0.72;
    flex-shrink: 0;
  }

  /* felt oval */
  .poker-table {
    position: absolute;
    inset: 8%;
    border-radius: 50%;
    background: radial-gradient(ellipse at 38% 32%, #286846 0%, var(--table-surface) 50%, #152e1e 100%);
    border: 7px solid var(--table-rim);
    box-shadow:
      0 0 0 4px #1a3020,
      0 0 0 11px #243c2c,
      0 0 0 13px #1a3020,
      0 22px 55px rgba(0,0,0,0.75),
      inset 0 2px 10px rgba(255,255,255,0.04);
  }

  /* center display: avg or hint */
  .table-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .table-avg-label {
    font-size: 0.52rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    margin-bottom: 4px;
  }

  .table-avg-val {
    font-family: 'Playfair Display', serif;
    font-size: 3rem;
    color: var(--gold);
    line-height: 1;
    animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes popIn {
    from { transform: scale(0.4); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }

  .table-hint {
    font-size: 0.58rem;
    color: rgba(255,255,255,0.18);
    letter-spacing: 1px;
  }

  /* ─── PLAYER SEATS ─── */
  .player-seat {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    width: 76px;
  }

  .seat-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: var(--felt-light);
    border: 2px solid var(--felt-border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    color: var(--gold);
    position: relative;
    transition: border-color 0.2s, box-shadow 0.2s;
    flex-shrink: 0;
  }

  .seat-avatar.has-voted {
    border-color: var(--gold);
    box-shadow: 0 0 9px rgba(201,168,76,0.3);
  }

  .seat-avatar.is-revealed {
    border-color: #4ecb71;
    box-shadow: 0 0 9px rgba(78,203,113,0.28);
  }

  /* tiny face-up card shown on reveal */
  .mini-card {
    position: absolute;
    top: -18px;
    right: -14px;
    width: 24px;
    height: 32px;
    background: var(--card-bg);
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Playfair Display', serif;
    font-size: 0.68rem;
    color: #1a1a1a;
    box-shadow: 0 3px 8px rgba(0,0,0,0.55);
    animation: cardFlip 0.3s ease;
  }

  @keyframes cardFlip {
    from { transform: rotateY(90deg) scale(0.8); opacity: 0; }
    to   { transform: rotateY(0deg) scale(1); opacity: 1; }
  }

  /* face-down card (voted but not revealed) */
  .mini-card-back {
    position: absolute;
    top: -18px;
    right: -14px;
    width: 24px;
    height: 32px;
    background: #265c3a;
    border: 1px solid #3a7a50;
    border-radius: 3px;
    box-shadow: 0 3px 8px rgba(0,0,0,0.55);
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 3px,
      rgba(255,255,255,0.04) 3px,
      rgba(255,255,255,0.04) 4px
    );
    animation: cardPop 0.2s ease;
  }

  @keyframes cardPop {
    from { transform: scale(0) rotate(-20deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg); opacity: 1; }
  }

  .seat-name {
    font-size: 0.58rem;
    color: rgba(245,240,232,0.85);
    text-align: center;
    white-space: nowrap;
    max-width: 72px;
    overflow: hidden;
    text-overflow: ellipsis;
    background: rgba(0,0,0,0.5);
    padding: 2px 6px;
    border-radius: 3px;
    letter-spacing: 0.2px;
  }

  .seat-name.is-me {
    color: var(--gold-light);
    border: 1px solid rgba(201,168,76,0.2);
  }

  /* ─── CARD PICKER ─── */
  .cards-area {
    width: 100%;
    max-width: 580px;
    flex-shrink: 0;
  }

  .cards-label {
    font-size: 0.58rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 9px;
    text-align: center;
  }

  .cards-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 7px;
  }

  .p-card {
    width: 46px;
    height: 65px;
    background: var(--card-bg);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Playfair Display', serif;
    font-size: 1.05rem;
    color: #1a1a1a;
    cursor: pointer;
    position: relative;
    transition: transform 0.14s, box-shadow 0.14s;
    box-shadow: 0 3px 10px rgba(0,0,0,0.5);
    user-select: none;
    border: 2px solid transparent;
  }

  .p-card::before {
    content: attr(data-v);
    position: absolute;
    top: 3px; left: 5px;
    font-size: 0.48rem;
    color: #888;
    font-family: 'DM Mono', monospace;
  }

  .p-card:hover {
    transform: translateY(-7px);
    box-shadow: 0 10px 22px rgba(0,0,0,0.6);
  }

  .p-card.sel {
    border-color: var(--gold);
    transform: translateY(-10px);
    box-shadow: 0 12px 26px rgba(201,168,76,0.38);
  }

  /* ─── ACTION BUTTONS ─── */
  .actions-row {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-shrink: 0;
  }

  .btn-reveal {
    padding: 10px 26px;
    background: transparent;
    border: 1px solid var(--gold);
    color: var(--gold);
    border-radius: 6px;
    font-family: 'DM Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.14s, color 0.14s;
  }

  .btn-reveal:hover { background: var(--gold); color: #111; }

  .btn-new-round {
    padding: 10px 26px;
    background: var(--gold);
    color: #111;
    border: none;
    border-radius: 6px;
    font-family: 'DM Mono', monospace;
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.14s;
  }

  .btn-new-round:hover { background: var(--gold-light); }
`;

export default function App() {
  const [screen, setScreen] = useState("login");
  const [username, setUsername] = useState("");
  const [groupId, setGroupId] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [connected, setConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [myVote, setMyVote] = useState(null);

  const wsRef = useRef(null);
  const meRef = useRef({ username: "", groupId: "" });

  useEffect(() => {
    const tag = document.createElement("style");
    tag.textContent = css;
    document.head.appendChild(tag);
    return () => document.head.removeChild(tag);
  }, []);

  const connectWS = useCallback((user, group) => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(
        JSON.stringify({ type: "register", groupId: group, username: user }),
      );
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "room_state") setRoomState(msg.data);
      if (msg.type === "error") console.warn("WS:", msg.message);
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
  }, []);

  async function handleJoin(e) {
    e.preventDefault();
    const u = username.trim();
    const g = groupId.trim().toUpperCase();
    if (!u || !g) return;

    setLoading(true);
    setLoginErr("");

    if (g !== "ACEPLAN") {
      setLoginErr("Invalid Room ID. Ask your team for the correct one.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: g, username: u }),
      });
      const data = await res.json();
      if (!data.ok) {
        setLoginErr(data.error);
        setLoading(false);
        return;
      }
      meRef.current = { username: u, groupId: g };
      connectWS(u, g);
      setScreen("table");
    } catch {
      setLoginErr("Can't reach server. Is it running on :3001?");
    } finally {
      setLoading(false);
    }
  }

  function sendVote(card) {
    if (!wsRef.current || roomState?.revealed) return;
    const next = myVote === card ? null : card;
    setMyVote(next);
    wsRef.current.send(JSON.stringify({ type: "vote", vote: next }));
  }

  function reveal() {
    wsRef.current?.send(JSON.stringify({ type: "reveal" }));
  }

  function reset() {
    setMyVote(null);
    wsRef.current?.send(JSON.stringify({ type: "reset" }));
  }

  function leave() {
    wsRef.current?.close();
    setScreen("login");
    setRoomState(null);
    setMyVote(null);
  }

  // ── LOGIN ───────────────────────────────
  if (screen === "login") {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <h1>Planning Poker</h1>
          <p className="login-subtitle">Sprint Estimation · Team Tool</p>
          <form onSubmit={handleJoin}>
            <div className="field">
              <label>Your Name</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Rudra"
                autoFocus
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label>Room ID</label>
              <input
                value={groupId}
                onChange={(e) => setGroupId(e.target.value.toUpperCase())}
                placeholder="e.g. Ask Team for the Room ID"
                autoComplete="off"
              />
            </div>
            <button
              className="btn-join"
              type="submit"
              disabled={loading || !username.trim() || !groupId.trim()}
            >
              {loading ? "joining..." : "join room →"}
            </button>
            {loginErr && <p className="login-err">{loginErr}</p>}
          </form>
        </div>
      </div>
    );
  }

  // ── TABLE ───────────────────────────────
  const me = meRef.current;
  const users = roomState?.users || [];
  const revealed = roomState?.revealed || false;
  const allVotes = revealed ? users.map((u) => u.vote).filter(Boolean) : [];
  const average = avg(allVotes);
  const positions = getCirclePositions(users.length);

  return (
    <div className="game-wrap">
      {/* top bar */}
      <div className="topbar">
        <div className="topbar-left">
          <span className="room-label">room · {me.groupId}</span>
          <span className="room-title">Planning Poker</span>
        </div>
        <div className="topbar-right">
          <span className="conn-indicator">
            <span className={`conn-dot ${connected ? "on" : "off"}`} />
            {connected ? "live" : "offline"}
          </span>
          <span className="me-pill">{me.username}</span>
          <button className="btn-leave" onClick={leave}>
            leave
          </button>
        </div>
      </div>

      <div className="center-area">
        {/* ── poker table ── */}
        <div className="table-container">
          <div className="poker-table" />

          {/* center: avg or waiting text */}
          <div className="table-center">
            {revealed && average !== null ? (
              <>
                <div className="table-avg-label">average</div>
                <div className="table-avg-val">{average}</div>
              </>
            ) : (
              <div className="table-hint">
                {users.length === 0 ? "waiting for players" : "cards face down"}
              </div>
            )}
          </div>

          {/* players around the ellipse */}
          {users.map((u, i) => {
            const pos = positions[i];
            const isMe = u.name === me.username;

            const avatarCls = [
              "seat-avatar",
              revealed ? "is-revealed" : "",
              u.hasVoted && !revealed ? "has-voted" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={u.name}
                className="player-seat"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <div className={avatarCls}>
                  {u.name[0].toUpperCase()}

                  {revealed && u.vote ? (
                    <div className="mini-card">{u.vote}</div>
                  ) : u.hasVoted && !revealed ? (
                    <div className="mini-card-back" />
                  ) : null}
                </div>

                <div className={`seat-name ${isMe ? "is-me" : ""}`}>
                  {isMe ? `${u.name} ★` : u.name}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── card picker ── */}
        {!revealed && (
          <div className="cards-area">
            <div className="cards-label">pick your estimate</div>
            <div className="cards-row">
              {CARDS.map((c) => (
                <div
                  key={c}
                  data-v={c}
                  className={`p-card ${myVote === c ? "sel" : ""}`}
                  onClick={() => sendVote(c)}
                >
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── action buttons ── */}
        <div className="actions-row">
          {!revealed ? (
            <button className="btn-reveal" onClick={reveal}>
              reveal cards
            </button>
          ) : (
            <button className="btn-new-round" onClick={reset}>
              new round
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
