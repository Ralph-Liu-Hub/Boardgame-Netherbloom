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

// A restored game keeps the seat it had: its browser id comes back with it.
export function setClientId(id) { try { if (id) sessionStorage.setItem("nb-client", id); } catch { /* storage blocked */ } }

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
// The table is only findable while this page holds its line to the matchmaking server. A phone that switches
// to another app (to send the code, say) can lose that line, so the host keeps trying to get it back, and tries
// again at once when the page is shown or the network returns. handlers.away() reports the table unfindable;
// handlers.open() fires again when it is back.
export function host(code, handlers) {
  let peer = null, closed = false, timer = 0;
  const conns = new Map();   // peer connection id -> conn
  const kick = () => {
    clearTimeout(timer);
    if (closed || !peer || peer.destroyed || !peer.disconnected) return;
    try { peer.reconnect(); } catch { /* closed */ }
  };
  const onShow = () => { if (document.visibilityState === "visible") kick(); };
  document.addEventListener("visibilitychange", onShow);
  window.addEventListener("online", kick);
  peerOpts().then(opts => {
    if (closed) return;
    peer = new window.Peer(PREFIX + code, opts);
    peer.on("open", () => handlers.open?.());
    peer.on("error", e => handlers.error?.(e));
    peer.on("disconnected", () => {
      if (closed) return;
      handlers.away?.();
      clearTimeout(timer);
      timer = setTimeout(kick, 2000);
    });
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
    close() {
      closed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("online", kick);
      peer?.destroy();
    },
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
