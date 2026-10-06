// Browser-native video intelligence for Master Clip:
//  - detectSpeechSegments: find non-silent regions with Web Audio (no server)
//  - exportTimeline: render the timeline to a downloadable video file with
//    canvas + MediaRecorder (no server)

import {
  clipLayout,
  clipTimelineDuration,
  type Aspect,
  type Caption,
  type Clip,
  type Hook,
} from "./projects";

export const ASPECT_SIZE: Record<Aspect, { w: number; h: number; label: string }> = {
  "9:16": { w: 720, h: 1280, label: "Dọc 9:16" },
  "16:9": { w: 1280, h: 720, label: "Ngang 16:9" },
  "1:1": { w: 960, h: 960, label: "Vuông 1:1" },
};

// ---------------------------------------------------------------------------
// Silence detection
// ---------------------------------------------------------------------------

export interface SilenceOptions {
  /** Anything quieter than this (dB) counts as silence. */
  thresholdDb: number;
  /** Silence shorter than this is ignored. */
  minSilenceSec: number;
  /** Speech blips shorter than this are dropped. */
  minSpeechSec: number;
  onProgress?: (p: number) => void;
}

/**
 * Decode the audio of a video blob and return the speech (non-silent)
 * segments as {start,end} in source seconds.
 */
export async function detectSpeechSegments(
  blob: Blob,
  opts: SilenceOptions,
): Promise<{ start: number; end: number }[]> {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) throw new Error("Trình duyệt không hỗ trợ Web Audio.");
  const ac = new AC();
  try {
    const buffer = await blob.arrayBuffer();
    let audio: AudioBuffer;
    try {
      audio = await ac.decodeAudioData(buffer);
    } catch {
      throw new Error("Không giải mã được âm thanh của video này.");
    }
    const channel = audio.getChannelData(0);
    const sr = audio.sampleRate;
    const winSec = 0.1;
    const win = Math.max(1, Math.floor(sr * winSec));
    const threshold = Math.pow(10, opts.thresholdDb / 20);
    const total = Math.ceil(channel.length / win);

    const segments: { start: number; end: number }[] = [];
    let segStart: number | null = null;
    let silenceStart: number | null = null;

    for (let i = 0; i < total; i++) {
      const from = i * win;
      const to = Math.min(from + win, channel.length);
      let sum = 0;
      for (let j = from; j < to; j++) {
        const s = channel[j] ?? 0;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / Math.max(1, to - from));
      const t = i * winSec;
      const isSpeech = rms >= threshold;

      if (isSpeech) {
        if (segStart === null) segStart = t;
        silenceStart = null;
      } else {
        if (silenceStart === null) silenceStart = t;
        if (segStart !== null && t + winSec - silenceStart >= opts.minSilenceSec) {
          if (silenceStart - segStart >= opts.minSpeechSec) {
            segments.push({ start: segStart, end: silenceStart });
          }
          segStart = null;
        }
      }
      if (opts.onProgress && i % 50 === 0) opts.onProgress(i / total);
    }
    if (segStart !== null) {
      const end = audio.duration;
      if (end - segStart >= opts.minSpeechSec) segments.push({ start: segStart, end });
    }
    opts.onProgress?.(1);
    return segments;
  } finally {
    await ac.close().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// Export engine
// ---------------------------------------------------------------------------

export interface ExportOptions {
  clips: Clip[];
  /** sourceId -> playable URL */
  sources: Map<string, string>;
  captions: Caption[];
  aspect: Aspect;
  videoBitsPerSecond: number;
  /** Câu hook hiện ở đầu video. */
  hook?: Hook | undefined;
  /** Nhạc nền trộn vào bản xuất (lặp lại nếu ngắn hơn video). */
  music?: { blob: Blob; volume: number } | undefined;
  onProgress?: (p: number) => void;
  signal?: AbortSignal;
}

function pickMimeType(): string {
  const candidates = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  if (typeof MediaRecorder === "undefined") return "";
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

function drawCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  if (video.readyState < 2 || video.videoWidth === 0) return;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const scale = Math.max(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawCaptions(
  ctx: CanvasRenderingContext2D,
  captions: Caption[],
  t: number,
  w: number,
  h: number,
) {
  const active = captions.filter((c) => t >= c.start && t < c.end);
  if (active.length === 0) return;
  const fontSize = Math.round(w * 0.055);
  ctx.font = `700 ${fontSize}px Manrope, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  const lineHeight = fontSize * 1.35;
  const bottom = h * 0.92;
  active.forEach((cap, idx) => {
    const y = bottom - (active.length - 1 - idx) * lineHeight;
    const text = cap.text.trim();
    if (!text) return;
    const tw = ctx.measureText(text).width;
    const padX = fontSize * 0.5;
    const padY = fontSize * 0.32;
    // pill background
    ctx.fillStyle = "rgba(0,0,0,0.62)";
    const bx = w / 2 - tw / 2 - padX;
    const bw = tw + padX * 2;
    const by = y - fontSize - padY;
    const bh = fontSize + padY * 2;
    const r = bh / 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, r);
    ctx.fill();
    // gold keyword highlight: wrap *word* in asterisks to highlight it
    const parts = text.split(/(\*[^*]+\*)/g);
    let cursor = w / 2 - ctx.measureText(text.replace(/\*/g, "")).width / 2;
    ctx.textAlign = "left";
    for (const part of parts) {
      const clean = part.replace(/\*/g, "");
      const isGold = part.startsWith("*") && part.endsWith("*") && part.length > 2;
      ctx.fillStyle = isGold ? "#f5c518" : "#ffffff";
      ctx.fillText(clean, cursor, y);
      cursor += ctx.measureText(clean).width;
    }
    ctx.textAlign = "center";
  });
}

/** Vẽ câu hook: khung vàng chữ đen, đặt ở phía trên khung hình. */
export function drawHook(ctx: CanvasRenderingContext2D, text: string, w: number, h: number) {
  const value = text.trim().toUpperCase();
  if (!value) return;
  const fontSize = Math.round(Math.min(w, h) * 0.07);
  ctx.font = `800 ${fontSize}px Sora, Manrope, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > w * 0.8) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  const lineHeight = fontSize * 1.2;
  const boxW = Math.min(
    w * 0.92,
    Math.max(...lines.map((l) => ctx.measureText(l).width)) + fontSize * 1.2,
  );
  const boxH = lines.length * lineHeight + fontSize * 0.7;
  const top = h * 0.14;
  ctx.fillStyle = "#f5c518";
  ctx.beginPath();
  ctx.roundRect((w - boxW) / 2, top, boxW, boxH, fontSize * 0.3);
  ctx.fill();
  ctx.fillStyle = "#111111";
  lines.forEach((l, i) => ctx.fillText(l, w / 2, top + fontSize * 0.35 + lineHeight * (i + 0.5)));
}

/**
 * Gọi `fn` ở khung hình kế tiếp. requestAnimationFrame bị trình duyệt dừng khi tab bị ẩn
 * hoặc cửa sổ bị che, nên có thêm hẹn giờ dự phòng để quá trình xuất không bị treo.
 */
function nextFrame(fn: () => void) {
  let fired = false;
  const run = () => {
    if (fired) return;
    fired = true;
    window.clearTimeout(timer);
    fn();
  };
  const timer = window.setTimeout(run, 50);
  requestAnimationFrame(run);
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.05 && video.readyState >= 2) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    const timer = window.setTimeout(() => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    }, 4000);
    video.addEventListener("seeked", () => {
      window.clearTimeout(timer);
      onSeeked();
    });
    try {
      video.currentTime = time;
    } catch {
      window.clearTimeout(timer);
      resolve();
    }
  });
}

