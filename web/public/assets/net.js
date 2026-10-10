// Online play over WebRTC data channels (PeerJS). The host's browser keeps the authoritative game;
// each player's browser plays its own turn and sends the new state to the host, who passes it on.
// No game data touches our server.

const PREFIX = "netherbloom-v1-";
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const newCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

// One id per browser tab (it survives a reload, so a dropped player gets their seat back).
export function clientId() {
  try {
    let id = sessionStorage.getItem("nb-client");
    if (!id) { id = Math.random().toString(36).slice(2, 12); sessionStorage.setItem("nb-client", id); }
    return id;
  } catch { return Math.random().toString(36).slice(2, 12); }
}

function peerOpts() {
  return { debug: 0, config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] } };
}

// ---------------------------------------------------------------- host
export function host(code, handlers) {
  const peer = new window.Peer(PREFIX + code, peerOpts());
  const conns = new Map();   // peer connection id -> conn
  peer.on("open", () => handlers.open?.());
  peer.on("error", e => handlers.error?.(e));
  peer.on("disconnected", () => { try { peer.reconnect(); } catch { /* closed */ } });
  peer.on("connection", conn => {
    conn.on("open", () => conns.set(conn.connectionId, conn));
    conn.on("data", msg => handlers.message?.(conn.connectionId, msg));
    const gone = () => { if (conns.delete(conn.connectionId)) handlers.leave?.(conn.connectionId); };
    conn.on("close", gone);
    conn.on("error", gone);
  });
  return {
    send(id, msg) { const c = conns.get(id); if (c && c.open) c.send(msg); },
    broadcast(msg, except) { for (const [id, c] of conns) if (id !== except && c.open) c.send(msg); },
    close() { peer.destroy(); },
  };
}

// ---------------------------------------------------------------- guest
export function join(code, handlers) {
  const peer = new window.Peer(peerOpts());
  let conn = null;
  peer.on("open", () => {
    conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true });
    conn.on("open", () => handlers.open?.());
    conn.on("data", msg => handlers.message?.(msg));
    conn.on("close", () => handlers.close?.());
    conn.on("error", e => handlers.error?.(e));
  });
  peer.on("error", e => handlers.error?.(e));
  return {
    send(msg) { if (conn && conn.open) conn.send(msg); },
    close() { peer.destroy(); },
  };
}
