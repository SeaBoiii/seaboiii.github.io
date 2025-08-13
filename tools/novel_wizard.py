#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tkinter Novel Wizard for GitHub Pages + Jekyll
Run from your repo root: python3 tools/novel_wizard.py
"""

import re, shutil, sys
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

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

def build_index_md(slug: str) -> str:
    t = f"{pretty(slug)} — Chapters"
    body = """{% assign pathprefix = '/novel/' | append: page.novel | append: '/' %}
<ul>
{% assign items = site.pages
  | where_exp: 'p', 'p.url contains pathprefix'
  | where_exp: 'p', 'p.name != "index.md"'
  | sort: 'order' %}
{% for ch in items %}
  <li><a href="{{ ch.url | relative_url }}">Chapter {{ ch.order }} — {{ ch.Title | default: ch.title }}</a></li>
{% endfor %}
</ul>
"""
    return (
        "---\n"
        f"layout: chapter\n"
        f"Title: {t}\n"
        f"novel: {slug}\n"
        f"order: 0\n"
        "---\n\n"
        f"{body}"
    )

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

def append_card_to_novels_index(novel_title: str, slug: str, cover_rel: str, status_choice: str):
    """Insert an <li> into /novel/index.html inside <ul class="novel-list"> if possible."""
    NOVEL_DIR.mkdir(parents=True, exist_ok=True)
    if not NOVELS_INDEX_HTML.exists():
        base = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Novels</title></head>
<body><ul class="novel-list">
</ul></body></html>
"""
        write_text(NOVELS_INDEX_HTML, base)
    html = NOVELS_INDEX_HTML.read_text(encoding="utf-8")

    # status mapping
    status_class = "complete" if status_choice == "Complete" else "incomplete"
    status_text = "Complete" if status_class == "complete" else "Incomplete"
    li = (
f'''      <li>
        <a href="/novel/{slug}/">
          <img src="{cover_rel}" alt="{novel_title}">
          <h4>{novel_title}</h4>
          <span class="status {status_class}">{status_text}</span>
        </a>
      </li>
''')
    import re as _re
    pat = _re.compile(r'(<ul[^>]*class="[^"]*novel-list[^"]*"[^>]*>)(.*?)(</ul>)', _re.IGNORECASE | _re.DOTALL)
    m = pat.search(html)
    if m:
        start, mid, end = m.groups()
        new_html = html[:m.start()] + start + mid + li + end + html[m.end():]
        write_text(NOVELS_INDEX_HTML, new_html)
    else:
        pos = html.lower().rfind("</ul>")
        new_html = html[:pos] + li + html[pos:] if pos != -1 else html + "\n" + li
        write_text(NOVELS_INDEX_HTML, new_html)

# ---------- GUI ----------
class Wizard(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Novel Wizard (Tkinter)")
        self.geometry("900x700")
        self.minsize(800, 600)

        # Vars
        self.title_var = tk.StringVar()
        self.slug_var = tk.StringVar()
        self.status_var = tk.StringVar(value="Incomplete")  # default
        self.cover_var = tk.StringVar()
        self.count_var = tk.IntVar(value=8)

        # Chapters: list of dict {title_var, text_widget}
        self.chapter_tabs = []

        self._build_ui()

    # UI layout
    def _build_ui(self):
        # Top form
        top = ttk.Frame(self, padding=12)
        top.pack(fill="x")

        ttk.Label(top, text="Novel Title").grid(row=0, column=0, sticky="w")
        title_entry = ttk.Entry(top, textvariable=self.title_var, width=40)
        title_entry.grid(row=0, column=1, sticky="we", columnspan=3, padx=(8,12))
        top.columnconfigure(3, weight=1)

        ttk.Label(top, text="Slug (auto)").grid(row=1, column=0, sticky="w")
        slug_entry = ttk.Entry(top, textvariable=self.slug_var, width=40, state="readonly")
        slug_entry.grid(row=1, column=1, sticky="we", columnspan=3, padx=(8,12))

        def _sync_slug(*_):
            self.slug_var.set(slugify(self.title_var.get()))
        self.title_var.trace_add("write", _sync_slug)

        ttk.Label(top, text="Status").grid(row=0, column=4, sticky="e")
        status = ttk.Combobox(top, textvariable=self.status_var, values=["Complete","Incomplete"], state="readonly", width=16)
        status.grid(row=0, column=5, sticky="w")

        ttk.Label(top, text="# Chapters").grid(row=1, column=4, sticky="e")
        spin = ttk.Spinbox(top, from_=1, to=200, textvariable=self.count_var, width=8, command=self._build_chapter_tabs)
        spin.grid(row=1, column=5, sticky="w")

        ttk.Label(top, text="Cover Image").grid(row=2, column=0, sticky="w", pady=(8,0))
        cover_entry = ttk.Entry(top, textvariable=self.cover_var, width=40)
        cover_entry.grid(row=2, column=1, sticky="we", columnspan=3, padx=(8,12), pady=(8,0))
        ttk.Button(top, text="Browse…", command=self._pick_cover).grid(row=2, column=4, sticky="e", pady=(8,0))
        ttk.Button(top, text="Create Novel", command=self._create).grid(row=2, column=5, sticky="e", pady=(8,0))

        # Tabs for chapters
        self.nb = ttk.Notebook(self)
        self.nb.pack(fill="both", expand=True, padx=12, pady=12)
        self._build_chapter_tabs()

    def _pick_cover(self):
        p = filedialog.askopenfilename(
            title="Choose cover image",
            filetypes=[("Images","*.png;*.jpg;*.jpeg;*.webp;*.gif"),("All files","*.*")]
        )
        if p: self.cover_var.set(p)

    def _build_chapter_tabs(self):
        # clear existing
        for i in range(len(self.nb.tabs())):
            self.nb.forget(self.nb.tabs()[0])
        self.chapter_tabs = []

        n = max(1, int(self.count_var.get() or 1))
        for i in range(1, n+1):
            frame = ttk.Frame(self.nb, padding=10)
            self.nb.add(frame, text=f"Chapter {i}")

            title_var = tk.StringVar()
            ttk.Label(frame, text=f"Chapter {i} Title").pack(anchor="w")
            title_entry = ttk.Entry(frame, textvariable=title_var)
            title_entry.pack(fill="x", pady=(2,8))

            text = tk.Text(frame, wrap="word", height=18)
            text.pack(fill="both", expand=True)

            self.chapter_tabs.append({"order": i, "title_var": title_var, "text": text})

    def _create(self):
        # Preflight
        if not NOVEL_DIR.exists():
            messagebox.showerror("Error", f"Cannot find {NOVEL_DIR}. Run from your repo root.")
            return
        novel_title = self.title_var.get().strip()
        if not novel_title:
            messagebox.showerror("Error", "Please enter a Novel Title.")
            return
        slug = self.slug_var.get().strip() or slugify(novel_title)

        # Prepare folder
        dest = NOVEL_DIR / slug
        dest.mkdir(parents=True, exist_ok=True)

        # Rename any index.html
        old = dest / "index.html"
        if old.exists():
            bak = dest / "index_old.html"
            if not bak.exists():
                old.rename(bak)

        # Copy cover
        cover_rel = copy_cover_to_images(self.cover_var.get().strip(), slug)

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

        # index.md
        write_text(dest / "index.md", build_index_md(slug))

        # Append card to /novel/index.html
        append_card_to_novels_index(novel_title, slug, cover_rel, self.status_var.get())

        messagebox.showinfo("Done", f"Created /novel/{slug}/ with {written} chapter(s).\nRemember to commit & push.")
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
