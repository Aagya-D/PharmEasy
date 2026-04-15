/**
 * Audio chimes used by the notification system.
 */

let _audioCtxRef = null;
let _userHasInteracted = false;

if (typeof window !== "undefined") {
  const _unlock = () => {
    _userHasInteracted = true;
    if (_audioCtxRef && _audioCtxRef.state === "suspended") {
      _audioCtxRef.resume().catch(() => {});
    }
    window.removeEventListener("click", _unlock, true);
    window.removeEventListener("keydown", _unlock, true);
    window.removeEventListener("touchstart", _unlock, true);
    window.removeEventListener("pointerdown", _unlock, true);
  };
  window.addEventListener("click", _unlock, true);
  window.addEventListener("keydown", _unlock, true);
  window.addEventListener("touchstart", _unlock, true);
  window.addEventListener("pointerdown", _unlock, true);
}

function getAudioContext() {
  try {
    if (!_audioCtxRef || _audioCtxRef.state === "closed") {
      _audioCtxRef = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (_audioCtxRef.state === "suspended") {
      _audioCtxRef.resume().catch(() => {});
    }
    return _audioCtxRef;
  } catch {
    return null;
  }
}

// Play the standard notification ping.
function playStandardPing() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // AudioContext unavailable or blocked
  }
}

// Play the urgent notification chime.
function playUrgentChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    [900, 800, 700].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  } catch {
    // AudioContext unavailable or blocked
  }
}

function playAdminChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const t = ctx.currentTime + index * 0.11;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.start(t);
      osc.stop(t + 0.24);
    });
  } catch {
    // AudioContext unavailable or blocked
  }
}

/**
 * Play a notification sound appropriate for the alert type.
 *
 * @param {'standard'|'cms'|'urgent'|'sos'|'message'|'admin'} type
 */
export function playNotificationSound(type = "standard") {
  // If the user hasn't interacted yet, queue the play for the next microtask
  // so it triggers after the gesture handler runs on real events.
  const play = () => {
    switch (type) {
      case "urgent":
      case "sos":
      case "message":
        playUrgentChime();
        break;
      case "admin":
        playAdminChime();
        break;
      case "standard":
      case "cms":
      default:
        playStandardPing();
        break;
    }
  };

  if (_userHasInteracted) {
    play();
  } else {
    // Queue for after first interaction — stores only the latest queued call
    const _deferred = () => {
      play();
      window.removeEventListener("click", _deferred, true);
      window.removeEventListener("keydown", _deferred, true);
      window.removeEventListener("touchstart", _deferred, true);
      window.removeEventListener("pointerdown", _deferred, true);
    };
    window.addEventListener("click", _deferred, true);
    window.addEventListener("keydown", _deferred, true);
    window.addEventListener("touchstart", _deferred, true);
    window.addEventListener("pointerdown", _deferred, true);
  }
}

export default playNotificationSound;
