// Timeline playback engine for the editor.
// One <video> element plays every clip in sequence: when the playhead crosses
// a clip boundary the element swaps source and seeks. All state lives here so
// Player / Timeline components stay presentational.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clipLayout, type Clip } from "@/lib/projects";

export interface PlayerApi {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  time: number;
  total: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  step: (delta: number) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function usePlayer(
  clips: Clip[],
  sourceUrls: Map<string, string>,
  opts?: { previewMuted?: boolean },
): PlayerApi {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const layout = useMemo(() => clipLayout(clips), [clips]);
  const total = useMemo(() => {
    const last = layout[layout.length - 1];
    return last ? last.offset + last.dur : 0;
  }, [layout]);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const layoutRef = useRef(layout);
  const totalRef = useRef(total);
  const urlsRef = useRef(sourceUrls);
  const previewMutedRef = useRef(opts?.previewMuted ?? false);
  previewMutedRef.current = opts?.previewMuted ?? false;
  layoutRef.current = layout;
  totalRef.current = total;
  urlsRef.current = sourceUrls;

  const effectiveVolume = useCallback((clip: Clip) => {
    if (previewMutedRef.current || clip.muted) return 0;
    return clip.volume;
  }, []);

  const clipAt = useCallback(
    (t: number) => layoutRef.current.find((l) => t >= l.offset && t < l.offset + l.dur),
    [],
  );

  /** Make the video element show `clip`, loading its source if needed. */
  const loadClipVideo = useCallback(
    (video: HTMLVideoElement, clip: Clip) => {
      return new Promise<void>((resolve) => {
        const src = urlsRef.current.get(clip.sourceId) ?? "";
        const apply = () => {
          video.playbackRate = clip.speed;
          video.volume = effectiveVolume(clip);
          resolve();
        };
        // Same source already loaded (e.g. switching between clips of one
        // video): no need to reload, just retarget the element.
        if (src !== "" && video.getAttribute("src") === src) {
          video.dataset["clip"] = clip.id;
          apply();
          return;
        }
        if (video.dataset["clip"] === clip.id) {
          apply();
          return;
        }
        const cleanup = () => {
          video.removeEventListener("loadedmetadata", onMeta);
          video.removeEventListener("error", onErr);
        };
        const onMeta = () => {
          cleanup();
          apply();
        };
        const onErr = () => {
          cleanup();
          apply();
        };
        video.addEventListener("loadedmetadata", onMeta);
        video.addEventListener("error", onErr);
        video.dataset["clip"] = clip.id;
        if (video.getAttribute("src") !== src) video.setAttribute("src", src);
        video.load();
      });
    },
    [effectiveVolume],
  );

  /** Position the video element at timeline time `t`. */
  const syncTo = useCallback(
    async (t: number, autoplay: boolean) => {
      const video = videoRef.current;
      if (!video) return;
      const hit = clipAt(t);
      if (!hit) {
        video.pause();
        return;
      }
      await loadClipVideo(video, hit.clip);
      const target = hit.clip.start + (t - hit.offset) * hit.clip.speed;
      const safeEnd = Math.max(hit.clip.start, hit.clip.end - 0.05);
      const clamped = clamp(target, hit.clip.start, safeEnd);
      if (Math.abs(video.currentTime - clamped) > 0.12) {
        try {
          video.currentTime = clamped;
        } catch {
          /* ignore */
        }
      }
      if (autoplay) {
        try {
          await video.play();
        } catch {
          playingRef.current = false;
          setPlaying(false);
        }
      }
    },
    [clipAt, loadClipVideo],
  );

  // rAF loop: advance the playhead from the video element's clock.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const video = videoRef.current;
      if (video && !video.paused && !video.seeking && video.readyState >= 2) {
        const hit = clipAt(timeRef.current);
        if (hit) {
          const pastEnd = video.currentTime >= hit.clip.end - 0.08 || video.ended;
          if (pastEnd) {
            const idx = layoutRef.current.indexOf(hit);
            const next = layoutRef.current[idx + 1];
            if (next) {
              timeRef.current = next.offset;
              setTime(next.offset);
              void syncTo(next.offset, true);
            } else {
              timeRef.current = totalRef.current;
              setTime(totalRef.current);
              playingRef.current = false;
              setPlaying(false);
              video.pause();
            }
          } else {
            const t = hit.offset + (video.currentTime - hit.clip.start) / hit.clip.speed;
            timeRef.current = clamp(t, 0, totalRef.current);
            setTime(timeRef.current);
          }
        }
      }
      if (playingRef.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, clipAt, syncTo]);

  const play = useCallback(() => {
    const t = timeRef.current >= totalRef.current - 0.05 ? 0 : timeRef.current;
    timeRef.current = t;
    setTime(t);
    playingRef.current = true;
    setPlaying(true);
    void syncTo(t, true);
  }, [syncTo]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    videoRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  const seek = useCallback(
    (t: number) => {
      const c = clamp(t, 0, totalRef.current);
      timeRef.current = c;
      setTime(c);
      void syncTo(c, playingRef.current);
    },
    [syncTo],
  );

  const step = useCallback((delta: number) => seek(timeRef.current + delta), [seek]);

  // Keep the playhead inside the timeline when clips are edited.
  useEffect(() => {
    if (timeRef.current > totalRef.current) {
      timeRef.current = totalRef.current;
      setTime(totalRef.current);
    }
  }, [total]);

  // Apply preview-mute toggles immediately, even mid-clip.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const hit = clipAt(timeRef.current);
    if (hit) video.volume = effectiveVolume(hit.clip);
  }, [opts?.previewMuted, clipAt, effectiveVolume]);

  // Space bar toggles playback (ignored while typing or when a button
  // has focus — the focused button already handles Space natively).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "BUTTON"))
        return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return { videoRef, time, total, playing, play, pause, toggle, seek, step };
}