/**
 * Render the whole timeline to a video file. Returns the recorded Blob.
 * Everything runs locally in the browser — no upload, no server.
 */
export async function exportTimeline(opts: ExportOptions): Promise<Blob> {
  const { clips, sources, captions, aspect, videoBitsPerSecond, hook, music, onProgress, signal } =
    opts;
  if (clips.length === 0) throw new Error("Timeline đang trống, chưa có gì để xuất.");

  const mime = pickMimeType();
  if (!mime) throw new Error("Trình duyệt này không hỗ trợ xuất video.");

  const { w, h } = ASPECT_SIZE[aspect];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không khởi tạo được canvas.");

  const stream = canvas.captureStream(30);

  // One hidden video element per unique source, with audio routed into the
  // recorded stream. Only the active one plays at a time.
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;
  const videos = new Map<string, HTMLVideoElement>();

  try {
    if (AC) {
      audioCtx = new AC();
      await audioCtx.resume().catch(() => undefined);
      audioDest = audioCtx.createMediaStreamDestination();
    }
    for (const clip of clips) {
      if (videos.has(clip.sourceId)) continue;
      const src = sources.get(clip.sourceId);
      if (!src) throw new Error("Thiếu nguồn video cho một clip.");
      const v = document.createElement("video");
      v.crossOrigin = "anonymous";
      v.preload = "auto";
      v.playsInline = true;
      v.src = src;
      if (audioCtx && audioDest) {
        try {
          audioCtx.createMediaElementSource(v).connect(audioDest);
        } catch {
          /* element may already be bound; ignore */
        }
      }
      videos.set(clip.sourceId, v);
    }
    let musicNode: AudioBufferSourceNode | null = null;
    if (music && audioCtx && audioDest) {
      try {
        const buffer = await audioCtx.decodeAudioData(await music.blob.arrayBuffer());
        musicNode = audioCtx.createBufferSource();
        musicNode.buffer = buffer;
        musicNode.loop = true;
        const gain = audioCtx.createGain();
        gain.gain.value = music.volume;
        musicNode.connect(gain).connect(audioDest);
      } catch {
        throw new Error("Không đọc được file nhạc nền.");
      }
    }
    const audioTrack = audioDest?.stream.getAudioTracks()[0];
    if (audioTrack) stream.addTrack(audioTrack);

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond,
    });
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    const finished = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () =>
        resolve(new Blob(chunks, { type: mime.split(";")[0] ?? "video/webm" }));
      recorder.onerror = () => reject(new Error("Lỗi khi ghi video xuất ra."));
    });
    recorder.start(250);
    musicNode?.start();

    const layout = clipLayout(clips);
    const total = layout.reduce((s, l) => s + l.dur, 0);
    let elapsed = 0;

    try {
      for (const { clip, dur } of layout) {
        if (signal?.aborted) throw new Error("Đã hủy xuất video.");
        const v = videos.get(clip.sourceId);
        if (!v) continue;
        v.playbackRate = clip.speed;
        v.volume = clip.muted ? 0 : clip.volume;
        await seekVideo(v, clip.start);
        await v.play().catch(() => undefined);
        // If playback never starts (e.g. blocked or unloadable media), fail
        // fast instead of recording a frozen frame forever.
        await new Promise<void>((resolve, reject) => {
          if (!v.paused) return resolve();
          window.setTimeout(() => {
            if (v.paused && v.readyState < 3) {
              reject(
                new Error(`Không phát được "${clip.name}" để xuất — thử kiểm tra lại nguồn video.`),
              );
            } else resolve();
          }, 3000);
        });

        await new Promise<void>((resolve) => {
          const draw = () => {
            if (signal?.aborted) return resolve();
            const local = Math.min(v.currentTime, clip.end);
            const t = elapsed + Math.max(0, (local - clip.start) / clip.speed);
            drawCover(ctx, v, w, h);
            drawCaptions(ctx, captions, t, w, h);
            if (hook && t < hook.duration) drawHook(ctx, hook.text, w, h);
            onProgress?.(total > 0 ? Math.min(1, t / total) : 1);
            if (v.currentTime >= clip.end - 0.05 || v.ended) return resolve();
            nextFrame(draw);
          };
          draw();
        });
        v.pause();
        elapsed += dur;
      }
    } finally {
      try {
        musicNode?.stop();
      } catch {
        /* ignore */
      }
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    onProgress?.(1);
    return await finished;
  } finally {
    videos.forEach((v) => {
      v.pause();
      v.src = "";
    });
    if (audioCtx) await audioCtx.close().catch(() => undefined);
  }
}

/** Split a clip into parts of at most maxLen timeline-seconds (for Shorts). */
export function splitClipIntoShorts(clip: Clip, maxLenSec: number): Clip[] {
  const raw = clip.end - clip.start;
  const total = clipTimelineDuration(clip);
  if (total <= maxLenSec || raw <= 0) return [clip];
  const parts: Clip[] = [];
  const n = Math.ceil(total / maxLenSec);
  for (let i = 0; i < n; i++) {
    const t0 = i * maxLenSec;
    const t1 = Math.min((i + 1) * maxLenSec, total);
    const s0 = clip.start + t0 * clip.speed;
    const s1 = clip.start + t1 * clip.speed;
    parts.push({
      ...clip,
      id: `${clip.id}-p${i + 1}`,
      name: `${clip.name} · P${i + 1}`,
      start: s0,
      end: s1,
    });
  }
  return parts;
}
