/**
 * v19.2.2 Offline-First Pocket Radio Engine.
 * Pure, testable logic for content-addressed episode matching, versioned bookmarks,
 * real sentence-level rewind, moment bookmarks, commute queue, raw MP3 ("我的音频")
 * deduplication/management, honest listening coverage tracking, and guarded 40s preload.
 */

export const RADIO_SOURCE_LABELS = Object.freeze({
  original_audio: '节目原声',
  kokoro_offline: 'Kokoro 合成朗读',
  cloud_tts: '云端合成',
  device_tts: '设备朗读'
});

export function resolveRadioSourceLabel({ channel = '', fromOfflinePack = false, engine = '', isDeviceTts = false } = {}) {
  if (channel === 'my_audio') return RADIO_SOURCE_LABELS.original_audio;
  if (fromOfflinePack || /kokoro|onnxruntime|af_heart/i.test(String(engine || ''))) {
    return RADIO_SOURCE_LABELS.kokoro_offline;
  }
  if (isDeviceTts) return RADIO_SOURCE_LABELS.device_tts;
  return RADIO_SOURCE_LABELS.cloud_tts;
}

/**
 * Content-addressed bookmark key so shifting channel order never mis-maps
 * an old bookmark or old audio file onto a different episode.
 */
export function episodeBookmarkKey(episodeId = '', contentHash = '') {
  const id = String(episodeId || '').trim();
  const hash = String(contentHash || '').trim();
  if (!id && !hash) return '';
  return hash ? `${id}::${hash.slice(0, 16)}` : id;
}

export function resolveVersionedBookmark(bookmarks = {}, episodeId = '', contentHash = '') {
  if (!bookmarks || typeof bookmarks !== 'object') return null;
  const key = episodeBookmarkKey(episodeId, contentHash);
  if (!key) return null;
  const rec = bookmarks[key];
  if (!rec || !Number.isFinite(Number(rec.positionSec))) return null;
  if (contentHash && rec.contentHash && rec.contentHash !== contentHash) return null;
  return {
    positionSec: Math.max(0, Number(rec.positionSec)),
    durationSec: Number.isFinite(Number(rec.durationSec)) ? Number(rec.durationSec) : 0,
    contentHash: rec.contentHash || contentHash,
    updatedAt: rec.updatedAt || null
  };
}

/**
 * Sentence-level rewind ("再听这句").
 * Only uses REAL measured segment timestamps (startSec/endSec); never fabricates
 * alignment by dividing by character count. Falls back explicitly to "退 5 秒".
 */
export function findSentenceStartForTime(segments = [], currentTimeSec = 0, { lastTapAtMs = 0, nowMs = Date.now(), doubleTapWindowMs = 2600 } = {}) {
  const cur = Math.max(0, Number(currentTimeSec) || 0);
  const valid = Array.isArray(segments)
    ? segments.filter(s => s && Number.isFinite(Number(s.startSec)) && Number.isFinite(Number(s.endSec)) && Number(s.endSec) > Number(s.startSec))
    : [];
  if (!valid.length) {
    return {
      mode: 'fallback_5s',
      targetSec: Math.max(0, Number((cur - 5).toFixed(2))),
      segmentIndex: -1,
      text: '',
      label: '退 5 秒'
    };
  }
  let idx = valid.findIndex(s => cur >= Number(s.startSec) && cur < Number(s.endSec));
  if (idx < 0) {
    idx = cur < Number(valid[0].startSec) ? 0 : valid.length - 1;
  }
  const isDoubleTap = lastTapAtMs > 0 && (nowMs - lastTapAtMs) <= doubleTapWindowMs;
  const nearStart = (cur - Number(valid[idx].startSec)) <= 0.85;
  const targetIdx = (isDoubleTap || nearStart) && idx > 0 ? idx - 1 : idx;
  const seg = valid[targetIdx];
  return {
    mode: 'sentence',
    targetSec: Math.max(0, Number(Number(seg.startSec).toFixed(2))),
    segmentIndex: targetIdx,
    text: String(seg.text || ''),
    label: '再听这句'
  };
}

export function searchEpisodeSegments(segments = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q || !Array.isArray(segments)) return [];
  const matches = [];
  segments.forEach((seg, idx) => {
    const text = String(seg?.text || '');
    if (text.toLowerCase().includes(q)) {
      matches.push({
        index: idx,
        startSec: Number.isFinite(Number(seg.startSec)) ? Number(seg.startSec) : null,
        endSec: Number.isFinite(Number(seg.endSec)) ? Number(seg.endSec) : null,
        text
      });
    }
  });
  return matches;
}

