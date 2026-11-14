"""Desktop literary authoring workspace; file operations stay in novel_wizard.

The preview is a plain-text composition aid. Public previews always open the
actual Next.js pages after an explicit build of saved source files.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import queue
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import tkinter.font as tkfont
import webbrowser
from urllib.parse import urlsplit

try:
    from .novel_studio_model import inspect_novel, preview_urls, render_reader_text, count_words
except ImportError:
    from novel_studio_model import inspect_novel, preview_urls, render_reader_text, count_words


PALETTE = {
    "bg": "#080A10", "surface": "#151B28", "raised": "#1D2636",
    "text": "#EEECE6", "muted": "#ADB4C3", "accent": "#B9C2E4",
    "border": "#353D4D", "success": "#AFD8C4", "warning": "#E5C790",
}
READER_THEMES = {
    "Night": ("#080A10", "#EEECE6"), "Dim": ("#1B2029", "#D8DAD9"),
    "Paper": ("#F7F7F2", "#242A31"), "Sepia": ("#EDE3CF", "#42392D"),
}


def configure_styles(app):
    p = PALETTE
    fonts = set(tkfont.families(app))
    app._studio_sans = "IBM Plex Sans" if "IBM Plex Sans" in fonts else "Segoe UI"
    app._studio_serif = "Literata" if "Literata" in fonts else "Georgia"
    app.configure(background=p["bg"])
    app.option_add("*Text.font", (app._studio_sans, 10))
    app.option_add("*Listbox.font", (app._studio_sans, 10))
    app.option_add("*Text.background", p["bg"])
    app.option_add("*Text.foreground", p["text"])
    app.option_add("*Text.insertBackground", p["text"])
    app.option_add("*Text.selectBackground", p["border"])
    app.option_add("*Text.selectForeground", p["text"])
    app.option_add("*Listbox.background", p["surface"])
    app.option_add("*Listbox.foreground", p["text"])
    app.option_add("*TCombobox*Listbox.background", p["surface"])
    app.option_add("*TCombobox*Listbox.foreground", p["text"])
    style = ttk.Style(app)
    if "clam" in style.theme_names():
        style.theme_use("clam")
    style.configure(".", background=p["bg"], foreground=p["text"], font=(app._studio_sans, 10), lightcolor=p["border"], darkcolor=p["border"], bordercolor=p["border"])
    style.configure("TFrame", background=p["bg"])
    style.configure("TLabel", background=p["bg"], foreground=p["text"])
    style.configure("Hint.TLabel", foreground=p["muted"])
    style.configure("Display.TLabel", font=(app._studio_serif, 25), foreground=p["text"])
    style.configure("Section.TLabel", font=(app._studio_serif, 18))
    style.configure("Title.TLabel", font=(app._studio_sans, 11, "bold"))
    style.configure("Accent.TLabel", foreground=p["accent"])
    style.configure("TButton", padding=(12, 8), background=p["surface"], foreground=p["text"], bordercolor=p["border"], focusthickness=2, focuscolor=p["accent"])
    style.map("TButton", background=[("active", p["raised"]), ("disabled", p["bg"])], foreground=[("disabled", "#737D8E")])
    style.configure("Primary.TButton", background=p["text"], foreground=p["bg"], padding=(16, 10), font=(app._studio_sans, 10, "bold"))
    style.map("Primary.TButton", background=[("active", p["accent"])], foreground=[("active", p["bg"])])
    for name in ("TEntry", "TCombobox", "TSpinbox"):
        style.configure(name, fieldbackground=p["surface"], background=p["surface"], foreground=p["text"], insertcolor=p["text"], bordercolor=p["border"], padding=6, arrowcolor=p["accent"])
        style.map(name, fieldbackground=[("readonly", p["surface"])], foreground=[("readonly", p["text"]), ("disabled", p["muted"])], bordercolor=[("focus", p["accent"])])
    style.configure("TCheckbutton", background=p["bg"], foreground=p["text"], indicatorbackground=p["surface"], indicatorforeground=p["accent"])
    style.map("TCheckbutton", background=[("active", p["bg"])])
    style.configure("TLabelframe", background=p["bg"], bordercolor=p["border"])
    style.configure("TLabelframe.Label", background=p["bg"], foreground=p["accent"])
    style.configure("TNotebook", background=p["bg"], borderwidth=0, tabmargins=(0, 0, 0, 10))
    style.configure("TNotebook.Tab", background=p["bg"], foreground=p["muted"], padding=(18, 12))
    style.map("TNotebook.Tab", background=[("selected", p["surface"])], foreground=[("selected", p["text"])])
    style.layout("Editor.TNotebook.Tab", [])
    style.configure("Treeview", background=p["bg"], fieldbackground=p["bg"], foreground=p["muted"], borderwidth=0, rowheight=36, font=(app._studio_sans, 10))
    style.map("Treeview", background=[("selected", p["surface"])], foreground=[("selected", p["text"])])
    style.configure("Treeview.Heading", background=p["bg"], foreground=p["muted"], relief="flat")
    style.configure("Vertical.TScrollbar", background=p["border"], troughcolor=p["bg"], borderwidth=0, arrowcolor=p["muted"])
    style.configure("TPanedwindow", background=p["border"])
    style.configure("TSeparator", background=p["border"])


def configure_window(app):
    width = min(1520, max(960, int(app.winfo_screenwidth() * .85)))
    height = min(1080, max(640, int(app.winfo_screenheight() * .86)))
    width = min(width, app.winfo_screenwidth() - 40)
    height = min(height, app.winfo_screenheight() - 80)
    app.geometry(f"{width}x{height}+{max(0,(app.winfo_screenwidth()-width)//2)}+30")
    app.minsize(940, 620)


def _scrollable(parent):
    outer = ttk.Frame(parent)
    canvas = tk.Canvas(outer, highlightthickness=0, background=PALETTE["bg"])
    bar = ttk.Scrollbar(outer, orient="vertical", command=canvas.yview)
    canvas.configure(yscrollcommand=bar.set)
    bar.pack(side="right", fill="y")
    canvas.pack(side="left", fill="both", expand=True)
    inner = ttk.Frame(canvas, padding=(6, 6, 20, 20))
    item = canvas.create_window((0, 0), window=inner, anchor="nw")
    def resized(event):
        canvas.configure(scrollregion=canvas.bbox("all"))
        def wrap_labels(widget):
            for child in widget.winfo_children():
                if isinstance(child, ttk.Label):
                    child.configure(wraplength=max(180, event.width - 35))
                wrap_labels(child)
        wrap_labels(inner)
    inner.bind("<Configure>", resized)
    canvas.bind("<Configure>", lambda event: canvas.itemconfigure(item, width=event.width))
    def wheel(event):
        canvas.yview_scroll(-int(event.delta / 120) if event.delta else (-1 if event.num == 4 else 1), "units")
        return "break"
    # Bind only descendants of this scroll area, leaving the chapter editor alone.
    def bind_children(widget):
        widget.bind("<MouseWheel>", wheel, add="+")
        widget.bind("<Button-4>", wheel, add="+")
        widget.bind("<Button-5>", wheel, add="+")
        for child in widget.winfo_children():
            bind_children(child)
    outer.after_idle(lambda: bind_children(inner))
    return outer, inner


class NovelStudio:
    FIELDS = ("title", "status", "blurb", "genre", "tone", "setting", "cover",
              "series_label", "series_order", "relation_type", "related_to",
              "shared_music_source", "shared_music_title", "hidden")

    def __init__(self, app, backend):
        self.app, self.backend = app, backend
        self.loading = 1
        self.active_key = ""
        self.baseline = ""
        self.baseline_snapshot = {}
        self.pending = None
        self.build_running = False
        self.focus_mode = False
        self._compact_key = None
        self._manual_layout = False
        self._reader_requested = True
        self.draft_status = tk.StringVar(app, value="Opening library…")
        self.summary = tk.StringVar(app, value="")
        self.book_title = tk.StringVar(app, value="Your next story")
        self.book_blurb = tk.StringVar(app, value="A cover, a premise, a first page.")
        self.tags = tk.StringVar(app)
        self.chapter_stats = tk.StringVar(app)
        self.preview_theme = tk.StringVar(app, value="Night")
        self.library_search = tk.StringVar(app)
        self.chapter_search = tk.StringVar(app)
        saved = backend.load_wizard_state().get("studio_preview_base", "http://127.0.0.1:4175")
        self.preview_base = tk.StringVar(app, value=saved)
        self._build()

    def _entry(self, parent, label, variable, attr, values=None, hint=None, readonly=False):
        ttk.Label(parent, text=label, style="Title.TLabel").pack(anchor="w", pady=(14, 5))
        if values is not None:
            widget = ttk.Combobox(parent, textvariable=variable, values=values, state="readonly" if readonly else "normal")
        else:
            widget = ttk.Entry(parent, textvariable=variable, state="readonly" if readonly else "normal")
        widget.pack(fill="x")
        setattr(self.app, attr, widget)
        if hint:
            ttk.Label(parent, text=hint, style="Hint.TLabel", wraplength=440).pack(anchor="w", pady=(4, 0))
        return widget

    def _preview_block(self, parent, prefix, title):
        a = self.app
        frame = ttk.LabelFrame(parent, text=title, padding=16)
        frame.columnconfigure(1, weight=1)
        setattr(a, prefix + "_preview_frame", frame)
        title_var = tk.StringVar(a)
        note_var = tk.StringVar(a)
        setattr(a, prefix + "_preview_title_var", title_var)
        setattr(a, prefix + "_preview_note_var", note_var)
        image = ttk.Label(frame, text="No cover selected", anchor="center", justify="center")
        image.grid(row=0, column=0, rowspan=2, sticky="nw", padx=(0, 16))
        setattr(a, {"selected": "selected_cover_preview", "upload": "upload_cover_preview", "related": "related_cover_preview"}[prefix], image)
        heading = ttk.Label(frame, textvariable=title_var, style="Title.TLabel", wraplength=230)
        heading.grid(row=0, column=1, sticky="nw")
        note = ttk.Label(frame, textvariable=note_var, style="Hint.TLabel", wraplength=230)
        note.grid(row=1, column=1, sticky="nw", pady=(8, 0))
        def reflow(event):
            if event.width < 390:
                frame.columnconfigure(0, weight=1)
                frame.columnconfigure(1, weight=0)
                image.grid_configure(row=0, column=0, rowspan=1, padx=0, sticky="n")
                heading.grid_configure(row=1, column=0, pady=(12, 0))
                note.grid_configure(row=2, column=0, pady=(8, 0))
                wrap = max(140, event.width - 40)
            else:
                frame.columnconfigure(0, weight=0)
                frame.columnconfigure(1, weight=1)
                image.grid_configure(row=0, column=0, rowspan=2, padx=(0, 16), sticky="nw")
                heading.grid_configure(row=0, column=1, pady=0)
                note.grid_configure(row=1, column=1, pady=(8, 0))
                wrap = max(140, event.width - 190)
            heading.configure(wraplength=wrap)
            note.configure(wraplength=wrap)
        frame.bind("<Configure>", reflow)
        return frame

    def _build(self):
        a, b = self.app, self.backend
        a.main = ttk.Frame(a, padding=(22, 18))
        a.main.pack(fill="both", expand=True)
        a.main.columnconfigure(0, weight=1)
        a.main.rowconfigure(1, weight=1)
        header = ttk.Frame(a.main)
        self.header = header
        header.grid(row=0, column=0, sticky="ew", pady=(0, 18))
        ttk.Label(header, text="Novel Wizard", style="Display.TLabel").pack(side="left")
        ttk.Label(header, text="A workspace for your literary library", style="Hint.TLabel").pack(side="left", padx=22)
        ttk.Button(header, text="Import setup", command=self.import_setup).pack(side="right")
        a.mode_combo = ttk.Combobox(header, textvariable=a.mode_var, values=[b.MODE_CREATE, b.MODE_EDIT], state="readonly", width=15)
        a.mode_combo.pack(side="right", padx=(0, 12))
        a.mode_combo.bind("<<ComboboxSelected>>", lambda event: a._on_mode_change())

        body = ttk.Panedwindow(a.main, orient="horizontal")
        self.body = body
        body.grid(row=1, column=0, sticky="nsew")
        rail = ttk.Frame(body, padding=(0, 0, 18, 0), width=245)
        self.library_rail = rail
        body.add(rail, weight=0)
        ttk.Label(rail, text="Your library", style="Section.TLabel").pack(anchor="w", pady=(0, 12))
        library_search = ttk.Entry(rail, textvariable=self.library_search)
        library_search.pack(fill="x", pady=(0, 8))
        ttk.Label(rail, text="Search titles or slugs", style="Hint.TLabel").pack(anchor="w", pady=(0, 10))
        self.library_tree = ttk.Treeview(rail, show="tree", selectmode="browse", height=12)
        self.library_tree.column("#0", width=220, minwidth=150)
        self.library_tree.pack(fill="both", expand=True)
        self.library_tree.bind("<<TreeviewSelect>>", self._library_selected)
        self.library_search.trace_add("write", lambda *_: self.refresh_library())
        a.lbl_existing = ttk.Label(rail, text="Selected URL", style="Hint.TLabel")
        a.lbl_existing.pack(anchor="w", pady=(16, 4))
        a.existing_combo = ttk.Combobox(rail, textvariable=a.existing_slug_var, width=24)
        a.existing_combo.pack(fill="x")
        a.existing_combo.bind("<<ComboboxSelected>>", lambda event: a._on_existing_selected())
        a.existing_combo.bind("<Return>", lambda event: a._on_existing_selected())
        a.existing_combo.bind("<KeyRelease>", lambda event: a._on_existing_query_change())
        a.btn_reload = ttk.Button(rail, text="Refresh library", command=lambda: (a._refresh_catalog(), self.refresh_library()))
        a.btn_reload.pack(fill="x", pady=(8, 0))

        self.workspace = ttk.Notebook(body)
        body.add(self.workspace, weight=1)
        self.pages = {}
        for title in ("Book", "Chapters", "Artwork", "Review"):
            frame = ttk.Frame(self.workspace, padding=(18, 8))
            self.workspace.add(frame, text=title)
            self.pages[title] = frame
        self.workspace.bind("<<NotebookTabChanged>>", lambda event: (self.refresh(), a.after(40, self._resize_now)))

        book = self.pages["Book"]
        book.columnconfigure(0, weight=3)
        book.columnconfigure(1, weight=2)
        book.rowconfigure(0, weight=1)
        scroll, form = _scrollable(book)
        scroll.grid(row=0, column=0, sticky="nsew")
        ttk.Label(form, text="The story at a glance", style="Section.TLabel").pack(anchor="w")
        ttk.Label(form, text="These details appear on the library and book pages.", style="Hint.TLabel").pack(anchor="w", pady=(6, 0))
        self._entry(form, "Book title", a.title_var, "title_entry")
        self._entry(form, "Permanent URL slug", a.slug_var, "slug_entry", readonly=True, hint="Existing chapter links and saved reading progress retain this URL.")
        self._entry(form, "Publication status", a.status_var, "status_combo", ["Complete", "Incomplete"], readonly=True)
        a.status_chip = tk.Label(form, text="", bg=PALETTE["surface"], fg=PALETTE["text"], padx=10, pady=4)
        a.status_chip.pack(anchor="w", pady=(6, 0))
        ttk.Label(form, text="Synopsis", style="Title.TLabel").pack(anchor="w", pady=(16, 5))
        a.blurb_entry = tk.Text(form, height=5, wrap="word", undo=True, padx=10, pady=10, relief="flat", highlightthickness=1, highlightbackground=PALETTE["border"], highlightcolor=PALETTE["accent"])
        a.blurb_entry.pack(fill="x")
        def update_blurb(event=None):
            if a.blurb_entry.edit_modified():
                text = a.blurb_entry.get("1.0", "end-1c")
                if text != a.blurb_var.get():
                    a.blurb_var.set(text)
                a.blurb_entry.edit_modified(False)
        def show_blurb(*_):
            text = a.blurb_var.get()
            if text != a.blurb_entry.get("1.0", "end-1c"):
                a.blurb_entry.delete("1.0", "end")
                a.blurb_entry.insert("1.0", text)
                a.blurb_entry.edit_modified(False)
        a.blurb_entry.bind("<<Modified>>", update_blurb)
        a.blurb_var.trace_add("write", show_blurb)
        a.discovery_frame = ttk.Frame(form)
        a.discovery_frame.pack(fill="x", pady=(14, 0))
        self._entry(a.discovery_frame, "Genres", a.genre_var, "genre_entry", hint="Comma-separated terms used by the catalogue filters.")
        self._entry(a.discovery_frame, "Mood and tone", a.tone_var, "tone_entry", hint="Use clear terms such as bittersweet, hopeful, or tense.")
        self._entry(a.discovery_frame, "Setting", a.setting_var, "setting_entry")
        a.rel_frame = ttk.LabelFrame(form, text="Connected stories", padding=14)
        a.rel_frame.pack(fill="x", pady=(24, 0))
        self._entry(a.rel_frame, "Series name", a.series_label_var, "series_entry")
        self._entry(a.rel_frame, "Reading order in series", a.series_order_var, "series_order_entry", hint="A positive whole number. This determines the book page’s reading sequence.")
        self._entry(a.rel_frame, "Relationship", a.relation_type_var, "relation_combo", b.RELATION_TYPE_CHOICES, readonly=True)
        a.related_to_combo = self._entry(a.rel_frame, "Related book slug", a.related_to_var, "related_to_combo", [], hint="Choose a real book in your library.")
        a.related_to_combo.bind("<KeyRelease>", lambda event: a._on_related_query_change())
        a.related_to_combo.bind("<<ComboboxSelected>>", lambda event: a._on_related_query_change())
        a.check_hidden = ttk.Checkbutton(form, text="Hidden in the legacy library only", variable=a.hidden_var)
        a.check_hidden.pack(anchor="w", pady=(20, 0))
        ttk.Label(form, text="The current library lists every Markdown book. Legacy visibility and audio settings are retained for older pages.", style="Hint.TLabel", wraplength=430).pack(anchor="w", pady=(5, 0))
        right_container = ttk.Frame(book, padding=(16, 0, 0, 8))
        right_container.grid(row=0, column=1, sticky="nsew")
        right_outer, right = _scrollable(right_container)
        right_outer.pack(fill="both", expand=True)
        right.columnconfigure(0, weight=1)
        ttk.Label(right, text="Book page preview", style="Accent.TLabel").grid(row=0, column=0, sticky="w", pady=(0, 18))
        a.selected_preview_frame = self._preview_block(right, "selected", "Current cover")
        a.selected_preview_frame.grid(row=1, column=0, sticky="ew")
        ttk.Label(right, textvariable=self.book_title, style="Section.TLabel", wraplength=360).grid(row=2, column=0, sticky="w", pady=(24, 8))
        ttk.Label(right, textvariable=self.summary, style="Hint.TLabel", wraplength=360).grid(row=3, column=0, sticky="w")
        ttk.Separator(right).grid(row=4, column=0, sticky="ew", pady=18)
        ttk.Label(right, textvariable=self.book_blurb, wraplength=360, justify="left").grid(row=5, column=0, sticky="nw")
        ttk.Label(right, textvariable=self.tags, style="Accent.TLabel", wraplength=360).grid(row=6, column=0, sticky="w", pady=18)
        self.book_open_button = ttk.Button(right_container, text="Open saved book page", command=lambda: self.open_page("book"))
        self.book_open_button.pack(anchor="w", pady=(12, 0))
        right.bind("<Configure>", lambda event: [child.configure(wraplength=max(160, event.width-26)) for child in right.winfo_children() if isinstance(child, ttk.Label)], add="+")

        chapters = self.pages["Chapters"]
        chapters.rowconfigure(1, weight=1)
        chapters.columnconfigure(0, weight=1)
        chapter_bar = ttk.Frame(chapters)
        chapter_bar.grid(row=0, column=0, sticky="ew", pady=(0, 12))
        a.lbl_edit_submode = ttk.Label(chapter_bar, text="Working on")
        a.lbl_edit_submode.pack(side="left")
        a.edit_submode_combo = ttk.Combobox(chapter_bar, textvariable=a.edit_submode_var, values=[b.EDIT_SUBMODE_EDIT, b.EDIT_SUBMODE_APPEND], state="readonly", width=23)
        a.edit_submode_combo.pack(side="left", padx=(8, 14))
        a.edit_submode_combo.bind("<<ComboboxSelected>>", lambda event: a._on_edit_submode_change())
        a.lbl_count = ttk.Label(chapter_bar, text="Drafts")
        a.lbl_count.pack(side="left")
        a.spin_count = ttk.Spinbox(chapter_bar, from_=1, to=200, textvariable=a.count_var, width=4, command=a._build_chapter_tabs)
        a.spin_count.pack(side="left", padx=8)
        a.chapter_hint_var = tk.StringVar(a)
        a.btn_bulk = ttk.Button(chapter_bar, text="Import chapters", command=a._bulk_import_docx)
        a.btn_bulk.pack(side="right")
        a.btn_bulk_replace = ttk.Button(chapter_bar, text="Replace names", command=a._open_bulk_replace_dialog)
        a.btn_bulk_replace.pack(side="right", padx=(0, 8))
        panes = ttk.Panedwindow(chapters, orient="horizontal")
        panes.grid(row=1, column=0, sticky="nsew")
        chapter_rail = ttk.Frame(panes, padding=(0, 0, 12, 0), width=170)
        panes.add(chapter_rail, weight=0)
        ttk.Entry(chapter_rail, textvariable=self.chapter_search).pack(fill="x", pady=(0, 8))
        ttk.Label(chapter_rail, text="Search chapter titles", style="Hint.TLabel").pack(anchor="w", pady=(0, 6))
        self.chapter_tree = ttk.Treeview(chapter_rail, show="tree", selectmode="browse")
        self.chapter_tree.column("#0", width=165, minwidth=110)
        self.chapter_tree.pack(fill="both", expand=True)
        self.chapter_tree.bind("<<TreeviewSelect>>", self._chapter_selected)
        self.chapter_search.trace_add("write", lambda *_: self.refresh_chapter_list(bind=False))
        editor = ttk.Frame(panes)
        panes.add(editor, weight=3)
        a.nb = ttk.Notebook(editor, style="Editor.TNotebook")
        a.nb.pack(fill="both", expand=True)
        a.nb.bind("<<NotebookTabChanged>>", lambda event: self.refresh_reader())
        self.chapter_panes = panes
        self.reader_pane = ttk.Frame(panes, padding=(14, 0, 0, 0))
        panes.add(self.reader_pane, weight=2)
        ttk.Label(self.reader_pane, text="Reading preview", style="Section.TLabel").pack(anchor="w", pady=(0, 10))
        ttk.Combobox(self.reader_pane, textvariable=self.preview_theme, values=list(READER_THEMES), state="readonly", width=12).pack(anchor="w", pady=(0, 10))
        self.preview_theme.trace_add("write", lambda *_: self.refresh_reader())
        self.reader_text = tk.Text(self.reader_pane, width=24, wrap="word", state="disabled", relief="flat", padx=22, pady=22, font=(a._studio_serif, 13), spacing1=4, spacing3=12, highlightthickness=1, highlightbackground=PALETTE["border"])
        self.reader_text.pack(fill="both", expand=True)
        ttk.Label(self.reader_pane, text="Plain-text draft preview. Open the saved reader to review the final formatting.", style="Hint.TLabel", wraplength=260).pack(anchor="w", pady=(10, 0))
        bottom = ttk.Frame(chapters)
        bottom.grid(row=2, column=0, sticky="ew", pady=(12, 0))
        ttk.Button(bottom, text="Previous", command=a._prev_tab).pack(side="left")
        ttk.Button(bottom, text="Next", command=a._next_tab).pack(side="left", padx=8)
        ttk.Button(bottom, text="Reading preview", command=self.toggle_reader).pack(side="left", padx=(0, 8))
        self.focus_button = ttk.Button(bottom, text="Focus", command=self.toggle_focus)
        self.focus_button.pack(side="left", padx=(0, 8))
        ttk.Label(bottom, textvariable=self.chapter_stats, style="Hint.TLabel").pack(side="left", padx=10)
        ttk.Button(bottom, text="Open saved chapter", command=lambda: self.open_page("reader")).pack(side="right")
        a._supports_x11_hwheel_buttons = a.tk.call("tk", "windowingsystem") == "x11"

        artwork_outer, artwork = _scrollable(self.pages["Artwork"])
        artwork_outer.pack(fill="both", expand=True)
        ttk.Label(artwork, text="The world around the words", style="Section.TLabel").pack(anchor="w", pady=(0, 10))
        ttk.Label(artwork, text="Keep the original artwork. Saving creates the responsive images used by the current pages.", style="Hint.TLabel", wraplength=700).pack(anchor="w")
        self._entry(artwork, "New or replacement cover file", a.cover_var, "cover_entry")
        a.btn_browse = ttk.Button(artwork, text="Choose cover", command=a._pick_cover)
        a.btn_browse.pack(anchor="w", pady=10)
        self._preview_block(artwork, "upload", "Selected artwork").pack(fill="x", pady=(0, 20))
        ttk.Label(artwork, text="Illustration gallery", style="Title.TLabel").pack(anchor="w", pady=(0, 6))
        a.gallery_entry = ttk.Entry(artwork, textvariable=a.gallery_summary_var, state="readonly")
        a.gallery_entry.pack(fill="x")
        gallery_actions = ttk.Frame(artwork)
        gallery_actions.pack(fill="x", pady=10)
        a.btn_gallery_manage = ttk.Button(gallery_actions, text="Manage artwork and scene notes", command=a._open_gallery_manager)
        a.btn_gallery_manage.pack(side="left")
        a.btn_gallery_reset = ttk.Button(gallery_actions, text="Reset selection", command=a._reset_gallery_selection)
        a.btn_gallery_reset.pack(side="left", padx=8)
        self._preview_block(artwork, "related", "Connected book").pack(fill="x", pady=20)
        a.music_frame = ttk.LabelFrame(artwork, text="Legacy audio settings", padding=14)
        a.music_frame.pack(fill="x", pady=(8, 0))
        ttk.Label(a.music_frame, text="Audio is preserved for the older pages. The current reader has no audio player.", style="Hint.TLabel", wraplength=700).pack(anchor="w")
        self._entry(a.music_frame, "Shared source", a.shared_music_source_var, "shared_music_entry")
        self._entry(a.music_frame, "Track label", a.shared_music_title_var, "shared_music_title_entry")
        music_actions = ttk.Frame(a.music_frame)
        music_actions.pack(fill="x", pady=10)
        a.btn_shared_music_browse = ttk.Button(music_actions, text="Choose audio", command=lambda: a._pick_music_source(a.shared_music_source_var))
        a.btn_shared_music_browse.pack(side="left")
        a.btn_shared_music_clear = ttk.Button(music_actions, text="Clear", command=a._clear_shared_music)
        a.btn_shared_music_clear.pack(side="left", padx=8)
        a.btn_apply_shared_music = ttk.Button(music_actions, text="Use for all chapters", command=a._apply_shared_music_to_all_chapters)
        a.btn_apply_shared_music.pack(side="left", padx=8)
        a.btn_clear_chapter_music = ttk.Button(music_actions, text="Clear chapter audio", command=a._clear_all_chapter_music)
        a.btn_clear_chapter_music.pack(side="left")

        review = self.pages["Review"]
        review.columnconfigure(0, weight=1)
        review.rowconfigure(2, weight=1)
        ttk.Label(review, text="Ready for the library", style="Section.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(review, text="Review the current draft, then save files or make a local commit. Publishing stays separate.", style="Hint.TLabel", wraplength=800).grid(row=1, column=0, sticky="w", pady=(8, 16))
        self.check_text = tk.Text(review, height=10, wrap="word", state="disabled", relief="flat", padx=18, pady=16, spacing3=10, highlightthickness=1, highlightbackground=PALETTE["border"])
        self.check_text.grid(row=2, column=0, sticky="nsew")
        for severity, color in (("error", "#EEADB7"), ("warning", PALETTE["warning"]), ("success", PALETTE["success"])):
            self.check_text.tag_configure(severity, foreground=color)
        preview_actions = ttk.Frame(review)
        preview_actions.grid(row=3, column=0, sticky="ew", pady=16)
        ttk.Label(preview_actions, text="Preview address").pack(side="left")
        ttk.Entry(preview_actions, textvariable=self.preview_base, width=28).pack(side="left", padx=10)
        ttk.Button(preview_actions, text="Build saved preview", command=self.build_preview).pack(side="left")
        ttk.Button(preview_actions, text="Open library", command=lambda: self.open_page("library")).pack(side="left", padx=8)
        commit = ttk.LabelFrame(review, text="Optional local commit", padding=14)
        commit.grid(row=4, column=0, sticky="ew")
        commit.columnconfigure(1, weight=1)
        ttk.Label(commit, text="Summary").grid(row=0, column=0, sticky="w", padx=(0, 12))
        a.commit_summary_entry = ttk.Entry(commit, textvariable=a.commit_summary_var)
        a.commit_summary_entry.grid(row=0, column=1, sticky="ew")
        ttk.Label(commit, text="Description").grid(row=1, column=0, sticky="nw", padx=(0, 12), pady=(10, 0))
        a.commit_desc_text = tk.Text(commit, height=3, wrap="word", relief="flat", padx=10, pady=8, highlightthickness=1, highlightbackground=PALETTE["border"])
        a.commit_desc_text.grid(row=1, column=1, sticky="ew", pady=(10, 0))

        a.action_row = ttk.Frame(a.main)
        a.action_row.grid(row=2, column=0, sticky="ew", pady=(18, 0))
        a.action_row.columnconfigure(0, weight=1)
        ttk.Label(a.action_row, textvariable=self.draft_status, style="Hint.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Button(a.action_row, text="Discard recovered draft", command=self.discard_draft).grid(row=0, column=1, padx=10)
        ttk.Button(a.action_row, text="Save files", command=lambda: a._commit(commit_to_git=False)).grid(row=0, column=2, padx=(0, 10))
        a.btn_commit = ttk.Button(a.action_row, text="Save & commit", style="Primary.TButton", command=a._commit)
        a.btn_commit.grid(row=0, column=3)
        a.title_var.trace_add("write", lambda *_: a._on_title_changed())
        a.status_var.trace_add("write", lambda *_: a._update_status_chip())
        a.cover_var.trace_add("write", lambda *_: a._refresh_upload_cover_preview())
        a.count_var.trace_add("write", lambda *_: self._count_changed())
        a.shared_music_source_var.trace_add("write", lambda *_: a._refresh_chapter_music_widgets())
        for field in self.FIELDS:
            getattr(a, field + "_var").trace_add("write", lambda *_: self.changed())
        a.bind("<Control-s>", lambda event: self._save_shortcut())
        a.bind("<Control-Shift-S>", lambda event: self._save_shortcut(commit=True))
        a.bind("<Control-f>", lambda event: self._focus_search())
        self._resize_job = None
        a.bind("<Configure>", self._resize, add="+")

    def toggle_reader(self):
        if str(self.reader_pane) in self.chapter_panes.panes():
            self.chapter_panes.forget(self.reader_pane)
            self._reader_requested = False
        else:
            self._reader_requested = True
            if self.chapter_panes.winfo_width() < 820 and not self.focus_mode:
                self.toggle_focus()
            self.chapter_panes.add(self.reader_pane, weight=2)
            self._resize_now()
            self.app.after(40, self._resize_now)

    def toggle_focus(self, automatic=False):
        if not automatic:
            self._manual_layout = True
        if not self.focus_mode:
            self.body.forget(self.library_rail)
            self.header.grid_remove()
            self.focus_mode = True
            self.focus_button.configure(text="Show library")
        else:
            self.body.insert(0, self.library_rail, weight=0)
            self.header.grid()
            self.focus_mode = False
            self.focus_button.configure(text="Focus")

    def _resize(self, event):
        if event.widget != self.app:
            return
        if self._resize_job:
            self.app.after_cancel(self._resize_job)
        self._resize_job = self.app.after(120, self._resize_now)

    def _resize_now(self):
        self._resize_job = None
        if not hasattr(self, "chapter_panes"):
            return
        current = self.workspace.select()
        chapter_page = str(self.pages["Chapters"])
        key = (self.app.winfo_width() < 1100, current)
        if key != self._compact_key:
            self._compact_key = key
            self._manual_layout = False
        if not self._manual_layout:
            should_focus = key[0] and current == chapter_page
            if should_focus != self.focus_mode:
                self.toggle_focus(automatic=True)
        if current != chapter_page:
            return
        available = self.chapter_panes.winfo_width()
        if available < 820 and str(self.reader_pane) in self.chapter_panes.panes():
            self.chapter_panes.forget(self.reader_pane)
        elif available >= 820 and self._reader_requested and str(self.reader_pane) not in self.chapter_panes.panes():
            self.chapter_panes.add(self.reader_pane, weight=2)
        if available > 10:
            self.chapter_panes.sashpos(0, min(175, max(120, int(available*.18))))
            if str(self.reader_pane) in self.chapter_panes.panes():
                self.chapter_panes.sashpos(1, max(525, available-315))

    def _save_shortcut(self, commit=False):
        self.app._commit(commit_to_git=commit)
        return "break"

    def import_setup(self):
        if not self.backend.missing_optional_dependencies():
            messagebox.showinfo("Import setup", "All optional import and image libraries are available.", parent=self.app)
            return
        self.app._deps_prompt_shown = False
        self.app._prompt_optional_dependency_install()

    def _focus_search(self):
        for child in self.library_tree.master.winfo_children():
            if isinstance(child, ttk.Entry):
                child.focus_set()
                break
        return "break"

    def _count_changed(self):
        try:
            count = int(self.app.count_var.get())
        except (ValueError, tk.TclError):
            return
        if not 1 <= count <= 200:
            return
        if not self.loading:
            self.app._build_chapter_tabs()
            self.changed()

    def refresh_library(self):
        if not hasattr(self, "library_tree"):
            return
        old = self.library_tree.selection()
        query = self.library_search.get().casefold().strip()
        self.library_tree.delete(*self.library_tree.get_children())
        books = []
        for slug in getattr(self.app, "_existing_slugs", []):
            meta = self.backend.read_novel_index_metadata(slug)
            title = meta.get("title") or self.backend.pretty(slug)
            if query and query not in (title + " " + slug).casefold():
                continue
            books.append((title.casefold(), slug, title))
        for _, slug, title in sorted(books):
            self.library_tree.insert("", "end", iid=slug, text=title)
        if old and self.library_tree.exists(old[0]):
            self.library_tree.selection_set(old)

    def _library_selected(self, event=None):
        selection = self.library_tree.selection()
        if not selection or self.loading:
            return
        slug = selection[0]
        if self.app.mode_var.get() == self.backend.MODE_EDIT and slug == self.app.slug_var.get():
            return
        self.begin_load()
        self.app.existing_slug_var.set(slug)
        if self.app.mode_var.get() != self.backend.MODE_EDIT:
            self.app.mode_var.set(self.backend.MODE_EDIT)
            self.app._on_mode_change()
        else:
            self.app._on_existing_selected()
        self.end_load()

    def _chapter_selected(self, event=None):
        selection = self.chapter_tree.selection()
        if selection:
            index = int(selection[0].split("-")[-1])
            if index < len(self.app.nb.tabs()):
                self.app.nb.select(index)

    def refresh_chapter_list(self, bind=True):
        self.chapter_tree.delete(*self.chapter_tree.get_children())
        query = self.chapter_search.get().casefold().strip()
        for index, rec in enumerate(self.app.chapter_tabs):
            title = rec["title_var"].get() or f"Chapter {rec['order']}"
            if not query or query in title.casefold():
                self.chapter_tree.insert("", "end", iid=f"chapter-{index}", text=title)
            if bind and not rec.get("studio_bound"):
                rec["studio_bound"] = True
                rec["text"].bind("<<Modified>>", lambda event, record=rec: self._text_changed(record))
                rec["text"].edit_modified(False)
                for name in ("title_var", "music_mode_var", "music_source_var", "music_title_var"):
                    rec[name].trace_add("write", lambda *_: self.changed())
        self.refresh_reader()

    def _text_changed(self, rec):
        if rec["text"].winfo_exists() and rec["text"].edit_modified():
            rec["text"].edit_modified(False)
            self.changed()

    def snapshot(self):
        a = self.app
        fields = {field: getattr(a, field + "_var").get() for field in self.FIELDS}
        chapters = []
        for rec in a.chapter_tabs:
            chapters.append({
                "order": rec["order"], "title": rec["title_var"].get(),
                "body": rec["text"].get("1.0", "end-1c"),
                "source_path": str(rec.get("source_path") or ""),
                "source_slug": str(rec.get("source_slug") or ""),
                "source_digest": str(rec.get("source_digest") or ""),
                "music_mode": rec["music_mode_var"].get(),
                "music_source": rec["music_source_var"].get(),
                "music_title": rec["music_title_var"].get(),
            })
        current_orders = {rec["order"] for rec in a.chapter_tabs}
        cache = {str(order): {key: str(value) if isinstance(value, Path) else value for key, value in item.items()}
                 for order, item in getattr(a, "_chapter_buffer_cache", {}).items() if order not in current_orders}
        return {"version": 1, "fields": fields, "chapters": chapters, "chapter_cache": cache,
                "gallery": a.gallery_items, "slug": a.slug_var.get()}

    @staticmethod
    def fingerprint(snapshot):
        return hashlib.sha256(json.dumps(snapshot, ensure_ascii=False, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    def key(self):
        return f"{self.app.mode_var.get()}:{self.app.slug_var.get() if self.app.mode_var.get() == self.backend.MODE_EDIT else 'new'}:{self.app.edit_submode_var.get()}"

    def begin_load(self):
        if not self.loading:
            self.stash()
        self.loading += 1

    def end_load(self):
        self.loading = max(0, self.loading - 1)
        if self.loading:
            return
        self.active_key = self.key()
        self.baseline_snapshot = self.snapshot()
        self.baseline = self.fingerprint(self.baseline_snapshot)
        draft = self.backend.load_wizard_state().get("studio_drafts", {}).get(self.active_key)
        if isinstance(draft, dict) and draft.get("version") == 1:
            self._restore(draft)
            self.draft_status.set("Recovered draft · original files unchanged")
        else:
            self.draft_status.set("Saved source loaded · edits recover automatically")
        self.refresh_library()
        self.refresh_chapter_list()
        self.refresh()

    def _restore(self, draft):
        self.loading += 1
        try:
            fields = draft.get("fields", {})
            base_fields = draft.get("base_fields", {})
            for field in self.FIELDS:
                if field in fields and isinstance(fields[field], (str, bool)):
                    if field in base_fields and fields[field] == base_fields[field]:
                        continue
                    getattr(self.app, field + "_var").set(fields[field])
            if self.app.mode_var.get() == self.backend.MODE_CREATE:
                chapters = draft.get("chapters", [])
                if chapters:
                    self.app.count_var.set(min(200, max(1, len(chapters))))
                    self.app._build_chapter_tabs()
            saved = {str(rec.get("source_slug") or rec.get("order")): rec for rec in draft.get("chapters", []) if isinstance(rec, dict)}
            bases = {str(rec.get("source_slug") or rec.get("order")): rec for rec in draft.get("base_chapters", []) if isinstance(rec, dict)}
            for rec in self.app.chapter_tabs:
                item = saved.get(str(rec.get("source_slug") or rec.get("order")))
                if not item:
                    continue
                base = bases.get(str(rec.get("source_slug") or rec.get("order")))
                if base and all(item.get(field) == base.get(field) for field in ("title", "body", "music_mode", "music_source", "music_title")):
                    continue
                rec["title_var"].set(str(item.get("title") or ""))
                rec["text"].delete("1.0", "end")
                rec["text"].insert("1.0", str(item.get("body") or ""))
                rec["text"].edit_modified(False)
                if isinstance(item.get("source_digest"), str):
                    rec["source_digest"] = item["source_digest"]
                for field in ("music_mode", "music_source", "music_title"):
                    rec[field + "_var"].set(str(item.get(field) or ""))
            if isinstance(draft.get("gallery"), list) and ("base_gallery" not in draft or draft["gallery"] != draft["base_gallery"]):
                self.app.gallery_items = draft["gallery"]
                self.app._refresh_gallery_summary()
            for order, item in draft.get("chapter_cache", {}).items():
                if str(order).isdigit() and isinstance(item, dict):
                    self.app._chapter_buffer_cache[int(order)] = item
        finally:
            self.loading -= 1

    def changed(self):
        if self.loading:
            return
        if self.pending:
            self.app.after_cancel(self.pending)
        self.draft_status.set("Draft changed · saving recovery copy…")
        self.pending = self.app.after(450, self._changed_now)

    def _changed_now(self):
        self.pending = None
        if self.loading:
            return
        self.stash()
        self.refresh_chapter_list(bind=False)
        self.refresh()

    def stash(self):
        if not self.active_key:
            return
        snapshot = self.snapshot()
        state = self.backend.load_wizard_state()
        drafts = state.setdefault("studio_drafts", {})
        if self.fingerprint(snapshot) == self.baseline:
            drafts.pop(self.active_key, None)
            status = "Saved source · no pending changes"
        else:
            snapshot["base_fields"] = self.baseline_snapshot.get("fields", {})
            snapshot["base_chapters"] = self.baseline_snapshot.get("chapters", [])
            snapshot["base_gallery"] = self.baseline_snapshot.get("gallery", [])
            drafts[self.active_key] = snapshot
            status = "Draft recovery saved locally · source files unchanged"
        state["studio_preview_base"] = self.preview_base.get()
        self.backend.save_wizard_state(state)
        self.draft_status.set(status)

    def mark_saved(self):
        state = self.backend.load_wizard_state()
        drafts = state.setdefault("studio_drafts", {})
        drafts.pop(self.active_key, None)
        self.backend.save_wizard_state(state)
        self.app._chapter_buffer_cache = {}
        self.baseline_snapshot = self.snapshot()
        self.baseline = self.fingerprint(self.baseline_snapshot)
        self.draft_status.set("Source files saved · rebuild preview to see changes")
        self.refresh()

    def discard_draft(self):
        if not messagebox.askyesno("Discard draft", "Discard this recovery copy and reload the saved source?", parent=self.app):
            return
        state = self.backend.load_wizard_state()
        state.setdefault("studio_drafts", {}).pop(self.active_key, None)
        self.backend.save_wizard_state(state)
        self.baseline = self.fingerprint(self.snapshot())
        if self.app.mode_var.get() == self.backend.MODE_EDIT:
            self.app._on_existing_selected()
        else:
            self.app._on_mode_change()

    def _draft_chapters(self):
        a = self.app
        merged = {}
        if a.mode_var.get() == self.backend.MODE_EDIT:
            for rec in a._existing_chapter_entries:
                source = Path(rec.get("path") or "")
                slug = source.stem if source.name else f"Chapter{rec['order']}"
                merged[slug] = {**rec, "slug": slug}
        for rec in a.chapter_tabs:
            slug = rec.get("source_slug") or f"Chapter{rec['order']}"
            body = rec["text"].get("1.0", "end-1c")
            if body.strip() or slug in merged:
                merged[slug] = {"slug": slug, "order": rec["order"], "title": rec["title_var"].get(), "body": body}
        return list(merged.values())

    def refresh(self):
        if self.loading or not hasattr(self, "check_text"):
            return
        a = self.app
        slug = a.slug_var.get().strip()
        cover = a.cover_var.get().strip()
        meta = {field: getattr(a, field + "_var").get() for field in ("title", "status", "blurb", "genre", "tone", "setting", "hidden")}
        meta["gallery"] = a.gallery_items
        meta["chapter_music_url"] = a.shared_music_source_var.get()
        if cover:
            meta["cover_source"] = cover
        relationship, error = a._build_relationship_entry_from_form(slug)
        relationships = self.backend.load_relationship_registry()
        if relationship:
            relationships[slug] = relationship
        else:
            relationships.pop(slug, None)
        try:
            info = inspect_novel(self.backend.REPO_ROOT, slug, metadata_overrides=meta, chapters=self._draft_chapters(), relationships=relationships)
        except Exception as exc:
            self.draft_status.set(f"Preview unavailable: {exc}")
            return
        self.book_title.set(meta["title"] or "Your next story")
        self.book_blurb.set(meta["blurb"] or "Add the synopsis readers will see on the book page.")
        self.tags.set("  /  ".join(str(meta[field]) for field in ("genre", "tone", "setting") if meta[field]))
        self.summary.set(f"{info['chapter_count']} chapters and endings\n{info['word_count']:,} words · about {info['reading_minutes']:,} min at 220 words/min")
        self.check_text.configure(state="normal")
        self.check_text.delete("1.0", "end")
        self.check_text.insert("end", self.book_title.get() + "\n" + self.summary.get() + "\n\n")
        issues = info.get("issues", [])
        if error:
            issues = issues + [{"severity": "error", "message": error}]
        if not issues:
            self.check_text.insert("end", "Ready for the current library, book page and reader.\n", "success")
        for issue in issues:
            self.check_text.insert("end", issue["severity"].capitalize() + ": " + issue["message"] + "\n", issue["severity"])
        self.check_text.insert("end", "\nThe browser preview uses saved files. Reader appearance and reading progress belong to each reader’s device.")
        self.check_text.configure(state="disabled")
        return info

    def validate_for_save(self):
        report = self.refresh()
        if report is None:
            raise ValueError("The current draft could not be checked. Review the book details before saving.")
        errors = [issue for issue in report.get("issues", []) if issue["severity"] == "error"]
        if errors:
            message = "\n".join(issue["message"] for issue in errors)
            if any(issue.get("code") == "asset_variants_missing" for issue in errors):
                message += "\n\nChoose the original image again under Artwork to prepare its responsive versions."
            self.workspace.select(self.pages["Review"])
            raise ValueError(message)

    def refresh_reader(self):
        if not hasattr(self, "reader_text") or not self.app.chapter_tabs:
            return
        try:
            index = self.app.nb.index(self.app.nb.select())
            rec = self.app.chapter_tabs[index]
        except (tk.TclError, IndexError):
            return
        body = rec["text"].get("1.0", "end-1c")
        title = rec["title_var"].get() or f"Chapter {rec['order']}"
        text = render_reader_text(body, title=title, label=f"Chapter {rec['order']}")
        background, foreground = READER_THEMES[self.preview_theme.get()]
        old_position = self.reader_text.yview()[0]
        self.reader_text.configure(state="normal", background=background, foreground=foreground, selectbackground=PALETTE["border"], selectforeground=PALETTE["text"])
        self.reader_text.delete("1.0", "end")
        self.reader_text.insert("1.0", title + "\n\n" + (text or "Start writing to see the reading preview."))
        self.reader_text.configure(state="disabled")
        self.reader_text.yview_moveto(old_position)
        words = count_words(body, title=title, label=f"Chapter {rec['order']}")
        self.chapter_stats.set(f"{words:,} words · about {max(1,(words+219)//220)} min")
        item = f"chapter-{index}"
        if self.chapter_tree.exists(item) and self.chapter_tree.selection() != (item,):
            self.chapter_tree.selection_set(item)
            self.chapter_tree.see(item)

    def open_page(self, kind):
        chapter = None
        if kind == "reader" and self.app.chapter_tabs:
            index = self.app.nb.index(self.app.nb.select())
            rec = self.app.chapter_tabs[index]
            chapter = rec.get("source_slug") or f"Chapter{rec['order']}"
        try:
            slug = (self.app.slug_var.get() or "new-story") if kind == "library" else self.app.slug_var.get()
            urls = preview_urls(slug, chapter, self.preview_base.get().strip())
            target = urls[kind]
        except (ValueError, KeyError) as exc:
            messagebox.showerror("Preview address", str(exc), parent=self.app)
            return
        if kind != "library" and not (self.backend.NOVEL_DIR / self.app.slug_var.get() / "index.md").exists():
            messagebox.showinfo("Save this story first", "Save the book files, then build the preview to open its public page.", parent=self.app)
            return
        if urlsplit(self.preview_base.get()).hostname in ("localhost", "127.0.0.1"):
            try:
                from .novel_preview import ensure_local_preview
            except ImportError:
                from novel_preview import ensure_local_preview
            preview = ensure_local_preview(self.backend.REPO_ROOT, self.preview_base.get())
            if not preview["ok"]:
                messagebox.showerror("Local preview", preview["message"], parent=self.app)
                return
        webbrowser.open(target)

    def build_preview(self):
        if self.build_running:
            return
        self.stash()
        preview_address = self.preview_base.get().strip()
        try:
            preview_urls("new-story", base=preview_address)
        except ValueError as exc:
            messagebox.showerror("Preview address", str(exc), parent=self.app)
            return
        self.build_running = True
        window = tk.Toplevel(self.app)
        window.title("Build saved novel pages")
        window.geometry("860x560")
        window.configure(background=PALETTE["bg"])
        ttk.Label(window, text="Building saved source files", style="Section.TLabel").pack(anchor="w", padx=20, pady=16)
        output = tk.Text(window, wrap="word", state="disabled", relief="flat", padx=20, pady=12)
        output.pack(fill="both", expand=True)
        status = tk.StringVar(window, value="The editor stays available. Unsaved drafts are retained separately.")
        ttk.Label(window, textvariable=status, style="Hint.TLabel").pack(anchor="w", padx=20, pady=14)
        messages = queue.Queue()
        root = self.backend.REPO_ROOT
        commands = []
        npm = "npm.cmd" if sys.platform == "win32" else "npm"
        if not (root / "showcase" / "dist" / "index.html").exists():
            commands.append([npm, "--prefix", "showcase", "run", "build"])
        commands.extend([[npm, "--prefix", "web", "run", "build"], [npm, "--prefix", "showcase", "run", "assemble"]])
        def worker():
            try:
                for command in commands:
                    messages.put("\n" + " ".join(command) + "\n")
                    options = {"creationflags": subprocess.CREATE_NO_WINDOW} if sys.platform == "win32" else {}
                    process = subprocess.Popen(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace", **options)
                    for line in process.stdout:
                        messages.put(line)
                    if process.wait() != 0:
                        messages.put((False, "Build failed. Review the output above; saved source files remain available."))
                        return
                try:
                    from .novel_preview import ensure_local_preview
                except ImportError:
                    from novel_preview import ensure_local_preview
                preview = ensure_local_preview(root, preview_address)
                messages.put((preview["ok"], "Preview built. " + preview["message"]))
            except Exception as exc:
                messages.put((False, str(exc)))
        threading.Thread(target=worker, daemon=True).start()
        def poll():
            done = False
            while not messages.empty():
                item = messages.get_nowait()
                if isinstance(item, tuple):
                    self.build_running = False
                    done = True
                    if window.winfo_exists():
                        status.set(item[1])
                        if item[0]:
                            ttk.Button(window, text="Open library", command=lambda: self.open_page("library")).pack(anchor="w", padx=20, pady=(0, 14))
                elif window.winfo_exists():
                    output.configure(state="normal")
                    output.insert("end", item)
                    output.see("end")
                    output.configure(state="disabled")
            if not done:
                self.app.after(100, poll)
        self.app.after(100, poll)


def build_ui(app, backend):
    app.studio = NovelStudio(app, backend)
