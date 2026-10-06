// Phân tích âm thanh chạy hoàn toàn trên trình duyệt (không server):
//  - analyzeEnvelope: đo âm lượng theo từng cửa sổ 50ms
//  - suggestHighlights: AI chấm điểm và đề xuất các đoạn hay nhất
//  - estimateBpm: dò nhịp nhạc để đồng bộ beat
// Kèm thư viện nhạc nền (file lưu trong IndexedDB) và đọc/ghi phụ đề SRT.

import { idbDel, idbGet, idbSet } from "./db";
import { uid, type Caption } from "./projects";

export interface Envelope {
  /** Số giây mỗi phần tử. */
  step: number;
  /** Âm lượng (dBFS) từng cửa sổ. */
  db: Float32Array;
  duration: number;
}

const ANALYSIS_RATE = 8000;
const WINDOW_SEC = 0.05;

/** Giải mã âm thanh ở tần số lấy mẫu thấp (tiết kiệm RAM) rồi tính envelope. */
export async function analyzeEnvelope(blob: Blob): Promise<Envelope> {
  const ctx = new OfflineAudioContext(1, 1, ANALYSIS_RATE);
  let audio: AudioBuffer;
  try {
    audio = await ctx.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw new Error("Không giải mã được âm thanh của file này.");
  }
  const size = Math.max(1, Math.round(audio.sampleRate * WINDOW_SEC));
  const count = Math.ceil(audio.length / size);
  const db = new Float32Array(count);
  const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
    audio.getChannelData(i),
  );
  for (let w = 0; w < count; w++) {
    const from = w * size;
    const to = Math.min(audio.length, from + size);
    let sum = 0;
    for (const data of channels) {
      for (let i = from; i < to; i++) {
        const v = data[i] ?? 0;
        sum += v * v;
      }
    }
    const rms = Math.sqrt(sum / Math.max(1, (to - from) * channels.length));
    db[w] = rms > 0 ? 20 * Math.log10(rms) : -100;
  }
  return { step: size / audio.sampleRate, db, duration: audio.duration };
}

export interface Highlight {
  start: number;
  end: number;
  /** Điểm 0–100. */
  score: number;
}

/**
 * Chấm điểm từng cửa sổ dài `targetLength` giây trong khoảng [from, to]:
 * 50% mật độ lời nói + 30% độ lớn so với trung bình + 20% độ biến thiên (cảm xúc).
 * Ranh giới được bám vào chỗ ngắt nghỉ gần nhất để không cắt giữa câu.
 */
export function suggestHighlights(
  env: Envelope,
  opts: { from: number; to: number; targetLength: number; count: number; thresholdDb: number },
): Highlight[] {
  const { step, db } = env;
  const from = Math.max(0, opts.from);
  const to = Math.min(env.duration, opts.to);
  const span = to - from;
  if (span <= 0) return [];
  const target = Math.min(Math.max(5, opts.targetLength), span);
  if (span <= target * 1.15) return [{ start: from, end: to, score: 80 }];

  const i0 = Math.floor(from / step);
  const i1 = Math.min(db.length, Math.ceil(to / step));
  const win = Math.max(1, Math.round(target / step));
  const hop = Math.max(1, Math.round(win / 6));

  let globalSum = 0;
  for (let i = i0; i < i1; i++) globalSum += Math.max(-80, db[i] ?? -100);
  const globalMean = globalSum / Math.max(1, i1 - i0);

  const candidates: { start: number; score: number }[] = [];
  for (let s = i0; s + win <= i1; s += hop) {
    let voiced = 0;
    let sum = 0;
    let sumSq = 0;
    for (let i = s; i < s + win; i++) {
      const v = Math.max(-80, db[i] ?? -100);
      if (v >= opts.thresholdDb) voiced++;
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / win;
    const deviation = Math.sqrt(Math.max(0, sumSq / win - mean * mean));
    const density = voiced / win;
    const loudness = Math.min(1, Math.max(0, (mean - globalMean + 12) / 24));
    const dynamics = Math.min(1, deviation / 14);
    candidates.push({ start: s * step, score: density * 0.5 + loudness * 0.3 + dynamics * 0.2 });
  }
  candidates.sort((a, b) => b.score - a.score);

  // Điểm ngắt nghỉ: giữa các khoảng im ≥ 0.3s.
  const pauses: number[] = [];
  let run = -1;
  for (let i = i0; i <= i1; i++) {
    const silent = i < i1 && (db[i] ?? -100) < opts.thresholdDb;
    if (silent && run < 0) run = i;
    if (!silent && run >= 0) {
      if ((i - run) * step >= 0.3) pauses.push(((run + i) / 2) * step);
      run = -1;
    }
  }
  const snap = (t: number) => {
    let best = t;
    let bestDist = 3;
    for (const p of pauses) {
      const d = Math.abs(p - t);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  };

  const chosen: Highlight[] = [];
  for (const c of candidates) {
    if (chosen.length >= opts.count) break;
    const start = Math.min(Math.max(from, snap(c.start)), to);
    const end = Math.min(to, Math.max(start + 3, snap(c.start + target)));
    if (chosen.some((h) => start < h.end - 1 && end > h.start + 1)) continue;
    chosen.push({ start, end, score: Math.round(55 + c.score * 45) });
  }
  return chosen.sort((a, b) => a.start - b.start);
}

/** Ước lượng BPM bằng tự tương quan đường onset (70–180 BPM). */
export function estimateBpm(env: Envelope): number {
  const { db, step } = env;
  const onset = new Float32Array(db.length);
  for (let i = 1; i < db.length; i++) onset[i] = Math.max(0, (db[i] ?? 0) - (db[i - 1] ?? 0));
  const minLag = Math.max(1, Math.round(60 / 180 / step));
  const maxLag = Math.round(60 / 70 / step);
  const limit = Math.min(onset.length, Math.round(90 / step));
  let bestLag = Math.round(60 / 120 / step);
  let best = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = lag; i < limit; i++) sum += (onset[i] ?? 0) * (onset[i - lag] ?? 0);
    if (sum > best) {
      best = sum;
      bestLag = lag;
    }
  }
  return Math.round(60 / (bestLag * step));
}

