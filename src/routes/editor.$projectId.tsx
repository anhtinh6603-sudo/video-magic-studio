import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Download, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Player } from "@/components/editor/Player";
import {
  CaptionPanel,
  ClipPanel,
  SideTabs,
  ToolsPanel,
  useSideTabState,
} from "@/components/editor/SidePanels";
import { MusicHookPanel } from "@/components/editor/MusicHookPanel";
import { Timeline } from "@/components/editor/Timeline";
import { usePlayer } from "@/components/editor/usePlayer";
import {
  analyzeEnvelope,
  captionsToSrt,
  downloadBlob,
  estimateBpm,
  getMusicBlob,
  parseSubtitles,
  suggestHighlights,
  type Envelope,
} from "@/lib/audio";
import {
  addFilesToProject,
  clipLayout,
  getProject,
  getSourceBlob,
  resolveSourceUrl,
  saveProject,
  uid,
  type Aspect,
  type Clip,
  type Project,
} from "@/lib/projects";
import { detectSpeechSegments, exportTimeline, splitClipIntoShorts } from "@/lib/video";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/editor/$projectId")({
  head: () => ({
    meta: [{ title: "Editor — Master Clip" }],
  }),
  component: EditorPage,
});

function EditorPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen bg-background" />;
  return <EditorApp />;
}

function probeDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.crossOrigin = "anonymous";
    const done = (d: number) => {
      v.removeAttribute("src");
      resolve(d);
    };
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : 0);
    v.onerror = () => done(0);
    v.src = url;
  });
}

const ASPECTS: Aspect[] = ["9:16", "16:9", "1:1"];

const EMPTY_CLIPS: Clip[] = [];

