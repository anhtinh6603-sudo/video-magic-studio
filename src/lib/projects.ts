// Project model + persistence for Master Clip.
// Metadata (clips, captions, settings) is stored in localStorage.
// Uploaded video files are stored as Blobs in IndexedDB (see db.ts) and
// resolved to object URLs when a project is opened.

import { idbDel, idbGet, idbSet } from "./db";

export type Aspect = "9:16" | "16:9" | "1:1";

export interface SourceRef {
  id: string;
  kind: "file" | "url";
  /** Display name of the source video. */
  name: string;
  /** Direct playable URL. For uploaded files this is only a label; the real
   *  bytes come from IndexedDB. For remote sources it is the video URL. */
  url: string;
}

export interface Clip {
  id: string;
  sourceId: string;
  name: string;
  /** In/out points inside the source video, in seconds. `end <= 0` means
   *  "until the end of the source" and is hydrated on load. */
  start: number;
  end: number;
  speed: number;
  volume: number;
  muted: boolean;
}

export interface Caption {
  id: string;
  /** Timeline seconds (not source seconds). */
  start: number;
  end: number;
  text: string;
}

export type CreateMode = "Talking-head" | "Nhiều clip + Nhạc" | "Video dài → Short";

export const CREATE_MODES: CreateMode[] = [
  "Talking-head",
  "Nhiều clip + Nhạc",
  "Video dài → Short",
];

/** Câu hook hiện nổi bật ở đầu video. */
export interface Hook {
  text: string;
  /** Số giây hiển thị tính từ đầu video. */
  duration: number;
}

/** Nhạc nền lấy từ thư viện nhạc (xem audio.ts). */
export interface ProjectMusic {
  trackId: string;
  name: string;
  volume: number;
}

export interface Project {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** Set when the user exports at least once. */
  exportedAt?: number;
  aspect: Aspect;
  workflow?: string;
  mode?: CreateMode;
  favorite?: boolean;
  /** Ảnh bìa nhỏ (data URL JPEG). */
  thumbnail?: string;
  hook?: Hook;
  music?: ProjectMusic;
  sources: SourceRef[];
  clips: Clip[];
  captions: Caption[];
}

const STORAGE_KEY = "master-clip-projects-v1";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatTimeMs(totalSeconds: number): string {
  const base = formatTime(totalSeconds);
  const ms = Math.floor((totalSeconds % 1) * 10);
  return `${base}.${ms}`;
}

function readAll(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(projects: Project[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function listProjects(): Project[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | undefined {
  return readAll().find((p) => p.id === id);
}

export function saveProject(project: Project): void {
  const all = readAll();
  const next = { ...project, updatedAt: Date.now() };
  const index = all.findIndex((p) => p.id === next.id);
  if (index >= 0) all[index] = next;
  else all.push(next);
  writeAll(all);
}

export async function deleteProject(id: string): Promise<void> {
  const project = getProject(id);
  writeAll(readAll().filter((p) => p.id !== id));
  if (project) {
    await Promise.all(
      project.sources
        .filter((s) => s.kind === "file")
        .map((s) => idbDel(s.id).catch(() => undefined)),
    );
  }
}

/** Load a source video's duration without showing it. */
function probeDuration(src: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const done = (value: number) => {
      video.src = "";
      resolve(value);
    };
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : 0);
    video.onerror = () => done(0);
    video.src = src;
  });
}

/** Chụp 1 khung hình làm ảnh bìa dự án (JPEG nhỏ, dạng data URL). */
export function captureThumbnail(src: string): Promise<string | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    const finish = (value: string | undefined) => {
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(undefined), 8000);
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 1) * 0.1);
    };
    video.onseeked = () => {
      try {
        const width = 320;
        const height = Math.round((width * (video.videoHeight || 9)) / (video.videoWidth || 16));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
        finish(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        finish(undefined);
      }
    };
    video.onerror = () => finish(undefined);
    video.src = src;
  });
}

function newClip(sourceId: string, name: string, end: number): Clip {
  return { id: uid(), sourceId, name, start: 0, end, speed: 1, volume: 1, muted: false };
}

/** Lưu file vào IndexedDB, trả về nguồn + clip toàn bộ video + URL tạm để chụp ảnh bìa. */
async function importFiles(files: File[], startIndex: number) {
  const sources: SourceRef[] = [];
  const clips: Clip[] = [];
  let firstUrl: string | null = null;
  for (const [i, file] of files.entries()) {
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|mkv|m4v)$/i.test(file.name)) {
      throw new Error(`"${file.name}" không phải file video.`);
    }
    const sourceId = uid();
    await idbSet(sourceId, file);
    const objectUrl = URL.createObjectURL(file);
    const duration = await probeDuration(objectUrl);
    if (!firstUrl) firstUrl = objectUrl;
    else URL.revokeObjectURL(objectUrl);
    sources.push({ id: sourceId, kind: "file", name: file.name, url: file.name });
    clips.push(newClip(sourceId, `Clip ${startIndex + i + 1}`, duration > 0 ? duration : 0));
  }
  return { sources, clips, firstUrl };
}

