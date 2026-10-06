// Các hộp thoại của trang chủ: bảng giá, thư viện âm thanh, hồ sơ, phản hồi và menu di động.
// Tất cả chạy trên trình duyệt; chưa có máy chủ/tài khoản online.

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  CircleDollarSign,
  ClipboardCopy,
  FolderOpen,
  Headphones,
  Home,
  Loader2,
  MessageSquareText,
  Music2,
  Pause,
  Play,
  Trash2,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMusicLibrary } from "@/components/editor/MusicHookPanel";
import { addMusicFiles, deleteMusic, getMusicBlob } from "@/lib/audio";
import { formatTime } from "@/lib/projects";
import { cn } from "@/lib/utils";

export type HomeDialog = "pricing" | "music" | "account" | "feedback" | null;

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

const PROFILE_KEY = "master-clip-profile-v1";
const FEEDBACK_KEY = "master-clip-feedback-v1";

function readProfileName() {
  try {
    return (JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as { name?: string }).name ?? "";
  } catch {
    return "";
  }
}

/** Tên hiển thị của hồ sơ trên máy (rỗng nếu chưa đặt). */
export function useProfileName() {
  const [name, setName] = useState("");
  useEffect(() => {
    const load = () => setName(readProfileName());
    load();
    window.addEventListener("master-clip-profile", load);
    return () => window.removeEventListener("master-clip-profile", load);
  }, []);
  return name;
}