export function createRadioMoment({ channel = '', episodeId = '', contentHash = '', title = '', timeSec = 0, sentenceText = '', sourceLabel = '' } = {}) {
  const t = Math.max(0, Number(timeSec) || 0);
  const resumeAtSec = Math.max(0, Number((t - 3).toFixed(2)));
  return {
    id: `moment:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`,
    channel: String(channel || ''),
    episodeId: String(episodeId || ''),
    contentHash: String(contentHash || ''),
    title: String(title || '收藏瞬间').trim(),
    timeSec: Number(t.toFixed(2)),
    resumeAtSec,
    sentenceText: String(sentenceText || '').trim(),
    sourceLabel: String(sourceLabel || '').trim(),
    savedAt: new Date().toISOString()
  };
}

export function mergeRadioQueue(queue = [], entry = null, { playNext = false } = {}) {
  const list = Array.isArray(queue) ? [...queue] : [];
  if (!entry || !entry.episodeId) return list;
  const key = `${entry.channel || ''}|${entry.episodeId}|${entry.startSec ?? ''}`;
  const filtered = list.filter(x => `${x.channel || ''}|${x.episodeId}|${x.startSec ?? ''}` !== key);
  const normalized = {
    id: entry.id || `q:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`,
    channel: String(entry.channel || ''),
    episodeId: String(entry.episodeId || ''),
    contentHash: String(entry.contentHash || ''),
    title: String(entry.title || '待听节目').trim(),
    startSec: Number.isFinite(Number(entry.startSec)) ? Math.max(0, Number(entry.startSec)) : 0,
    addedAt: entry.addedAt || new Date().toISOString()
  };
  return playNext ? [normalized, ...filtered] : [...filtered, normalized];
}

/**
 * Separates actual listening duration from unique covered timeline ranges.
 * Replaying a 10s sentence 10 times records actualListeningSec=100, coveredSec=10.
 * Never counts pause, buffering, synthesis wait, or seek skips.
 */
export function createEpisodeCoverageTracker() {
  let actualMs = 0;
  const ranges = [];
  function mergeRanges() {
    if (ranges.length <= 1) return;
    ranges.sort((a, b) => a[0] - b[0]);
    const out = [ranges[0]];
    for (let i = 1; i < ranges.length; i++) {
      const prev = out[out.length - 1];
      const cur = ranges[i];
      if (cur[0] <= prev[1] + 0.25) {
        prev[1] = Math.max(prev[1], cur[1]);
      } else {
        out.push(cur);
      }
    }
    ranges.length = 0;
    ranges.push(...out);
  }
  return {
    recordPlaybackStep(fromSec, toSec, wallDeltaMs) {
      const f = Number(fromSec), t = Number(toSec), w = Number(wallDeltaMs);
      if (!Number.isFinite(f) || !Number.isFinite(t) || !Number.isFinite(w)) return;
      // Reject seek jumps (> 4s in a single tick) or non-positive wall elapsed time
      if (w <= 0 || w > 5000 || t <= f || (t - f) > 4.5) return;
      actualMs += w;
      ranges.push([Math.max(0, f), Math.max(0, t)]);
      mergeRanges();
    },
    snapshot(durationSec = 0) {
      mergeRanges();
      const coveredSec = ranges.reduce((s, [a, b]) => s + Math.max(0, b - a), 0);
      const dur = Number(durationSec) || 0;
      const coveragePct = dur > 0 ? Math.min(100, Math.round((coveredSec / dur) * 100)) : 0;
      return {
        actualListeningSec: Math.round(actualMs / 1000),
        coveredSec: Number(coveredSec.toFixed(1)),
        coveragePct,
        ranges: ranges.map(([a, b]) => [Number(a.toFixed(1)), Number(b.toFixed(1))])
      };
    }
  };
}

/**
 * Guarded 40s cloud preload predicate.
 * Cloud preload defaults to OFF and only fires when every safety rule holds.
 */
