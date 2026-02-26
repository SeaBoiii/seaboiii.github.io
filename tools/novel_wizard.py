#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tkinter Novel Wizard for GitHub Pages + Jekyll
- Create a new novel with chapters (minimal inputs)
- Append additional chapters to an existing novel (no cover input)
- Formatted paste (HTML/RTF → Markdown) + single DOCX/Markdown import
- NEW: Bulk DOCX/Markdown import (select multiple files; sorted by filename; fills titles & content; auto-scales tabs)

Run from your repo root: python3 tools/novel_wizard.py
"""

import json, re, shutil, sys, subprocess
from html import escape as html_escape
from pathlib import Path
from typing import Optional, Tuple
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
try:
    from bs4 import BeautifulSoup as _BeautifulSoup  # pip install beautifulsoup4
except Exception:
    _BeautifulSoup = None
try:
    from PIL import Image as _PILImage, ImageTk as _PILImageTk  # pip install pillow
except Exception:
    _PILImage = None
    _PILImageTk = None

REPO_ROOT = Path(__file__).resolve().parents[1]  # repo root (../ from tools/)
NOVEL_DIR = REPO_ROOT / "novel"
IMAGES_DIR = REPO_ROOT / "images"
NOVELS_INDEX_HTML = NOVEL_DIR / "index.html"
RELATIONSHIPS_JSON = REPO_ROOT / "tools" / "novel_relationships.json"
MARKDOWN_EXTS = {".md", ".markdown", ".mdown", ".mkd"}

RELATION_TYPE_LABELS = {
    "original": "Original",
    "prequel": "Prequel",
    "sequel": "Sequel",
    "companion": "Companion",
    "spin-off": "Spin-off",
}
RELATION_TYPE_CHOICES = ["", "Original", "Prequel", "Sequel", "Companion", "Spin-off"]

# ---------- helpers ----------
def slugify(title: str) -> str:
    s = title.strip().lower()
    s = re.sub(r"[^\w\s-]", "-", s)        # non-alnum -> hyphen
    s = re.sub(r"\s+", "-", s)             # spaces -> hyphen
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "untitled"

def pretty(slug: str) -> str:
    t = re.sub(r"[-_]+", " ", slug).strip()
    return " ".join(w.capitalize() for w in t.split()) if t else "Untitled"

def write_text(p: Path, text: str):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8", newline="\n")

def _normalize_relation_type(value: str) -> str:
    s = (value or "").strip().lower()
    if not s:
        return ""
    key = re.sub(r"[^a-z]+", "", s)
    mapping = {
        "original": "original",
        "prequel": "prequel",
        "sequel": "sequel",
        "companion": "companion",
        "spinoff": "spin-off",
    }
    return mapping.get(key, "")

def _normalize_relationship_entry(value) -> dict:
    if not isinstance(value, dict):
        return {}

    out = {}
    series_label = str(value.get("series_label") or "").strip()
    if series_label:
        out["series_label"] = series_label

    series_id = str(value.get("series_id") or "").strip()
    if not series_id and series_label:
        series_id = slugify(series_label)
    if series_id:
        out["series_id"] = slugify(series_id)

    reading_order_raw = value.get("reading_order")
    try:
        if reading_order_raw not in (None, ""):
            reading_order = int(reading_order_raw)
            if reading_order > 0:
                out["reading_order"] = reading_order
    except Exception:
        pass

    relation_type = _normalize_relation_type(str(value.get("relation_type") or ""))
    if relation_type:
        out["relation_type"] = relation_type

    related_to = str(value.get("related_to") or "").strip()
    if related_to:
        out["related_to"] = slugify(related_to)

    return out

def load_relationship_registry() -> dict:
    if not RELATIONSHIPS_JSON.exists():
        return {}
    try:
        raw = json.loads(RELATIONSHIPS_JSON.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(raw, dict):
        return {}

    out = {}
    for raw_slug, raw_entry in raw.items():
        slug = slugify(str(raw_slug or ""))
        if not slug:
            continue
        entry = _normalize_relationship_entry(raw_entry)
        if entry:
            out[slug] = entry
    return out

def save_relationship_registry(registry: dict):
    clean = {}
    for raw_slug, raw_entry in (registry or {}).items():
        slug = slugify(str(raw_slug or ""))
        if not slug:
            continue
        entry = _normalize_relationship_entry(raw_entry)
        if entry:
            clean[slug] = entry
    RELATIONSHIPS_JSON.parent.mkdir(parents=True, exist_ok=True)
    RELATIONSHIPS_JSON.write_text(
        json.dumps(clean, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )

def upsert_relationship_registry_entry(slug: str, entry: Optional[dict]):
    slug = slugify(slug)
    if not slug:
        return
    registry = load_relationship_registry()
    if entry:
        clean = _normalize_relationship_entry(entry)
        if clean:
            registry[slug] = clean
        else:
            registry.pop(slug, None)
    else:
        registry.pop(slug, None)
    save_relationship_registry(registry)

def relationship_entry_for_slug(slug: str) -> dict:
    return load_relationship_registry().get(slugify(slug), {})

def relationship_badges_for_slug(slug: str) -> list[dict]:
    entry = relationship_entry_for_slug(slug)
    if not entry:
        return []

    badges = []
    series_label = str(entry.get("series_label") or "").strip()
    if series_label:
        badges.append({"label": series_label, "title": f"Series: {series_label}"})

    reading_order = entry.get("reading_order")
    if isinstance(reading_order, int) and reading_order > 0:
        badges.append({"label": f"Book {reading_order}", "title": "Recommended reading order"})

    relation_type = _normalize_relation_type(str(entry.get("relation_type") or ""))
    if relation_type:
        relation_label = RELATION_TYPE_LABELS.get(relation_type, pretty(relation_type))
        related_to = str(entry.get("related_to") or "").strip()
        title = relation_label
        if related_to:
            title = f"{relation_label} to {pretty(related_to)}"
        badges.append({"label": relation_label, "title": title})

    return badges

def _novel_slug_from_card_href(href: str) -> str:
    h = (href or "").strip()
    if not h:
        return ""
    m = re.search(r"/novel/([^/]+)(?:/|/index\.html)?$", h)
    if not m:
        return ""
    return slugify(m.group(1))

def _local_path_from_site_url(url: str) -> Optional[Path]:
    u = (url or "").strip()
    if not u:
        return None
    if u.startswith(("http://", "https://")):
        return None
    p = (REPO_ROOT / u.lstrip("/")) if u.startswith("/") else (REPO_ROOT / u)
    return p if p.exists() else None

def novel_card_preview_info(slug: str) -> dict:
    """
    Best-effort lookup of a novel's display title and cover image file from /novel/index.html.
    Returns: {"slug", "title", "image_path", "image_url", "note"}.
    """
    slug = slugify(slug)
    info = {
        "slug": slug,
        "title": pretty(slug) if slug else "",
        "image_path": None,
        "image_url": "",
        "note": "",
    }
    if not slug:
        return info
    if not NOVELS_INDEX_HTML.exists():
        info["note"] = f"{NOVELS_INDEX_HTML.name} not found"
        return info
    if _BeautifulSoup is None:
        info["note"] = "Install beautifulsoup4 for cover preview lookup"
        return info

    try:
        soup = _BeautifulSoup(NOVELS_INDEX_HTML.read_text(encoding="utf-8"), "html.parser")
    except Exception as exc:
        info["note"] = f"Could not parse {NOVELS_INDEX_HTML.name}: {exc}"
        return info

    for card in soup.select("li.novel-card"):
        a = card.find("a", href=True)
        card_slug = _novel_slug_from_card_href(a.get("href", "") if a else "")
        if card_slug != slug:
            continue

        title_node = card.find(class_="novel-title")
        if title_node:
            info["title"] = title_node.get_text(" ", strip=True) or info["title"]

        img = card.find("img")
        if img and img.get("src"):
            src = str(img.get("src") or "").strip()
            info["image_url"] = src
            local = _local_path_from_site_url(src)
            if local is not None:
                info["image_path"] = local
                return info

        # Fallback: inspect any source/srcset in <picture> and try the first candidate.
        source = card.find("source")
        if source and source.get("srcset"):
            srcset = str(source.get("srcset") or "")
            first = srcset.split(",")[0].strip().split(" ")[0].strip()
            info["image_url"] = first or info["image_url"]
            local = _local_path_from_site_url(first)
            if local is not None:
                info["image_path"] = local
                return info

        if not info["note"]:
            info["note"] = "Card found, but no local image file resolved"
        return info

    info["note"] = "Novel card not found in novel/index.html"
    return info

def sync_relationship_badges_in_novels_index() -> dict:
    """
    Rebuild each novel card's relationship badges + data-* attrs from the registry.
    Status/Hidden badges are preserved canonically from card data attributes.
    """
    if _BeautifulSoup is None:
        raise RuntimeError(
            "BeautifulSoup4 is required for syncing relationship badges.\n"
            "Install it with: pip install beautifulsoup4"
        )
    if not NOVELS_INDEX_HTML.exists():
        raise FileNotFoundError(f"Cannot find {NOVELS_INDEX_HTML}")

    html = NOVELS_INDEX_HTML.read_text(encoding="utf-8")
    soup = _BeautifulSoup(html, "html.parser")
    cards = list(soup.select("li.novel-card"))

    if not cards:
        return {
            "cards_total": 0,
            "cards_touched": 0,
            "cards_updated": 0,
            "cards_skipped": 0,
            "file_changed": False,
        }

    cards_touched = 0
    cards_updated = 0
    cards_skipped = 0

    for card in cards:
        a = card.find("a", href=True)
        slug = _novel_slug_from_card_href(a.get("href", "") if a else "")
        if not slug:
            cards_skipped += 1
            continue
        cards_touched += 1

        before = str(card)
        rel_entry = relationship_entry_for_slug(slug)

        # Sync relationship data-* attrs
        if rel_entry.get("series_id"):
            card["data-series"] = str(rel_entry.get("series_id"))
        else:
            card.attrs.pop("data-series", None)

        if rel_entry.get("relation_type"):
            card["data-relation"] = str(rel_entry.get("relation_type"))
        else:
            card.attrs.pop("data-relation", None)

        if isinstance(rel_entry.get("reading_order"), int):
            card["data-order"] = str(int(rel_entry.get("reading_order")))
        else:
            card.attrs.pop("data-order", None)

        if rel_entry.get("related_to"):
            card["data-related-to"] = str(rel_entry.get("related_to"))
        else:
            card.attrs.pop("data-related-to", None)

        status_class = str(card.get("data-status") or "").strip().lower()
        if status_class not in {"complete", "incomplete"}:
            status_class = "incomplete"
        status_text = "Complete" if status_class == "complete" else "Incomplete"
        hidden = str(card.get("data-hidden") or "").strip().lower() == "true"

        meta = card.find(class_="novel-meta")
        if meta is None:
            if a is None:
                cards_skipped += 1
                continue
            meta = soup.new_tag("div", attrs={"class": "novel-meta"})
            title_node = a.find(class_="novel-title")
            if title_node is not None:
                title_node.insert_after(meta)
            else:
                a.append(meta)
        else:
            meta["class"] = ["novel-meta"]

        # Canonical rebuild of meta badges: status + relationship + hidden.
        meta.clear()

        status_badge = soup.new_tag("span", attrs={"class": ["badge", status_class]})
        status_badge.string = status_text
        meta.append(status_badge)

        for badge in relationship_badges_for_slug(slug):
            label = str(badge.get("label") or "").strip()
            if not label:
                continue
            badge_tag = soup.new_tag("span", attrs={"class": ["badge"]})
            title = str(badge.get("title") or "").strip()
            if title:
                badge_tag["title"] = title
            badge_tag.string = label
            meta.append(badge_tag)

        if hidden:
            hidden_badge = soup.new_tag("span", attrs={"class": ["badge"]})
            hidden_badge.string = "Hidden"
            meta.append(hidden_badge)

        if str(card) != before:
            cards_updated += 1

    new_html = soup.prettify()
    file_changed = new_html != html
    if file_changed:
        NOVELS_INDEX_HTML.write_text(new_html, encoding="utf-8", newline="\n")

    return {
        "cards_total": len(cards),
        "cards_touched": cards_touched,
        "cards_updated": cards_updated,
        "cards_skipped": cards_skipped,
        "file_changed": file_changed,
    }

def build_relationship_entry_from_values(
    slug: str,
    series_label: str = "",
    series_order_raw: str = "",
    relation_type_raw: str = "",
    related_to_raw: str = "",
) -> Tuple[Optional[dict], Optional[str]]:
    series_label = (series_label or "").strip()
    series_order_raw = (series_order_raw or "").strip()
    relation_type = _normalize_relation_type(relation_type_raw or "")
    related_to_raw = (related_to_raw or "").strip()
    related_to = slugify(related_to_raw) if related_to_raw else ""
    slug = slugify(slug)

    if not any([series_label, series_order_raw, relation_type, related_to]):
        return None, None

    entry = {}
    if series_label:
        entry["series_label"] = series_label
        entry["series_id"] = slugify(series_label)

    if series_order_raw:
        if not series_order_raw.isdigit() or int(series_order_raw) <= 0:
            return None, "Series Book # must be a positive integer."
        entry["reading_order"] = int(series_order_raw)

    if relation_type:
        entry["relation_type"] = relation_type

    if related_to:
        if related_to == slug:
            return None, "Related slug cannot be the same as the selected novel slug."
        entry["related_to"] = related_to

    # If a related novel is chosen but no series label was supplied, inherit it when possible.
    if related_to and not entry.get("series_label"):
        parent = relationship_entry_for_slug(related_to)
        parent_label = str(parent.get("series_label") or "").strip()
        if parent_label:
            entry["series_label"] = parent_label
            entry["series_id"] = slugify(parent_label)

    return _normalize_relationship_entry(entry), None

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

def read_text_with_fallback(path: Path) -> str:
    for enc in ("utf-8", "utf-8-sig", "cp1252"):
        try:
            return path.read_text(encoding=enc)
        except Exception:
            continue
    return ""

def split_markdown_front_matter(text: str) -> tuple[dict, str]:
    s = (text or "").lstrip("\ufeff")
    m = re.match(r"^---\s*\r?\n(?P<fm>.*?)(?:\r?\n)---\s*(?:\r?\n)?", s, flags=re.S)
    if not m:
        return {}, s
    kv = {}
    for line in (m.group("fm") or "").splitlines():
        mm = re.match(r"^\s*([^:]+)\s*:\s*(.*)\s*$", line)
        if mm:
            kv[mm.group(1).strip()] = mm.group(2).strip()
    return kv, s[m.end():]

def _titleish_line(line: str) -> str:
    s = line.rstrip("\r\n")
    s = re.sub(r"^\s{0,3}#{1,6}\s*", "", s)        # markdown heading marker
    s = re.sub(r"\s*#{1,6}\s*$", "", s)            # trailing heading hashes
    s = re.sub(r"^\s*(\*\*|__)", "", s)            # leading bold marker
    s = re.sub(r"(\*\*|__)\s*$", "", s)            # trailing bold marker
    return s.strip()

def _strip_chapter_prefix_title(title: str) -> str:
    s = (title or "").strip()
    if not s:
        return ""
    # "Chapter 5", "Chapter 5: Title", "Chapter 5 - Title"
    s2 = re.sub(r"(?i)^\s*chapter\b\s*\d+\b\s*[:.\-–—]*\s*", "", s).strip()
    return s2

def _split_markdown_title_from_body(body: str) -> tuple[str, str]:
    """
    Extract a likely chapter title while preserving body formatting exactly
    (including indentation) for the remaining content.

    Heuristics (in order):
    - First non-empty line is an H1 -> title
    - First non-empty line looks like "Chapter X[: - title]" -> title (same line or next non-empty line)
    """
    if not body:
        return "", body

    lines = body.splitlines(keepends=True)
    if not lines:
        return "", body

    nonempty = [i for i, line in enumerate(lines) if line.strip()]
    if not nonempty:
        return "", body

    first_i = nonempty[0]
    first_line = lines[first_i]
    first_titleish = _titleish_line(first_line)

    # Case 1: "Chapter X" line (plain or markdown heading)
    chapter_line_match = re.match(
        r"^\s{0,3}(?:#{1,6}\s*)?(?:\*\*|__)?\s*chapter\b\s*([0-9]+)\b(?P<rest>.*)$",
        first_line,
        flags=re.I,
    )
    if chapter_line_match:
        rest = chapter_line_match.group("rest") or ""
        rest_title = re.sub(r"^[\s:.\-–—]+", "", _titleish_line(rest))
        rest_title = _strip_chapter_prefix_title(rest_title)
        if rest_title:
            title = rest_title
            keep = lines[:first_i] + lines[first_i + 1 :]
            if first_i < len(keep) and keep[first_i].strip() == "":
                del keep[first_i]
            return title, "".join(keep)

        # Title is usually on the line after "Chapter X"
        if len(nonempty) >= 2:
            second_i = nonempty[1]
            candidate_line = lines[second_i]
            candidate_title = _titleish_line(candidate_line)
            candidate_title = _strip_chapter_prefix_title(candidate_title)
            if (
                candidate_title
                and not re.match(r"(?i)^chapter\b\s*\d+\b", candidate_title)
                and not re.match(r"^[-=_*~]{3,}$", candidate_title)
            ):
                # Remove chapter line + title line, preserve all indentation/spacing after them.
                keep = []
                for i, line in enumerate(lines):
                    if i in (first_i, second_i):
                        continue
                    keep.append(line)
                # Remove a single blank line immediately after the removed header block.
                anchor = min(first_i, second_i)
                if anchor < len(keep) and keep[anchor].strip() == "":
                    del keep[anchor]
                return candidate_title, "".join(keep)

    # Case 2: leading H1
    if re.match(r"^\s{0,3}#\s+\S", first_line):
        title = _strip_chapter_prefix_title(first_titleish)
        keep = lines[:first_i] + lines[first_i + 1 :]
        # Remove one immediate blank line after the extracted title line.
        if first_i < len(keep) and keep[first_i].strip() == "":
            del keep[first_i]
        return title, "".join(keep)

    return "", body

def markdown_file_import_info(path: Path) -> dict:
    text = read_text_with_fallback(path)
    fm, body = split_markdown_front_matter(text)

    title = _strip_chapter_prefix_title(str(fm.get("Title") or fm.get("title") or "").strip())
    if not title:
        inferred_title, body_wo_title = _split_markdown_title_from_body(body)
        if inferred_title:
            title = _strip_chapter_prefix_title(inferred_title)
            body = body_wo_title

    order = None
    raw_order = fm.get("order")
    if raw_order is not None and str(raw_order).strip().isdigit():
        order = int(str(raw_order).strip())

    return {
        "body": normalize_smart_punctuation(body or ""),
        "title": title,
        "order": order,
    }

def import_file_info(path: Path) -> dict:
    ext = path.suffix.lower()
    if ext == ".docx":
        body = docx_file_to_markdown(path)
        title, body_wo_title = _split_markdown_title_from_body(body)
        return {
            "body": body_wo_title if title else body,
            "title": _strip_chapter_prefix_title(title),
            "order": None,
            "kind": "docx",
        }
    if ext in MARKDOWN_EXTS:
        info = markdown_file_import_info(path)
        info["kind"] = "markdown"
        return info
    return {"body": "", "title": "", "order": None, "kind": "unknown"}

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
    # Preserve leading indentation/spacing from imported or pasted content.
    body = body or ""
    if not body.endswith("\n"):
        body += "\n"
    return header + body

def build_index_md(slug: str, status: str = "Incomplete", blurb: str = "") -> str:
    t = pretty(slug)
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
    rel_entry = relationship_entry_for_slug(slug)

    data_series = ""
    data_relation = ""
    data_order = ""
    data_related_to = ""
    if rel_entry.get("series_id"):
        data_series = f''' data-series="{html_escape(str(rel_entry.get("series_id")))}"'''
    if rel_entry.get("relation_type"):
        data_relation = f''' data-relation="{html_escape(str(rel_entry.get("relation_type")))}"'''
    if isinstance(rel_entry.get("reading_order"), int):
        data_order = f''' data-order="{int(rel_entry.get("reading_order"))}"'''
    if rel_entry.get("related_to"):
        data_related_to = f''' data-related-to="{html_escape(str(rel_entry.get("related_to")))}"'''

    hidden_attr = ' data-hidden="true"' if hidden else ''
    hidden_badge = f'''              <span class="badge">Hidden</span>\n''' if hidden else ''
    rel_badges = []
    for badge in relationship_badges_for_slug(slug):
        label = html_escape(str(badge.get("label") or ""))
        if not label:
            continue
        title = str(badge.get("title") or "").strip()
        title_attr = f''' title="{html_escape(title)}"''' if title else ""
        rel_badges.append(f'''              <span class="badge"{title_attr}>{label}</span>\n''')
    rel_badges_html = "".join(rel_badges)

    safe_title = html_escape(novel_title)
    safe_aria = html_escape(novel_title)
    safe_cover = html_escape(cover_rel)
    li = (
        f'''        <li class="novel-card" data-title="{html_escape(novel_title.lower())}" data-status="{status_class}"{hidden_attr}{data_series}{data_relation}{data_order}{data_related_to}>\n'''
        f'''          <a href="/novel/{slug}/" aria-label="{safe_aria}">\n'''
        f'''            <img src="{safe_cover}" alt="{safe_title}" loading="lazy" />\n'''
        f'''            <h2 class="novel-title">{safe_title}</h2>\n'''
        f'''            <div class="novel-meta">\n'''
        f'''              <span class="badge {status_class}">{status_text}</span>\n'''
        f'''{rel_badges_html}'''
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

class RelationshipEditorDialog(tk.Toplevel):
    """Edit relationship metadata for existing novels via a simple form."""
    def __init__(self, master, on_registry_changed=None):
        super().__init__(master)
        self.title("Relationship Editor")
        self.resizable(True, True)
        self.on_registry_changed = on_registry_changed

        self.slug_var = tk.StringVar()
        self.series_label_var = tk.StringVar()
        self.series_order_var = tk.StringVar()
        self.relation_type_var = tk.StringVar(value="")
        self.related_to_var = tk.StringVar()
        self.status_var = tk.StringVar(value="Select a novel to edit relationship metadata.")
        self.preview_title_var = tk.StringVar(value="")
        self.preview_note_var = tk.StringVar(value="")
        self._cover_preview_img = None

        self._build_ui()
        self._reload_slugs()

        self.transient(master)
        self.grab_set()
        self.protocol("WM_DELETE_WINDOW", self.destroy)

    def _build_ui(self):
        root = ttk.Frame(self, padding=12)
        root.pack(fill="both", expand=True)
        root.columnconfigure(1, weight=1)
        root.columnconfigure(2, weight=1)

        ttk.Label(root, text="Novel").grid(row=0, column=0, sticky="w")
        self.slug_combo = ttk.Combobox(root, textvariable=self.slug_var, width=36)
        self.slug_combo.grid(row=0, column=1, sticky="we", padx=(8,8))
        self.slug_combo.bind("<<ComboboxSelected>>", lambda e: self._load_selected())
        self.slug_combo.bind("<FocusOut>", lambda e: self._load_selected())
        ttk.Button(root, text="Reload", command=self._reload_slugs).grid(row=0, column=2, sticky="e")

        preview = ttk.LabelFrame(root, text="Novel preview", padding=(10, 8))
        preview.grid(row=1, column=0, columnspan=3, sticky="nsew", pady=(10, 0))
        preview.columnconfigure(1, weight=1)
        preview.rowconfigure(0, weight=1)

        self.cover_preview_label = ttk.Label(preview, text="No preview", anchor="center", justify="center")
        self.cover_preview_label.grid(row=0, column=0, rowspan=3, sticky="nw", padx=(0, 12))

        ttk.Label(preview, textvariable=self.preview_title_var, justify="left").grid(row=0, column=1, sticky="w")
        ttk.Label(preview, textvariable=self.preview_note_var, justify="left", wraplength=360).grid(
            row=1, column=1, sticky="w", pady=(6,0)
        )

        form = ttk.LabelFrame(root, text="Relationship metadata", padding=(10, 8))
        form.grid(row=2, column=0, columnspan=3, sticky="we", pady=(10, 0))
        form.columnconfigure(1, weight=1)
        form.columnconfigure(3, weight=1)

        ttk.Label(form, text="Series label").grid(row=0, column=0, sticky="w")
        self.series_entry = ttk.Entry(form, textvariable=self.series_label_var, width=28)
        self.series_entry.grid(row=0, column=1, sticky="we", padx=(8,12))

        ttk.Label(form, text="Book #").grid(row=0, column=2, sticky="e")
        self.series_order_entry = ttk.Entry(form, textvariable=self.series_order_var, width=8)
        self.series_order_entry.grid(row=0, column=3, sticky="w", padx=(8,0))

        ttk.Label(form, text="Relation").grid(row=1, column=0, sticky="w", pady=(6,0))
        self.relation_combo = ttk.Combobox(
            form,
            textvariable=self.relation_type_var,
            values=RELATION_TYPE_CHOICES,
            state="readonly",
            width=16,
        )
        self.relation_combo.grid(row=1, column=1, sticky="w", padx=(8,12), pady=(6,0))

        ttk.Label(form, text="Related slug").grid(row=1, column=2, sticky="e", pady=(6,0))
        self.related_to_combo = ttk.Combobox(form, textvariable=self.related_to_var, width=28)
        self.related_to_combo.grid(row=1, column=3, sticky="we", padx=(8,0), pady=(6,0))

        ttk.Label(
            root,
            text="Tip: leave all fields blank and click Save to remove a relationship entry.",
        ).grid(row=3, column=0, columnspan=3, sticky="w", pady=(8,0))

        ttk.Label(root, textvariable=self.status_var).grid(row=4, column=0, columnspan=3, sticky="w", pady=(8,0))

        btns = ttk.Frame(root)
        btns.grid(row=5, column=0, columnspan=3, sticky="e", pady=(10,0))
        ttk.Button(btns, text="Remove", command=self._remove_selected).pack(side="left")
        ttk.Button(btns, text="Save", command=self._save_selected).pack(side="left", padx=(8,0))
        ttk.Button(btns, text="Close", command=self.destroy).pack(side="left", padx=(8,0))

    def _reset_cover_preview(self, title: str = "", note: str = ""):
        self._cover_preview_img = None
        self.cover_preview_label.configure(image="", text="No preview")
        self.preview_title_var.set(title or "")
        self.preview_note_var.set(note or "")

    def _update_cover_preview(self, slug: str):
        slug = slugify(slug)
        if not slug:
            self._reset_cover_preview("", "Select a novel to preview its cover.")
            return

        info = novel_card_preview_info(slug)
        title = str(info.get("title") or pretty(slug))
        img_path = info.get("image_path")
        note = str(info.get("note") or "")
        img_url = str(info.get("image_url") or "")

        # Title line includes slug for quick confirmation.
        self.preview_title_var.set(f"{title} ({slug})")

        if img_path is None:
            extra = []
            if img_url:
                extra.append(f"Image URL: {img_url}")
            if note:
                extra.append(note)
            self._reset_cover_preview(self.preview_title_var.get(), "\n".join(extra).strip())
            return

        if _PILImage is None or _PILImageTk is None:
            self._reset_cover_preview(
                self.preview_title_var.get(),
                f"{img_path.name}\nInstall pillow for thumbnail preview (pip install pillow)",
            )
            return

        try:
            with _PILImage.open(img_path) as im0:
                im = im0.convert("RGB")
                im.thumbnail((110, 165))
                photo = _PILImageTk.PhotoImage(im)
        except Exception as exc:
            self._reset_cover_preview(
                self.preview_title_var.get(),
                f"{img_path.name}\nCould not load preview: {exc}",
            )
            return

        self._cover_preview_img = photo
        self.cover_preview_label.configure(image=photo, text="")
        note_lines = [img_path.name]
        if note:
            note_lines.append(note)
        self.preview_note_var.set("\n".join(note_lines))

    def _refresh_related_choices(self, current_slug: str = ""):
        all_slugs = self._all_slugs()
        if current_slug:
            all_slugs = [s for s in all_slugs if s != current_slug]
        try:
            self.related_to_combo.configure(values=all_slugs)
        except Exception:
            pass

    def _all_slugs(self) -> list[str]:
        slugs = set(list_existing_slugs())
        slugs.update(load_relationship_registry().keys())
        return sorted(slugs)

    def _reload_slugs(self):
        current = slugify(self.slug_var.get())
        slugs = self._all_slugs()
        try:
            self.slug_combo.configure(values=slugs)
        except Exception:
            pass
        if current and current in slugs:
            self.slug_var.set(current)
        elif slugs and not self.slug_var.get().strip():
            self.slug_var.set(slugs[0])
        self._load_selected()

    def _set_form_from_entry(self, entry: dict):
        self.series_label_var.set(str(entry.get("series_label") or ""))
        order = entry.get("reading_order")
        self.series_order_var.set(str(order) if isinstance(order, int) and order > 0 else "")
        rel_key = _normalize_relation_type(str(entry.get("relation_type") or ""))
        rel_label = RELATION_TYPE_LABELS.get(rel_key, "")
        self.relation_type_var.set(rel_label if rel_label in RELATION_TYPE_CHOICES else "")
        self.related_to_var.set(str(entry.get("related_to") or ""))

    def _clear_form(self):
        self.series_label_var.set("")
        self.series_order_var.set("")
        self.relation_type_var.set("")
        self.related_to_var.set("")

    def _selected_slug(self) -> str:
        return slugify(self.slug_var.get())

    def _load_selected(self):
        slug = self._selected_slug()
        self._refresh_related_choices(slug)
        if not slug:
            self._clear_form()
            self._update_cover_preview("")
            self.status_var.set("Select a novel to edit relationship metadata.")
            return
        self._update_cover_preview(slug)
        entry = relationship_entry_for_slug(slug)
        if entry:
            self._set_form_from_entry(entry)
            self.status_var.set(f"Loaded relationship metadata for '{slug}'.")
        else:
            self._clear_form()
            self.status_var.set(f"No relationship metadata saved for '{slug}'.")

    def _save_selected(self):
        slug = self._selected_slug()
        if not slug:
            messagebox.showerror("Relationship Editor", "Select or type a novel slug first.", parent=self)
            return

        entry, err = build_relationship_entry_from_values(
            slug=slug,
            series_label=self.series_label_var.get(),
            series_order_raw=self.series_order_var.get(),
            relation_type_raw=self.relation_type_var.get(),
            related_to_raw=self.related_to_var.get(),
        )
        if err:
            messagebox.showerror("Relationship Editor", err, parent=self)
            return

        upsert_relationship_registry_entry(slug, entry)
        self._reload_slugs()
        self.slug_var.set(slug)
        self._load_selected()
        if entry:
            self.status_var.set(f"Saved relationship metadata for '{slug}'.")
        else:
            self.status_var.set(f"Removed relationship metadata for '{slug}'.")
        if callable(self.on_registry_changed):
            try:
                self.on_registry_changed()
            except Exception:
                pass

    def _remove_selected(self):
        slug = self._selected_slug()
        if not slug:
            messagebox.showerror("Relationship Editor", "Select or type a novel slug first.", parent=self)
            return
        if not relationship_entry_for_slug(slug):
            self.status_var.set(f"No relationship metadata exists for '{slug}'.")
            return
        if not messagebox.askyesno(
            "Relationship Editor",
            f"Remove relationship metadata for '{slug}'?",
            parent=self,
        ):
            return
        upsert_relationship_registry_entry(slug, None)
        self._reload_slugs()
        self.slug_var.set(slug)
        self._load_selected()
        self.status_var.set(f"Removed relationship metadata for '{slug}'.")
        if callable(self.on_registry_changed):
            try:
                self.on_registry_changed()
            except Exception:
                pass

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
        self.series_label_var = tk.StringVar()
        self.series_order_var = tk.StringVar()
        self.relation_type_var = tk.StringVar(value="")
        self.related_to_var = tk.StringVar()
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

        self.rel_frame = ttk.LabelFrame(top, text="Series / relationship (optional)", padding=(8, 6))
        self.rel_frame.grid(row=5, column=0, columnspan=6, sticky="we", pady=(8,0))
        self.rel_frame.columnconfigure(1, weight=1)
        self.rel_frame.columnconfigure(3, weight=1)

        ttk.Label(self.rel_frame, text="Series label").grid(row=0, column=0, sticky="w")
        self.series_entry = ttk.Entry(self.rel_frame, textvariable=self.series_label_var, width=30)
        self.series_entry.grid(row=0, column=1, sticky="we", padx=(8,12))

        ttk.Label(self.rel_frame, text="Book #").grid(row=0, column=2, sticky="e")
        self.series_order_entry = ttk.Entry(self.rel_frame, textvariable=self.series_order_var, width=8)
        self.series_order_entry.grid(row=0, column=3, sticky="w", padx=(8,0))

        ttk.Label(self.rel_frame, text="Relation").grid(row=1, column=0, sticky="w", pady=(6,0))
        self.relation_combo = ttk.Combobox(
            self.rel_frame,
            textvariable=self.relation_type_var,
            values=RELATION_TYPE_CHOICES,
            state="readonly",
            width=16,
        )
        self.relation_combo.grid(row=1, column=1, sticky="w", padx=(8,12), pady=(6,0))

        ttk.Label(self.rel_frame, text="Related slug").grid(row=1, column=2, sticky="e", pady=(6,0))
        self.related_to_combo = ttk.Combobox(
            self.rel_frame,
            textvariable=self.related_to_var,
            values=list_existing_slugs(),
            width=28,
        )
        self.related_to_combo.grid(row=1, column=3, sticky="we", padx=(8,0), pady=(6,0))

        # Action buttons (Create/Append and Bulk Import)
        self.btn_commit = ttk.Button(top, text="Create / Append", command=self._commit)
        self.btn_commit.grid(row=6, column=5, sticky="e", pady=(8,0))
        self.btn_relationships = ttk.Button(top, text="Edit relationships…", command=self._open_relationship_editor)
        self.btn_relationships.grid(row=6, column=4, sticky="e", pady=(8,0), padx=(0,8))
        self.btn_sync_relationships = ttk.Button(top, text="Sync relationship badges", command=self._sync_relationship_badges)
        self.btn_sync_relationships.grid(row=7, column=4, sticky="e", pady=(6,0), padx=(0,8))
        self.btn_bulk = ttk.Button(top, text="Bulk import files…", command=self._bulk_import_docx)
        self.btn_bulk.grid(row=7, column=5, sticky="e", pady=(6,0))

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

    def _refresh_relationship_choices(self):
        try:
            self.related_to_combo.configure(values=list_existing_slugs())
        except Exception:
            pass

    def _build_relationship_entry_from_form(self, slug: str) -> Tuple[Optional[dict], Optional[str]]:
        return build_relationship_entry_from_values(
            slug=slug,
            series_label=self.series_label_var.get(),
            series_order_raw=self.series_order_var.get(),
            relation_type_raw=self.relation_type_var.get(),
            related_to_raw=self.related_to_var.get(),
        )

    def _open_relationship_editor(self):
        try:
            dlg = RelationshipEditorDialog(self, on_registry_changed=self._refresh_relationship_choices)
            dlg.focus_force()
        except Exception as exc:
            messagebox.showerror("Relationship Editor", f"Could not open editor.\n{exc}")

    def _sync_relationship_badges(self):
        try:
            stats = sync_relationship_badges_in_novels_index()
        except Exception as exc:
            messagebox.showerror("Sync relationship badges", str(exc))
            return

        changed = bool(stats.get("file_changed"))
        msg = (
            f"Cards found: {stats.get('cards_total', 0)}\n"
            f"Cards processed: {stats.get('cards_touched', 0)}\n"
            f"Cards updated: {stats.get('cards_updated', 0)}\n"
            f"Cards skipped: {stats.get('cards_skipped', 0)}\n\n"
            f"{'Updated' if changed else 'No changes needed for'} {NOVELS_INDEX_HTML.name}."
        )
        messagebox.showinfo("Sync relationship badges", msg)

    def _on_mode_change(self):
        mode = self.mode_var.get()
        if mode == "Create new":
            # Minimal inputs for create
            self.title_var.set("")
            self.slug_var.set("")
            self.cover_var.set("")
            self.blurb_var.set("")
            self.hidden_var.set(False)
            self.series_label_var.set("")
            self.series_order_var.set("")
            self.relation_type_var.set("")
            self.related_to_var.set("")
            self._refresh_relationship_choices()
            self.start_order = 1
            self._show(self.lbl_title, self.title_entry,
                       self.lbl_slug, self.slug_entry,
                       self.lbl_status, self.status_combo,
                       self.lbl_cover, self.cover_entry, self.btn_browse,
                       self.rel_frame)
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
                       self.lbl_cover, self.cover_entry, self.btn_browse,
                       self.rel_frame)
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
            ttk.Button(tools, text="Import file…",
                    command=lambda t=text, tv=title_var: self._import_docx_into(text_widget=t, title_var=tv)).pack(side="left", padx=(6,0))

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
        files = filedialog.askopenfilenames(
            title="Select chapter files (DOCX / Markdown; multiple)",
            filetypes=[
                ("Supported files", "*.docx;*.md;*.markdown;*.mdown;*.mkd"),
                ("Markdown", "*.md;*.markdown;*.mdown;*.mkd"),
                ("Word document", "*.docx"),
                ("All files", "*.*"),
            ],
        )
        if not files:
            return

        # Extract chapter numbers from files and map them
        file_map = {}       # chapter_number -> file_path
        import_cache = {}   # file_path -> parsed/imported data
        skipped_no_order = []
        failed_docx = []
        for path in files:
            p = Path(path)
            info = import_file_info(p)
            import_cache[path] = info

            if info.get("kind") == "docx" and not (info.get("body") or "").strip():
                failed_docx.append(p.name)
                continue

            ch_num = _extract_chapter_num_from_name(path)
            if ch_num == 10**9 and info.get("order") is not None:
                ch_num = int(info["order"])

            if ch_num == 10**9:
                skipped_no_order.append(p.name)
                continue

            file_map[ch_num] = path

        if not file_map:
            if failed_docx:
                messagebox.showerror(
                    "Import failed",
                    "Could not convert the selected DOCX files.\n"
                    "Install 'mammoth' (pip install mammoth) for DOCX import, or import Markdown files."
                )
                return
            messagebox.showerror(
                "No chapters",
                "Could not extract chapter numbers from filenames.\n"
                "Use names like 'Chapter1.md' / 'Chapter1.docx' or include 'order:' in Markdown front matter."
            )
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
                info = import_cache.get(path) or import_file_info(Path(path))
                stem = Path(path).stem
                stem_guess = re.sub(r"[_-]+", " ", stem).strip().title()
                stem_after_chapter = re.sub(
                    r"(?i)^.*?\bchapter\s*\d+\b\s*[:.\-–—]*\s*",
                    "",
                    stem_guess,
                ).strip()
                title_guess = (info.get("title") or "").strip() or _strip_chapter_prefix_title(stem_after_chapter or stem_guess)
                md = info.get("body") or ""
                rec["title_var"].set(title_guess or f"Chapter {order}")
                rec["text"].delete("1.0", "end")
                rec["text"].insert("1.0", md)
            # else: leave empty (gap chapter)

        notices = []
        if skipped_no_order:
            notices.append(
                f"Skipped {len(skipped_no_order)} file(s) without a chapter number/order (e.g. {skipped_no_order[0]})."
            )
        if failed_docx:
            notices.append(
                f"Skipped {len(failed_docx)} DOCX file(s) that could not be converted (install 'mammoth' for DOCX import)."
            )
        if notices:
            messagebox.showwarning("Bulk import notes", "\n".join(notices))

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

    def _import_docx_into(self, text_widget: tk.Text=None, title_var: tk.StringVar=None):
        if not text_widget:
            return
        p = filedialog.askopenfilename(
            title="Select chapter file (.docx or .md)",
            filetypes=[
                ("Supported files", "*.docx;*.md;*.markdown;*.mdown;*.mkd"),
                ("Markdown", "*.md;*.markdown;*.mdown;*.mkd"),
                ("Word document", "*.docx"),
                ("All files", "*.*"),
            ],
        )
        if not p:
            return
        info = import_file_info(Path(p))
        md = info.get("body") or ""
        if Path(p).suffix.lower() == ".docx" and not md:
            messagebox.showerror(
                "Import failed",
                "Could not convert DOCX. Install 'mammoth' (pip install mammoth) for best results."
            )
            return
        if info.get("kind") == "unknown":
            messagebox.showerror("Import failed", "Unsupported file type. Use .docx or .md/.markdown.")
            return
        imported_title = (info.get("title") or "").strip()
        if title_var is not None and imported_title:
            try:
                if not title_var.get().strip():
                    title_var.set(imported_title)
            except Exception:
                pass
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
        slug = slugify(slug)

        relationship_entry = None
        if mode == "Create new":
            relationship_entry, rel_err = self._build_relationship_entry_from_form(slug)
            if rel_err:
                messagebox.showerror("Relationship metadata", rel_err)
                return

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
            try:
                upsert_relationship_registry_entry(slug, relationship_entry)
            except Exception as exc:
                messagebox.showwarning(
                    "Relationship metadata",
                    f"Could not save relationship metadata to {RELATIONSHIPS_JSON.name}.\n{exc}\n"
                    "The novel will still be created, but relationship badges may be missing."
                )
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

