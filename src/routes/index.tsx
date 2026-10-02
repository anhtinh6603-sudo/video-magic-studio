import { createFileRoute } from "@tanstack/react-router";
import {
  AudioLines,
  Captions,
  Check,
  ChevronDown,
  CircleDollarSign,
  Clapperboard,
  Clock3,
  CloudUpload,
  Download,
  FileAudio,
  Film,
  FolderOpen,
  Gauge,
  Headphones,
  Home,
  ImageIcon,
  Link2,
  Menu,
  MessageSquareText,
  Music2,
  Pause,
  Play,
  Plus,
  Scissors,
  Sparkles,
  Star,
  Upload,
  User,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import sampleGolfAerial from "@/assets/sample-golf-aerial.mp4.asset.json";
import sampleGolfMan from "@/assets/sample-golf-man.mp4.asset.json";
import sampleGolfSwing from "@/assets/sample-golf-swing.mp4.asset.json";
import sampleLake from "@/assets/sample-lake.mp4.asset.json";
import sampleTravel from "@/assets/sample-travel.mp4.asset.json";
import sampleVilla from "@/assets/sample-villa.mp4.asset.json";
import presenter from "@/assets/sample-presenter.jpg";
import runner from "@/assets/sample-runner.jpg";
import stretch from "@/assets/sample-stretch.jpg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Master Clip — Video dài thành nhiều Short" },
      { name: "description", content: "Biến video thô thành nội dung viral tự động bằng AI." },
      { property: "og:title", content: "Master Clip — Video dài thành nhiều Short" },
      {
        property: "og:description",
        content: "Biến video thô thành nội dung viral tự động bằng AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type AiTool = { icon: LucideIcon; label: string; sublabel?: string };

type WorkflowSkill = { name: string; description: string };

const workflowSkills: WorkflowSkill[] = [
  { name: "Dạng 1 · Thoại + Thumbnail", description: "Cắt gọn, thumbnail mở đầu và caption động." },
  { name: "Dạng 2 · Hiệu ứng cao cấp", description: "Zoom cảm xúc, overlay, SFX và crop bám mặt." },
  {
    name: "Dạng 3 · Hướng dẫn tối giản",
    description: "Video chuyên gia sạch, rõ nội dung và CTA.",
  },
  { name: "Dạng 4 · Infographic trắng", description: "Lớp phủ infographic sáng kiểu HeyGen." },
  {
    name: "Cấp độ 1 · Khung đơn",
    description: "Cắt video dài 1 người nói thành nhiều short 9:16.",
  },
  {
    name: "Cấp độ 2 · Postcard 2 người",
    description: "Podcast 2 người, khung postcard linh hoạt theo người nói.",
  },
  {
    name: "Highlight theo nhạc",
    description: "AI tự cắt đoạn hay nhất từ 1 video, ghép khớp beat nhạc.",
  },
  {
    name: "Nhiều clip + Nhạc trend",
    description: "Ghép nhiều clip rời thành 1 video đúng nhịp nhạc hot.",
  },
  {
    name: "KOL chuyển động tự nhiên",
    description: "Người thật nói chuyện, chuyển động tự nhiên kiểu Veo.",
  },
  {
    name: "Chữ động HyperFrames",
    description: "Intro, chữ động và overlay motion graphic điện ảnh.",
  },
  {
    name: "Talking-head Studio",
    description: "Video chuyên gia 4 phong cách dựng sẵn, caption đẹp.",
  },
  { name: "Tái chế video", description: "Biến video dài hoặc podcast thành loạt short viral." },
];

const tools: AiTool[] = [
  { icon: Film, label: "Sửa Đổi Video AI" },
  { icon: Music2, label: "Đồng Bộ Nhạc", sublabel: "Thông minh" },
  { icon: AudioLines, label: "Lọc Mức Điểm", sublabel: "Âm" },
  { icon: Sparkles, label: "AI Chấm Điểm", sublabel: "Cảnh Quay" },
  { icon: Clapperboard, label: "Video Dài →", sublabel: "Short" },
  { icon: Download, label: "Nhập Từ", sublabel: "YouTube/Drive" },
  { icon: WandSparkles, label: "Hook Mở Đầu" },
  { icon: Captions, label: "Caption Đồng", sublabel: "Bộ" },
  { icon: Scissors, label: "Cắt Khoảng", sublabel: "Lặng Tự Động" },
  { icon: ImageIcon, label: "Slide Đồ Họa AI" },
  { icon: FileAudio, label: "Đồng Bộ Nhịp", sublabel: "Nhạc" },
  { icon: Gauge, label: "Lọc Mức Ồn", sublabel: "Âm" },
];

const samples = [
  { video: sampleGolfAerial.url, name: "Video mẫu 1" },
  { video: sampleVilla.url, name: "Video mẫu 2" },
  { video: sampleGolfSwing.url, name: "Video mẫu 3" },
  { video: sampleGolfMan.url, name: "Video mẫu 4" },
  { video: sampleTravel.url, name: "Video mẫu 5" },
  { video: sampleLake.url, name: "Video mẫu 6" },
];

const projects = [
  {
    title: "cải phân tích xương — bản đề xuất 8 cảnh",
    meta: "Bản dự án · 2:44",
    image: null,
    active: true,
  },
  {
    title: "cải phân tích xương — bản đề xuất 8 cảnh",
    meta: "Bản dự án · 2:15",
    image: null,
    active: true,
  },
  { title: "video-nhiều-clip-nhạc", meta: "30.09.2026 · 1:39", image: runner },
  { title: "2026-09-30_ai_sub-agent-edit-video", meta: "30.09.2026 · 0:48", image: presenter },
  { title: "video-nhiều-clip-nhạc", meta: "28.09.2026 · 1:49", image: stretch },
];

function Index() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [mode, setMode] = useState("Video dài → Short");
  const [tab, setTab] = useState("Tất cả các dự án");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedSample, setSelectedSample] = useState<number | null>(null);
  const [playingSample, setPlayingSample] = useState<number | null>(null);
  const [favorite, setFavorite] = useState<number[]>([3]);
  const [notice, setNotice] = useState("");
  const [selectedSkill, setSelectedSkill] = useState(workflowSkills[0].name);

  function handleUrl() {
    setNotice(
      url.trim() ? "Đã nhận liên kết — sẵn sàng tạo dự án." : "Hãy dán liên kết video trước.",
    );
  }

  function toggleSample(index: number) {
    const video = videoRefs.current[index];
    if (!video) return;
    if (playingSample === index) {
      video.pause();
      setPlayingSample(null);
      return;
    }
    videoRefs.current.forEach((other, i) => {
      if (i !== index && other) other.pause();
    });
    video.play().catch(() => undefined);
    setSelectedSample(index);
    setPlayingSample(index);
  }

  function chooseFile(file?: File) {
    if (!file) return;
    setFileName(file.name);
    setNotice(`Đã thêm ${file.name}`);
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <Header onNotice={setNotice} />

      <aside className="fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-44 border-r border-border/60 bg-background/95 p-3 xl:block">
        <Button
          variant="outline"
          className="h-10 w-full justify-start border-brand/65 bg-brand/5 text-brand"
        >
          <Home className="size-4" /> Trang chủ
        </Button>
        <div className="mt-auto flex h-[calc(100%-3rem)] items-end">
          <Button variant="ghost" className="w-full justify-start">
            <MessageSquareText className="size-4" /> Phản hồi
          </Button>
        </div>
      </aside>

      <main className="relative mx-auto max-w-[1040px] px-4 pb-14 pt-9 sm:px-6 xl:ml-[calc((100vw-1040px)/2+42px)]">
        <div className="pointer-events-none absolute left-1/2 top-6 -z-0 h-80 w-[620px] -translate-x-1/2 app-grid opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <section className="relative z-10 mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold text-foreground">
            Biến video thô thành content viral — tự động, bằng AI.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Kéo thả video dài — AI quét và đề xuất đoạn hay nhất.
          </p>

          <div className="mt-4 rounded-lg border border-border bg-card p-2 shadow-2xl">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  aria-label="Liên kết video"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleUrl()}
                  placeholder="Dán link YouTube, Google Drive, hoặc link file video"
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:border-brand"
                />
              </div>
              <Button variant="gold" size="sm" className="h-10" onClick={handleUrl}>
                Lấy video
              </Button>
            </div>

            <div className="my-2 flex items-center gap-3 text-[10px] uppercase text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              hoặc
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                chooseFile(event.dataTransfer.files[0]);
              }}
              className="flex h-16 w-full items-center justify-center gap-3 rounded-md border border-dashed border-border bg-panel-raised text-left transition-colors hover:border-brand/60"
            >
              <span className="grid size-8 place-items-center rounded-md bg-brand/10 text-brand">
                <CloudUpload className="size-4" />
              </span>
              <span>
                <strong className="block text-xs">
                  {fileName || "Kéo thả file video dài vào đây"}
                </strong>
                <span className="mt-1 block text-[10px] text-muted-foreground">
                  hoặc bấm để chọn file từ máy
                </span>
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-1 text-[11px]">
            <span className="mr-2 text-muted-foreground">Chế độ tạo:</span>
            {["Talking-head", "Nhiều clip + Nhạc", "Video dài → Short"].map((item) => (
              <Button
                key={item}
                variant="ghost"
                size="sm"
                onClick={() => setMode(item)}
                className={cn("h-7 px-2", mode === item && "border-b border-brand text-brand")}
              >
                {item}
              </Button>
            ))}
          </div>
        </section>

        <section className="relative z-10 mt-8" aria-labelledby="ai-tools-title">
          <h2
            id="ai-tools-title"
            className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
          >
            Được hỗ trợ bởi AI
          </h2>
          <div className="marquee relative mt-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]">
            <div className="marquee-track flex w-max items-start">
              {[0, 1].map((copy) => (
                <div
                  key={copy}
                  aria-hidden={copy === 1}
                  className="flex items-start gap-5 pr-5 sm:gap-8 sm:pr-8"
                >
                  {tools.map(({ icon: Icon, label, sublabel }) => (
                    <button
                      key={`${copy}-${label}`}
                      type="button"
                      tabIndex={copy === 1 ? -1 : 0}
                      onClick={() =>
                        setNotice(`${label}${sublabel ? ` ${sublabel}` : ""} đã được chọn.`)
                      }
                      className="group flex w-[72px] shrink-0 flex-col items-center gap-2 text-center sm:w-[86px]"
                    >
                      <span className="grid size-10 place-items-center rounded-full border border-border bg-panel-raised text-brand transition-all group-hover:border-brand group-hover:bg-brand/10">
                        <Icon className="size-[18px]" strokeWidth={1.8} />
                      </span>
                      <span className="text-[9px] font-semibold leading-3 text-muted-foreground group-hover:text-foreground">
                        {label}
                        <br />
                        {sublabel}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 mt-9" aria-labelledby="skills-title">
          <div className="mb-1 flex items-end justify-between gap-3">
            <div>
              <h2
                id="skills-title"
                className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
              >
                Skill đã nạp
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Chọn workflow trước khi đưa video vào dùng.
              </p>
            </div>
            <span className="rounded-full border border-brand/60 px-2.5 py-1 text-[10px] font-bold text-brand">
              {workflowSkills.length} Skill
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {workflowSkills.map((skill) => {
              const active = selectedSkill === skill.name;
              return (
                <button
                  key={skill.name}
                  type="button"
                  onClick={() => {
                    setSelectedSkill(skill.name);
                    setNotice(`Đã chọn workflow: ${skill.name}.`);
                  }}
                  className={cn(
                    "relative rounded-lg border bg-card p-3 text-left transition-colors",
                    active
                      ? "border-brand shadow-[0_0_18px_color-mix(in_oklab,var(--brand)_25%,transparent)]"
                      : "border-border hover:border-brand/50",
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <Sparkles className="size-4 shrink-0 text-brand" />
                    {active && (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground">
                        <Check className="size-3" />
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block text-[11px] font-bold">{skill.name}</span>
                  <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">
                    {skill.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="relative z-10 mt-9" aria-labelledby="sample-title">
          <h2
            id="sample-title"
            className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
          >
            Video mẫu
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {samples.map((sample, index) => (
              <article
                key={sample.name}
                className={cn(
                  "group relative overflow-hidden rounded-lg border bg-card transition-colors",
                  selectedSample === index ? "border-brand" : "border-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSample(index)}
                  className="relative block aspect-[9/14] w-full overflow-hidden bg-panel"
                >
                  <video
                    ref={(el) => {
                      videoRefs.current[index] = el;
                    }}
                    src={sample.video}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="auto"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/10" />
                  <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full border border-foreground/20 bg-background/65 text-foreground">
                    {playingSample === index ? (
                      <Pause className="size-3" fill="currentColor" />
                    ) : (
                      <Play className="ml-0.5 size-3" fill="currentColor" />
                    )}
                  </span>
                  {index === 4 && (
                    <span className="absolute inset-x-2 top-1/2 text-sm font-extrabold">
                      Follow us for
                    </span>
                  )}
                  {selectedSample === index && (
                    <span className="absolute left-2 top-2 grid size-5 place-items-center rounded-full bg-brand text-brand-foreground">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
                <div className="px-2 py-2 text-[10px] font-semibold">{sample.name}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="relative z-10 mt-9" aria-label="Danh sách dự án">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
            <div className="flex items-center gap-4">
              {["Tất cả các dự án", "Dự án đã lưu", "Nháp"].map((item, index) => (
                <Button
                  key={item}
                  variant="ghost"
                  size="sm"
                  onClick={() => setTab(item)}
                  className={cn(
                    "h-9 rounded-none px-0 text-[11px]",
                    tab === item && "border-b-2 border-brand text-foreground",
                  )}
                >
                  {item} <span className="text-muted-foreground">({index === 0 ? 6 : 0})</span>
                </Button>
              ))}
            </div>
            <div className="flex gap-3 text-[10px]">
              <Button variant="ghost" size="sm" className="px-1">
                Chọn nhiều
              </Button>
              <Button variant="ghost" size="sm" className="px-1">
                Xem tất cả
              </Button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {projects.map((project, index) => (
              <article
                key={`${project.title}-${index}`}
                className={cn(
                  "overflow-hidden rounded-lg border bg-card",
                  project.active ? "border-brand/65" : "border-border",
                )}
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-panel-raised">
                  {project.image ? (
                    <img
                      src={project.image}
                      alt=""
                      loading="lazy"
                      width={768}
                      height={1376}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                      <span className="grid size-8 place-items-center rounded-full bg-brand text-brand-foreground">
                        <Play className="ml-0.5 size-4" fill="currentColor" />
                      </span>
                      <span className="text-[9px] font-semibold">
                        cải phân tích xương — bản đề xuất 8 cảnh
                      </span>
                    </div>
                  )}
                  {project.image && (
                    <span className="absolute bottom-2 left-2 rounded bg-background/80 px-1.5 py-1 text-[8px] font-bold">
                      Còn 15 ngày
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Yêu thích dự án"
                    onClick={() =>
                      setFavorite((old) =>
                        old.includes(index)
                          ? old.filter((item) => item !== index)
                          : [...old, index],
                      )
                    }
                    className="absolute right-1 top-1 size-7 bg-background/65"
                  >
                    <Star
                      className={cn("size-3", favorite.includes(index) && "fill-brand text-brand")}
                    />
                  </Button>
                </div>
                <div className="p-2">
                  <h3 className="truncate text-[10px] font-bold">{project.title}</h3>
                  <p className="mt-1 text-[8px] text-muted-foreground">{project.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {notice && (
        <div className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-md border border-brand/40 bg-popover px-4 py-3 text-xs shadow-2xl">
          <Check className="size-4 text-brand" />
          <span>{notice}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Đóng thông báo"
            onClick={() => setNotice("")}
            className="ml-2 size-6"
          >
            <X className="size-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Header({ onNotice }: { onNotice: (message: string) => void }) {
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-brand/25 bg-background/95 shadow-[0_4px_22px_color-mix(in_oklab,var(--brand)_10%,transparent)] backdrop-blur">
      <div className="flex h-full items-center justify-between px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="xl:hidden">
            <Menu className="size-4" />
          </Button>
          <div className="font-display text-2xl font-extrabold italic gold-text sm:text-3xl">
            Master Clip
          </div>
          <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">
            Video dài → Nhiều Short
          </span>
        </div>
        <div className="hidden text-[10px] font-semibold text-muted-foreground lg:block">
          Thời Gian · Thu Nhập · Tự Do
        </div>
        <nav className="flex items-center gap-1.5">
          <Button variant="nav" size="sm" onClick={() => onNotice("Bảng giá sẽ được cập nhật.")}>
            <CircleDollarSign className="size-3.5" />
            <span className="hidden sm:inline">Giá cả</span>
          </Button>
          <Button variant="nav" size="sm" onClick={() => onNotice("Đã mở thư viện dự án.")}>
            <FolderOpen className="size-3.5" />
            <span className="hidden md:inline">Dự án</span>
          </Button>
          <Button variant="nav" size="sm" onClick={() => onNotice("Đã mở thư viện âm thanh.")}>
            <Headphones className="size-3.5" />
            <span className="hidden md:inline">Âm thanh</span>
          </Button>
          <Button
            variant="nav"
            size="sm"
            onClick={() => onNotice("Tính năng đăng nhập đang chờ kết nối.")}
          >
            <User className="size-3.5 sm:hidden" />
            <span className="hidden sm:inline">Đăng nhập</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
