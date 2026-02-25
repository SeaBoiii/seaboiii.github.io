#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tkinter Novel Wizard for GitHub Pages + Jekyll
- Create a new novel with chapters (minimal inputs)
- Append additional chapters to an existing novel (no cover input)
- Formatted paste (HTML/RTF → Markdown) + single DOCX import
- NEW: Bulk DOCX import (select multiple .docx files; sorted by filename; fills titles & content; auto-scales tabs)

Run from your repo root: python3 tools/novel_wizard.py
"""

import re, shutil, sys, subprocess
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

# Optional converters for formatted paste (install with pip to enable)
try:
    import markdownify as _markdownify  # pip install markdownify
except Exception:
    _markdownify = None
try:
    import mammoth as _mammoth  # pip install mammoth
except Exception:
    _mammoth = None
try:
    from striprtf.striprtf import rtf_to_text as _rtf_to_text  # pip install striprtf
except Exception:
    _rtf_to_text = None

REPO_ROOT = Path(__file__).resolve().parents[1]  # repo root (../ from tools/)
NOVEL_DIR = REPO_ROOT / "novel"
IMAGES_DIR = REPO_ROOT / "images"
NOVELS_INDEX_HTML = NOVEL_DIR / "index.html"

# ---------- helpers ----------
def slugify(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"[^\w\s-]", "-", s)        # non-alnum -> hyphen
    s = re.sub(r"\s+", "-", s)             # spaces -> hyphen
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "untitled"

def pretty(slug: str) -> str:
    t = re.sub(r"[-_]+", " ", slug).strip()
    return t[:1].upper() + t[1:] if t else "Untitled"

def write_text(p: Path, text: str):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8", newline="\n")

# ---- Formatting helpers ----
SMART_QUOTES = {
    "\u2018": "'", "\u2019": "'", "\u201C": '"', "\u201D": '"',
    "\u2013": "-", "\u2014": "--",
}

def normalize_smart_punctuation(s: str) -> str:
    for k, v in SMART_QUOTES.items():
        s = s.replace(k, v)
    return s

def html_to_markdown(html: str) -> str:
    html = html or ""
    if _markdownify:
        try:
            md = _markdownify.markdownify(html, heading_style="ATX", strip=['span'])
            return normalize_smart_punctuation(md)
        except Exception:
            pass
    # Naive fallback if markdownify isn't available
    md = html
    md = re.sub(r"<\s*h1[^>]*>(.*?)<\s*/h1\s*>", r"# \1\n\n", md, flags=re.I|re.S)
    md = re.sub(r"<\s*h2[^>]*>(.*?)<\s*/h2\s*>", r"## \1\n\n", md, flags=re.I|re.S)
    md = re.sub(r"<\s*strong[^>]*>(.*?)<\s*/strong\s*>", r"**\1**", md, flags=re.I|re.S)
    md = re.sub(r"<\s*em[^>]*>(.*?)<\s*/em\s*>", r"*\1*", md, flags=re.I|re.S)
    md = re.sub(r"<\s*br\s*/?>", "\n", md, flags=re.I)
    md = re.sub(r"<[^>]+>", "", md)  # strip remaining tags
    return normalize_smart_punctuation(md)

def rtf_to_markdown(rtf: str) -> str:
    if _rtf_to_text:
        try:
            txt = _rtf_to_text(rtf)
            return normalize_smart_punctuation(txt)
        except Exception:
            pass
    return normalize_smart_punctuation(rtf)

def docx_file_to_markdown(path: Path) -> str:
    if _mammoth:
        try:
            with open(path, "rb") as f:
                result = _mammoth.convert_to_html(f)
            html = result.value
            return html_to_markdown(html)
        except Exception:
            return ""
    return ""

# ---- Chapter/index builders ----

def build_chapter_md(slug: str, order: int, title: str, body: str) -> str:
    header = (
        "---\n"
        f"layout: chapter\n"
        f"Title: {title.strip()}\n"
        f"novel: {slug}\n"
        f"order: {order}\n"
        "---\n\n"
    )
    body = (body or "").lstrip()
    if not body.endswith("\n"):
        body += "\n"
    return header + body

def build_index_md(slug: str, status: str = "Incomplete", blurb: str = "") -> str:
    t = f"{pretty(slug)} — Chapters"
    body = """<ul>
{% assign pathprefix = '/novel/' | append: page.novel | append: '/' %}
{% assign items = site.pages
  | where_exp: 'p', 'p.url contains pathprefix'
  | where_exp: 'p', 'p.name != "index.md"'
  | sort: 'order' %}
{% for ch in items %}
  <li><a href="{{ ch.url | relative_url }}">Chapter {{ ch.order }} — {{ ch.Title | default: ch.title }}</a></li>
{% endfor %}
</ul>
"""
    blurb_text = blurb.strip() if blurb else "A captivating story."
    return (
        "---\n"
        f"layout: novel\n"
        f"Title: {t}\n"
        f"novel: {slug}\n"
        f"status: {status}\n"
        f"blurb: >-\n"
        f"  {blurb_text}\n"
        f"order: 0\n"
        "---\n\n"
        f"{body}"
    )

# ---- Novel scanning helpers (for append mode) ----
FM_START = "---"

def parse_front_matter(text: str) -> dict:
    s = text.lstrip()
    if not s.startswith(FM_START):
        return {}
    end = s.find(FM_START, len(FM_START))
    if end == -1:
        return {}
    block = s[len(FM_START):end]
    kv = {}
    for line in block.splitlines():
        m = re.match(r"^\s*([^:]+)\s*:\s*(.*)\s*$", line)
        if m:
            kv[m.group(1).strip()] = m.group(2).strip()
    return kv

def read_order_from_file(p: Path) -> int:
    try:
        txt = p.read_text(encoding="utf-8")
    except Exception:
        return -1
    kv = parse_front_matter(txt)
    if "order" in kv and str(kv["order"]).strip().isdigit():
        return int(kv["order"])
    # fallback: infer from filename like Chapter12.md
    m = re.search(r"(\d+)", p.stem)
    return int(m.group(1)) if m else -1

def get_existing_info(slug: str):
    folder = NOVEL_DIR / slug
    if not folder.exists():
        return {"exists": False}
    md_files = [p for p in folder.glob("*.md") if p.name.lower() != "index.md"]
    if not md_files:
        return {"exists": True, "max_order": 0, "count": 0}
    orders = [read_order_from_file(p) for p in md_files]
    orders = [o for o in orders if o >= 0]
    max_order = max(orders) if orders else 0
    return {"exists": True, "max_order": max_order, "count": len(md_files)}

def list_existing_slugs() -> list[str]:
    if not NOVEL_DIR.exists():
        return []
    return sorted([p.name for p in NOVEL_DIR.iterdir() if p.is_dir()])

# ---- Assets helpers ----

def copy_cover_to_images(src_path: str, slug: str) -> str:
    if not src_path:
        return f"/images/{slug}-cover.png"
    sp = Path(src_path).expanduser()
    if not sp.exists() or not sp.is_file():
        return f"/images/{slug}-cover.png"
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    ext = sp.suffix.lower() or ".png"
    if ext not in {".png", ".jpg", ".jpeg", ".webp", ".gif"}:
        ext = ".png"
    dst = IMAGES_DIR / f"{slug}-cover{ext}"
    shutil.copyfile(sp, dst)
    return f"/images/{dst.name}"

def append_card_to_novels_index(novel_title: str, slug: str, cover_rel: str, status_choice: str, hidden: bool = False):
    """Insert an <li> into /novel/index.html inside <ul class="novel-grid" id="novelGrid"> if possible."""
    NOVEL_DIR.mkdir(parents=True, exist_ok=True)
    if not NOVELS_INDEX_HTML.exists():
        base = """<!doctype html>
