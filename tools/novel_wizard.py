#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tkinter Novel Wizard for GitHub Pages + Jekyll
- Mode 1: Create New (create novel, chapters, cover, relationship metadata)
- Mode 2: Edit Current (edit metadata/relationships, append chapters, replace cover)
- Formatted paste (HTML/RTF -> Markdown) + single DOCX/Markdown import
- Bulk DOCX/Markdown import with chapter + epilogue ordering support
- Built-in git commit (summary + description); user handles git push

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
    with p.open("w", encoding="utf-8", newline="\n") as f:
        f.write(text)

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
    write_text(
        RELATIONSHIPS_JSON,
        json.dumps(clean, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
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
        write_text(NOVELS_INDEX_HTML, new_html)

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

DEFAULT_NOVEL_INDEX_BODY = """<ul>
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

def _format_blurb_yaml_block(blurb: str) -> str:
    text = (blurb or "").strip() or "A captivating story."
    lines = text.splitlines() or ["A captivating story."]
    return "\n".join(f"  {line}" for line in lines)

def build_index_md(
    slug: str,
    status: str = "Incomplete",
    blurb: str = "",
    title: Optional[str] = None,
    body: Optional[str] = None,
) -> str:
    t = (title or pretty(slug)).strip() or pretty(slug)
    body_text = body if body is not None else DEFAULT_NOVEL_INDEX_BODY
    body_text = body_text if body_text.endswith("\n") else body_text + "\n"
    blurb_yaml = _format_blurb_yaml_block(blurb)
    return (
        "---\n"
        f"layout: novel\n"
        f"Title: {t}\n"
        f"novel: {slug}\n"
        f"status: {status}\n"
        f"blurb: >-\n"
        f"{blurb_yaml}\n"
        f"order: 0\n"
        "---\n\n"
        f"{body_text}"
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

def load_existing_chapter_entries(slug: str) -> list[dict]:
    folder = NOVEL_DIR / slugify(slug)
    if not folder.exists():
        return []

    entries = []
    for p in folder.glob("*.md"):
        if p.name.lower() == "index.md":
            continue

        order = read_order_from_file(p)
        if order < 0:
            continue

        text = read_text_with_fallback(p)
        fm_block, body = _split_front_matter_and_body(text)
        fm = _parse_front_matter_values(fm_block)
        title = str(fm.get("Title") or fm.get("title") or "").strip()
        if not title:
            title = f"Chapter {order}"

        entries.append(
            {
                "order": int(order),
                "title": title,
                "body": (body or "").rstrip(),
                "path": p,
            }
        )

    entries.sort(key=lambda e: (int(e["order"]), str(e["path"]).lower()))
    return entries

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

MODE_CREATE = "Create New"
MODE_EDIT = "Edit Current"
EDIT_SUBMODE_APPEND = "Append Chapters"
EDIT_SUBMODE_EDIT = "Edit Current Chapters"
SUPPORTED_COVER_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}

def _normalize_status_choice(value: str) -> str:
    return "Complete" if str(value or "").strip().lower() == "complete" else "Incomplete"

def _clean_novel_title_for_editor(title: str) -> str:
    s = str(title or "").strip()
    if not s:
        return ""
    # Handle mojibake em dash in some legacy files.
    s = s.replace("â€”", "—")
    s = re.sub(r"\s*[—\-]\s*chapters\s*$", "", s, flags=re.I)
    return s.strip()

def _sanitize_auto_chapter_title(title: str) -> str:
    """
    Auto-generated import titles should avoid ':' because unquoted YAML front matter
    can misparse them in `Title: ...` lines.
    """
    s = normalize_smart_punctuation(str(title or "")).strip()
    if not s:
        return ""
    s = re.sub(r"\s*:\s*", " - ", s)
    s = re.sub(r"\s{2,}", " ", s).strip()
    return s

def _canonical_novel_title(slug: str, preferred_title: str = "") -> str:
    card_title = _clean_novel_title_for_editor(str(novel_card_details(slug).get("title") or ""))
    if card_title:
        return card_title

    preferred = _clean_novel_title_for_editor(preferred_title)
    if preferred:
        return preferred

    return pretty(slug)

def _split_front_matter_and_body(text: str) -> tuple[str, str]:
    s = (text or "").lstrip("\ufeff")
    m = re.match(
        r"^---\s*\r?\n(?P<fm>.*?)(?:\r?\n)---\s*(?:\r?\n)?(?P<body>.*)$",
        s,
        flags=re.S,
    )
    if not m:
        return "", s
    return m.group("fm"), m.group("body")

def _parse_front_matter_values(fm_block: str) -> dict:
    out = {}
    lines = (fm_block or "").splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$", line)
        if not m:
            i += 1
            continue
        key = m.group(1).strip()
        val = (m.group(2) or "").rstrip()
        if val in {"|", "|-", "|+", ">", ">-", ">+"}:
            i += 1
            buf = []
            while i < len(lines):
                nxt = lines[i]
                if re.match(r"^\s*[A-Za-z0-9_-]+\s*:\s*", nxt) and not nxt.startswith("  "):
                    i -= 1
                    break
                buf.append(nxt[2:] if nxt.startswith("  ") else nxt.strip())
                i += 1
            val = "\n".join(buf).strip()
        out[key] = val.strip()
        i += 1
    return out

def read_novel_index_metadata(slug: str) -> dict:
    slug = slugify(slug)
    idx = NOVEL_DIR / slug / "index.md"
    data = {
        "exists": idx.exists(),
        "title": pretty(slug),
        "status": "Incomplete",
        "blurb": "",
        "body": DEFAULT_NOVEL_INDEX_BODY,
    }
    if not idx.exists():
        return data

    text = read_text_with_fallback(idx)
    fm_block, body = _split_front_matter_and_body(text)
    fm = _parse_front_matter_values(fm_block)

    title = str(fm.get("Title") or fm.get("title") or "").strip()
    if title:
        data["title"] = _clean_novel_title_for_editor(title)

    status = str(fm.get("status") or "").strip()
    if status:
        data["status"] = _normalize_status_choice(status)

    blurb = str(fm.get("blurb") or "").strip()
    if blurb:
        data["blurb"] = blurb

    if body.strip():
        data["body"] = body if body.endswith("\n") else body + "\n"

    return data

def write_novel_index_metadata(slug: str, title: str, status: str, blurb: str) -> Path:
    slug = slugify(slug)
    idx = NOVEL_DIR / slug / "index.md"
    existing = read_novel_index_metadata(slug)
    normalized_title = _canonical_novel_title(
        slug=slug,
        preferred_title=title or existing.get("title") or "",
    )
    md = build_index_md(
        slug=slug,
        status=_normalize_status_choice(status),
        blurb=blurb,
        title=normalized_title,
        body=existing.get("body") or DEFAULT_NOVEL_INDEX_BODY,
    )
    write_text(idx, md)
    return idx

def copy_cover_to_images_and_cleanup(src_path: str, slug: str) -> tuple[str, list[Path]]:
    slug = slugify(slug)
    cover_rel = copy_cover_to_images(src_path, slug)
    dst_path = _local_path_from_site_url(cover_rel)
    removed = []

    def _remove_if_exists(path: Path):
        try:
            if path.exists():
                path.unlink()
                removed.append(path)
        except Exception:
            pass

    # Keep only the newly selected source extension (if any).
    for ext in SUPPORTED_COVER_EXTS:
        candidate = IMAGES_DIR / f"{slug}-cover{ext}"
        if dst_path is not None and candidate == dst_path:
            continue
        _remove_if_exists(candidate)

    # Force optimized responsive variants to regenerate from the new source.
    for ext in ("jpg", "webp"):
        for candidate in IMAGES_DIR.glob(f"{slug}-cover-*.{ext}"):
            _remove_if_exists(candidate)

    return cover_rel, removed

def _card_image_url(card) -> str:
    img = card.find("img")
    if img and img.get("src"):
        return str(img.get("src") or "").strip()
    source = card.find("source")
    if source and source.get("srcset"):
        srcset = str(source.get("srcset") or "")
        return srcset.split(",")[0].strip().split(" ")[0].strip()
    return ""

def novel_card_details(slug: str) -> dict:
    slug = slugify(slug)
    out = {
        "exists": False,
        "slug": slug,
        "title": pretty(slug),
        "status": "Incomplete",
        "hidden": False,
        "image_url": "",
        "image_path": None,
        "note": "",
    }
    if not slug:
        return out
    if not NOVELS_INDEX_HTML.exists():
        out["note"] = f"{NOVELS_INDEX_HTML.name} not found"
        return out
    if _BeautifulSoup is None:
        out["note"] = "Install beautifulsoup4 for novel card lookup"
        return out

    try:
        soup = _BeautifulSoup(NOVELS_INDEX_HTML.read_text(encoding="utf-8"), "html.parser")
    except Exception as exc:
        out["note"] = f"Could not parse {NOVELS_INDEX_HTML.name}: {exc}"
        return out

    for card in soup.select("li.novel-card"):
        a = card.find("a", href=True)
        card_slug = _novel_slug_from_card_href(a.get("href", "") if a else "")
        if card_slug != slug:
            continue

        out["exists"] = True
        status = str(card.get("data-status") or "").strip().lower()
        out["status"] = "Complete" if status == "complete" else "Incomplete"
        out["hidden"] = str(card.get("data-hidden") or "").strip().lower() == "true"

        tnode = card.find(class_="novel-title")
        if tnode:
            out["title"] = tnode.get_text(" ", strip=True) or out["title"]

        image_url = _card_image_url(card)
        out["image_url"] = image_url
        if image_url:
            out["image_path"] = _local_path_from_site_url(image_url)
        if out["image_path"] is None:
            out["note"] = "Card found, but no local image file resolved"
        return out

    out["note"] = "Novel card not found in novel/index.html"
    return out

def update_novel_card_in_novels_index(
    slug: str,
    novel_title: Optional[str] = None,
    status_choice: Optional[str] = None,
    hidden: Optional[bool] = None,
    cover_rel: Optional[str] = None,
) -> bool:
    slug = slugify(slug)
    if not slug:
        return False
    if _BeautifulSoup is None:
        raise RuntimeError("BeautifulSoup4 is required to update novel cards.")
    if not NOVELS_INDEX_HTML.exists():
        raise FileNotFoundError(f"Cannot find {NOVELS_INDEX_HTML}")

    html = NOVELS_INDEX_HTML.read_text(encoding="utf-8")
    soup = _BeautifulSoup(html, "html.parser")
    card = None
    for c in soup.select("li.novel-card"):
        a = c.find("a", href=True)
        if _novel_slug_from_card_href(a.get("href", "") if a else "") == slug:
            card = c
            break
    if card is None:
        return False

    before = str(card)
    title_text = (novel_title or pretty(slug)).strip() or pretty(slug)
    status_text = _normalize_status_choice(status_choice or "")
    status_class = "complete" if status_text == "Complete" else "incomplete"

    card["data-title"] = title_text.lower()
    card["data-status"] = status_class
    if hidden is True:
        card["data-hidden"] = "true"
    elif hidden is False:
        card.attrs.pop("data-hidden", None)

    a = card.find("a", href=True)
    if a is not None:
        a["aria-label"] = title_text

    tnode = card.find(class_="novel-title")
    if tnode is None and a is not None:
        tnode = soup.new_tag("h2", attrs={"class": "novel-title"})
        a.append(tnode)
    if tnode is not None:
        tnode.string = title_text

    if cover_rel:
        new_img = soup.new_tag("img")
        new_img["src"] = cover_rel
        new_img["alt"] = title_text
        new_img["loading"] = "lazy"
        picture = card.find("picture")
        old_img = picture.find("img") if picture is not None else card.find("img")
        if picture is not None:
            picture.replace_with(new_img)
        elif old_img is not None:
            old_img.replace_with(new_img)
        elif a is not None:
            a.insert(0, new_img)
    else:
        pic = card.find("picture")
        pic_img = pic.find("img") if pic is not None else None
        if pic_img is not None:
            pic_img["alt"] = title_text
        img = card.find("img")
        if img is not None:
            img["alt"] = title_text

    if str(card) == before:
        return False

    write_text(NOVELS_INDEX_HTML, soup.prettify())
    return True

def load_novel_catalog() -> dict:
    catalog = {}

    if NOVELS_INDEX_HTML.exists() and _BeautifulSoup is not None:
        try:
            soup = _BeautifulSoup(NOVELS_INDEX_HTML.read_text(encoding="utf-8"), "html.parser")
            for card in soup.select("li.novel-card"):
                a = card.find("a", href=True)
                slug = _novel_slug_from_card_href(a.get("href", "") if a else "")
                if not slug:
                    continue
                title_node = card.find(class_="novel-title")
                title = title_node.get_text(" ", strip=True) if title_node else pretty(slug)
                image_url = _card_image_url(card)
                status = str(card.get("data-status") or "").strip().lower()
                catalog[slug] = {
                    "exists": True,
                    "slug": slug,
                    "title": title or pretty(slug),
                    "status": "Complete" if status == "complete" else "Incomplete",
                    "hidden": str(card.get("data-hidden") or "").strip().lower() == "true",
                    "image_url": image_url,
                    "image_path": _local_path_from_site_url(image_url) if image_url else None,
                }
        except Exception:
            pass

    for slug in list_existing_slugs():
        s = slugify(slug)
        if not s:
            continue
        catalog.setdefault(
            s,
            {
                "exists": False,
                "slug": s,
                "title": pretty(s),
                "status": "Incomplete",
                "hidden": False,
                "image_url": "",
                "image_path": None,
            },
        )

    for slug in load_relationship_registry().keys():
        s = slugify(slug)
        if not s:
            continue
        catalog.setdefault(
            s,
            {
                "exists": False,
                "slug": s,
                "title": pretty(s),
                "status": "Incomplete",
                "hidden": False,
                "image_url": "",
                "image_path": None,
            },
        )

    return catalog

def _extract_import_sequence(name: str, fallback_order: Optional[int] = None) -> Optional[Tuple[str, int]]:
    stem = Path(name).stem

    m_ep = re.search(r"(?i)\bepilogue\b[\s._-]*([0-9]+)?", stem)
    if m_ep:
        val = m_ep.group(1)
        return ("epilogue", int(val) if val and str(val).isdigit() else 1)

    m_ch = re.search(r"(?i)\bchapter\b[\s._-]*([0-9]+)", stem)
    if m_ch:
        return ("chapter", int(m_ch.group(1)))

    if fallback_order is not None and int(fallback_order) > 0:
        return ("chapter", int(fallback_order))

    m_any = re.search(r"([0-9]+)", stem)
    if m_any:
        return ("chapter", int(m_any.group(1)))

    return None

def _extract_chapter_num_from_name(name: str) -> int:
    slot = _extract_import_sequence(name)
    if not slot:
        return 10**9
    return int(slot[1])

class Wizard(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Novel Wizard")
        self._configure_window()
        self._configure_styles()

        # Vars
        self.mode_var = tk.StringVar(value=MODE_CREATE)
        self.title_var = tk.StringVar()
        self.slug_var = tk.StringVar()
        self.status_var = tk.StringVar(value="Complete")
        self.cover_var = tk.StringVar()
        self.blurb_var = tk.StringVar()
        self.hidden_var = tk.BooleanVar(value=False)
        self.series_label_var = tk.StringVar()
        self.series_order_var = tk.StringVar()
        self.relation_type_var = tk.StringVar(value="")
        self.related_to_var = tk.StringVar()
        self.count_var = tk.IntVar(value=3)
        self.existing_slug_var = tk.StringVar()
        self.edit_submode_var = tk.StringVar(value=EDIT_SUBMODE_APPEND)
        self.commit_summary_var = tk.StringVar()
        self.start_order = 1

        self._auto_summary = ""
        self._auto_description = ""
        self.catalog = {}
        self._existing_slugs = []
        self._existing_chapter_entries = []

        # Chapters buffer: list of dict {order,title_var,text}
        self.chapter_tabs = []

        self._selected_cover_preview_img = None
        self._upload_cover_preview_img = None
        self._related_cover_preview_img = None

        self._build_ui()
        self._refresh_catalog()
        self._on_mode_change()

    def _configure_window(self):
        sw = int(self.winfo_screenwidth())
        sh = int(self.winfo_screenheight())
        w = min(1380, max(1120, int(sw * 0.88)))
        h = min(1040, max(820, int(sh * 0.90)))
        x = max(0, (sw - w) // 2)
        y = max(0, (sh - h) // 2 - 24)
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.minsize(1060, 760)

    def _configure_styles(self):
        style = ttk.Style(self)
        if "clam" in style.theme_names():
            style.theme_use("clam")
        style.configure("Primary.TButton", padding=(18, 10))
        style.configure("Hint.TLabel", foreground="#475569")

    # UI layout
    def _build_ui(self):
        self.main = ttk.Frame(self, padding=12)
        self.main.pack(fill="both", expand=True)
        self.main.columnconfigure(0, weight=1)
        self.main.rowconfigure(3, weight=1)

        mode_bar = ttk.Frame(self.main)
        mode_bar.grid(row=0, column=0, sticky="we")
        mode_bar.columnconfigure(5, weight=1)

        ttk.Label(mode_bar, text="Mode").grid(row=0, column=0, sticky="w")
        self.mode_combo = ttk.Combobox(
            mode_bar,
            textvariable=self.mode_var,
            values=[MODE_CREATE, MODE_EDIT],
            state="readonly",
            width=16,
        )
        self.mode_combo.grid(row=0, column=1, sticky="w", padx=(8, 18))
        self.mode_combo.bind("<<ComboboxSelected>>", lambda e: self._on_mode_change())

        self.lbl_existing = ttk.Label(mode_bar, text="Novel")
        self.lbl_existing.grid(row=0, column=2, sticky="e")
        self.existing_combo = ttk.Combobox(mode_bar, textvariable=self.existing_slug_var, width=34)
        self.existing_combo.grid(row=0, column=3, sticky="we", padx=(8, 8))
        self.existing_combo.bind("<<ComboboxSelected>>", lambda e: self._on_existing_selected())
        self.existing_combo.bind("<Return>", lambda e: self._on_existing_selected())
        self.existing_combo.bind("<FocusOut>", lambda e: self._on_existing_selected())
        self.existing_combo.bind("<KeyRelease>", lambda e: self._on_existing_query_change())

        self.btn_reload = ttk.Button(mode_bar, text="Reload", command=self._refresh_catalog)
        self.btn_reload.grid(row=0, column=4, sticky="e")

        top = ttk.Frame(self.main)
        top.grid(row=1, column=0, sticky="nsew", pady=(10, 0))
        top.columnconfigure(0, weight=3)
        top.columnconfigure(1, weight=2)

        form = ttk.LabelFrame(top, text="Novel Details", padding=(10, 8))
        form.grid(row=0, column=0, sticky="nsew")
        form.columnconfigure(1, weight=1)
        form.columnconfigure(3, weight=1)

        self.lbl_title = ttk.Label(form, text="Novel Title")
        self.lbl_title.grid(row=0, column=0, sticky="w")
        self.title_entry = ttk.Entry(form, textvariable=self.title_var)
        self.title_entry.grid(row=0, column=1, columnspan=3, sticky="we", padx=(8, 0))

        self.lbl_slug = ttk.Label(form, text="Slug")
        self.lbl_slug.grid(row=1, column=0, sticky="w", pady=(6, 0))
        self.slug_entry = ttk.Entry(form, textvariable=self.slug_var, state="readonly")
        self.slug_entry.grid(row=1, column=1, columnspan=3, sticky="we", padx=(8, 0), pady=(6, 0))

        self.lbl_status = ttk.Label(form, text="Status")
        self.lbl_status.grid(row=2, column=0, sticky="w", pady=(8, 0))
        self.status_combo = ttk.Combobox(
            form,
            textvariable=self.status_var,
            values=["Complete", "Incomplete"],
            state="readonly",
            width=14,
        )
        self.status_combo.grid(row=2, column=1, sticky="w", padx=(8, 8), pady=(8, 0))

        self.status_chip = tk.Label(form, text="", padx=8, pady=2, bd=1, relief="solid")
        self.status_chip.grid(row=2, column=2, sticky="w", pady=(8, 0))

        self.check_hidden = ttk.Checkbutton(form, text="Hidden novel", variable=self.hidden_var)
        self.check_hidden.grid(row=2, column=3, sticky="e", pady=(8, 0))

        self.lbl_blurb = ttk.Label(form, text="Blurb")
        self.lbl_blurb.grid(row=3, column=0, sticky="w", pady=(8, 0))
        self.blurb_entry = ttk.Entry(form, textvariable=self.blurb_var)
        self.blurb_entry.grid(row=3, column=1, columnspan=3, sticky="we", padx=(8, 0), pady=(8, 0))

        self.lbl_cover = ttk.Label(form, text="Cover Image")
        self.lbl_cover.grid(row=4, column=0, sticky="w", pady=(8, 0))
        self.cover_entry = ttk.Entry(form, textvariable=self.cover_var)
        self.cover_entry.grid(row=4, column=1, columnspan=2, sticky="we", padx=(8, 8), pady=(8, 0))
        self.btn_browse = ttk.Button(form, text="Browse...", command=self._pick_cover)
        self.btn_browse.grid(row=4, column=3, sticky="e", pady=(8, 0))

        self.rel_frame = ttk.LabelFrame(form, text="Relationships", padding=(8, 6))
        self.rel_frame.grid(row=5, column=0, columnspan=4, sticky="we", pady=(10, 0))
        self.rel_frame.columnconfigure(1, weight=1)
        self.rel_frame.columnconfigure(3, weight=1)

        ttk.Label(self.rel_frame, text="Series label").grid(row=0, column=0, sticky="w")
        self.series_entry = ttk.Entry(self.rel_frame, textvariable=self.series_label_var)
        self.series_entry.grid(row=0, column=1, sticky="we", padx=(8, 12))

        ttk.Label(self.rel_frame, text="Book #").grid(row=0, column=2, sticky="e")
        self.series_order_entry = ttk.Entry(self.rel_frame, textvariable=self.series_order_var, width=8)
        self.series_order_entry.grid(row=0, column=3, sticky="w", padx=(8, 0))

        ttk.Label(self.rel_frame, text="Relation").grid(row=1, column=0, sticky="w", pady=(6, 0))
        self.relation_combo = ttk.Combobox(
            self.rel_frame,
            textvariable=self.relation_type_var,
            values=RELATION_TYPE_CHOICES,
            state="readonly",
            width=16,
        )
        self.relation_combo.grid(row=1, column=1, sticky="w", padx=(8, 12), pady=(6, 0))

        ttk.Label(self.rel_frame, text="Related slug").grid(row=1, column=2, sticky="e", pady=(6, 0))
        self.related_to_combo = ttk.Combobox(self.rel_frame, textvariable=self.related_to_var, width=28)
        self.related_to_combo.grid(row=1, column=3, sticky="we", padx=(8, 0), pady=(6, 0))
        self.related_to_combo.bind("<KeyRelease>", lambda e: self._on_related_query_change())
        self.related_to_combo.bind("<<ComboboxSelected>>", lambda e: self._on_related_query_change())
        self.related_to_combo.bind("<FocusOut>", lambda e: self._refresh_related_cover_preview())

        ttk.Label(
            form,
            text="Related slug is searchable. Type a few letters to narrow likely novels.",
            style="Hint.TLabel",
        ).grid(row=6, column=0, columnspan=4, sticky="w", pady=(8, 0))

        preview_col = ttk.Frame(top)
        preview_col.grid(row=0, column=1, sticky="nsew", padx=(12, 0))
        preview_col.columnconfigure(1, weight=1)

        self.selected_preview_title_var = tk.StringVar(value="")
        self.selected_preview_note_var = tk.StringVar(value="")
        self.selected_preview_frame = ttk.LabelFrame(preview_col, text="Selected Novel Preview", padding=(8, 6))
        self.selected_preview_frame.grid(row=0, column=0, sticky="we")
        self.selected_preview_frame.columnconfigure(1, weight=1)
        self.selected_cover_preview = ttk.Label(self.selected_preview_frame, text="No preview", anchor="center", justify="center")
        self.selected_cover_preview.grid(row=0, column=0, rowspan=2, sticky="nw", padx=(0, 10))
        ttk.Label(self.selected_preview_frame, textvariable=self.selected_preview_title_var).grid(row=0, column=1, sticky="w")
        ttk.Label(self.selected_preview_frame, textvariable=self.selected_preview_note_var, wraplength=270).grid(
            row=1, column=1, sticky="w", pady=(6, 0)
        )

        self.upload_preview_title_var = tk.StringVar(value="")
        self.upload_preview_note_var = tk.StringVar(value="")
        self.upload_preview_frame = ttk.LabelFrame(preview_col, text="Cover Upload Preview", padding=(8, 6))
        self.upload_preview_frame.grid(row=1, column=0, sticky="we", pady=(10, 0))
        self.upload_preview_frame.columnconfigure(1, weight=1)
        self.upload_cover_preview = ttk.Label(self.upload_preview_frame, text="No preview", anchor="center", justify="center")
        self.upload_cover_preview.grid(row=0, column=0, rowspan=2, sticky="nw", padx=(0, 10))
        ttk.Label(self.upload_preview_frame, textvariable=self.upload_preview_title_var).grid(row=0, column=1, sticky="w")
        ttk.Label(self.upload_preview_frame, textvariable=self.upload_preview_note_var, wraplength=270).grid(
            row=1, column=1, sticky="w", pady=(6, 0)
        )

        self.related_preview_title_var = tk.StringVar(value="")
        self.related_preview_note_var = tk.StringVar(value="")
        self.related_preview_frame = ttk.LabelFrame(preview_col, text="Related Novel Preview", padding=(8, 6))
        self.related_preview_frame.grid(row=2, column=0, sticky="we", pady=(10, 0))
        self.related_preview_frame.columnconfigure(1, weight=1)
        self.related_cover_preview = ttk.Label(self.related_preview_frame, text="No preview", anchor="center", justify="center")
        self.related_cover_preview.grid(row=0, column=0, rowspan=2, sticky="nw", padx=(0, 10))
        ttk.Label(self.related_preview_frame, textvariable=self.related_preview_title_var).grid(row=0, column=1, sticky="w")
        ttk.Label(self.related_preview_frame, textvariable=self.related_preview_note_var, wraplength=270).grid(
            row=1, column=1, sticky="w", pady=(6, 0)
        )

        chapter_bar = ttk.Frame(self.main)
        chapter_bar.grid(row=2, column=0, sticky="we", pady=(10, 0))
        self.lbl_edit_submode = ttk.Label(chapter_bar, text="Edit mode")
        self.lbl_edit_submode.pack(side="left")
        self.edit_submode_combo = ttk.Combobox(
            chapter_bar,
            textvariable=self.edit_submode_var,
            values=[EDIT_SUBMODE_APPEND, EDIT_SUBMODE_EDIT],
            state="readonly",
            width=24,
        )
        self.edit_submode_combo.pack(side="left", padx=(8, 14))
        self.edit_submode_combo.bind("<<ComboboxSelected>>", lambda e: self._on_edit_submode_change())

        self.lbl_count = ttk.Label(chapter_bar, text="# Chapters")
        self.lbl_count.pack(side="left")
        self.spin_count = ttk.Spinbox(
            chapter_bar,
            from_=1,
            to=200,
            textvariable=self.count_var,
            width=8,
            command=self._build_chapter_tabs,
        )
        self.spin_count.pack(side="left", padx=(8, 12))
        self.chapter_hint_var = tk.StringVar(value="")
        ttk.Label(chapter_bar, textvariable=self.chapter_hint_var, style="Hint.TLabel").pack(side="left")
        self.btn_bulk = ttk.Button(chapter_bar, text="Bulk Import Files...", command=self._bulk_import_docx)
        self.btn_bulk.pack(side="right")

        self.nb = ttk.Notebook(self.main)
        self.nb.grid(row=3, column=0, sticky="nsew", pady=(8, 0))

        self._supports_x11_hwheel_buttons = (self.tk.call("tk", "windowingsystem") == "x11")
        self.nb.bind("<Shift-MouseWheel>", self._on_hmousewheel)
        if self._supports_x11_hwheel_buttons:
            self.nb.bind("<Button-6>", self._on_hmousewheel)
            self.nb.bind("<Button-7>", self._on_hmousewheel)

        nav = ttk.Frame(self.main)
        nav.grid(row=4, column=0, sticky="w", pady=(8, 0))
        ttk.Button(nav, text="Prev Chapter", width=14, command=self._prev_tab).pack(side="left")
        ttk.Button(nav, text="Next Chapter", width=14, command=self._next_tab).pack(side="left", padx=(8, 0))

        commit_frame = ttk.LabelFrame(self.main, text="Commit Message", padding=(8, 6))
        commit_frame.grid(row=5, column=0, sticky="we", pady=(10, 0))
        commit_frame.columnconfigure(1, weight=1)
        ttk.Label(commit_frame, text="Summary").grid(row=0, column=0, sticky="w")
        self.commit_summary_entry = ttk.Entry(commit_frame, textvariable=self.commit_summary_var)
        self.commit_summary_entry.grid(row=0, column=1, sticky="we", padx=(8, 0))
        ttk.Label(commit_frame, text="Description").grid(row=1, column=0, sticky="nw", pady=(8, 0))
        self.commit_desc_text = tk.Text(commit_frame, height=3, wrap="word")
        self.commit_desc_text.grid(row=1, column=1, sticky="we", padx=(8, 0), pady=(8, 0))

        self.action_row = ttk.Frame(self.main)
        self.action_row.grid(row=6, column=0, sticky="we", pady=(10, 0))
        self.action_row.columnconfigure(0, weight=1)
        self.action_row.columnconfigure(1, weight=1)
        self.action_row.columnconfigure(2, weight=1)
        self.btn_commit = ttk.Button(self.action_row, text="Create & Commit", style="Primary.TButton", command=self._commit)
        self.btn_commit.grid(row=0, column=2, sticky="e")

        self.title_var.trace_add("write", lambda *_: self._on_title_changed())
        self.status_var.trace_add("write", lambda *_: self._update_status_chip())
        self.cover_var.trace_add("write", lambda *_: self._refresh_upload_cover_preview())
        self.count_var.trace_add("write", lambda *_: self._build_chapter_tabs())

    def _get_commit_description(self) -> str:
        return self.commit_desc_text.get("1.0", "end").strip()

    def _set_commit_description(self, text: str):
        self.commit_desc_text.delete("1.0", "end")
        if text:
            self.commit_desc_text.insert("1.0", text)

    def _update_status_chip(self):
        status = _normalize_status_choice(self.status_var.get())
        if status == "Complete":
            self.status_chip.configure(text="Complete", bg="#dcfce7", fg="#166534")
        else:
            self.status_chip.configure(text="Incomplete", bg="#fee2e2", fg="#991b1b")

    def _load_preview_image(self, path: Optional[Path], size: tuple[int, int] = (84, 126)):
        if path is None:
            return None, "No local image found."
        if not path.exists():
            return None, f"{path.name} is missing."
        if _PILImage is None or _PILImageTk is None:
            return None, f"{path.name}\nInstall pillow for thumbnail previews."
        try:
            with _PILImage.open(path) as im0:
                im = im0.convert("RGB")
                im.thumbnail(size)
                return _PILImageTk.PhotoImage(im), path.name
        except Exception as exc:
            return None, f"{path.name}\nCould not load preview: {exc}"

    def _refresh_catalog(self):
        self.catalog = load_novel_catalog()
        self._existing_slugs = sorted(list_existing_slugs())
        self._refresh_existing_choices(self.existing_slug_var.get())
        self._refresh_related_choices(self.related_to_var.get())

    def _ranked_slugs(self, query: str, candidates: list[str], exclude_slug: str = "") -> list[str]:
        q = (query or "").strip().lower()
        exclude_slug = slugify(exclude_slug)
        ranked = []
        for slug in candidates:
            s = slugify(slug)
            if not s or s == exclude_slug:
                continue
            title = str((self.catalog.get(s) or {}).get("title") or pretty(s)).lower()
            if not q:
                score = (2, title, s)
            elif s.startswith(q) or title.startswith(q):
                score = (0, len(s), title, s)
            elif q in s or q in title:
                idx_slug = s.find(q) if q in s else 999
                idx_title = title.find(q) if q in title else 999
                score = (1, min(idx_slug, idx_title), title, s)
            else:
                continue
            ranked.append((score, s))
        ranked.sort(key=lambda item: item[0])
        return [slug for _, slug in ranked]

    def _refresh_existing_choices(self, query: str = ""):
        ranked = self._ranked_slugs(query, self._existing_slugs)
        try:
            self.existing_combo.configure(values=ranked[:30])
        except Exception:
            pass

    def _refresh_related_choices(self, query: str = ""):
        current_slug = slugify(self.slug_var.get())
        ranked = self._ranked_slugs(query, sorted(self.catalog.keys()), exclude_slug=current_slug)
        try:
            self.related_to_combo.configure(values=ranked[:30])
        except Exception:
            pass

    def _set_auto_commit_message(self, force: bool = False):
        slug = slugify(self.slug_var.get()) or "novel"
        title = (self.title_var.get() or pretty(slug)).strip()
        if self.mode_var.get() == MODE_CREATE:
            summary = f"feat(novel): create {slug}"
            desc = f"Create '{title}' with metadata, relationships, cover updates, and chapter files."
        else:
            summary = f"chore(novel): update {slug}"
            desc = f"Update '{title}' metadata, relationships, cover assets, and appended chapters."

        cur_summary = self.commit_summary_var.get().strip()
        cur_desc = self._get_commit_description()
        if force or (not cur_summary or cur_summary == self._auto_summary):
            self.commit_summary_var.set(summary)
        if force or (not cur_desc or cur_desc == self._auto_description):
            self._set_commit_description(desc)
        self._auto_summary = summary
        self._auto_description = desc

    def _on_title_changed(self):
        if self.mode_var.get() == MODE_CREATE:
            self.slug_var.set(slugify(self.title_var.get()))
            self._refresh_related_choices(self.related_to_var.get())
            self._set_auto_commit_message()

    def _on_existing_query_change(self):
        self._refresh_existing_choices(self.existing_slug_var.get())

    def _on_related_query_change(self):
        self._refresh_related_choices(self.related_to_var.get())
        self._refresh_related_cover_preview()

    def _is_edit_chapter_mode(self) -> bool:
        return self.mode_var.get() == MODE_EDIT and self.edit_submode_var.get() == EDIT_SUBMODE_EDIT

    def _show_edit_submode_controls(self):
        if not self.lbl_edit_submode.winfo_ismapped():
            self.lbl_edit_submode.pack(side="left", before=self.lbl_count)
            self.edit_submode_combo.pack(side="left", padx=(8, 14), before=self.lbl_count)

    def _hide_edit_submode_controls(self):
        if self.lbl_edit_submode.winfo_ismapped():
            self.lbl_edit_submode.pack_forget()
        if self.edit_submode_combo.winfo_ismapped():
            self.edit_submode_combo.pack_forget()

    def _on_edit_submode_change(self):
        if self.mode_var.get() != MODE_EDIT:
            return
        self._refresh_edit_submode_state(rebuild_tabs=True)

    def _refresh_edit_submode_state(self, rebuild_tabs: bool = True):
        if self.mode_var.get() != MODE_EDIT:
            self._existing_chapter_entries = []
            self.spin_count.state(["!disabled"])
            self.btn_bulk.state(["!disabled"])
            return

        slug = slugify(self.existing_slug_var.get() or self.slug_var.get())
        info = get_existing_info(slug) if slug else {"max_order": 0, "count": 0}
        self.start_order = (info.get("max_order") or 0) + 1
        self._existing_chapter_entries = load_existing_chapter_entries(slug) if slug else []

        if self._is_edit_chapter_mode():
            self.spin_count.state(["disabled"])
            self.btn_bulk.state(["disabled"])
            self.btn_bulk.configure(text="Bulk Append Files...")
            target_count = max(1, len(self._existing_chapter_entries))
            if int(self.count_var.get() or 0) != target_count:
                self.count_var.set(target_count)
            if self._existing_chapter_entries:
                self.chapter_hint_var.set(f"Editing {len(self._existing_chapter_entries)} existing chapter(s).")
            else:
                self.chapter_hint_var.set("No existing chapters found. Switch to Append Chapters to add new ones.")
        else:
            self.spin_count.state(["!disabled"])
            self.btn_bulk.state(["!disabled"])
            self.btn_bulk.configure(text="Bulk Append Files...")
            self.chapter_hint_var.set(f"Appending starts at chapter {self.start_order}.")

        if rebuild_tabs:
            self.chapter_tabs = []
            self._build_chapter_tabs()

    def _pick_cover(self):
        p = filedialog.askopenfilename(
            title="Choose cover image",
            filetypes=[("Images", "*.png;*.jpg;*.jpeg;*.webp;*.gif"), ("All files", "*.*")],
        )
        if p:
            self.cover_var.set(p)

    def _refresh_selected_cover_preview(self):
        if self.mode_var.get() != MODE_EDIT:
            self._selected_cover_preview_img = None
            self.selected_cover_preview.configure(image="", text="Create mode")
            self.selected_preview_title_var.set("Selected novel preview")
            self.selected_preview_note_var.set("Switch to Edit Current to preview existing novels.")
            return

        slug = slugify(self.existing_slug_var.get() or self.slug_var.get())
        if not slug:
            self._selected_cover_preview_img = None
            self.selected_cover_preview.configure(image="", text="No preview")
            self.selected_preview_title_var.set("Selected novel preview")
            self.selected_preview_note_var.set("Select a novel to preview.")
            return

        info = self.catalog.get(slug) or {}
        if not info.get("exists"):
            info = novel_card_details(slug)
        title = str(info.get("title") or pretty(slug))
        self.selected_preview_title_var.set(f"{title} ({slug})")

        photo, note = self._load_preview_image(info.get("image_path"))
        if photo is not None:
            self._selected_cover_preview_img = photo
            self.selected_cover_preview.configure(image=photo, text="")
        else:
            self._selected_cover_preview_img = None
            self.selected_cover_preview.configure(image="", text="No preview")

        note_lines = [f"Status: {info.get('status') or 'Unknown'}"]
        if info.get("hidden"):
            note_lines.append("Hidden card")
        note_lines.append(note)
        self.selected_preview_note_var.set("\n".join([line for line in note_lines if line]))

    def _refresh_upload_cover_preview(self):
        path_raw = self.cover_var.get().strip()
        if not path_raw:
            self._upload_cover_preview_img = None
            self.upload_cover_preview.configure(image="", text="No preview")
            if self.mode_var.get() == MODE_CREATE:
                self.upload_preview_title_var.set("New cover")
                self.upload_preview_note_var.set("Select a cover image to preview upload.")
            else:
                self.upload_preview_title_var.set("Replacement cover")
                self.upload_preview_note_var.set("Optional. Pick a file only when replacing the current cover.")
            return

        p = Path(path_raw).expanduser()
        self.upload_preview_title_var.set(p.name)
        photo, note = self._load_preview_image(p)
        if photo is not None:
            self._upload_cover_preview_img = photo
            self.upload_cover_preview.configure(image=photo, text="")
        else:
            self._upload_cover_preview_img = None
            self.upload_cover_preview.configure(image="", text="No preview")
        self.upload_preview_note_var.set(note)

    def _refresh_related_cover_preview(self):
        query = self.related_to_var.get().strip()
        if not query:
            self._related_cover_preview_img = None
            self.related_cover_preview.configure(image="", text="No preview")
            self.related_preview_title_var.set("Related novel")
            self.related_preview_note_var.set("Type a related slug to see likely matches.")
            return

        exact = slugify(query)
        ranked = self._ranked_slugs(query, sorted(self.catalog.keys()), exclude_slug=self.slug_var.get())
        slug = exact if exact in self.catalog else (ranked[0] if ranked else "")
        if not slug:
            self._related_cover_preview_img = None
            self.related_cover_preview.configure(image="", text="No preview")
            self.related_preview_title_var.set("Related novel")
            self.related_preview_note_var.set("No matching novel found.")
            return

        info = self.catalog.get(slug) or {}
        if not info.get("exists"):
            info = novel_card_details(slug)
        title = str(info.get("title") or pretty(slug))
        self.related_preview_title_var.set(f"{title} ({slug})")

        photo, note = self._load_preview_image(info.get("image_path"))
        if photo is not None:
            self._related_cover_preview_img = photo
            self.related_cover_preview.configure(image=photo, text="")
        else:
            self._related_cover_preview_img = None
            self.related_cover_preview.configure(image="", text="No preview")

        note_lines = []
        if slug != exact:
            note_lines.append(f"Best match for '{query}'")
        note_lines.append(f"Status: {info.get('status') or 'Unknown'}")
        if info.get("hidden"):
            note_lines.append("Hidden card")
        note_lines.append(note)
        self.related_preview_note_var.set("\n".join([line for line in note_lines if line]))

    def _build_relationship_entry_from_form(self, slug: str) -> Tuple[Optional[dict], Optional[str]]:
        return build_relationship_entry_from_values(
            slug=slug,
            series_label=self.series_label_var.get(),
            series_order_raw=self.series_order_var.get(),
            relation_type_raw=self.relation_type_var.get(),
            related_to_raw=self.related_to_var.get(),
        )

    def _on_mode_change(self):
        mode = self.mode_var.get()
        if mode == MODE_CREATE:
            self.title_var.set("")
            self.slug_var.set("")
            self.existing_slug_var.set("")
            self.edit_submode_var.set(EDIT_SUBMODE_APPEND)
            self.status_var.set("Complete")
            self.cover_var.set("")
            self.blurb_var.set("")
            self.hidden_var.set(False)
            self.series_label_var.set("")
            self.series_order_var.set("")
            self.relation_type_var.set("")
            self.related_to_var.set("")
            self.start_order = 1
            self.chapter_hint_var.set("Chapters start from 1.")
            self.btn_bulk.configure(text="Bulk Import Files...")
            self.spin_count.state(["!disabled"])
            self.btn_bulk.state(["!disabled"])

            self.lbl_existing.grid_remove()
            self.existing_combo.grid_remove()
            self.btn_reload.grid_remove()
            self._hide_edit_submode_controls()

            self.btn_commit.configure(text="Create & Commit")
            self.btn_commit.grid_configure(column=0, columnspan=3, sticky="ew")
            self.selected_preview_frame.grid_remove()
        else:
            self.lbl_existing.grid()
            self.existing_combo.grid()
            self.btn_reload.grid()
            self._show_edit_submode_controls()

            self.btn_commit.configure(text="Update & Commit")
            self.btn_commit.grid_configure(column=2, columnspan=1, sticky="e")
            self.selected_preview_frame.grid()
            self._refresh_existing_choices(self.existing_slug_var.get())
            if self._existing_slugs and not slugify(self.existing_slug_var.get()):
                self.existing_slug_var.set(self._existing_slugs[0])
            self._on_existing_selected()

        self.chapter_tabs = []
        self._build_chapter_tabs()
        self._refresh_related_choices(self.related_to_var.get())
        self._refresh_selected_cover_preview()
        self._refresh_upload_cover_preview()
        self._refresh_related_cover_preview()
        self._update_status_chip()
        self._set_auto_commit_message(force=True)

    def _on_existing_selected(self):
        if self.mode_var.get() != MODE_EDIT:
            return

        raw = self.existing_slug_var.get().strip()
        slug = slugify(raw)
        if not slug or slug not in self._existing_slugs:
            matches = self._ranked_slugs(raw, self._existing_slugs)
            if not matches:
                return
            slug = matches[0]

        self.existing_slug_var.set(slug)
        self.slug_var.set(slug)
        idx_meta = read_novel_index_metadata(slug)
        card_meta = self.catalog.get(slug) or {}
        if not card_meta.get("exists"):
            card_meta = novel_card_details(slug)

        card_title = _clean_novel_title_for_editor(str(card_meta.get("title") or ""))
        idx_title = _clean_novel_title_for_editor(str(idx_meta.get("title") or ""))
        loaded_title = card_title or idx_title or pretty(slug)
        self.title_var.set(loaded_title.strip())
        self.status_var.set(_normalize_status_choice(str(idx_meta.get("status") or card_meta.get("status") or "Incomplete")))
        self.blurb_var.set(str(idx_meta.get("blurb") or ""))
        self.hidden_var.set(bool(card_meta.get("hidden")))
        self.cover_var.set("")

        rel = relationship_entry_for_slug(slug)
        self.series_label_var.set(str(rel.get("series_label") or ""))
        ro = rel.get("reading_order")
        self.series_order_var.set(str(ro) if isinstance(ro, int) and ro > 0 else "")
        rel_key = _normalize_relation_type(str(rel.get("relation_type") or ""))
        rel_label = RELATION_TYPE_LABELS.get(rel_key, "")
        self.relation_type_var.set(rel_label if rel_label in RELATION_TYPE_CHOICES else "")
        self.related_to_var.set(str(rel.get("related_to") or ""))

        self._refresh_edit_submode_state(rebuild_tabs=True)
        self._refresh_related_choices(self.related_to_var.get())
        self._refresh_selected_cover_preview()
        self._refresh_upload_cover_preview()
        self._refresh_related_cover_preview()
        self._set_auto_commit_message(force=True)

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
        source_by_order = {}
        if self._is_edit_chapter_mode():
            entries = list(self._existing_chapter_entries or [])
            if entries:
                orders = [int(e["order"]) for e in entries]
                source_by_order = {int(e["order"]): e for e in entries}
            else:
                orders = [1]
        else:
            n = max(1, int(self.count_var.get() or 1))
            start = self.start_order if self.mode_var.get() == MODE_EDIT else 1
            orders = [start + i for i in range(n)]

        for order in orders:
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
            elif order in source_by_order:
                src = source_by_order[order]
                src_title = str(src.get("title") or f"Chapter {order}")
                src_body = str(src.get("body") or "")
                title_var.set(src_title[:MAX_TITLE_LEN])
                try:
                    text.delete('1.0', 'end')
                    text.insert('1.0', src_body)
                except Exception:
                    pass

            self.chapter_tabs.append({"order": order, "title_var": title_var, "text": text})


    def _bulk_import_docx(self):
        if self._is_edit_chapter_mode():
            messagebox.showinfo(
                "Bulk append",
                "Bulk import is available in 'Append Chapters' mode.\n"
                "Switch edit mode to Append Chapters to use bulk append.",
            )
            return

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

        entries = []
        skipped_no_order = []
        failed_docx = []

        for path in files:
            p = Path(path)
            info = import_file_info(p)

            if info.get("kind") == "docx" and not (info.get("body") or "").strip():
                failed_docx.append(p.name)
                continue

            slot = _extract_import_sequence(p.name, info.get("order"))
            if not slot:
                skipped_no_order.append(p.name)
                continue

            entries.append({
                "path": p,
                "info": info,
                "kind": slot[0],
                "num": int(slot[1]),
            })

        if not entries:
            if failed_docx:
                messagebox.showerror(
                    "Import failed",
                    "Could not convert the selected DOCX files.\n"
                    "Install 'mammoth' (pip install mammoth) for DOCX import, or import Markdown files."
                )
                return
            messagebox.showerror(
                "No chapters",
                "Could not extract chapter/epilogue order from filenames.\n"
                "Use names like 'Chapter1.md', 'Epilogue1.md', or include 'order:' in Markdown front matter."
            )
            return

        entries.sort(key=lambda e: (0 if e["kind"] == "chapter" else 1, e["num"], e["path"].name.lower()))

        if self.mode_var.get() == MODE_EDIT:
            self.chapter_hint_var.set(f"Appending {len(entries)} file(s) from chapter {self.start_order}.")
        else:
            self.start_order = 1
            self.chapter_hint_var.set("Imported files mapped in order (chapters first, then epilogues).")

        self.count_var.set(len(entries))
        self._build_chapter_tabs()

        for i, rec in enumerate(self.chapter_tabs):
            if i >= len(entries):
                break
            ent = entries[i]
            info = ent["info"] or {}
            stem = ent["path"].stem
            stem_guess = re.sub(r"[_-]+", " ", stem).strip().title()
            if ent["kind"] == "epilogue":
                stem_after = re.sub(r"(?i)^.*?\bepilogue\b\s*\d*\s*[:.\-–—]*\s*", "", stem_guess).strip()
            else:
                stem_after = re.sub(r"(?i)^.*?\bchapter\s*\d+\b\s*[:.\-–—]*\s*", "", stem_guess).strip()

            title_guess = (info.get("title") or "").strip() or _strip_chapter_prefix_title(stem_after or stem_guess)
            if not title_guess and ent["kind"] == "epilogue":
                title_guess = f"Epilogue {ent['num']}"
            title_guess = _sanitize_auto_chapter_title(title_guess)
            if not title_guess:
                title_guess = f"Chapter {rec['order']}"

            rec["title_var"].set(title_guess)
            rec["text"].delete("1.0", "end")
            rec["text"].insert("1.0", info.get("body") or "")

        notices = []
        if skipped_no_order:
            notices.append(
                f"Skipped {len(skipped_no_order)} file(s) without chapter/epilogue order (e.g. {skipped_no_order[0]})."
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
        imported_title = _sanitize_auto_chapter_title((info.get("title") or "").strip())
        if title_var is not None and imported_title:
            try:
                if not title_var.get().strip():
                    title_var.set(imported_title)
            except Exception:
                pass
        text_widget.insert("insert", md)

    def _update_badges(self):
        if self.mode_var.get() != MODE_EDIT:
            return
        slug = slugify(self.existing_slug_var.get() or self.slug_var.get())
        if not slug:
            messagebox.showerror("Update badges", "Select a novel first.")
            return

        rel_entry, rel_err = self._build_relationship_entry_from_form(slug)
        if rel_err:
            messagebox.showerror("Relationship metadata", rel_err)
            return

        try:
            upsert_relationship_registry_entry(slug, rel_entry)
            update_novel_card_in_novels_index(
                slug=slug,
                novel_title=self.title_var.get().strip() or pretty(slug),
                status_choice=self.status_var.get(),
                hidden=self.hidden_var.get(),
                cover_rel=None,
            )
            stats = sync_relationship_badges_in_novels_index()
        except Exception as exc:
            messagebox.showerror("Update badges", str(exc))
            return

        self._refresh_catalog()
        self._refresh_selected_cover_preview()
        self._refresh_related_cover_preview()
        messagebox.showinfo(
            "Update badges",
            f"Relationship metadata updated and badges synced.\nCards updated: {stats.get('cards_updated', 0)}",
        )

    def _run_optimize_script(self) -> tuple[bool, str]:
        script = REPO_ROOT / "tools" / "optimize_and_update_index.py"
        if not script.exists():
            return False, f"Missing script: {script}"
        res = subprocess.run(
            [sys.executable, str(script)],
            cwd=REPO_ROOT,
            check=False,
            text=True,
            capture_output=True,
        )
        output = (res.stdout or "").strip()
        err = (res.stderr or "").strip()
        msg = "\n".join([x for x in [output, err] if x]).strip()
        return (res.returncode == 0), (msg or "No output.")

    def _stage_and_commit(self, paths: set[Path], summary: str, description: str) -> tuple[bool, str]:
        rel_paths = []
        for p in sorted(paths, key=lambda x: str(x).lower()):
            pp = p if p.is_absolute() else (REPO_ROOT / p)
            try:
                rp = pp.relative_to(REPO_ROOT)
            except Exception:
                continue
            rel_paths.append(str(rp).replace("\\", "/"))
        rel_paths = sorted(set(rel_paths))
        if not rel_paths:
            return False, "No repository paths to stage."

        add_res = subprocess.run(
            ["git", "add", "--"] + rel_paths,
            cwd=REPO_ROOT,
            check=False,
            text=True,
            capture_output=True,
        )
        if add_res.returncode != 0:
            raise RuntimeError((add_res.stderr or add_res.stdout or "git add failed").strip())

        commit_cmd = ["git", "commit", "-m", summary]
        if description:
            commit_cmd += ["-m", description]
        commit_res = subprocess.run(
            commit_cmd,
            cwd=REPO_ROOT,
            check=False,
            text=True,
            capture_output=True,
        )
        out = "\n".join(
            [x for x in [(commit_res.stdout or "").strip(), (commit_res.stderr or "").strip()] if x]
        ).strip()
        if commit_res.returncode != 0:
            if "nothing to commit" in out.lower():
                return False, "No changes were committed (nothing to commit)."
            raise RuntimeError(out or "git commit failed")
        return True, out

    def _commit(self):
        if not NOVEL_DIR.exists():
            messagebox.showerror("Error", f"Cannot find {NOVEL_DIR}. Run from your repo root.")
            return

        summary = self.commit_summary_var.get().strip()
        description = self._get_commit_description().strip()
        if not summary:
            messagebox.showerror("Commit message", "Commit summary is required.")
            return
        if not description:
            messagebox.showerror("Commit message", "Commit description is required.")
            return

        mode = self.mode_var.get()
        if mode == MODE_CREATE:
            novel_title = self.title_var.get().strip()
            if not novel_title:
                messagebox.showerror("Error", "Please enter a novel title.")
                return
            if not self.cover_var.get().strip():
                messagebox.showerror("Error", "Please choose a cover image for Create New.")
                return
            if not self.blurb_var.get().strip():
                messagebox.showerror("Error", "Please enter a blurb for Create New.")
                return
            slug = slugify(self.slug_var.get().strip() or novel_title)
        else:
            slug = slugify(self.existing_slug_var.get().strip() or self.slug_var.get().strip())
            if not slug:
                messagebox.showerror("Error", "Select an existing novel to edit.")
                return
            novel_title = self.title_var.get().strip() or pretty(slug)
            catalog_entry = self.catalog.get(slug) or {}
            card_exists = bool(catalog_entry.get("exists"))
            if not card_exists:
                card_exists = bool(novel_card_details(slug).get("exists"))
            if not card_exists:
                messagebox.showerror(
                    "Edit Current",
                    f"No existing novel card found for '{slug}' in {NOVELS_INDEX_HTML.name}.\n"
                    "Edit mode will not create a new card.",
                )
                return

        rel_entry, rel_err = self._build_relationship_entry_from_form(slug)
        if rel_err:
            messagebox.showerror("Relationship metadata", rel_err)
            return

        dest = NOVEL_DIR / slug
        dest.mkdir(parents=True, exist_ok=True)

        if mode == MODE_CREATE and any(dest.glob("Chapter*.md")):
            if not messagebox.askyesno(
                "Existing slug",
                f"/novel/{slug}/ already has chapter files.\nContinue and write into this slug?",
            ):
                return

        staged_paths = set()
        written = 0
        for rec in self.chapter_tabs:
            order = int(rec["order"])
            ch_title = rec["title_var"].get().strip() or f"Chapter {order}"
            body = rec["text"].get("1.0", "end").rstrip()
            if not body:
                continue
            ch_path = dest / f"Chapter{order}.md"
            write_text(ch_path, build_chapter_md(slug, order, ch_title, body))
            staged_paths.add(ch_path)
            written += 1

        if mode == MODE_CREATE and written == 0:
            messagebox.showerror("No chapters", "Please enter at least one chapter body.")
            return

        idx = write_novel_index_metadata(
            slug=slug,
            title=novel_title,
            status=self.status_var.get(),
            blurb=self.blurb_var.get(),
        )
        staged_paths.add(idx)

        try:
            upsert_relationship_registry_entry(slug, rel_entry)
            staged_paths.add(RELATIONSHIPS_JSON)
        except Exception as exc:
            messagebox.showerror("Relationship metadata", f"Could not save relationship metadata.\n{exc}")
            return

        cover_rel = ""
        cover_base = ""
        optimize_needed = False

        if mode == MODE_CREATE:
            cover_rel = copy_cover_to_images(self.cover_var.get().strip(), slug)
            local_cover = _local_path_from_site_url(cover_rel)
            if local_cover is not None:
                staged_paths.add(local_cover)
            append_card_to_novels_index(
                novel_title=novel_title,
                slug=slug,
                cover_rel=cover_rel,
                status_choice=self.status_var.get(),
                hidden=self.hidden_var.get(),
            )
            staged_paths.add(NOVELS_INDEX_HTML)
            cover_base = Path(cover_rel).stem
            optimize_needed = True
        else:
            replacement = self.cover_var.get().strip()
            if replacement:
                cover_rel, removed = copy_cover_to_images_and_cleanup(replacement, slug)
                local_cover = _local_path_from_site_url(cover_rel)
                if local_cover is not None:
                    staged_paths.add(local_cover)
                for p in removed:
                    staged_paths.add(p)
                cover_base = Path(cover_rel).stem
                optimize_needed = True

            try:
                update_novel_card_in_novels_index(
                    slug=slug,
                    novel_title=novel_title,
                    status_choice=self.status_var.get(),
                    hidden=self.hidden_var.get(),
                    cover_rel=cover_rel or None,
                )
            except Exception as exc:
                messagebox.showerror("Update card", str(exc))
                return

            staged_paths.add(NOVELS_INDEX_HTML)

        try:
            sync_relationship_badges_in_novels_index()
            staged_paths.add(NOVELS_INDEX_HTML)
        except Exception as exc:
            messagebox.showwarning("Sync badges", f"Could not sync relationship badges.\n{exc}")

        if optimize_needed:
            ok, optimize_msg = self._run_optimize_script()
            if not ok:
                messagebox.showwarning(
                    "Optimize failed",
                    "The optimize/update script returned a non-zero exit code.\n"
                    f"{optimize_msg}",
                )
            staged_paths.add(NOVELS_INDEX_HTML)
            base = cover_base or f"{slug}-cover"
            for ext in ("jpg", "webp"):
                for p in IMAGES_DIR.glob(f"{base}-*.{ext}"):
                    staged_paths.add(p)

        try:
            committed, git_msg = self._stage_and_commit(staged_paths, summary, description)
        except Exception as exc:
            messagebox.showerror("Git commit failed", str(exc))
            return

        self._refresh_catalog()
        self._refresh_selected_cover_preview()
        self._refresh_upload_cover_preview()
        self._refresh_related_cover_preview()

        action = "Created" if mode == MODE_CREATE else "Updated"
        if committed:
            messagebox.showinfo(
                "Done",
                f"{action} /novel/{slug}/ with {written} chapter(s).\n\n"
                "Commit completed. Please run git push manually.\n\n"
                f"{git_msg}",
            )
            self.destroy()
        else:
            messagebox.showinfo(
                "No commit",
                f"{action} /novel/{slug}/ with {written} chapter(s), but nothing was committed.\n\n{git_msg}",
            )

# ---------- entry ----------
def main():
    if not NOVEL_DIR.exists():
        print(f"❌ Not in repo root. Missing: {NOVEL_DIR}")
        sys.exit(1)
    app = Wizard()
    app.mainloop()

if __name__ == "__main__":
    main()