export function shouldTriggerCloudPreload({
  cloudPreloadEnabled = false,
  offlineOnly = false,
  channel = '',
  isPlaying = false,
  isPaused = false,
  singleLoop = false,
  sleepDeadlineMs = 0,
  nowMs = Date.now(),
  durationSec = 0,
  currentTimeSec = 0,
  hasNextEpisode = false,
  nextAlreadyLocal = false,
  inFlight = false,
  alreadyAttempted = false
} = {}) {
  if (!cloudPreloadEnabled) return false;
  if (offlineOnly) return false;
  if (channel === 'my_audio') return false;
  if (!isPlaying || isPaused) return false;
  if (singleLoop) return false;
  if (sleepDeadlineMs > 0 && (sleepDeadlineMs - nowMs) <= 45000) return false;
  if (!Number.isFinite(durationSec) || durationSec <= 20) return false;
  const remaining = durationSec - (Number(currentTimeSec) || 0);
  if (remaining > 40 || remaining < 0) return false;
  if (!hasNextEpisode || nextAlreadyLocal || inFlight || alreadyAttempted) return false;
  return true;
}

/**
 * Raw MP3 direct import planner for "我的音频".
 * - Same content hash -> skip_duplicate (never duplicates)
 * - Same title/filename with DIFFERENT content hash -> disambiguate title, never overwrite
 */
export function planRawAudioImport(existingTracks = [], incoming = {}) {
  const list = Array.isArray(existingTracks) ? existingTracks : [];
  const sha = String(incoming.audioSha256 || '').trim();
  if (!sha) throw Error('缺少音频内容校验哈希。');
  const dup = list.find(t => t && t.audioSha256 === sha);
  if (dup) {
    return { action: 'skip_duplicate', existing: dup };
  }
  const rawName = String(incoming.title || incoming.filename || '未命名音频').trim().replace(/\.(mp3|m4a|aac|wav)$/i, '').trim() || '未命名音频';
  const existingTitles = new Set(list.map(t => String(t?.title || '').trim().toLowerCase()));
  let finalTitle = rawName;
  if (existingTitles.has(finalTitle.toLowerCase())) {
    let n = 2;
    while (existingTitles.has(`${rawName} (${n})`.toLowerCase())) n++;
    finalTitle = `${rawName} (${n})`;
  }
  const track = {
    id: `myaudio:${sha.slice(0, 16)}`,
    audioSha256: sha,
    filename: String(incoming.filename || `${finalTitle}.mp3`),
    title: finalTitle,
    bytes: Math.max(0, Number(incoming.bytes) || 0),
    durationSec: Math.max(0, Number(incoming.durationSec) || 0),
    mimeType: String(incoming.mimeType || 'audio/mpeg'),
    sourceType: 'original_audio',
    importedAt: incoming.importedAt || new Date().toISOString()
  };
  return { action: 'add', track };
}

export function reorderMyAudioTrack(tracks = [], trackId = '', direction = 'up') {
  const list = Array.isArray(tracks) ? [...tracks] : [];
  const idx = list.findIndex(t => t && t.id === trackId);
  if (idx < 0) return list;
  const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (nextIdx < 0 || nextIdx >= list.length) return list;
  const [item] = list.splice(idx, 1);
  list.splice(nextIdx, 0, item);
  return list;
}

export function renameMyAudioTrack(tracks = [], trackId = '', newTitle = '') {
  const clean = String(newTitle || '').trim();
  if (!clean) return Array.isArray(tracks) ? [...tracks] : [];
  return (Array.isArray(tracks) ? tracks : []).map(t => (t && t.id === trackId ? { ...t, title: clean } : t));
}

export function formatDurationZh(totalSeconds = 0) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r} 秒`;
  return r > 0 ? `${m} 分 ${String(r).padStart(2, '0')} 秒` : `${m} 分钟`;
}

export function formatBytesHuman(bytes = 0) {
  const b = Math.max(0, Number(bytes) || 0);
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${Math.round(b / 1024)} KB`;
  return `${b} B`;
}

export function formatRadioImportSummary({ importedCount = 0, skippedCount = 0, totalDurationSec = 0, totalBytes = 0, unit = '集' } = {}) {
  const parts = [];
  if (importedCount > 0) parts.push(`${importedCount} ${unit}可离线播放`);
  if (skippedCount > 0) parts.push(`已跳过 ${skippedCount} ${unit}重复内容`);
  if (totalDurationSec > 0) parts.push(`共 ${formatDurationZh(totalDurationSec)}`);
  if (totalBytes > 0) parts.push(`占用 ${formatBytesHuman(totalBytes)}`);
  return parts.join('，') || '未导入新音频';
}
