// In-game voice: everyone at an online table (players and watchers) is in voice from the moment they arrive and hears
// the others; each person switches their own microphone on and off whenever they like. It runs as WebRTC media calls
// on the same PeerJS link the game already uses (and the same TURN relays, see /api/ice), a full mesh: each pair of
// people shares one call. The host keeps the list of who is at the table and passes it to everyone; of each pair, the
// one whose peer id sorts first places the call, so no pair calls twice.
// Until a microphone is switched on, each call carries a silent track; switching on swaps the real microphone into
// every call (no new call), and switching off swaps the silence back and releases the microphone.
// No audio touches our server (only the relay, when a direct route between two browsers fails).

export function createVoice({ myId, onChange }) {
  let joined = false, mic = null, hearing = true, list = [], ctx = null, silent = null;
  const calls = new Map();     // peer id -> media call
  const audios = new Map();    // peer id -> <audio>
  const meters = new Map();    // peer id ("me" for my own microphone) -> analyser
  const speaking = new Set();
  let timer = 0;

  const audioCtx = () => { try { ctx ||= new (window.AudioContext || window.webkitAudioContext)(); } catch { /* none */ } return ctx; };
  // a silent track to call with while my microphone is off
  const silence = () => {
    if (silent) return silent;
    const c = audioCtx();
    if (c) { const dest = c.createMediaStreamDestination(); const g = c.createGain(); g.gain.value = 0; c.createOscillator().connect(g); g.connect(dest); silent = dest.stream; }
    else silent = new MediaStream();
    return silent;
  };
  const outgoing = () => mic || silence();
  const outTrack = () => outgoing().getAudioTracks()[0] || null;
  const meter = (id, s) => {
    const c = audioCtx();
    if (!c) return;
    try { const an = c.createAnalyser(); an.fftSize = 512; c.createMediaStreamSource(s).connect(an); meters.set(id, an); } catch { /* no level meter */ }
  };
  const listen = () => {
    if (timer) return;
    const buf = new Uint8Array(512);
    timer = setInterval(() => {
      let changedAny = false;
      for (const [id, an] of meters) {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += (v - 128) * (v - 128);
        const on = Math.sqrt(sum / buf.length) > 4;
        if (on !== speaking.has(id)) { on ? speaking.add(id) : speaking.delete(id); changedAny = true; }
      }
      if (changedAny) onChange?.();
    }, 160);
  };
  const swapTrack = () => {   // put my current outgoing track (microphone or silence) into every call
    const t = outTrack();
    for (const call of calls.values()) {
      for (const s of call.peerConnection?.getSenders?.() || []) if (!s.track || s.track.kind === "audio") s.replaceTrack(t).catch(() => {});
    }
  };
  const hangUp = id => {
    try { calls.get(id)?.close(); } catch { /* */ }
    calls.delete(id);
    const a = audios.get(id); if (a) { a.srcObject = null; a.remove(); audios.delete(id); }
    meters.delete(id); speaking.delete(id);
  };
  const attach = (id, call) => {
    calls.set(id, call);
    call.on("stream", s => {
      let a = audios.get(id);
      if (!a) { a = document.createElement("audio"); a.autoplay = true; a.dataset.voice = id; a.style.display = "none"; document.body.appendChild(a); audios.set(id, a); }
      a.srcObject = s; a.muted = !hearing;
      a.play?.().catch(() => { /* plays once the page has been touched */ });
      meter(id, s); listen();
      onChange?.();
    });
    call.on("close", () => { if (calls.get(id) === call) hangUp(id); onChange?.(); });
    call.on("error", () => { if (calls.get(id) === call) hangUp(id); onChange?.(); });
  };

  return {
    get joined() { return joined; },
    get micOn() { return !!mic; },
    get hearing() { return hearing; },
    speaking: id => speaking.has(id === myId() ? "me" : id),
    members: () => list,
    // arrive in voice (listening, microphone off); called when entering an online table
    join() { joined = true; silence(); listen(); onChange?.(); },
    // switch my microphone on (the browser asks for permission the first time); false if it is not allowed
    async micStart() {
      if (mic) return true;
      try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false }); }
      catch { return false; }
      audioCtx()?.resume?.();
      meter("me", mic); listen(); swapTrack();
      onChange?.();
      return true;
    },
    micStop() {
      if (!mic) return;
      const old = mic; mic = null;
      swapTrack();
      old.getTracks().forEach(t => t.stop());   // releases the microphone (the browser's mic light goes off)
      meters.delete("me"); speaking.delete("me");
      onChange?.();
    },
    // hear the others or not
    setHearing(on) { hearing = !!on; for (const a of audios.values()) a.muted = !hearing; onChange?.(); },
    // leave voice altogether (leaving the table)
    stop() {
      for (const id of [...calls.keys()]) hangUp(id);
      mic?.getTracks().forEach(t => t.stop()); mic = null; joined = false;
      clearInterval(timer); timer = 0; speaking.clear(); meters.clear();
      onChange?.();
    },
    // the host's list of who is at the table: place the calls this side owes, hang up on anyone who left
    update(next, peer) {
      list = next || [];
      const me = myId();
      const ids = new Set(list.map(m => m.id));
      for (const id of [...calls.keys()]) if (!ids.has(id) || !joined) hangUp(id);
      if (joined && peer && ids.has(me)) for (const m of list) {
        if (m.id === me || calls.has(m.id) || !(me < m.id)) continue;
        try { attach(m.id, peer.call(m.id, outgoing(), { metadata: { voice: 1 } })); } catch { /* the other side is gone */ }
      }
      onChange?.();
    },
    // someone at the table calls me
    incoming(call) {
      if (!joined || call.metadata?.voice !== 1) { try { call.close(); } catch { /* */ } return; }
      hangUp(call.peer);
      call.answer(outgoing());
      attach(call.peer, call);
    },
  };
}
