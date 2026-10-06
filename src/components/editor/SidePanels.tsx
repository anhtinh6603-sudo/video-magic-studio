import { useState } from "react";
import {
  Captions,
  Copy,
  FileDown,
  FileUp,
  Film,
  Loader2,
  Music2,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatTimeMs, type Caption, type Clip } from "@/lib/projects";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Clip panel
// ---------------------------------------------------------------------------

interface ClipPanelProps {
  clip: Clip | null;
  onChange: (id: string, patch: Partial<Clip>) => void;
  onSplit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ClipPanel({ clip, onChange, onSplit, onDuplicate, onDelete }: ClipPanelProps) {
  if (!clip) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Chọn một clip trên timeline để chỉnh sửa.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[11px]">Tên clip</Label>
        <Input
          value={clip.name}
          onChange={(e) => onChange(clip.id, { name: e.target.value })}
          className="mt-1 h-9 text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px]">Bắt đầu (giây)</Label>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={Number(clip.start.toFixed(2))}
            onChange={(e) =>
              onChange(clip.id, {
                start: Math.max(0, Number(e.target.value) || 0),
              })
            }
            className="mt-1 h-9 font-mono text-xs"
          />
        </div>
        <div>
          <Label className="text-[11px]">Kết thúc (giây)</Label>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={Number(clip.end.toFixed(2))}
            onChange={(e) =>
              onChange(clip.id, {
                end: Math.max(0.1, Number(e.target.value) || 0.1),
              })
            }
            className="mt-1 h-9 font-mono text-xs"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Tốc độ phát</Label>
          <span className="font-mono text-[11px] text-brand">{clip.speed.toFixed(1)}x</span>
        </div>
        <Slider
          value={[clip.speed]}
          min={0.5}
          max={2}
          step={0.1}
          onValueChange={([v]) => onChange(clip.id, { speed: v ?? 1 })}
          className="mt-2"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label className="text-[11px]">Âm lượng</Label>
          <span className="font-mono text-[11px] text-brand">{Math.round(clip.volume * 100)}%</span>
        </div>
        <Slider
          value={[clip.volume]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={([v]) => onChange(clip.id, { volume: v ?? 1, muted: false })}
          className="mt-2"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-panel px-3 py-2">
        <span className="flex items-center gap-2 text-[11px] font-semibold">
          <VolumeX className="size-3.5 text-muted-foreground" /> Tắt tiếng clip
        </span>
        <Switch checked={clip.muted} onCheckedChange={(v) => onChange(clip.id, { muted: v })} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSplit(clip.id)}
          className="text-[11px]"
        >
          <Scissors className="size-3.5" /> Chia clip
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDuplicate(clip.id)}
          className="text-[11px]"
        >
          <Copy className="size-3.5" /> Nhân bản
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(clip.id)}
          className="text-[11px] text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3.5" /> Xóa
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        "Chia clip" cắt clip đang chọn tại vị trí playhead hiện tại.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Caption panel
// ---------------------------------------------------------------------------

interface CaptionPanelProps {
  captions: Caption[];
  time: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onChange: (id: string, patch: Partial<Caption>) => void;
  onDelete: (id: string) => void;
  onImportSrt: (file: File) => void;
  onExportSrt: () => void;
}

