import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Music2, Trash2, WandSparkles, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { addMusicFiles, listMusic, type MusicTrack } from "@/lib/audio";
import { formatTime, type Hook, type ProjectMusic } from "@/lib/projects";

const HOOK_IDEAS = [
  "Đừng lướt qua video này!",
  "Bí mật ít ai biết",
  "3 giây thay đổi mọi thứ",
  "Sai lầm 90% người mắc phải",
];

/** Đọc thư viện nhạc và tự cập nhật khi có thay đổi. */
export function useMusicLibrary() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  useEffect(() => {
    const load = () => setTracks(listMusic());
    load();
    window.addEventListener("master-clip-music", load);
    return () => window.removeEventListener("master-clip-music", load);
  }, []);
  return tracks;
}

interface MusicHookPanelProps {
  hook: Hook | undefined;
  onHook: (hook: Hook | undefined) => void;
  music: ProjectMusic | undefined;
  onMusic: (music: ProjectMusic | undefined) => void;
  bpm: number | null;
  onBeatSync: () => void;
  onPreviewHook: () => void;
}

export function MusicHookPanel({
  hook,
  onHook,
  music,
  onMusic,
  bpm,
  onBeatSync,
  onPreviewHook,
}: MusicHookPanelProps) {
  const tracks = useMusicLibrary();
  const [uploading, setUploading] = useState(false);
  const text = hook?.text ?? "";
  const duration = hook?.duration ?? 2.5;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-panel p-3">
        <h4 className="flex items-center gap-2 text-[12px] font-bold">
          <WandSparkles className="size-4 text-brand" /> Hook mở đầu
        </h4>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
          Câu hook nổi bật trong vài giây đầu video để giữ người xem ở lại. Được đốt thẳng vào video
          khi xuất.
        </p>
        <textarea
          value={text}
          onChange={(e) => onHook(e.target.value ? { text: e.target.value, duration } : undefined)}
          rows={2}
          placeholder="VD: Cách tiết kiệm 2 giờ mỗi ngày"
          className="mt-3 w-full rounded-md border border-input bg-background p-2 text-xs outline-none focus:border-brand"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {HOOK_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => onHook({ text: idea, duration })}
              className="rounded-full border border-border px-2 py-1 text-[10px] text-muted-foreground hover:border-brand hover:text-foreground"
            >
              {idea}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px]">Thời gian hiển thị</Label>
            <span className="font-mono text-[11px] text-brand">{duration.toFixed(1)}s</span>
          </div>
          <Slider
            value={[duration]}
            min={0.5}
            max={8}
            step={0.5}
            disabled={!text}
            onValueChange={([v]) => onHook({ text, duration: v ?? 2.5 })}
            className="mt-2"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          disabled={!text}
          onClick={onPreviewHook}
        >
          Xem hook từ đầu
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-panel p-3">
        <h4 className="flex items-center gap-2 text-[12px] font-bold">
          <Music2 className="size-4 text-brand" /> Nhạc nền
        </h4>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
          Nhạc phát cùng bản xem trước và được trộn vào video khi xuất (tự lặp nếu ngắn hơn video).
        </p>
        <select
          aria-label="Chọn nhạc nền"
          value={music?.trackId ?? ""}
          onChange={(e) => {
            const track = tracks.find((t) => t.id === e.target.value);
            onMusic(
              track
                ? { trackId: track.id, name: track.name, volume: music?.volume ?? 0.4 }
                : undefined,
            );
          }}
          className="mt-3 h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">Không dùng nhạc</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {formatTime(t.duration)}
            </option>
          ))}
        </select>
        <label className="mt-2 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-[11px] text-muted-foreground hover:border-brand hover:text-foreground">
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Music2 className="size-3.5" />
          )}
          Tải nhạc từ máy (mp3, wav, m4a…)
          <input
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (!files.length) return;
              setUploading(true);
              try {
                const added = await addMusicFiles(files);
                const first = added[0];
                if (first)
                  onMusic({ trackId: first.id, name: first.name, volume: music?.volume ?? 0.4 });
                toast.success(`Đã thêm ${added.length} bản nhạc vào thư viện.`);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Không thêm được nhạc.");
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        {music && (
          <>
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <Label className="text-[11px]">Âm lượng nhạc</Label>
                <span className="font-mono text-[11px] text-brand">
                  {Math.round(music.volume * 100)}%
                </span>
              </div>
              <Slider
                value={[music.volume]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([v]) => onMusic({ ...music, volume: v ?? 0.4 })}
                className="mt-2"
              />
            </div>
            <div className="mt-3 rounded-md border border-border bg-card p-2.5">
              <p className="flex items-center gap-2 text-[11px] font-semibold">
                <Waves className="size-3.5 text-brand" /> Đồng bộ nhịp nhạc
              </p>
              <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                {bpm ? `Nhịp ước tính: ${bpm} BPM. ` : "Đang dò nhịp… "}
                Cắt tròn độ dài từng clip theo số phách để mỗi lần chuyển cảnh rơi đúng beat.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                disabled={!bpm}
                onClick={onBeatSync}
              >
                Khớp clip theo nhịp
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-destructive hover:text-destructive"
              onClick={() => onMusic(undefined)}
            >
              <Trash2 className="size-3.5" /> Bỏ nhạc nền
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
