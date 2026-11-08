// In-game voice: everyone at an online table who turns on their microphone talks to everyone else in voice, over
// WebRTC media calls on the same PeerJS link the game already uses (and the same TURN relays, see /api/ice).
// It is a full mesh: each pair of people in voice share one call. The host keeps the list of who is in voice and
// passes it to everyone; of each pair, the one whose peer id sorts first places the call, so no pair calls twice.
// No audio touches our server (only the relay, when a direct route between two browsers fails).

export function createVoice({ myId, onChange }) {
  let stream = null, muted = false, list = [], ctx = null;
  const calls = new Map();     // peer id -> media call
  const audios = new Map();    // peer id -> <audio>
  const meters = new Map();    // peer id ("me" for my own microphone) -> analyser
  const speaking = new Set();
  let timer = 0;

  const meter = (id, s) => {
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(s).connect(an);
      meters.set(id, an);
    } catch { /* no Web Audio: no speaking light */ }
  };
  const listen = () => {
    clearInterval(timer);
    const buf = new Uint8Array(512);
    timer = setInterval(() => {
      let changedAny = false;
      for (const [id, an] of meters) {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += (v - 128) * (v - 128);
        const on = Math.sqrt(sum / buf.length) > 4 && !(id === "me" && muted);
        if (on !== speaking.has(id)) { on ? speaking.add(id) : speaking.delete(id); changedAny = true; }
      }
      if (changedAny) onChange?.();
    }, 160);
  };
  const hangUp = id => {
    calls.get(id)?.close(); calls.delete(id);
    const a = audios.get(id); if (a) { a.srcObject = null; a.remove(); audios.delete(id); }
    meters.delete(id); speaking.delete(id);
  };
  const attach = (id, call) => {
    calls.set(id, call);
    call.on("stream", s => {
      let a = audios.get(id);
      if (!a) { a = document.createElement("audio"); a.autoplay = true; a.dataset.voice = id; a.style.display = "none"; document.body.appendChild(a); audios.set(id, a); }
      a.srcObject = s;
      a.play?.().catch(() => { /* played once the page has been touched */ });
      meter(id, s);
      onChange?.();
    });
    call.on("close", () => { if (calls.get(id) === call) hangUp(id); onChange?.(); });
    call.on("error", () => { if (calls.get(id) === call) hangUp(id); onChange?.(); });
  };

  const api = {
    get on() { return !!stream; },
    get muted() { return muted; },
    speaking: id => speaking.has(id === myId() ? "me" : id),
    members: () => list,
    // turn my microphone on: the browser asks for permission the first time
    async start() {
      if (stream) return true;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
      catch { return false; }
      muted = false;
      meter("me", stream); listen();
      return true;
    },
    stop() {
      for (const id of [...calls.keys()]) hangUp(id);
      stream?.getTracks().forEach(t => t.stop()); stream = null;
      meters.delete("me"); speaking.delete("me");
      clearInterval(timer); timer = 0;
      onChange?.();
    },
    setMuted(m) { muted = !!m; stream?.getAudioTracks().forEach(t => { t.enabled = !muted; }); onChange?.(); },
    // the host's list of who is in voice: place the calls this side owes, hang up on anyone who left
    update(next, peer) {
      list = next || [];
      const me = myId();
      const ids = new Set(list.map(m => m.id));
      for (const id of [...calls.keys()]) if (!ids.has(id) || !stream) hangUp(id);
      if (stream && peer && ids.has(me)) for (const m of list) {
        if (m.id === me || calls.has(m.id) || !(me < m.id)) continue;
        try { attach(m.id, peer.call(m.id, stream, { metadata: { voice: 1 } })); } catch { /* the other side is gone */ }
      }
      onChange?.();
    },
    // someone in voice calls me
    incoming(call) {
      if (!stream || call.metadata?.voice !== 1) { try { call.close(); } catch { /* */ } return; }
      hangUp(call.peer);
      call.answer(stream);
      attach(call.peer, call);
    },
    connected: () => [...audios.keys()],
  };
  return api;
}
