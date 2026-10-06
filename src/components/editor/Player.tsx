import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";

import { formatTime, formatTimeMs, type Aspect, type Caption } from "@/lib/projects";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { PlayerApi } from "./usePlayer";

const ASPECT_CLASS: Record<Aspect, string> = {
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-[16/9]",
  "1:1": "aspect-square",
};

interface PlayerProps {
  player: PlayerApi;
  aspect: Aspect;
  captions: Caption[];
  previewMuted: boolean;
  onTogglePreviewMute: () => void;
}

export function Player({
  player,
  aspect,
  captions,
  previewMuted,
  onTogglePreviewMute,
}: PlayerProps) {
  const { videoRef, time, total, playing, toggle, step } = player;
  const active = captions.filter((c) => time >= c.start && time < c.end);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center rounded-xl border border-border bg-panel p-3">
        <div
          className={cn(
            "relative w-full max-w-[300px] overflow-hidden rounded-lg bg-black",
            ASPECT_CLASS[aspect],
          )}
        >
          <video
            ref={videoRef}
            crossOrigin="anonymous"
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {active.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[8%] flex flex-col items-center gap-1 px-4">
              {active.map((cap) => (
                <CaptionLine key={cap.id} text={cap.text} />
              ))}
            </div>
          )}
          {!playing && total === 0 && (
            <div className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">
              Chưa có clip nào
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => step(-5)} aria-label="Lùi 5 giây">
          <RotateCcw className="size-4" />
        </Button>
        <Button
          variant="gold"
          size="icon"
          onClick={toggle}
          aria-label={playing ? "Tạm dừng" : "Phát"}
          className="size-10 rounded-full"
        >
          {playing ? (
            <Pause className="size-4" fill="currentColor" />
          ) : (
            <Play className="ml-0.5 size-4" fill="currentColor" />
          )}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => step(5)} aria-label="Tiến 5 giây">
          <RotateCw className="size-4" />
        </Button>
        <div className="ml-1 font-mono text-xs text-muted-foreground">
          <span className="text-foreground">{formatTimeMs(time)}</span>
          {" / "}
          {formatTime(total)}
        </div>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePreviewMute}
            aria-label={previewMuted ? "Bật tiếng xem trước" : "Tắt tiếng xem trước"}
          >
            {previewMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CaptionLine({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g);
  return (
    <span className="max-w-full rounded-full bg-black/60 px-3 py-1 text-center text-sm font-bold leading-6 text-white">
      {parts.map((part, i) => {
        const isGold = part.startsWith("*") && part.endsWith("*") && part.length > 2;
        return (
          <span key={i} className={isGold ? "text-brand" : undefined}>
            {part.replace(/\*/g, "")}
          </span>
        );
      })}
    </span>
  );
}