export function CaptionPanel({
  captions,
  time,
  selectedId,
  onSelect,
  onAdd,
  onChange,
  onDelete,
  onImportSrt,
  onExportSrt,
}: CaptionPanelProps) {
  const sorted = [...captions].sort((a, b) => a.start - b.start);
  return (
    <div className="space-y-3">
      <Button variant="gold" size="sm" onClick={onAdd} className="w-full">
        <Plus className="size-3.5" /> Thêm caption tại {formatTimeMs(time)}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-[11px] font-semibold hover:bg-accent">
          <FileUp className="size-3.5" /> Nhập SRT/VTT
          <input
            type="file"
            accept=".srt,.vtt,text/vtt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onImportSrt(file);
            }}
          />
        </label>
        <Button
          variant="outline"
          size="sm"
          className="text-[11px]"
          disabled={!captions.some((c) => c.text.trim())}
          onClick={onExportSrt}
        >
          <FileDown className="size-3.5" /> Xuất SRT
        </Button>
      </div>
      <p className="text-[10px] leading-4 text-muted-foreground">
        Mẹo: bọc từ khóa trong <span className="font-mono text-brand">*dấu sao*</span> để hiển thị
        màu vàng nổi bật, ví dụ: <span className="font-mono">Giảm *50%* hôm nay</span>
      </p>
      {sorted.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Chưa có caption nào. Thêm caption để video short thu hút hơn.
        </div>
      )}
      <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
        {sorted.map((cap) => {
          const active = selectedId === cap.id;
          return (
            <div
              key={cap.id}
              className={cn(
                "rounded-lg border p-2.5",
                active ? "border-brand bg-brand/5" : "border-border bg-panel",
              )}
            >
              <div className="flex items-center gap-2">
                <Captions className="size-3.5 shrink-0 text-brand" />
                <button
                  type="button"
                  onClick={() => onSelect(active ? null : cap.id)}
                  className="flex-1 truncate text-left text-[11px] font-bold"
                >
                  {cap.text.replace(/\*/g, "") || "(trống)"}
                </button>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {formatTimeMs(cap.start)}–{formatTimeMs(cap.end)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-destructive"
                  onClick={() => onDelete(cap.id)}
                  aria-label="Xóa caption"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
              {active && (
                <div className="mt-2 space-y-2">
                  <Input
                    value={cap.text}
                    onChange={(e) => onChange(cap.id, { text: e.target.value })}
                    placeholder="Nội dung caption…"
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={Number(cap.start.toFixed(2))}
                      onChange={(e) =>
                        onChange(cap.id, { start: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="h-8 font-mono text-[11px]"
                      aria-label="Caption bắt đầu"
                    />
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      value={Number(cap.end.toFixed(2))}
                      onChange={(e) =>
                        onChange(cap.id, { end: Math.max(0.1, Number(e.target.value) || 0.1) })
                      }
                      className="h-8 font-mono text-[11px]"
                      aria-label="Caption kết thúc"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI tools panel (runs 100% in the browser)
// ---------------------------------------------------------------------------

export interface ToolsPanelProps {
  hasClip: boolean;
  selectedClipName: string;
  busy: string | null;
  progress: number;
  thresholdDb: number;
  onThresholdDb: (v: number) => void;
  minSilence: number;
  onMinSilence: (v: number) => void;
  shortLen: number;
  onShortLen: (v: number) => void;
  onCutSilence: () => void;
  onSplitShorts: () => void;
  onExport: () => void;
  highlightCount: number;
  onHighlightCount: (v: number) => void;
  onSuggestHighlights: () => void;
}

const COMING_SOON = ["Slide đồ họa AI", "Tách nền / xóa vật thể", "Nhận dạng giọng nói → caption"];

export function ToolsPanel(props: ToolsPanelProps) {
  const {
    hasClip,
    selectedClipName,
    busy,
    progress,
    thresholdDb,
    onThresholdDb,
    minSilence,
    onMinSilence,
    shortLen,
    onShortLen,
    onCutSilence,
    onSplitShorts,
    onExport,
    highlightCount,
    onHighlightCount,
    onSuggestHighlights,
  } = props;
  const running = busy !== null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-brand/40 bg-panel p-3">
        <h4 className="flex items-center gap-2 text-[12px] font-bold">
          <Sparkles className="size-4 text-brand" /> AI chấm điểm & chọn đoạn hay
        </h4>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
          Quét âm thanh của clip đang chọn, chấm điểm theo mật độ lời nói, độ lớn và cảm xúc, rồi
          giữ lại những đoạn hay nhất (dài khoảng {shortLen}s, cắt đúng chỗ ngắt câu).
        </p>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px]">Số đoạn muốn lấy</Label>
            <span className="font-mono text-[11px] text-brand">{highlightCount}</span>
          </div>
          <Slider
            value={[highlightCount]}
            min={1}
            max={15}
            step={1}
            onValueChange={([v]) => onHighlightCount(v ?? 5)}
            className="mt-2"
            disabled={running}
          />
        </div>
        <Button
          variant="gold"
          size="sm"
          className="mt-3 w-full"
          disabled={!hasClip || running}
          onClick={onSuggestHighlights}
        >
          {running && busy === "highlight" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Đang chấm điểm…
            </>
          ) : (
            "Quét & đề xuất đoạn hay"
          )}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-panel p-3">
        <h4 className="flex items-center gap-2 text-[12px] font-bold">
          <Scissors className="size-4 text-brand" /> Cắt khoảng lặng tự động
        </h4>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
          AI phân tích sóng âm ngay trên máy và loại bỏ những đoạn im lặng
          {hasClip ? (
            <>
              {" "}
              trong clip <span className="font-bold text-foreground">"{selectedClipName}"</span>
            </>
          ) : (
            " trong clip đang chọn"
          )}
          .
        </p>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px]">Ngưỡng im lặng</Label>
            <span className="font-mono text-[11px] text-brand">{thresholdDb} dB</span>
          </div>
          <Slider
            value={[thresholdDb]}
            min={-50}
            max={-20}
            step={1}
            onValueChange={([v]) => onThresholdDb(v ?? -38)}
            className="mt-2"
            disabled={running}
          />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px]">Bỏ qua khoảng lặng từ</Label>
            <span className="font-mono text-[11px] text-brand">{minSilence.toFixed(1)}s</span>
          </div>
          <Slider
            value={[minSilence]}
            min={0.3}
            max={2}
            step={0.1}
            onValueChange={([v]) => onMinSilence(v ?? 0.6)}
            className="mt-2"
            disabled={running}
          />
        </div>
        <Button
          variant="gold"
          size="sm"
          className="mt-3 w-full"
          disabled={!hasClip || running}
          onClick={onCutSilence}
        >
          {running && busy === "silence" ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Đang phân tích…{" "}
              {Math.round(progress * 100)}%
            </>
          ) : (
            "Chạy cắt khoảng lặng"
          )}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-panel p-3">
        <h4 className="flex items-center gap-2 text-[12px] font-bold">
          <Film className="size-4 text-brand" /> Video dài → nhiều Short
        </h4>
        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
          Chia đều clip dài thành các short theo độ dài bạn chọn (độ dài này cũng dùng cho AI đề
          xuất ở trên).
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Label className="text-[11px]">Mỗi short tối đa</Label>
          <Input
            type="number"
            min={10}
            max={180}
            value={shortLen}
            onChange={(e) => onShortLen(Math.min(180, Math.max(10, Number(e.target.value) || 60)))}
            className="h-8 w-20 font-mono text-xs"
            disabled={running}
          />
          <span className="text-[11px] text-muted-foreground">giây</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          disabled={!hasClip || running}
          onClick={onSplitShorts}
        >
          Chia clip đang chọn
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-panel p-3">
        <h4 className="flex items-center gap-2 text-[12px] font-bold">
          <Sparkles className="size-4 text-brand" /> Công cụ AI nâng cao
        </h4>
        <ul className="mt-2 space-y-1.5">
          {COMING_SOON.map((name) => (
            <li
              key={name}
              className="flex items-center justify-between rounded-md bg-card px-2.5 py-1.5 text-[11px]"
            >
              <span className="text-muted-foreground">{name}</span>
              <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-bold text-muted-foreground">
                Sắp có
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Button variant="gold" className="w-full" onClick={onExport} disabled={running}>
        Xuất video
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab container
// ---------------------------------------------------------------------------

export type SideTab = "clip" | "caption" | "music" | "tools";

export function SideTabs({ tab, onTab }: { tab: SideTab; onTab: (t: SideTab) => void }) {
  const items: { id: SideTab; label: string; icon: typeof Film }[] = [
    { id: "clip", label: "Clip", icon: Film },
    { id: "caption", label: "Caption", icon: Captions },
    { id: "music", label: "Nhạc & Hook", icon: Music2 },
    { id: "tools", label: "AI", icon: Sparkles },
  ];
  return (
    <div className="grid grid-cols-4 gap-1 rounded-lg border border-border bg-panel p-1">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTab(id)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[11px] font-bold transition-colors",
            tab === id
              ? "bg-brand text-brand-foreground shadow-brand"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

export function useSideTabState(initial: SideTab = "clip") {
  const [tab, setTab] = useState<SideTab>(initial);
  return { tab, setTab };
}
