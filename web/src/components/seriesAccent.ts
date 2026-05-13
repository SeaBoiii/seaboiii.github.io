// Stable color assignment per series, used for card highlights and badges.
const PALETTE = [
  {
    border: "border-amber-300/60",
    borderHover: "border-amber-400",
    bar: "bg-gradient-to-r from-amber-300 via-orange-300 to-amber-200",
    chip: "border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  {
    border: "border-rose-300/60",
    borderHover: "border-rose-400",
    bar: "bg-gradient-to-r from-rose-300 via-pink-300 to-rose-200",
    chip: "border-rose-300/60 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
    dot: "bg-rose-500",
  },
  {
    border: "border-emerald-300/60",
    borderHover: "border-emerald-400",
    bar: "bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-200",
    chip:
      "border-emerald-300/60 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    border: "border-violet-300/60",
    borderHover: "border-violet-400",
    bar: "bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-200",
    chip:
      "border-violet-300/60 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
    dot: "bg-violet-500",
  },
  {
    border: "border-sky-300/60",
    borderHover: "border-sky-400",
    bar: "bg-gradient-to-r from-sky-300 via-cyan-300 to-sky-200",
    chip: "border-sky-300/60 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
    dot: "bg-sky-500",
  },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function seriesAccentClass(seriesId: string) {
  return PALETTE[hash(seriesId) % PALETTE.length];
}
