/**
 * Multimodal Immersion & Audio Mastery Engine (12.0.0)
 * - AirPods / iPhone Lock-Screen MediaSession API integration
 * - Precision A-B Loop State Manager for intensive listening & shadowing
 * - SpeechRecognition live dictation draft helper (strictly input assist, NEVER pronunciation scoring)
 */

const cleanImm = value => String(value ?? '').replace(/\r/g, '').trim();

/**
 * Registers lock-screen and AirPods media controls safely when MediaSession API is available.
 */
export function registerMediaSession({
  title = '言道修炼殿 · English Cultivation',
  artist = 'Kokoro af_heart Offline Audio',
  album = 'One-Flow Daily Journey',
  onPlay = null,
  onPause = null,
  onPrev = null,
  onNext = null,
  onSeekBackward = null,
  onSeekForward = null
} = {}) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return { supported: false };
  }
  try {
    if (typeof MediaMetadata !== 'undefined') {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cleanImm(title) || '言道修炼殿',
        artist: cleanImm(artist) || 'English Cultivation',
        album: cleanImm(album) || 'Daily Journey'
      });
    }
    const bind = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, typeof handler === 'function' ? handler : null);
      } catch {}
    };
    bind('play', onPlay);
    bind('pause', onPause);
    bind('previoustrack', onPrev);
    bind('nexttrack', onNext);
    bind('seekbackward', onSeekBackward);
    bind('seekforward', onSeekForward);
    return { supported: true, title };
  } catch {
    return { supported: false };
  }
}

/**
 * Pure state machine for A-B intensive listening loop bounds.
 */
export function createAbLoopState() {
  return { a: null, b: null, active: false };
}

export function setAbLoopPoint(state = createAbLoopState(), point = 'a', currentSeconds = 0, durationSeconds = 0) {
  const cur = Number(currentSeconds);
  const dur = Number(durationSeconds);
  if (!Number.isFinite(cur) || cur < 0) return { ...state };
  const clamped = Number.isFinite(dur) && dur > 0 ? Math.min(dur, cur) : cur;
  const next = { ...state };
  if (point === 'a') {
    next.a = Number(clamped.toFixed(2));
    if (next.b !== null && next.b <= next.a + 0.25) next.b = null;
    next.active = Boolean(next.a !== null && next.b !== null && next.b > next.a + 0.25);
  } else if (point === 'b') {
    if (next.a === null) next.a = 0;
    if (clamped > next.a + 0.25) {
      next.b = Number(clamped.toFixed(2));
      next.active = true;
    }
  } else if (point === 'clear') {
    return createAbLoopState();
  }
  return next;
}

export function shouldLoopBack(state, currentSeconds) {
  if (!state || !state.active || state.a === null || state.b === null) return false;
  return Number(currentSeconds) >= Number(state.b);
}

/**
 * Detects browser Web Speech Recognition support for zero-cost English dictation drafting.
 * Strictly an input convenience helper — NEVER claims to score pronunciation or fluency.
 */
export function dictationCapability() {
  if (typeof window === 'undefined') return { supported: false, Ctor: null };
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  return { supported: Boolean(Ctor), Ctor };
}

export function createDictationController({ lang = 'en-US', onTranscript = null, onEnd = null, onError = null } = {}) {
  const cap = dictationCapability();
  if (!cap.supported) {
    return {
      supported: false,
      start: () => false,
      stop: () => {}
    };
  }
  const recognition = new cap.Ctor();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;

  let finalText = '';
  let running = false;

  recognition.onresult = event => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const piece = event.results[i][0]?.transcript || '';
      if (event.results[i].isFinal) finalText += (finalText ? ' ' : '') + piece.trim();
      else interim += piece;
    }
    const combined = `${finalText}${interim ? (finalText ? ' ' : '') + interim.trim() : ''}`.trim();
    if (typeof onTranscript === 'function') onTranscript(combined, { finalText, interim });
  };
  recognition.onerror = err => {
    running = false;
    if (typeof onError === 'function') onError(err?.error || 'speech_recognition_error');
  };
  recognition.onend = () => {
    running = false;
    if (typeof onEnd === 'function') onEnd(finalText);
  };

  return {
    supported: true,
    isRunning: () => running,
    start(seedText = '') {
      finalText = cleanImm(seedText);
      running = true;
      try {
        recognition.start();
        return true;
      } catch {
        running = false;
        return false;
      }
    },
    stop() {
      running = false;
      try { recognition.stop(); } catch {}
    }
  };
}
