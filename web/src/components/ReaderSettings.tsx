"use client";

import { useEffect, useState } from "react";
import NativeDialog from "./NativeDialog";
import {
  applyReaderPreferences, loadReaderPreferences, saveReaderPreferences,
  PREFERENCES_DID_CHANGE, PREFERENCES_WILL_CHANGE,
  READER_DEFAULTS, READER_FONTS, READER_PREFERENCES_KEY,
  type ReaderPreferences, type ReaderTheme, validateReaderPreferences,
} from "@/lib/reader-preferences";

export function ReaderPrefsBoot() {
  // Validate and apply the same saved settings before the server-rendered prose paints.
  const code = `(function(){
    var d=${JSON.stringify(READER_DEFAULTS)},p={},r=document.documentElement;
    try{p=JSON.parse(localStorage.getItem(${JSON.stringify(READER_PREFERENCES_KEY)})||'{}')||{};if(!p.theme&&localStorage.getItem('theme')==='light')p.theme='paper';}catch(e){}
    function n(v,f,min,max){return typeof v==='number'&&isFinite(v)?Math.max(min,Math.min(max,v)):f;}
    var fonts=${JSON.stringify(Object.fromEntries(READER_FONTS.map((font) => [font.id, font.css])))};
    r.setAttribute('data-reader','true');
    r.setAttribute('data-reader-theme',['night','dim','paper','sepia'].indexOf(p.theme)!==-1?p.theme:d.theme);
    r.style.setProperty('--reader-font-scale',n(p.fontScale,d.fontScale,.85,1.4));
    r.style.setProperty('--reader-line-height',n(p.lineHeight,d.lineHeight,1.45,2.1));
    r.style.setProperty('--reader-max-width',n(p.width,d.width,620,980)+'px');
    r.style.setProperty('--reader-font',Object.prototype.hasOwnProperty.call(fonts,p.fontId)?fonts[p.fontId]:fonts[d.fontId]);
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

const THEMES: { id: ReaderTheme; label: string; description: string }[] = [
  { id: "night", label: "Night", description: "Deep charcoal" },
  { id: "dim", label: "Dim", description: "Soft blue-grey" },
  { id: "paper", label: "Paper", description: "Warm white" },
  { id: "sepia", label: "Sepia", description: "Warm parchment" },
];

export default function ReaderSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prefs, setPrefs] = useState<ReaderPreferences>({ ...READER_DEFAULTS });

  useEffect(() => { setPrefs(loadReaderPreferences()); }, []);

  function update(patch: Partial<ReaderPreferences>) {
    window.dispatchEvent(new Event(PREFERENCES_WILL_CHANGE));
    const next = validateReaderPreferences({ ...prefs, ...patch });
    setPrefs(next);
    applyReaderPreferences(next);
    saveReaderPreferences(next);
    window.dispatchEvent(new Event(PREFERENCES_DID_CHANGE));
  }

  return (
    <NativeDialog open={open} onClose={onClose} title="Make yourself comfortable" className="reader-settings-dialog">
      <p className="reader-dialog-intro">Shape the page around the way you like to read.</p>
      <fieldset className="reader-theme-fieldset">
        <legend>Page theme</legend>
        <div className="reader-theme-options">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              data-theme-choice={theme.id}
              aria-pressed={prefs.theme === theme.id}
              onClick={() => update({ theme: theme.id })}
              className="reader-theme-choice"
            >
              <span className="reader-theme-sample" aria-hidden="true">Aa</span>
              <span>{theme.label}</span>
              <span className="sr-only"> — {theme.description}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="reader-settings-fields">
        <label className="reader-select-field" htmlFor="reader-font-family">
          <span>Typeface</span>
          <select id="reader-font-family" value={prefs.fontId} onChange={(event) => update({ fontId: event.target.value })}>
            {READER_FONTS.map((font) => <option key={font.id} value={font.id}>{font.label}</option>)}
          </select>
        </label>
        <RangeRow label="Text size" id="reader-font-size" value={prefs.fontScale} min={0.85} max={1.4} step={0.05}
          format={(value) => `${Math.round(value * 100)}%`} onChange={(fontScale) => update({ fontScale })} />
        <RangeRow label="Line spacing" id="reader-line-spacing" value={prefs.lineHeight} min={1.45} max={2.1} step={0.05}
          format={(value) => value.toFixed(2)} onChange={(lineHeight) => update({ lineHeight })} />
        <RangeRow label="Page width" id="reader-page-width" value={prefs.width} min={620} max={980} step={20}
          format={(value) => `${value}px`} onChange={(width) => update({ width })} />
      </div>
      <div className="reader-settings-footer">
        <button type="button" className="reader-text-button" onClick={() => update({ ...READER_DEFAULTS })}>Restore defaults</button>
        <p>Your preferences and reading position are saved on this device.</p>
      </div>
    </NativeDialog>
  );
}

function RangeRow({ label, id, value, min, max, step, format, onChange }: {
  label: string; id: string; value: number; min: number; max: number; step: number;
  format: (value: number) => string; onChange: (value: number) => void;
}) {
  return (
    <label className="reader-range-field" htmlFor={id}>
      <span className="reader-range-label"><span>{label}</span><output htmlFor={id}>{format(value)}</output></span>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        aria-valuetext={format(value)} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
