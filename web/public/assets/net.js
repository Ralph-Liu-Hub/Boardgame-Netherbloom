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

// The ICE servers come from /api/ice: STUN, plus TURN relays when the deployment has them configured.
let iceCache = null;
async function peerOpts() {
  if (!iceCache) {
    try {
      const r = await fetch("/api/ice", { cache: "no-store" });
      iceCache = r.ok ? await r.json() : null;
    } catch { iceCache = null; }
  }
  const iceServers = iceCache?.iceServers?.length ? iceCache.iceServers : [{ urls: "stun:stun.l.google.com:19302" }];
  return { debug: 0, config: { iceServers } };
}
export const hasRelay = () => !!iceCache?.relay;

// ---------------------------------------------------------------- host
export function host(code, handlers) {
  let peer = null, closed = false;
  const conns = new Map();   // peer connection id -> conn
  peerOpts().then(opts => {
    if (closed) return;
    peer = new window.Peer(PREFIX + code, opts);
    peer.on("open", () => handlers.open?.());
    peer.on("error", e => handlers.error?.(e));
    peer.on("disconnected", () => { try { peer.reconnect(); } catch { /* closed */ } });
    peer.on("connection", conn => {
      conn.on("open", () => conns.set(conn.connectionId, conn));
      conn.on("data", msg => handlers.message?.(conn.connectionId, msg));
      const gone = () => { if (conns.delete(conn.connectionId)) handlers.leave?.(conn.connectionId); };
      conn.on("close", gone);
      conn.on("error", gone);
      // a link that never opens (no route between the two networks) is reported to the host too
      conn.on("iceStateChanged", st => { if (st === "failed") handlers.error?.({ type: "negotiation-failed" }); });
    });
  });
  return {
    send(id, msg) { const c = conns.get(id); if (c && c.open) c.send(msg); },
    broadcast(msg, except) { for (const [id, c] of conns) if (id !== except && c.open) c.send(msg); },
    close() { closed = true; peer?.destroy(); },
  };
}

// ---------------------------------------------------------------- guest
export function join(code, handlers) {
  let peer = null, conn = null, closed = false;
  peerOpts().then(opts => {
    if (closed) return;
    peer = new window.Peer(opts);
    peer.on("open", () => {
      conn = peer.connect(PREFIX + code.toUpperCase(), { reliable: true });
      conn.on("open", () => handlers.open?.());
      conn.on("data", msg => handlers.message?.(msg));
      conn.on("close", () => handlers.close?.());
      conn.on("error", e => handlers.error?.(e));
    });
    peer.on("error", e => handlers.error?.(e));
  });
  return {
    send(msg) { if (conn && conn.open) conn.send(msg); },
    close() { closed = true; peer?.destroy(); },
  };
}