function EditorApp() {
  const { projectId } = Route.useParams();

  const [project, setProject] = useState<Project | null>(null);
  const [sourceUrls, setSourceUrls] = useState<Map<string, string>>(new Map());
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const { tab, setTab } = useSideTabState();
  const [previewMuted, setPreviewMuted] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [thresholdDb, setThresholdDb] = useState(-38);
  const [minSilence, setMinSilence] = useState(0.6);
  const [shortLen, setShortLen] = useState(60);

  const [exportOpen, setExportOpen] = useState(false);
  const [quality, setQuality] = useState<"cao" | "trung-binh">("cao");
  const [exportMode, setExportMode] = useState<"merge" | "separate">("merge");
  const [exportLabel, setExportLabel] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const [highlightCount, setHighlightCount] = useState(5);
  const envelopes = useRef(new Map<string, Envelope>());
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const player = usePlayer(project?.clips ?? EMPTY_CLIPS, sourceUrls, { previewMuted });

  // ---- load project -------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = getProject(projectId);
        if (!p) throw new Error("Không tìm thấy dự án này.");
        const urls = new Map<string, string>();
        for (const s of p.sources) urls.set(s.id, await resolveSourceUrl(s));
        if (cancelled) return;
        const durations = new Map<string, number>();
        await Promise.all(
          p.sources.map(async (s) => {
            durations.set(s.id, await probeDuration(urls.get(s.id) ?? ""));
          }),
        );
        if (cancelled) return;
        const clips = p.clips.map((c) => {
          const d = durations.get(c.sourceId) ?? 0;
          let { start, end } = c;
          if (d > 0) {
            if (end <= 0 || end > d) end = d;
            if (start < 0) start = 0;
            if (start >= end) start = 0;
          }
          return { ...c, start, end };
        });
        const next = { ...p, clips };
        setProject(next);
        setSourceUrls(urls);
        setSelectedClipId(next.clips[0]?.id ?? null);
        if (next.mode === "Video dài → Short") setTab("tools");
        if (next.mode === "Nhiều clip + Nhạc") setTab("music");
        saveProject(next);
        setHydrated(true);
        setLoadState("ready");
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Không tải được dự án.");
          setLoadState("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- background music ---------------------------------------------------
  const musicTrackId = project?.music?.trackId ?? null;
  useEffect(() => {
    setBpm(null);
    setMusicUrl(null);
    if (!musicTrackId) return;
    let cancelled = false;
    let url: string | null = null;
    getMusicBlob(musicTrackId)
      .then(async (blob) => {
        if (cancelled) return;
        if (!blob) {
          toast.error("Không tìm thấy file nhạc trong thư viện.");
          return;
        }
        url = URL.createObjectURL(blob);
        setMusicUrl(url);
        const env = await analyzeEnvelope(blob);
        if (!cancelled) setBpm(estimateBpm(env));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [musicTrackId]);

  // Phát nhạc nền cùng bản xem trước.
  const musicVolume = project?.music?.volume ?? 0;
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = Math.min(1, Math.max(0, previewMuted ? 0 : musicVolume));
  }, [musicVolume, previewMuted, musicUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !musicUrl) return;
    if (!player.playing) {
      audio.pause();
      return;
    }
    const length = audio.duration;
    const target = Number.isFinite(length) && length > 0 ? player.time % length : player.time;
    if (Math.abs(audio.currentTime - target) > 0.35) audio.currentTime = target;
    if (audio.paused) audio.play().catch(() => undefined);
  }, [player.playing, player.time, musicUrl]);

  // ---- autosave -----------------------------------------------------------
  useEffect(() => {
    if (!hydrated || !project) return;
    const t = window.setTimeout(() => {
      saveProject(project);
      setSavedAt(Date.now());
    }, 800);
    return () => window.clearTimeout(t);
  }, [project, hydrated]);

  const layout = useMemo(() => clipLayout(project?.clips ?? []), [project]);
  const selectedClip = project?.clips.find((c) => c.id === selectedClipId) ?? null;

  const update = (fn: (p: Project) => Project) => setProject((prev) => (prev ? fn(prev) : prev));

  // ---- clip actions -------------------------------------------------------
  const updateClip = (id: string, patch: Partial<Clip>) =>
    update((p) => ({
      ...p,
      clips: p.clips.map((c) => {
        if (c.id !== id) return c;
        const n = { ...c, ...patch };
        if (n.end <= n.start) n.end = n.start + 0.5;
        n.speed = Math.min(2, Math.max(0.5, n.speed || 1));
        n.volume = Math.min(1, Math.max(0, n.volume ?? 1));
        return n;
      }),
    }));

  const splitSelected = (id: string) => {
    const clip = project?.clips.find((c) => c.id === id);
    const item = layout.find((l) => l.clip.id === id);
    if (!clip || !item) return;
    const local = player.time - item.offset;
    if (local < 0.3 || local > item.dur - 0.3) {
      toast.warning("Hãy đưa playhead vào giữa clip rồi mới chia.");
      return;
    }
    const cutSrc = clip.start + local * clip.speed;
    const a: Clip = { ...clip, end: cutSrc };
    const b: Clip = { ...clip, id: uid(), name: `${clip.name} · 2`, start: cutSrc };
    update((p) => {
      const i = p.clips.findIndex((c) => c.id === id);
      const clips = [...p.clips];
      clips.splice(i, 1, a, b);
      return { ...p, clips };
    });
    setSelectedClipId(b.id);
    toast.success("Đã chia clip thành 2 đoạn.");
  };

  const duplicateClip = (id: string) => {
    const clip = project?.clips.find((c) => c.id === id);
    if (!clip) return;
    const copy: Clip = { ...clip, id: uid(), name: `${clip.name} (bản sao)` };
    update((p) => {
      const i = p.clips.findIndex((c) => c.id === id);
      const clips = [...p.clips];
      clips.splice(i + 1, 0, copy);
      return { ...p, clips };
    });
    setSelectedClipId(copy.id);
    toast.success("Đã nhân bản clip.");
  };

  const deleteClip = (id: string) => {
    update((p) => ({ ...p, clips: p.clips.filter((c) => c.id !== id) }));
    setSelectedClipId((prev) => {
      if (prev !== id || !project) return null;
      const i = project.clips.findIndex((c) => c.id === id);
      const rest = project.clips.filter((c) => c.id !== id);
      return rest[Math.min(i, rest.length - 1)]?.id ?? null;
    });
    toast.success("Đã xóa clip.");
  };

  // ---- caption actions ----------------------------------------------------
  const addCaption = () => {
    const start = player.time;
    const cap = {
      id: uid(),
      start,
      end: Math.min(player.total, start + 3),
      text: "",
    };
    if (cap.end <= cap.start + 0.3) cap.end = cap.start + 3;
    update((p) => ({ ...p, captions: [...p.captions, cap] }));
    setSelectedCaptionId(cap.id);
    setTab("caption");
  };

  const updateCaption = (
    id: string,
    patch: Partial<{ start: number; end: number; text: string }>,
  ) =>
    update((p) => ({
      ...p,
      captions: p.captions.map((c) => {
        if (c.id !== id) return c;
        const n = { ...c, ...patch };
        if (n.end <= n.start) n.end = n.start + 0.5;
        return n;
      }),
    }));

  const deleteCaption = (id: string) =>
    update((p) => ({ ...p, captions: p.captions.filter((c) => c.id !== id) }));

  // ---- AI tools (local) ---------------------------------------------------
  const cutSilence = async () => {
    if (!project || !selectedClip || busy) return;
    const source = project.sources.find((s) => s.id === selectedClip.sourceId);
    if (!source) return;
    setBusy("silence");
    setProgress(0);
    try {
      const blob = await getSourceBlob(source);
      const segments = await detectSpeechSegments(blob, {
        thresholdDb,
        minSilenceSec: minSilence,
        minSpeechSec: 0.3,
        onProgress: setProgress,
      });
      const rel = segments
        .map((s) => ({
          start: Math.max(selectedClip.start, s.start),
          end: Math.min(selectedClip.end, s.end),
        }))
        .filter((s) => s.end - s.start > 0.25);
      if (rel.length === 0) {
        toast.info("Không tìm thấy đoạn có tiếng nói trong clip này.");
        return;
      }
      const fresh = rel.map((s, i) => ({
        ...selectedClip,
        id: uid(),
        name: `${selectedClip.name} · ${i + 1}`,
        start: s.start,
        end: s.end,
      }));
      const id = selectedClip.id;
      update((p) => {
        const i = p.clips.findIndex((c) => c.id === id);
        const clips = [...p.clips];
        clips.splice(i, 1, ...fresh);
        return { ...p, clips };
      });
      const first = fresh[0];
      if (first) setSelectedClipId(first.id);
      toast.success(`Đã loại bỏ khoảng lặng — còn ${fresh.length} đoạn có tiếng.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cắt khoảng lặng thất bại.");
    } finally {
      setBusy(null);
      setProgress(0);
    }
  };

  const splitShorts = () => {
    if (!project || !selectedClip || busy) return;
    const parts = splitClipIntoShorts(selectedClip, shortLen);
    if (parts.length <= 1) {
      toast.info(`Clip đã ngắn hơn ${shortLen} giây, không cần chia.`);
      return;
    }
    const id = selectedClip.id;
    update((p) => {
      const i = p.clips.findIndex((c) => c.id === id);
      const clips = [...p.clips];
      clips.splice(i, 1, ...parts);
      return { ...p, clips };
    });
    const firstPart = parts[0];
    if (firstPart) setSelectedClipId(firstPart.id);
    toast.success(`Đã chia thành ${parts.length} short.`);
  };

  const getEnvelope = async (sourceId: string) => {
    const cached = envelopes.current.get(sourceId);
    if (cached) return cached;
    const source = project?.sources.find((s) => s.id === sourceId);
    if (!source) throw new Error("Không tìm thấy video nguồn.");
    const env = await analyzeEnvelope(await getSourceBlob(source));
    envelopes.current.set(sourceId, env);
    return env;
  };

  const suggestBest = async () => {
    if (!project || !selectedClip || busy) return;
    setBusy("highlight");
    try {
      const env = await getEnvelope(selectedClip.sourceId);
      const found = suggestHighlights(env, {
        from: selectedClip.start,
        to: selectedClip.end,
        targetLength: shortLen * selectedClip.speed,
        count: highlightCount,
        thresholdDb,
      });
      if (found.length === 0) {
        toast.info("Không tìm thấy đoạn phù hợp trong clip này.");
        return;
      }
      const fresh: Clip[] = found.map((h, i) => ({
        ...selectedClip,
        id: uid(),
        name: `Short ${i + 1} · ${h.score}đ`,
        start: h.start,
        end: h.end,
      }));
      const id = selectedClip.id;
      update((p) => {
        const i = p.clips.findIndex((c) => c.id === id);
        const clips = [...p.clips];
        clips.splice(i, 1, ...fresh);
        return { ...p, clips };
      });
      setSelectedClipId(fresh[0]?.id ?? null);
      toast.success(`AI đã chọn ${fresh.length} đoạn hay nhất — điểm nằm trong tên mỗi clip.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không phân tích được âm thanh.");
    } finally {
      setBusy(null);
    }
  };

  const beatSync = () => {
    if (!bpm || !project) return;
    const beat = 60 / bpm;
    update((p) => ({
      ...p,
      clips: p.clips.map((c) => {
        const dur = (c.end - c.start) / c.speed;
        const beats = Math.max(1, Math.round(dur / beat));
        return { ...c, end: Math.min(c.end, c.start + beats * beat * c.speed) };
      }),
    }));
    toast.success(`Đã khớp ${project.clips.length} clip theo nhịp ${bpm} BPM.`);
  };

  const importSrt = async (file: File) => {
    const parsed = parseSubtitles(await file.text());
    if (parsed.length === 0) {
      toast.error("Không đọc được phụ đề trong file này.");
      return;
    }
    update((p) => ({ ...p, captions: parsed }));
    toast.success(`Đã nhập ${parsed.length} dòng phụ đề.`);
  };

  const addVideos = async (files: File[]) => {
    if (!project || files.length === 0 || busy) return;
    setBusy("import");
    try {
      const next = await addFilesToProject(project, files);
      const urls = new Map(sourceUrls);
      for (const s of next.sources) if (!urls.has(s.id)) urls.set(s.id, await resolveSourceUrl(s));
      setSourceUrls(urls);
      setProject(next);
      toast.success(`Đã thêm ${files.length} video vào cuối timeline.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không thêm được video.");
    } finally {
      setBusy(null);
    }
  };

  // ---- export -------------------------------------------------------------
  const doExport = async () => {
    if (!project || busy) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy("export");
    setProgress(0);
    try {
      const musicBlob = project.music ? await getMusicBlob(project.music.trackId) : undefined;
      const music =
        musicBlob && project.music ? { blob: musicBlob, volume: project.music.volume } : undefined;
      const safe = (name: string) => name.replace(/[\\/:*?"<>|]/g, "").trim();
      const baseName = safe(project.title) || "master-clip";
      // Gộp cả timeline thành 1 video, hoặc mỗi clip thành 1 short riêng
      // (caption được dời mốc thời gian theo vị trí của clip trên timeline).
      const jobs =
        exportMode === "merge"
          ? [{ name: baseName, clips: project.clips, captions: project.captions }]
          : layout.map(({ clip, offset, dur }) => ({
              name: `${baseName} - ${safe(clip.name)}`,
              clips: [clip],
              captions: project.captions
                .filter((c) => c.end > offset && c.start < offset + dur)
                .map((c) => ({ ...c, start: Math.max(0, c.start - offset), end: c.end - offset })),
            }));
      for (const [index, job] of jobs.entries()) {
        setExportLabel(jobs.length > 1 ? `Short ${index + 1}/${jobs.length}` : "");
        setProgress(0);
        const blob = await exportTimeline({
          clips: job.clips,
          sources: sourceUrls,
          captions: job.captions,
          aspect: project.aspect,
          videoBitsPerSecond: quality === "cao" ? 12_000_000 : 6_000_000,
          hook: project.hook,
          music,
          onProgress: setProgress,
          signal: ctrl.signal,
        });
        const ext = blob.type.includes("mp4") ? "mp4" : "webm";
        downloadBlob(blob, `${job.name}.${ext}`);
      }
      update((p) => ({ ...p, exportedAt: Date.now() }));
      toast.success(
        jobs.length > 1
          ? `Đã xuất ${jobs.length} short — các file đang tải xuống.`
          : "Xuất video thành công — file đang tải xuống.",
      );
      setExportOpen(false);
    } catch (e) {
      if (e instanceof Error && /hủy/i.test(e.message)) toast.info("Đã hủy xuất video.");
      else toast.error(e instanceof Error ? e.message : "Xuất video thất bại.");
    } finally {
      setBusy(null);
      setExportLabel("");
      abortRef.current = null;
    }
  };

  // ---- render -------------------------------------------------------------
  if (loadState === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-brand" />
          Đang mở dự án…
        </div>
      </div>
    );
  }

  if (loadState === "error" || !project) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-sm text-center">
          <p className="text-sm font-semibold">Không mở được dự án</p>
          <p className="mt-2 text-xs text-muted-foreground">{loadError}</p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-brand-foreground"
          >
            <ArrowLeft className="size-4" /> Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-brand/25 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4">
          <Link
            to="/"
            className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:border-brand/50 hover:text-foreground"
            aria-label="Về trang chủ"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Input
            value={project.title}
            onChange={(e) => update((p) => ({ ...p, title: e.target.value }))}
            className="h-9 max-w-[240px] border-transparent bg-transparent text-sm font-bold hover:border-border focus:border-brand"
            aria-label="Tên dự án"
          />
          {project.workflow && (
            <span className="hidden rounded-full border border-brand/50 px-2.5 py-1 text-[10px] font-bold text-brand md:inline">
              {project.workflow}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <label
              className={cn(
                "hidden h-8 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-3 text-xs font-semibold text-muted-foreground hover:border-brand/60 hover:text-foreground md:inline-flex",
                busy && "pointer-events-none opacity-50",
              )}
            >
              {busy === "import" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Thêm video
              <input
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  void addVideos(files);
                }}
              />
            </label>
            <div className="hidden items-center gap-1 rounded-lg border border-border bg-panel p-1 sm:flex">
              {ASPECTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => update((p) => ({ ...p, aspect: a }))}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 font-mono text-[11px] font-bold transition-colors",
                    project.aspect === a
                      ? "bg-brand text-brand-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <span className="hidden items-center gap-1 text-[10px] text-muted-foreground lg:flex">
              <Check className="size-3 text-brand" />
              {savedAt
                ? `Đã lưu ${new Date(savedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
                : "Tự động lưu"}
            </span>
            <Button variant="gold" size="sm" onClick={() => setExportOpen(true)}>
              <Download className="size-3.5" /> Xuất video
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="min-w-0 space-y-5">
            <Player
              player={player}
              aspect={project.aspect}
              captions={project.captions}
              hook={project.hook}
              previewMuted={previewMuted}
              onTogglePreviewMute={() => setPreviewMuted((v) => !v)}
            />
            <Timeline
              layout={layout}
              total={player.total}
              time={player.time}
              captions={project.captions}
              selectedClipId={selectedClipId}
              selectedCaptionId={selectedCaptionId}
              onSeek={player.seek}
              onSelectClip={(id) => {
                setSelectedClipId(id);
                setTab("clip");
              }}
              onSelectCaption={(id) => {
                setSelectedCaptionId(id);
                if (id) setTab("caption");
              }}
            />
          </div>

          <div className="space-y-4">
            <SideTabs tab={tab} onTab={setTab} />
            {tab === "clip" && (
              <ClipPanel
                clip={selectedClip}
                onChange={updateClip}
                onSplit={splitSelected}
                onDuplicate={duplicateClip}
                onDelete={deleteClip}
              />
            )}
            {tab === "caption" && (
              <CaptionPanel
                captions={project.captions}
                time={player.time}
                selectedId={selectedCaptionId}
                onSelect={setSelectedCaptionId}
                onAdd={addCaption}
                onChange={updateCaption}
                onDelete={deleteCaption}
                onImportSrt={(file) => void importSrt(file)}
                onExportSrt={() =>
                  downloadBlob(
                    new Blob([captionsToSrt(project.captions)], {
                      type: "text/plain;charset=utf-8",
                    }),
                    `${project.title || "phu-de"}.srt`,
                  )
                }
              />
            )}
            {tab === "music" && (
              <MusicHookPanel
                hook={project.hook}
                onHook={(hook) =>
                  update((p) => {
                    const { hook: _old, ...rest } = p;
                    return hook ? { ...rest, hook } : rest;
                  })
                }
                music={project.music}
                onMusic={(music) =>
                  update((p) => {
                    const { music: _old, ...rest } = p;
                    return music ? { ...rest, music } : rest;
                  })
                }
                bpm={bpm}
                onBeatSync={beatSync}
                onPreviewHook={() => {
                  player.seek(0);
                  player.play();
                }}
              />
            )}
            {tab === "tools" && (
              <ToolsPanel
                hasClip={!!selectedClip}
                selectedClipName={selectedClip?.name ?? ""}
                busy={busy}
                progress={progress}
                thresholdDb={thresholdDb}
                onThresholdDb={setThresholdDb}
                minSilence={minSilence}
                onMinSilence={setMinSilence}
                shortLen={shortLen}
                onShortLen={setShortLen}
                onCutSilence={cutSilence}
                onSplitShorts={splitShorts}
                onExport={() => setExportOpen(true)}
                highlightCount={highlightCount}
                onHighlightCount={setHighlightCount}
                onSuggestHighlights={() => void suggestBest()}
              />
            )}
          </div>
        </div>
      </main>

      {musicUrl && <audio ref={audioRef} src={musicUrl} loop preload="auto" className="hidden" />}

      {exportOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Xuất video</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() =>
                  busy === "export" ? abortRef.current?.abort() : setExportOpen(false)
                }
                aria-label="Đóng"
              >
                <X className="size-4" />
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Render ({project.aspect}) ngay trên máy của bạn — không tải lên server. Caption, hook
              và nhạc nền được đốt thẳng vào video.
            </p>
            <div className="mt-4">
              <span className="text-[11px] font-semibold">Kiểu xuất</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "merge", label: "1 video", sub: "Ghép cả timeline" },
                    {
                      id: "separate",
                      label: `${project.clips.length} short`,
                      sub: "Mỗi clip thành 1 file",
                    },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    disabled={busy === "export"}
                    onClick={() => setExportMode(m.id)}
                    className={cn(
                      "rounded-lg border p-2.5 text-left transition-colors",
                      exportMode === m.id
                        ? "border-brand bg-brand/10"
                        : "border-border hover:border-brand/50",
                    )}
                  >
                    <span className="block text-[12px] font-bold">{m.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{m.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <span className="text-[11px] font-semibold">Chất lượng</span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "cao", label: "Cao", sub: "~12 Mbps" },
                    { id: "trung-binh", label: "Trung bình", sub: "~6 Mbps" },
                  ] as const
                ).map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    disabled={busy === "export"}
                    onClick={() => setQuality(q.id)}
                    className={cn(
                      "rounded-lg border p-2.5 text-left transition-colors",
                      quality === q.id
                        ? "border-brand bg-brand/10"
                        : "border-border hover:border-brand/50",
                    )}
                  >
                    <span className="block text-[12px] font-bold">{q.label}</span>
                    <span className="block text-[10px] text-muted-foreground">{q.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            {busy === "export" && (
              <div className="mt-4">
                <Progress value={Math.round(progress * 100)} className="h-2" />
                <p className="mt-2 text-center font-mono text-[11px] text-brand">
                  {exportLabel ? `${exportLabel} · ` : ""}Đang render… {Math.round(progress * 100)}%
                </p>
                <p className="mt-1 text-center text-[10px] text-muted-foreground">
                  Video được dựng theo thời gian thực — hãy giữ tab này mở.
                </p>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              {busy === "export" ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => abortRef.current?.abort()}
                >
                  Hủy
                </Button>
              ) : (
                <>
                  <Button variant="outline" className="flex-1" onClick={() => setExportOpen(false)}>
                    Để sau
                  </Button>
                  <Button variant="gold" className="flex-1" onClick={doExport}>
                    <Download className="size-4" /> Bắt đầu xuất
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
