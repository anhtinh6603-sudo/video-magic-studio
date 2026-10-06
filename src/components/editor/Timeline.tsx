import { useMemo, useRef } from "react";

import { formatTime, type Caption, type Clip } from "@/lib/projects";
import { cn } from "@/lib/utils";

interface LayoutItem {
  clip: Clip;
  offset: number;
  dur: number;
}

interface TimelineProps {
  layout: LayoutItem[];
  total: number;
  time: number;
  captions: Caption[];
  selectedClipId: string | null;
  selectedCaptionId: string | null;
  onSeek: (t: number) => void;
  onSelectClip: (id: string) => void;
  onSelectCaption: (id: string | null) => void;
}

function niceStep(total: number): number {
  const raw = total / 8;
  const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300];
  return steps.find((s) => s >= raw) ?? 600;
}

export function Timeline({
  layout,
  total,
  time,
  captions,
  selectedClipId,
  selectedCaptionId,
  onSeek,
  onSelectClip,
  onSelectCaption,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const ticks = useMemo(() => {
    if (total <= 0) return [];
    const step = niceStep(total);
    const out: number[] = [];
    for (let t = 0; t <= total + 0.001; t += step) out.push(t);
    return out;
  }, [total]);

  const seekFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el || total <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * total);
  };

  const pct = (t: number) => (total > 0 ? `${(t / total) * 100}%` : "0%");

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          Timeline
        </h3>
        <span className="font-mono text-[10px] text-muted-foreground">
          {layout.length} clip · {formatTime(total)}
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative cursor-crosshair touch-none select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          seekFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) seekFromClientX(e.clientX);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
      >
        {/* ruler */}
        <div className="relative h-5 border-b border-border/60">
          {ticks.map((t) => (
            <div key={t} className="absolute top-0 h-full" style={{ left: pct(t) }}>
              <div className="h-1.5 w-px bg-border" />
              <span className="absolute left-1 top-0 font-mono text-[8px] text-muted-foreground">
                {formatTime(t)}
              </span>
            </div>
          ))}
        </div>

        {/* clips lane */}
        <div className="relative mt-1 h-16 rounded-md bg-panel">
          {layout.map(({ clip, offset, dur }) => (
            <button
              key={clip.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelectClip(clip.id)}
              className={cn(
                "absolute top-1 bottom-1 overflow-hidden rounded-md border px-2 text-left transition-colors",
                selectedClipId === clip.id
                  ? "border-brand bg-brand/15 shadow-[0_0_14px_color-mix(in_oklab,var(--brand)_30%,transparent)]"
                  : "border-border bg-panel-raised hover:border-brand/50",
              )}
              style={{ left: pct(offset), width: `calc(${pct(dur)} - 3px)` }}
              title={`${clip.name} · ${formatTime(clip.start)} → ${formatTime(clip.end)} · ${clip.speed}x`}
            >
              <span className="block truncate text-[10px] font-bold">{clip.name}</span>
              <span className="block truncate font-mono text-[8px] text-muted-foreground">
                {formatTime(clip.start)}–{formatTime(clip.end)}
                {clip.speed !== 1 ? ` · ${clip.speed}x` : ""}
                {clip.muted ? " · tắt tiếng" : ""}
              </span>
            </button>
          ))}
          {layout.length === 0 && (
            <div className="absolute inset-0 grid place-items-center text-[11px] text-muted-foreground">
              Kéo video vào trang chủ để bắt đầu dự án mới
            </div>
          )}
        </div>

        {/* captions lane */}
        <div className="relative mt-1 h-7 rounded-md bg-panel/60">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
            Caption
          </span>
          {captions.map((cap) => (
            <button
              key={cap.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelectCaption(cap.id)}
              className={cn(
                "absolute top-1 bottom-1 overflow-hidden rounded border px-1 text-left",
                selectedCaptionId === cap.id
                  ? "border-brand bg-brand/20"
                  : "border-border bg-card hover:border-brand/50",
              )}
              style={{
                left: pct(cap.start),
                width: `calc(${pct(Math.max(0.5, cap.end - cap.start))} - 3px)`,
              }}
              title={cap.text}
            >
              <span className="block truncate text-[8px]">{cap.text.replace(/\*/g, "")}</span>
            </button>
          ))}
        </div>

        {/* playhead */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-brand"
          style={{ left: pct(Math.min(time, total)) }}
        >
          <div className="absolute -left-[5px] -top-0 size-[11px] rotate-45 rounded-[2px] bg-brand" />
        </div>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Bấm hoặc kéo trên timeline để di chuyển · bấm clip để chỉnh sửa · phím Space để phát/tạm
        dừng
      </p>
    </div>
  );
}
