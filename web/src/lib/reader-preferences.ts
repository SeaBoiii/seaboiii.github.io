export type ReaderTheme = "night" | "dim" | "paper" | "sepia";

export interface ReaderPreferences {
  version: 2;
  fontScale: number;
  lineHeight: number;
  width: number;
  fontId: string;
  theme: ReaderTheme;
}

export const READER_PREFERENCES_KEY = "reader-prefs";
export const PREFERENCES_WILL_CHANGE = "reader-preferences-will-change";
export const PREFERENCES_DID_CHANGE = "reader-preferences-did-change";

export const READER_FONTS = [
  { id: "literata", label: "Literata", css: '"Literata", Georgia, "Times New Roman", serif' },
  { id: "lora", label: "Lora", css: '"Lora", Georgia, serif' },
  { id: "source", label: "Source Serif", css: '"Source Serif 4", Georgia, serif' },
  { id: "merri", label: "Merriweather", css: '"Merriweather", Georgia, serif' },
  { id: "atkinson", label: "Atkinson Hyperlegible", css: '"Atkinson Hyperlegible", sans-serif' },
  { id: "system-serif", label: "System Serif", css: 'Georgia, "Times New Roman", serif' },
  { id: "system-sans", label: "System Sans", css: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
] as const;

export const READER_DEFAULTS: ReaderPreferences = {
  version: 2, fontScale: 1, lineHeight: 1.85, width: 720, fontId: "literata", theme: "night",
};

function bounded(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value)) : fallback;
}

/** Keep the previous six font choices and numeric settings while validating old data. */
export function validateReaderPreferences(value: unknown, legacyTheme?: string | null): ReaderPreferences {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  return {
    version: 2,
    fontScale: bounded(raw.fontScale, READER_DEFAULTS.fontScale, 0.85, 1.4),
    lineHeight: bounded(raw.lineHeight, READER_DEFAULTS.lineHeight, 1.45, 2.1),
    width: bounded(raw.width, READER_DEFAULTS.width, 620, 980),
    fontId: READER_FONTS.some((font) => font.id === raw.fontId)
      ? raw.fontId as string : READER_DEFAULTS.fontId,
    theme: ["night", "dim", "paper", "sepia"].includes(raw.theme as string)
      ? raw.theme as ReaderTheme : legacyTheme === "light" ? "paper" : "night",
  };
}

export function loadReaderPreferences(): ReaderPreferences {
  try {
    const raw = window.localStorage.getItem(READER_PREFERENCES_KEY);
    return validateReaderPreferences(raw ? JSON.parse(raw) : null, window.localStorage.getItem("theme"));
  } catch {
    return { ...READER_DEFAULTS };
  }
}

export function applyReaderPreferences(value: ReaderPreferences): void {
  const prefs = validateReaderPreferences(value);
  const root = document.documentElement;
  root.dataset.reader = "true";
  root.dataset.readerTheme = prefs.theme;
  root.style.setProperty("--reader-font-scale", String(prefs.fontScale));
  root.style.setProperty("--reader-line-height", String(prefs.lineHeight));
  root.style.setProperty("--reader-max-width", `${prefs.width}px`);
  root.style.setProperty("--reader-font", READER_FONTS.find((font) => font.id === prefs.fontId)!.css);
}

export function saveReaderPreferences(prefs: ReaderPreferences): void {
  try { window.localStorage.setItem(READER_PREFERENCES_KEY, JSON.stringify(validateReaderPreferences(prefs))); }
  catch {}
}