export async function createProjectFromFiles(
  files: File[],
  workflow?: string,
  mode?: CreateMode,
): Promise<Project> {
  if (files.length === 0) throw new Error("Chưa chọn file video.");
  const { sources, clips, firstUrl } = await importFiles(files, 0);
  const thumbnail = firstUrl ? await captureThumbnail(firstUrl) : undefined;
  if (firstUrl) URL.revokeObjectURL(firstUrl);
  const first = files[0];
  const project: Project = {
    id: uid(),
    title:
      files.length > 1
        ? `${files.length} clip · ${new Date().toLocaleDateString("vi-VN")}`
        : first?.name.replace(/\.[a-z0-9]+$/i, "") || "Dự án mới",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    aspect: "9:16",
    ...(workflow ? { workflow } : {}),
    ...(mode ? { mode } : {}),
    ...(thumbnail ? { thumbnail } : {}),
    sources,
    clips,
    captions: [],
  };
  saveProject(project);
  return project;
}

export function createProjectFromFile(file: File, workflow?: string, mode?: CreateMode) {
  return createProjectFromFiles([file], workflow, mode);
}

/** Thêm video mới vào cuối timeline của dự án. */
export async function addFilesToProject(project: Project, files: File[]): Promise<Project> {
  const { sources, clips, firstUrl } = await importFiles(files, project.clips.length);
  if (firstUrl) URL.revokeObjectURL(firstUrl);
  return {
    ...project,
    sources: [...project.sources, ...sources],
    clips: [...project.clips, ...clips],
  };
}

export async function createProjectFromUrl(
  url: string,
  name: string,
  workflow?: string,
  mode?: CreateMode,
): Promise<Project> {
  const sourceId = uid();
  const thumbnail = await captureThumbnail(url);
  const project: Project = {
    id: uid(),
    title: name || "Dự án mới",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    aspect: "9:16",
    ...(workflow ? { workflow } : {}),
    ...(mode ? { mode } : {}),
    ...(thumbnail ? { thumbnail } : {}),
    sources: [{ id: sourceId, kind: "url", name, url }],
    // end = 0 → "full length", hydrated when the editor loads metadata.
    clips: [newClip(sourceId, "Clip 1", 0)],
    captions: [],
  };
  saveProject(project);
  return project;
}

// ---------------------------------------------------------------------------
// Runtime helpers (client only)
// ---------------------------------------------------------------------------

const objectUrlCache = new Map<string, string>();

/** Resolve a source to something a <video> element can play. */
export async function resolveSourceUrl(source: SourceRef): Promise<string> {
  const cached = objectUrlCache.get(source.id);
  if (cached) return cached;
  if (source.kind === "url") {
    objectUrlCache.set(source.id, source.url);
    return source.url;
  }
  const blob = await idbGet(source.id);
  if (!blob) throw new Error(`Không tìm thấy file video "${source.name}" trong bộ nhớ máy.`);
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(source.id, url);
  return url;
}

/** Get the raw bytes of a source (uploaded file or same-origin remote). */
export async function getSourceBlob(source: SourceRef): Promise<Blob> {
  if (source.kind === "file") {
    const blob = await idbGet(source.id);
    if (!blob) throw new Error(`Không tìm thấy file video "${source.name}".`);
    return blob;
  }
  const res = await fetch(source.url);
  if (!res.ok) throw new Error("Không tải được video từ liên kết.");
  return await res.blob();
}

/** Timeline duration of a clip in seconds (accounts for speed). */
export function clipTimelineDuration(clip: Clip): number {
  const raw = Math.max(0, clip.end - clip.start);
  return raw / Math.max(0.1, clip.speed);
}

export function projectDuration(project: Project): number {
  return project.clips.reduce((sum, c) => sum + clipTimelineDuration(c), 0);
}

/** Offsets of every clip on the timeline. */
export function clipLayout(clips: Clip[]): { clip: Clip; offset: number; dur: number }[] {
  const layout: { clip: Clip; offset: number; dur: number }[] = [];
  let offset = 0;
  for (const clip of clips) {
    const dur = clipTimelineDuration(clip);
    layout.push({ clip, offset, dur });
    offset += dur;
  }
  return layout;
}

export function isDirectVideoUrl(url: string): boolean {
  const clean = url.trim().toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|facebook\.com|drive\.google\.com/.test(clean))
    return false;
  return /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/.test(clean) || clean.startsWith("blob:");
}