export function PricingDialog({ open, onOpenChange }: DialogProps) {
  const free = [
    "Không giới hạn dự án, lưu ngay trên trình duyệt",
    "Cắt khoảng lặng & AI chấm điểm đoạn hay",
    "Chia video dài thành nhiều short",
    "Caption, hook mở đầu, nhạc nền, khớp nhịp",
    "Xuất 9:16 / 16:9 / 1:1 không watermark",
  ];
  const pro = [
    "Nhận dạng giọng nói → caption tự động",
    "Tách nền, xoá vật thể, slide đồ hoạ AI",
    "Nhập trực tiếp từ YouTube / Google Drive",
    "Lưu dự án trên đám mây, dùng nhiều máy",
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-popover">
        <DialogHeader>
          <DialogTitle>Bảng giá</DialogTitle>
          <DialogDescription>
            Mọi xử lý hiện chạy ngay trên máy bạn nên bản hiện tại hoàn toàn miễn phí.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-brand bg-brand/5 p-4">
            <p className="text-xs font-bold text-brand">Miễn phí · Đang dùng</p>
            <p className="mt-1 font-display text-2xl font-extrabold">0đ</p>
            <ul className="mt-3 space-y-2">
              {free.map((item) => (
                <li key={item} className="flex gap-2 text-[11px]">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-bold text-muted-foreground">Pro · Sắp ra mắt</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-muted-foreground">
              Sẽ công bố
            </p>
            <ul className="mt-3 space-y-2">
              {pro.map((item) => (
                <li key={item} className="flex gap-2 text-[11px] text-muted-foreground">
                  <Check className="mt-0.5 size-3.5 shrink-0" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MusicLibraryDialog({ open, onOpenChange }: DialogProps) {
  const tracks = useMusicLibrary();
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = () => {
    audioRef.current?.pause();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPlaying(null);
  };

  useEffect(() => {
    if (!open) stop();
  }, [open]);

  const toggle = async (id: string) => {
    if (playing === id) {
      stop();
      return;
    }
    stop();
    const blob = await getMusicBlob(id);
    if (!blob) {
      toast.error("Không tìm thấy file nhạc.");
      return;
    }
    const url = URL.createObjectURL(blob);
    urlRef.current = url;
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.src = url;
    audio.onended = stop;
    await audio.play().catch(() => undefined);
    setPlaying(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border bg-popover">
        <DialogHeader>
          <DialogTitle>Thư viện âm thanh</DialogTitle>
          <DialogDescription>
            Nhạc tải lên được lưu trên trình duyệt này và dùng làm nhạc nền trong tab “Nhạc & Hook”
            của trình chỉnh sửa.
          </DialogDescription>
        </DialogHeader>
        <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:border-brand hover:text-foreground">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Music2 className="size-4" />}
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
                toast.success(`Đã thêm ${added.length} bản nhạc.`);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Không thêm được nhạc.");
              } finally {
                setUploading(false);
              }
            }}
          />
        </label>
        {tracks.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Thư viện đang trống.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {tracks.map((track) => (
              <li
                key={track.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
              >
                <Button
                  variant={playing === track.id ? "gold" : "outline"}
                  size="icon"
                  className="size-8 rounded-full"
                  aria-label={playing === track.id ? "Dừng" : "Nghe thử"}
                  onClick={() => void toggle(track.id)}
                >
                  {playing === track.id ? (
                    <Pause className="size-3.5" fill="currentColor" />
                  ) : (
                    <Play className="ml-0.5 size-3.5" fill="currentColor" />
                  )}
                </Button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{track.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatTime(track.duration)}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive"
                  aria-label="Xoá bản nhạc"
                  onClick={() => {
                    if (playing === track.id) stop();
                    void deleteMusic(track.id);
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AccountDialog({ open, onOpenChange }: DialogProps) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName(readProfileName());
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border bg-popover">
        <DialogHeader>
          <DialogTitle>Hồ sơ trên máy này</DialogTitle>
          <DialogDescription>
            Đăng nhập online chưa được kết nối. Dự án và video của bạn đang được lưu riêng trên
            trình duyệt này — đặt tên hiển thị để cá nhân hoá không gian làm việc.
          </DialogDescription>
        </DialogHeader>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên hiển thị"
          maxLength={40}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-brand"
        />
        <Button
          variant="gold"
          onClick={() => {
            localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: name.trim() }));
            window.dispatchEvent(new Event("master-clip-profile"));
            toast.success(name.trim() ? `Xin chào, ${name.trim()}!` : "Đã xoá tên hiển thị.");
            onOpenChange(false);
          }}
        >
          Lưu
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackDialog({ open, onOpenChange }: DialogProps) {
  const [text, setText] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border bg-popover">
        <DialogHeader>
          <DialogTitle>Phản hồi</DialogTitle>
          <DialogDescription>
            Góp ý được lưu lại trên máy. Bấm “Sao chép” để dán gửi cho đội phát triển qua kênh bạn
            muốn.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Bạn muốn cải thiện điều gì?"
          className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:border-brand"
        />
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!text.trim()}
            onClick={() => {
              navigator.clipboard
                .writeText(text.trim())
                .then(() => toast.success("Đã sao chép nội dung phản hồi."))
                .catch(() => toast.error("Không sao chép được."));
            }}
          >
            <ClipboardCopy className="size-4" /> Sao chép
          </Button>
          <Button
            variant="gold"
            disabled={!text.trim()}
            onClick={() => {
              try {
                const list = JSON.parse(localStorage.getItem(FEEDBACK_KEY) ?? "[]") as unknown[];
                list.push({ text: text.trim(), at: Date.now() });
                localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list));
              } catch {
                /* ignore */
              }
              toast.success("Cảm ơn bạn! Phản hồi đã được lưu.");
              setText("");
              onOpenChange(false);
            }}
          >
            Lưu phản hồi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MobileMenu({
  open,
  onOpenChange,
  onOpen,
  onProjects,
}: DialogProps & { onOpen: (dialog: Exclude<HomeDialog, null>) => void; onProjects: () => void }) {
  const items = [
    {
      icon: Home,
      label: "Trang chủ",
      action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    },
    { icon: FolderOpen, label: "Dự án", action: onProjects },
    { icon: Headphones, label: "Âm thanh", action: () => onOpen("music") },
    { icon: CircleDollarSign, label: "Giá cả", action: () => onOpen("pricing") },
    { icon: User, label: "Hồ sơ", action: () => onOpen("account") },
    { icon: MessageSquareText, label: "Phản hồi", action: () => onOpen("feedback") },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 border-border bg-background">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl font-extrabold italic gold-text">
            Master Clip
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-1">
          {items.map(({ icon: Icon, label, action }, index) => (
            <Button
              key={label}
              variant="ghost"
              className={cn("w-full justify-start", index === 0 && "text-brand")}
              onClick={() => {
                onOpenChange(false);
                action();
              }}
            >
              <Icon className="size-4" /> {label}
            </Button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
