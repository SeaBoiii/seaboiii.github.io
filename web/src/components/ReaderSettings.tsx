"use client";

import { useEffect, useState } from "react";

const FONT_FAMILIES: Array<{ id: string; label: string; css: string }> = [
  { id: "lora", label: "Lora", css: '"Lora", Georgia, serif' },
  { id: "source", label: "Source Serif", css: '"Source Serif 4", Georgia, serif' },
  { id: "merri", label: "Merriweather", css: '"Merriweather", Georgia, serif' },
  { id: "atkinson", label: "Atkinson Hyperlegible", css: '"Atkinson Hyperlegible", sans-serif' },
  { id: "system-serif", label: "System Serif", css: 'Georgia, "Times New Roman", serif' },
  { id: "system-sans", label: "System Sans", css: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
];

const KEY = "reader-prefs";

interface Prefs {
  fontScale: number;
  lineHeight: number;
  width: number;
  fontId: string;
}

const DEFAULTS: Prefs = { fontScale: 1, lineHeight: 1.75, width: 800, fontId: "lora" };

function load(): Prefs {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

function apply(p: Prefs) {
  const root = document.documentElement;
  root.style.setProperty("--reader-font-scale", String(p.fontScale));
  root.style.setProperty("--reader-line-height", String(p.lineHeight));
  root.style.setProperty("--reader-max-width", `${p.width}px`);
  const family = FONT_FAMILIES.find((f) => f.id === p.fontId)?.css ?? FONT_FAMILIES[0].css;
  root.style.setProperty("--reader-font", family);
}

export function ReaderPrefsBoot() {
  // Inline script that applies saved prefs before paint, avoiding flash.
  const code = `
(function(){
  try {
    var raw = localStorage.getItem(${JSON.stringify(KEY)});
    var p = raw ? JSON.parse(raw) : {};
    var fontMap = ${JSON.stringify(
      Object.fromEntries(FONT_FAMILIES.map((f) => [f.id, f.css])),
    )};
    var r = document.documentElement;
    if (typeof p.fontScale === 'number') r.style.setProperty('--reader-font-scale', String(p.fontScale));
    if (typeof p.lineHeight === 'number') r.style.setProperty('--reader-line-height', String(p.lineHeight));
    if (typeof p.width === 'number') r.style.setProperty('--reader-max-width', p.width + 'px');
    if (p.fontId && fontMap[p.fontId]) r.style.setProperty('--reader-font', fontMap[p.fontId]);
  } catch (e) {}
})();
`.trim();
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export default function ReaderSettings({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    setPrefs(load());
  }, []);

  function update(patch: Partial<Prefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    apply(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Reader settings"
      className="absolute right-2 top-full mt-2 w-[min(360px,calc(100vw-1rem))] rounded-2xl border border-border bg-surface p-4 shadow-soft sm:right-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-text">Reader settings</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="rounded-md px-2 text-muted hover:text-text"
        >
          ✕
        </button>
      </div>
      <div className="space-y-4">
        <RangeRow
          label="Font size"
          value={prefs.fontScale}
          min={0.85}
          max={1.4}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(v) => update({ fontScale: v })}
        />
        <RangeRow
          label="Line height"
          value={prefs.lineHeight}
          min={1.45}
          max={2.1}
          step={0.05}
          format={(v) => v.toFixed(2)}
          onChange={(v) => update({ lineHeight: v })}
        />
        <RangeRow
          label="Content width"
          value={prefs.width}
          min={620}
          max={980}
          step={20}
          format={(v) => `${v}px`}
          onChange={(v) => update({ width: v })}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Font family
          </span>
          <select
            value={prefs.fontId}
            onChange={(e) => update({ fontId: e.target.value })}
            className="rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setPrefs(DEFAULTS);
            apply(DEFAULTS);
            try {
              localStorage.removeItem(KEY);
            } catch {}
          }}
          className="text-xs font-medium text-muted underline hover:text-text"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
        <span className="font-normal text-text">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="accent-[rgb(var(--accent))]"
      />
    </label>
  );
}
