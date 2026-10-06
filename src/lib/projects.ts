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

export interface Project {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  /** Set when the user exports at least once. */
  exportedAt?: number;
  aspect: Aspect;
  workflow?: string;
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

export async function createProjectFromFile(file: File, workflow?: string): Promise<Project> {
  const sourceId = uid();
  await idbSet(sourceId, file);
  const objectUrl = URL.createObjectURL(file);
  const duration = await probeDuration(objectUrl);
  URL.revokeObjectURL(objectUrl);

  const project: Project = {
    id: uid(),
    title: file.name.replace(/\.[a-z0-9]+$/i, "") || "Dự án mới",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    aspect: "9:16",
    ...(workflow ? { workflow } : {}),
    sources: [{ id: sourceId, kind: "file", name: file.name, url: file.name }],
    clips: [
      {
        id: uid(),
        sourceId,
        name: "Clip 1",
        start: 0,
        end: duration > 0 ? duration : 0,
        speed: 1,
        volume: 1,
        muted: false,
      },
    ],
    captions: [],
  };
  saveProject(project);
  return project;
}

export async function createProjectFromUrl(
  url: string,
  name: string,
  workflow?: string,
): Promise<Project> {
  const sourceId = uid();
  const project: Project = {
    id: uid(),
    title: name || "Dự án mới",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    aspect: "9:16",
    ...(workflow ? { workflow } : {}),
    sources: [{ id: sourceId, kind: "url", name, url }],
    clips: [
      {
        id: uid(),
        sourceId,
        name: "Clip 1",
        start: 0,
        // end = 0 → "full length", hydrated when the editor loads metadata.
        end: 0,
        speed: 1,
        volume: 1,
        muted: false,
      },
    ],
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