<html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Novels</title></head>
<body><ul class=\"novel-grid\" id=\"novelGrid\">
</ul></body></html>
"""
        write_text(NOVELS_INDEX_HTML, base)
    html = NOVELS_INDEX_HTML.read_text(encoding="utf-8")

    # status mapping
    status_class = "complete" if status_choice == "Complete" else "incomplete"
    status_text = "Complete" if status_class == "complete" else "Incomplete"
    hidden_attr = ' data-hidden="true"' if hidden else ''
    hidden_badge = f'''              <span class="badge">Hidden</span>\n''' if hidden else ''
    li = (
        f'''        <li class="novel-card" data-title="{novel_title.lower()}" data-status="{status_class}"{hidden_attr}>\n'''
        f'''          <a href="/novel/{slug}/" aria-label="{novel_title}">\n'''
        f'''            <img src="{cover_rel}" alt="{novel_title}" loading="lazy" />\n'''
        f'''            <h2 class="novel-title">{novel_title}</h2>\n'''
        f'''            <div class="novel-meta">\n'''
        f'''              <span class="badge {status_class}">{status_text}</span>\n'''
        f'''{hidden_badge}'''
        f'''            </div>\n'''
        f'''          </a>\n'''
        f'''        </li>\n'''
    )
    import re as _re
    # Try to find novel-grid first (new format), then fall back to novel-list
    pat = _re.compile(r'(<ul[^>]*class=\"[^\"]*novel-grid[^\"]*\"[^>]*id=\"novelGrid\"[^>]*>)(.*?)(</ul>)', _re.IGNORECASE | _re.DOTALL)
    m = pat.search(html)
    if not m:
        pat = _re.compile(r'(<ul[^>]*class=\"[^\"]*novel-list[^\"]*\"[^>]*>)(.*?)(</ul>)', _re.IGNORECASE | _re.DOTALL)
        m = pat.search(html)
    if m:
        start, mid, end = m.groups()
        new_html = html[:m.start()] + start + mid + li + end + html[m.end():]
        write_text(NOVELS_INDEX_HTML, new_html)
    else:
        pos = html.lower().rfind("</ul>")
        new_html = html[:pos] + li + html[pos:] if pos != -1 else html + "\n" + li
        write_text(NOVELS_INDEX_HTML, new_html)
        write_text(NOVELS_INDEX_HTML, new_html)

class PasteFormattedDialog(tk.Toplevel):
    """Paste HTML or RTF and convert to Markdown before inserting."""
    def __init__(self, master, on_done):
        super().__init__(master)
        self.title("Paste formatted text")
        self.resizable(True, True)
        self.on_done = on_done

        self.var_mode = tk.StringVar(value="HTML")
        frm = ttk.Frame(self, padding=10)
        frm.pack(fill="both", expand=True)

        ttk.Label(frm, text="Format").grid(row=0, column=0, sticky="w")
        ttk.Combobox(frm, textvariable=self.var_mode, values=["HTML", "RTF"], state="readonly", width=12)\
            .grid(row=0, column=1, sticky="w")

        ttk.Label(frm, text="Paste here").grid(row=1, column=0, columnspan=2, sticky="w", pady=(6,2))
        self.txt = tk.Text(frm, wrap="word", height=18)
        self.txt.grid(row=2, column=0, columnspan=2, sticky="nsew")
        frm.rowconfigure(2, weight=1)
        frm.columnconfigure(1, weight=1)

        btns = ttk.Frame(frm)
        btns.grid(row=3, column=0, columnspan=2, sticky="e", pady=(8,0))
        ttk.Button(btns, text="Cancel", command=self.destroy).pack(side="right")
        ttk.Button(btns, text="Insert", command=self._insert).pack(side="right", padx=(0,8))

        self.transient(master)
        self.grab_set()
        self.txt.focus_set()

    def _insert(self):
        data = self.txt.get("1.0", "end").strip()
        if not data:
            self.destroy(); return
        if self.var_mode.get() == "HTML":
            md = html_to_markdown(data)
        else:
            md = rtf_to_markdown(data)
        if callable(self.on_done):
            self.on_done(md)
        self.destroy()

# ---------- GUI ----------

def _extract_chapter_num_from_name(name: str) -> int:
    m = re.search(r"(\d+)", Path(name).stem)
    return int(m.group(1)) if m else 10**9  # large sentinel if no number

class Wizard(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Novel Wizard (Tkinter)")
        self.geometry("1000x760")
        self.minsize(880, 640)

        # Vars
        self.mode_var = tk.StringVar(value="Create new")  # or "Append to existing"
        self.title_var = tk.StringVar()
        self.slug_var = tk.StringVar()
        self.status_var = tk.StringVar(value="Incomplete")  # default
        self.cover_var = tk.StringVar()
        self.blurb_var = tk.StringVar()
        self.hidden_var = tk.BooleanVar(value=False)
        self.count_var = tk.IntVar(value=3)  # number of chapters to add/create
        self.existing_slug_var = tk.StringVar()
        self.start_order = 1  # where new chapters begin (append mode)

        # Chapters buffer: list of dict {order,title_var,text}
        self.chapter_tabs = []

        self._build_ui()

    # UI layout
    def _build_ui(self):
        # Top form
        top = ttk.Frame(self, padding=12)
        top.pack(fill="x")
        self.top = top

        # Mode row
        ttk.Label(top, text="Mode").grid(row=0, column=0, sticky="w")
        mode = ttk.Combobox(top, textvariable=self.mode_var, values=["Create new","Append to existing"], state="readonly", width=20)
        mode.grid(row=0, column=1, sticky="w")
        mode.bind("<<ComboboxSelected>>", lambda e: self._on_mode_change())

        # Existing novel selector (append mode only)
        self.lbl_existing = ttk.Label(top, text="Existing novel")
        self.lbl_existing.grid(row=0, column=2, sticky="e")
        self.existing_combo = ttk.Combobox(top, textvariable=self.existing_slug_var, values=list_existing_slugs(), state="readonly", width=32)
        self.existing_combo.grid(row=0, column=3, sticky="we", padx=(6,12))
        self.existing_combo.bind("<<ComboboxSelected>>", lambda e: self._on_existing_selected())
        top.columnconfigure(3, weight=1)

        # New / common fields
        self.lbl_title = ttk.Label(top, text="Novel Title")
        self.lbl_title.grid(row=1, column=0, sticky="w", pady=(6,0))
        self.title_entry = ttk.Entry(top, textvariable=self.title_var, width=40)
        self.title_entry.grid(row=1, column=1, sticky="we", columnspan=3, padx=(8,12), pady=(6,0))

        self.lbl_slug = ttk.Label(top, text="Slug (auto)")
        self.lbl_slug.grid(row=2, column=0, sticky="w")
        self.slug_entry = ttk.Entry(top, textvariable=self.slug_var, width=40, state="readonly")
        self.slug_entry.grid(row=2, column=1, sticky="we", columnspan=3, padx=(8,12))

        def _sync_slug(*_):
            if self.mode_var.get() == "Create new":
                self.slug_var.set(slugify(self.title_var.get()))
        self.title_var.trace_add("write", _sync_slug)

        self.lbl_status = ttk.Label(top, text="Status")
        self.lbl_status.grid(row=1, column=4, sticky="e")
        self.status_combo = ttk.Combobox(top, textvariable=self.status_var, values=["Complete","Incomplete"], state="readonly", width=16)
        self.status_combo.grid(row=1, column=5, sticky="w", pady=(6,0))

        self.lbl_count = ttk.Label(top, text="# Chapters to add")
        self.lbl_count.grid(row=2, column=4, sticky="e")
        self.spin_count = ttk.Spinbox(top, from_=1, to=200, textvariable=self.count_var, width=8, command=self._build_chapter_tabs)
        self.spin_count.grid(row=2, column=5, sticky="w")

        self.lbl_cover = ttk.Label(top, text="Cover Image")
        self.lbl_cover.grid(row=3, column=0, sticky="w", pady=(8,0))
        self.cover_entry = ttk.Entry(top, textvariable=self.cover_var, width=40)
        self.cover_entry.grid(row=3, column=1, sticky="we", columnspan=3, padx=(8,12), pady=(8,0))
        self.btn_browse = ttk.Button(top, text="Browse…", command=self._pick_cover)
        self.btn_browse.grid(row=3, column=4, sticky="e", pady=(8,0))

        self.lbl_blurb = ttk.Label(top, text="Blurb (required)")
        self.lbl_blurb.grid(row=4, column=0, sticky="w", pady=(8,0))
        self.blurb_entry = ttk.Entry(top, textvariable=self.blurb_var, width=40)
        self.blurb_entry.grid(row=4, column=1, sticky="we", columnspan=3, padx=(8,12), pady=(8,0))
        self.check_hidden = ttk.Checkbutton(top, text="Hidden novel", variable=self.hidden_var)
        self.check_hidden.grid(row=4, column=4, sticky="w", pady=(8,0))

        # Action buttons (Create/Append and Bulk Import)
        self.btn_commit = ttk.Button(top, text="Create / Append", command=self._commit)
        self.btn_commit.grid(row=4, column=5, sticky="e", pady=(8,0))
        self.btn_bulk = ttk.Button(top, text="Bulk import .docx…", command=self._bulk_import_docx)
        self.btn_bulk.grid(row=5, column=5, sticky="e", pady=(6,0))

        # Tabs for chapters
        self.nb = ttk.Notebook(self)
        self.nb.pack(fill="both", expand=True, padx=12, pady=(12,4))
        
        # Bind horizontal wheel events for chapter navigation only.
        # Leave vertical wheel scrolling to the text widgets so editing feels normal.
        # Tk on Windows/macOS may reject Button-6/7 (X11-only horizontal wheel buttons).
        self._supports_x11_hwheel_buttons = (self.tk.call("tk", "windowingsystem") == "x11")
        self.nb.bind("<Shift-MouseWheel>", self._on_hmousewheel)  # Side wheel or Shift+wheel
        if self._supports_x11_hwheel_buttons:
            self.nb.bind("<Button-6>", self._on_hmousewheel)      # Linux horizontal scroll left
            self.nb.bind("<Button-7>", self._on_hmousewheel)      # Linux horizontal scroll right

        # Tab navigation to avoid squished headers
        nav = ttk.Frame(self)
        nav.pack(fill="x", padx=12, pady=(0,8))
        ttk.Button(nav, text="◀ Prev", width=10, command=self._prev_tab).pack(side="left")
        ttk.Button(nav, text="Next ▶", width=10, command=self._next_tab).pack(side="left", padx=(8,0))

        self._on_mode_change()  # sets defaults and builds tabs

    # --- visibility helpers ---
    def _show(self, *widgets):
        for w in widgets:
            try:
                w.grid()
            except Exception:
                pass
    def _hide(self, *widgets):
        for w in widgets:
            try:
                w.grid_remove()
            except Exception:
                pass

    def _pick_cover(self):
        p = filedialog.askopenfilename(
            title="Choose cover image",
            filetypes=[("Images","*.png;*.jpg;*.jpeg;*.webp;*.gif"),("All files","*.*")]
        )
        if p: self.cover_var.set(p)

    def _on_mode_change(self):
        mode = self.mode_var.get()
        if mode == "Create new":
            # Minimal inputs for create
            self.title_var.set("")
            self.slug_var.set("")
            self.cover_var.set("")
            self.blurb_var.set("")
            self.hidden_var.set(False)
            self.start_order = 1
            self._show(self.lbl_title, self.title_entry,
                       self.lbl_slug, self.slug_entry,
                       self.lbl_status, self.status_combo,
                       self.lbl_cover, self.cover_entry, self.btn_browse)
            # Hide append-only controls
            self._hide(self.lbl_existing, self.existing_combo)
        else:  # Append mode — hide cover & create-only fields, show existing selector
            # preload first existing slug if any
            slugs = list_existing_slugs()
            if slugs and not self.existing_slug_var.get():
                self.existing_slug_var.set(slugs[0])
            self._on_existing_selected()
            self._hide(self.lbl_title, self.title_entry,
                       self.lbl_slug, self.slug_entry,
                       self.lbl_cover, self.cover_entry, self.btn_browse)
            self._show(self.lbl_existing, self.existing_combo,
                       self.lbl_status, self.status_combo)
        self._build_chapter_tabs()

    def _on_existing_selected(self):
        slug = self.existing_slug_var.get().strip()
        if not slug:
            return
        info = get_existing_info(slug)
        self.slug_var.set(slug)
        self.title_var.set(pretty(slug))
        self.start_order = (info.get("max_order") or 0) + 1
        self._build_chapter_tabs()

    def _build_chapter_tabs(self):
        # Preserve existing content by order before rebuild
        preserved = {}
        for rec in getattr(self, 'chapter_tabs', []) or []:
            try:
                preserved[int(rec['order'])] = {
                    'title': rec['title_var'].get(),
                    'body': rec['text'].get('1.0', 'end')
                }
            except Exception:
                pass

        # clear existing
        for _ in range(len(self.nb.tabs())):
            self.nb.forget(self.nb.tabs()[0])
        self.chapter_tabs = []

        MAX_TITLE_LEN = 100  # Prevent UI crashes from overly long titles
        n = max(1, int(self.count_var.get() or 1))
        start = self.start_order if self.mode_var.get() == "Append to existing" else 1
        for i in range(n):
            order = start + i
            frame = ttk.Frame(self.nb, padding=10)
            self.nb.add(frame, text=f"{order}")

            title_var = tk.StringVar()
            
            # Validate title length on change
            def _validate_title(var=title_var):
                val = var.get()
                if len(val) > MAX_TITLE_LEN:
                    var.set(val[:MAX_TITLE_LEN])
            title_var.trace_add("write", lambda *_, v=title_var: _validate_title(v))
            
            ttk.Label(frame, text=f"Chapter {order} Title").pack(anchor="w")
            title_entry = ttk.Entry(frame, textvariable=title_var)
            title_entry.pack(fill="x", pady=(2,8))

            # toolbar for formatted paste / import
            tools = ttk.Frame(frame)
            tools.pack(fill="x", pady=(0,6))

            # text area with scrollbar
            txt_frame = ttk.Frame(frame)
            txt_frame.pack(fill="both", expand=True)
            yscroll = ttk.Scrollbar(txt_frame, orient="vertical")
            text = tk.Text(txt_frame, wrap="word", height=18, undo=True, yscrollcommand=yscroll.set)
            yscroll.config(command=text.yview)
            yscroll.pack(side="right", fill="y")

            ttk.Button(tools, text="Paste formatted…",
                    command=lambda t=text: self._paste_formatted_into(text_widget=t)).pack(side="left")
            ttk.Button(tools, text="Import .docx…",
                    command=lambda t=text: self._import_docx_into(text_widget=t)).pack(side="left", padx=(6,0))

            text.pack(side="left", fill="both", expand=True)

            # Bind chapter navigation to horizontal wheel only so vertical scrolling
            # continues to scroll the chapter text while editing.
            for w in (frame, title_entry, tools, txt_frame, text):
                w.bind("<Shift-MouseWheel>", self._on_hmousewheel)
                if self._supports_x11_hwheel_buttons:
                    w.bind("<Button-6>", self._on_hmousewheel)
                    w.bind("<Button-7>", self._on_hmousewheel)

            # restore preserved content if exists
            if order in preserved:
                title_var.set(preserved[order]['title'][:MAX_TITLE_LEN])  # Truncate if too long
                try:
                    text.delete('1.0','end')
                    text.insert('1.0', preserved[order]['body'])
                except Exception:
                    pass

            self.chapter_tabs.append({"order": order, "title_var": title_var, "text": text})


    def _bulk_import_docx(self):
        files = filedialog.askopenfilenames(title="Select .docx files (multiple)",
                                            filetypes=[("Word document","*.docx")])
        if not files:
            return
        
        # Extract chapter numbers from files and map them
        file_map = {}  # chapter_number -> file_path
        for path in files:
            ch_num = _extract_chapter_num_from_name(path)
            if ch_num != 10**9:  # Has a valid number
                file_map[ch_num] = path
        
        if not file_map:
            messagebox.showerror("No chapters", "Could not extract chapter numbers from filenames. Use format like 'Chapter1.docx'.")
            return
        
        min_ch = min(file_map.keys())
        max_ch = max(file_map.keys())
        
        # Check if imported chapters conflict with existing chapters (append mode)
        if self.mode_var.get() == "Append to existing" and min_ch < self.start_order:
            reply = messagebox.askyesno("Chapter conflict", 
                f"Imported chapters include {min_ch}-{max_ch}, but existing chapters go up to {self.start_order - 1}.\n"
                f"Only import chapters >= {self.start_order}?")
            if reply:
                file_map = {k: v for k, v in file_map.items() if k >= self.start_order}
                if not file_map:
                    messagebox.showerror("Cancelled", "No valid chapters after filtering.")
                    return
                min_ch = min(file_map.keys())
                max_ch = max(file_map.keys())
            # If user clicks 'No', continue with full range (allow all numbers)
        
        # Create tabs for the full range from min_ch to max_ch (fills gaps automatically)
        n = max_ch - min_ch + 1
        self.count_var.set(n)
        self.start_order = min_ch
        self._build_chapter_tabs()
        
        # Populate tabs with files that exist, leave gaps empty
        for rec in self.chapter_tabs:
            order = rec['order']
            if order in file_map:
                path = file_map[order]
                stem = Path(path).stem
                title_guess = re.sub(r"[_-]+", " ", stem).strip().title()
                md = docx_file_to_markdown(Path(path))
                rec["title_var"].set(title_guess or f"Chapter {order}")
                rec["text"].delete("1.0", "end")
                rec["text"].insert("1.0", md)
            # else: leave empty (gap chapter)

    def _paste_formatted_into(self, text_widget: tk.Text=None):
        if not text_widget:
            return
        def _done(md):
            text_widget.insert("insert", md)
        PasteFormattedDialog(self, _done)

    def _on_mousewheel(self, event):
        """Handle mouse wheel scrolling for chapter navigation."""
        # Windows/macOS: event.delta > 0 is scroll up, < 0 is scroll down
        # Linux: event.num == 4 is scroll up, == 5 is scroll down
        if event.num == 4 or event.delta > 0:
            self._prev_tab()  # Scroll up = previous chapter
        elif event.num == 5 or event.delta < 0:
            self._next_tab()  # Scroll down = next chapter
        return "break"

    def _on_hmousewheel(self, event):
        """Handle horizontal wheel scrolling for chapter navigation."""
        # Windows/macOS: event.delta < 0 is scroll right, > 0 is scroll left
        # Linux: event.num == 6 is scroll left, == 7 is scroll right
        num = getattr(event, "num", None)
        delta = getattr(event, "delta", 0)
        if num == 6 or delta > 0:
            self._prev_tab()  # Scroll left = previous chapter
            return "break"
        elif num == 7 or delta < 0:
            self._next_tab()  # Scroll right = next chapter
            return "break"

    def _next_tab(self):
        tabs = self.nb.tabs()
        if not tabs:
            return
        cur = self.nb.select()
        idx = tabs.index(cur)
        self.nb.select(tabs[(idx + 1) % len(tabs)])

    def _prev_tab(self):
        tabs = self.nb.tabs()
        if not tabs:
            return
        cur = self.nb.select()
        idx = tabs.index(cur)
        self.nb.select(tabs[(idx - 1) % len(tabs)])

    def _import_docx_into(self, text_widget: tk.Text=None):
        if not text_widget:
            return
        p = filedialog.askopenfilename(title="Select .docx file",
                                       filetypes=[("Word document","*.docx")])
        if not p:
            return
        md = docx_file_to_markdown(Path(p))
        if not md:
            messagebox.showerror("Import failed",
                "Could not convert DOCX. Install 'mammoth' (pip install mammoth) for best results.")
            return
        text_widget.insert("insert", md)

    def _commit(self):
        # Preflight
        if not NOVEL_DIR.exists():
            messagebox.showerror("Error", f"Cannot find {NOVEL_DIR}. Run from your repo root.")
            return

        mode = self.mode_var.get()
        if mode == "Create new":
            novel_title = self.title_var.get().strip()
            if not novel_title:
                messagebox.showerror("Error", "Please enter a Novel Title.")
                return
            slug = self.slug_var.get().strip() or slugify(novel_title)
        else:
            # Append mode
            slug = self.existing_slug_var.get().strip() or self.slug_var.get().strip()
            if not slug:
                messagebox.showerror("Error", "Select an existing novel to append to.")
                return
            novel_title = pretty(slug)

        dest = NOVEL_DIR / slug
        dest.mkdir(parents=True, exist_ok=True)

        if mode == "Create new":
            # Rename any index.html
            old = dest / "index.html"
            if old.exists():
                bak = dest / "index_old.html"
                if not bak.exists():
                    old.rename(bak)

            # Copy cover & add card to /novel/index.html
            cover_rel = copy_cover_to_images(self.cover_var.get().strip(), slug)
        else:
            cover_rel = f"/images/{slug}-cover.png"  # unused in append, but harmless

        # Write chapters
        written = 0
        for rec in self.chapter_tabs:
            order = rec["order"]
            ch_title = rec["title_var"].get().strip() or f"Chapter {order}"
            body = rec["text"].get("1.0", "end").rstrip()
            if not body:
                continue
            md = build_chapter_md(slug, order, ch_title, body)
            write_text(dest / f"Chapter{order}.md", md)
            written += 1

        if written == 0:
            messagebox.showerror("No chapters", "Please enter at least one chapter body.")
            return

        # index.md — create if missing (safe for append)
        idx = dest / "index.md"
        if not idx.exists():
            write_text(idx, build_index_md(slug, self.status_var.get(), self.blurb_var.get()))

        # Append card only for new novels
        if mode == "Create new":
            append_card_to_novels_index(novel_title, slug, cover_rel, self.status_var.get(), self.hidden_var.get())

        # Update index.html + generate variants (best-effort)
        try:
            script = REPO_ROOT / "tools" / "optimize_and_update_index.py"
            if script.exists():
                res = subprocess.run([sys.executable, str(script)], check=False)
                if res.returncode != 0:
                    messagebox.showwarning(
                        "Optimize failed",
                        "The optimize/update script returned a non-zero exit code.\n"
                        "Index or image variants may not be fully updated."
                    )
        except Exception as exc:
            messagebox.showwarning(
                "Optimize failed",
                f"Could not run optimize/update script.\n{exc}"
            )

        action = "Created" if mode == "Create new" else "Appended"
        messagebox.showinfo("Done", f"{action} /novel/{slug}/ with {written} chapter(s).\nRemember to commit & push.")
        self.destroy()

# ---------- entry ----------
def main():
    if not NOVEL_DIR.exists():
        print(f"❌ Not in repo root. Missing: {NOVEL_DIR}")
        sys.exit(1)
    app = Wizard()
    app.mainloop()

if __name__ == "__main__":
    main()