// ---------------------------------------------------------------------------
// Thư viện nhạc nền
// ---------------------------------------------------------------------------

export interface MusicTrack {
  id: string;
  name: string;
  duration: number;
  createdAt: number;
}

const MUSIC_KEY = "master-clip-music-v1";
const musicBlobKey = (id: string) => `music:${id}`;

export function listMusic(): MusicTrack[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MUSIC_KEY) ?? "[]") as MusicTrack[];
    return Array.isArray(parsed) ? parsed.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

function writeMusic(list: MusicTrack[]) {
  localStorage.setItem(MUSIC_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("master-clip-music"));
}

function probeAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => resolve(0);
    audio.src = url;
  });
}

export async function addMusicFiles(files: File[]): Promise<MusicTrack[]> {
  const added: MusicTrack[] = [];
  for (const file of files) {
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)) {
      throw new Error(`"${file.name}" không phải file âm thanh.`);
    }
    const url = URL.createObjectURL(file);
    const duration = await probeAudioDuration(url);
    URL.revokeObjectURL(url);
    const track: MusicTrack = {
      id: uid(),
      name: file.name.replace(/\.[^.]+$/, ""),
      duration,
      createdAt: Date.now(),
    };
    await idbSet(musicBlobKey(track.id), file);
    added.push(track);
  }
  writeMusic([...added, ...listMusic()]);
  return added;
}

export async function deleteMusic(id: string) {
  writeMusic(listMusic().filter((t) => t.id !== id));
  await idbDel(musicBlobKey(id)).catch(() => undefined);
}

export function getMusicBlob(id: string) {
  return idbGet(musicBlobKey(id));
}

// ---------------------------------------------------------------------------
// Phụ đề SRT / VTT
// ---------------------------------------------------------------------------

function srtTime(t: number) {
  const ms = Math.max(0, Math.round(t * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
}

export function captionsToSrt(captions: Caption[]) {
  return [...captions]
    .filter((c) => c.text.trim())
    .sort((a, b) => a.start - b.start)
    .map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text.trim()}\n`)
    .join("\n");
}

function parseTimestamp(value: string) {
  const match = value.trim().match(/(?:(\d+):)?(\d+):(\d+)[,.](\d+)/);
  if (!match) return NaN;
  const [, h = "0", m = "0", s = "0", ms = "0"] = match;
  return (
    Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms.padEnd(3, "0").slice(0, 3)) / 1000
  );
}

export function parseSubtitles(text: string): Caption[] {
  const result: Caption[] = [];
  for (const block of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = block.split("\n").filter((l) => l.trim() && l.trim() !== "WEBVTT");
    const ti = lines.findIndex((l) => l.includes("-->"));
    if (ti < 0) continue;
    const [a = "", b = ""] = (lines[ti] ?? "").split("-->");
    const start = parseTimestamp(a);
    const end = parseTimestamp(b.trim().split(/\s+/)[0] ?? "");
    const body = lines
      .slice(ti + 1)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start && body) {
      result.push({ id: uid(), start, end, text: body });
    }
  }
  return result;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
}
