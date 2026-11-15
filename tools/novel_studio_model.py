"""Read-only authoring checks for the current Next.js novel pages.

This module uses only the Python standard library. It never writes a story,
asset, preference, or Git file. Word counts are an authoring estimate: the
public site derives its final count with Remark. Both use 220 words/minute.
The front-matter reader supports the scalar/block fields and gallery list
written by Novel Wizard; it deliberately reports unsupported YAML instead of
silently claiming to understand every YAML feature.
"""

from __future__ import annotations

from collections import Counter
from html import unescape
import json
import math
from pathlib import Path
import re
import unicodedata
from urllib.parse import quote, unquote, urlsplit

WORDS_PER_MINUTE = 220
RESPONSIVE_WIDTHS = (320, 640, 960)
BOOK_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
CHAPTER_FILE = re.compile(r"^(?:Chapter\d+|Epilogue[^/\\]*)\.md$", re.I)
ROMAN = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5,
         "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10}


def _issue(severity: str, code: str, message: str, **extra) -> dict:
    return {"severity": severity, "code": code, "message": message, **extra}


def _scalar(value: str):
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        try:
            return json.loads(value)
        except ValueError:
            # YAML double quoting has escapes JSON does not share. Keep the
            # source visible; the unsupported-YAML check explains the limit.
            return value[1:-1]
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1].replace("''", "'")
    value = re.split(r"\s+#", value, maxsplit=1)[0].rstrip()
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    if value in ("null", "Null", "NULL", "~"):
        return None
    return value


def read_front_matter(text: str) -> tuple[dict, str, list[dict]]:
    """Read Wizard's front-matter format without importing an optional YAML lib."""
    text = str(text or "").lstrip("\ufeff")
    match = re.match(r"^---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)", text, re.S)
    if not match:
        return {}, text, []
    lines = match[1].splitlines()
    metadata, issues = {}, []
    i = 0
    while i < len(lines):
        line = lines[i]
        i += 1
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        field = re.match(r"^([A-Za-z_][\w-]*)\s*:\s*(.*)$", line)
        if not field:
            issues.append(_issue("warning", "yaml_unsupported", "An unsupported front-matter line needs a build check: " + line.strip()))
            continue
        key, value = field.groups()
        if key in metadata:
            issues.append(_issue("error", "yaml_duplicate", f"Front matter repeats the '{key}' field."))
        if value in (">", ">-", ">+", "|", "|-", "|+"):
            block = []
            while i < len(lines) and (not lines[i].strip() or lines[i].startswith((" ", "\t"))):
                block.append(lines[i][2:] if lines[i].startswith("  ") else lines[i].lstrip())
                i += 1
            # Tags use newlines as separators in Next. Preserve those author
            # separators even for folded blocks rather than inventing tags.
            metadata[key] = "\n".join(block).strip()
        elif key == "gallery" and not value:
            items, current = [], None
            while i < len(lines) and (not lines[i].strip() or lines[i].startswith((" ", "\t"))):
                gallery_line = lines[i]
                i += 1
                start = re.match(r"^\s+-\s+(?:url:\s*)?(.*)$", gallery_line)
                desc = re.match(r"^\s+description:\s*(.*)$", gallery_line)
                if start:
                    if current:
                        items.append(current)
                    current = {"url": _scalar(start[1]), "description": ""}
                elif desc and current:
                    current["description"] = _scalar(desc[1])
                elif gallery_line.strip():
                    issues.append(_issue("warning", "yaml_unsupported", "An artwork field uses unsupported YAML; verify it in the site build."))
            if current:
                items.append(current)
            metadata[key] = items
        else:
            if value.startswith(("[", "{", "&", "*", "!")):
                issues.append(_issue("warning", "yaml_unsupported", f"The '{key}' field uses YAML beyond the Wizard preview. Verify the site build."))
            if not value.startswith(('"', "'")) and re.search(r":\s", value):
                issues.append(_issue("error", "yaml_unquoted_colon", f"Quote '{key}' because its value contains a colon followed by a space."))
            metadata[key] = _scalar(value)
    return metadata, text[match.end():], issues


def classify_epilogue(title: str) -> tuple[str, str]:
    """Match public reader semantics: Roman/Arabic sequence, lettered choices."""
    title = re.sub(r"^Chapter\s+\d+\s*[-:–—]+\s*", "", str(title or "").strip(), flags=re.I)
    if not re.search("epilogue", title, re.I):
        return "none", ""
    marker = re.match(r"^Epilogue\s+([IVX]+)\b", title, re.I)
    if marker:
        return "sequential", marker[1].upper()
    marker = re.match(r"^Epilogue\s+(\d+)\b", title, re.I)
    if marker:
        number = int(marker[1])
        key = next((roman for roman, n in ROMAN.items() if n == number and n <= 8), marker[1])
        return "sequential", key
    marker = re.match(r"^Epilogue\s+([A-Z])\b", title, re.I)
    if marker:
        return "branching", marker[1].upper()
    return "single", ""


def _roman_number(marker: str) -> int | None:
    if marker in ROMAN:
        return ROMAN[marker]
    # More than X is legal in the public classifier. Use a consistent numeric
    # sort for imports, without confusing I, V or X with A/B endings.
    if not re.fullmatch(r"X{0,3}(?:IX|IV|V?I{0,3})", marker) or not marker:
        return None
    value, previous = 0, 0
    for character in reversed(marker):
        number = {"I": 1, "V": 5, "X": 10}[character]
        value += -number if number < previous else number
        previous = max(number, previous)
    return value


def extract_import_sequence(name: str, fallback_order=None) -> tuple[str, int] | None:
    """Sort imported chapters before ordered epilogues; preserve A/B order."""
    stem = re.sub(r"[_-]+", " ", Path(name).stem)
    stem = re.sub(r"(?<=[A-Za-z])(?=[0-9])|(?<=[0-9])(?=[A-Za-z])", " ", stem)
    stem = re.sub(r"\b(epilogue|chapter)(?=[A-Za-z])", r"\1 ", stem, flags=re.I)
    try:
        fallback = int(fallback_order)
        fallback = fallback if fallback > 0 else None
    except (TypeError, ValueError):
        fallback = None
    epilogue = re.search(r"\bepilogue\b\s*[:.\-–—]*\s*(?:(\d+|[IVX]+|[A-Z])\b)?", stem, re.I)
    if epilogue:
        marker = str(epilogue[1] or "").upper()
        if marker.isdigit():
            return "epilogue", int(marker)
        roman = _roman_number(marker)
        if roman is not None:
            return "epilogue", roman
        if len(marker) == 1:
            return "epilogue", ord(marker) - ord("A") + 1
        return "epilogue", fallback or 1
    chapter = re.search(r"\bchapter\b\s*[:.\-–—]*\s*(\d+)", stem, re.I)
    if chapter:
        return "chapter", int(chapter[1])
    if fallback:
        return "chapter", fallback
    number = re.search(r"\d+", stem)
    return ("chapter", int(number[0])) if number else None


def _comparable(title: str) -> str:
    title = unicodedata.normalize("NFKC", str(title or "")).lower()
    return " ".join(re.findall(r"[^\W_]+", title, re.UNICODE))


def chapter_display_title(title: str) -> str:
    clean = re.sub(r"^Chapter\s+\d+\s*[-:–—]+\s*", "", str(title or "").strip(), flags=re.I)
    clean = re.sub(r"^Epilogue(?:\s+(?:[IVX]+|[A-Z]|\d+))?\s*[-:–—]+\s*", "", clean, flags=re.I)
    if not clean or re.fullmatch("epilogue", clean, re.I):
        return str(title or "").strip()
    return "" if re.fullmatch(r"Chapter\s+\d+", clean, re.I) else clean


def reader_content(body: str, title: str = "", label: str = "", display_title: str = "") -> str:
    """Remove only the redundant H1 the public reader would remove."""
    body = str(body or "")
    heading = re.match(r"^\s*#\s+(.+?)(?:\s+#+)?\s*(?:\r?\n|$)", body)
    if not heading:
        return body
    display_title = display_title or chapter_display_title(title)
    equivalents = (title, label, display_title, f"{label} {display_title}".strip())
    if any(value and _comparable(heading[1]) == _comparable(value) for value in equivalents):
        return body[heading.end():]
    return body


def markdown_to_text(body: str) -> str:
    """A transparent plain-text preview, not a replacement for Remark/GFM."""
    body = str(body or "")
    body = re.sub(r"^\s*\[[^\]]+\]:\s*\S+.*$", "", body, flags=re.M)
    body = re.sub(r"!\[[^\]]*\](?:\([^\n]*?\)|\[[^\]]*\])", "", body)
    # Use the visible link label and leave its URL out of the word estimate.
    body = re.sub(r"\[([^\]]+)\]\([^\n]*?\)", r"\1", body)
    body = re.sub(r"\[([^\]]+)\]\[[^\]]*\]", r"\1", body)
    body = re.sub(r"^\s*(?:`{3,}|~{3,})[^\n]*$", "", body, flags=re.M)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    body = re.sub(r"<((?:https?://|mailto:)[^>]+)>", r"\1", body)
    body = re.sub(r"<[^>]*>", " ", body)
    body = re.sub(r"^\s{0,3}(?:#{1,6}\s+|>\s?|[-+*]\s+|\d+[.)]\s+)", "", body, flags=re.M)
    body = re.sub(r"^\s*[-*_]{3,}\s*$", "", body, flags=re.M)
    body = re.sub(r"(?:\*\*|__|~~|`)", "", body)
    body = re.sub(r"(?<!\w)[*_]|[*_](?!\w)", "", body)
    return unescape(body).strip()


def render_reader_text(body: str, title: str = "", label: str = "", display_title: str = "") -> str:
    return markdown_to_text(reader_content(body, title, label, display_title))


def count_words(body: str, title: str = "", label: str = "", display_title: str = "") -> int:
    text = render_reader_text(body, title, label, display_title)
    return len(re.findall(r"[^\W_]+(?:['’\-][^\W_]+)*", text, re.UNICODE))


def reading_minutes(word_count: int) -> int:
    return max(1, math.ceil(max(0, word_count) / WORDS_PER_MINUTE))


def preview_urls(slug: str, chapter: str | None = None, base: str = "http://127.0.0.1:4175") -> dict:
    if not BOOK_SLUG.fullmatch(slug):
        raise ValueError("A novel slug must use lowercase ASCII words separated by hyphens.")
    parsed = urlsplit(base)
    if parsed.scheme not in ("http", "https") or not parsed.netloc or parsed.query or parsed.fragment:
        raise ValueError("Preview base must be an HTTP(S) origin or path without a query or fragment.")
    if chapter and (not re.fullmatch(r"[A-Za-z0-9_-]+", chapter)):
        raise ValueError("Chapter URL must use a filename stem without slashes or an extension.")
    base = base.rstrip("/")
    book = f"{base}/novel/{quote(slug)}/"
    return {"library": f"{base}/novel/#collection", "book": book,
            "reader": f"{book}{quote(chapter)}/" if chapter else ""}


def _asset_issues(repo_root: Path, url, label: str, source_path: str = "") -> list[dict]:
    if source_path:
        path = Path(source_path).expanduser()
        return [] if path.is_file() else [_issue("error", "asset_source_missing", f"{label} upload does not exist: {source_path}")]
    url = str(url or "").strip()
    if not url:
        return [_issue("error", "asset_missing", f"{label} has no public image URL.")]
    parsed = urlsplit(url)
    if parsed.scheme in ("http", "https") and parsed.netloc:
        return [_issue("warning", "asset_remote", f"{label} uses a remote image. Availability cannot be verified locally.")]
    if parsed.scheme or parsed.netloc or not parsed.path.startswith("/"):
        return [_issue("error", "asset_url_invalid", f"{label} must use /images/... or an HTTPS image URL.")]
    target = (repo_root / unquote(parsed.path).lstrip("/")).resolve()
    if not target.is_relative_to(repo_root.resolve()):
        return [_issue("error", "asset_url_invalid", f"{label} points outside this repository.")]
    if not target.is_file():
        return [_issue("error", "asset_missing", f"{label} is missing: {url}")]
    if re.fullmatch(r"/images/[^/]+(?:-cover|-gallery-\d+)\.png", parsed.path, re.I):
        missing = [str(width) for width in RESPONSIVE_WIDTHS if not target.with_name(f"{target.stem}-{width}.webp").is_file()]
        if missing:
            return [_issue("error", "asset_variants_missing", f"{label} needs the {', '.join(missing)}px WebP variants used by the current pages.")]
    return []


def _natural_key(value: str):
    return [int(chunk) if chunk.isdigit() else chunk.lower() for chunk in re.split(r"(\d+)", value)]


def inspect_novel(repo_root: Path, slug: str, metadata_overrides: dict | None = None,
                  chapters: list[dict] | None = None, relationships: dict | None = None) -> dict:
    """Return page readiness and estimates without changing repository files.

    ``chapters`` is the complete proposed set, not an append list. Merge saved
    chapters with draft overlays before passing it. Metadata overlays accept
    ``cover_source`` and artwork ``source_path`` for proposed local uploads.
    """
    repo_root = Path(repo_root).resolve()
    issues, metadata, saved_chapters = [], {}, []
    safe_slug = bool(BOOK_SLUG.fullmatch(str(slug or "")))
    if not safe_slug:
        issues.append(_issue("error", "slug_invalid", "Use lowercase ASCII words separated by hyphens for the public novel URL."))
    else:
        folder = repo_root / "novel" / slug
        index = folder / "index.md"
        if index.is_file():
            metadata, _, parse_issues = read_front_matter(index.read_text(encoding="utf-8-sig"))
            issues.extend(parse_issues)
        elif metadata_overrides is None:
            issues.append(_issue("error", "index_missing", "This book has no index.md metadata for its public page."))
        if chapters is None and folder.is_dir():
            for path in sorted(folder.glob("*.md"), key=lambda p: _natural_key(p.name)):
                if path.name.lower() == "index.md":
                    continue
                if not CHAPTER_FILE.fullmatch(path.name):
                    issues.append(_issue("warning", "chapter_route_ignored", f"The current reader will not export {path.name}; use Chapter<number>.md or Epilogue*.md."))
                    continue
                data, body, parse_issues = read_front_matter(path.read_text(encoding="utf-8-sig"))
                issues.extend({**issue, "chapter": path.stem} for issue in parse_issues)
                saved_chapters.append({"slug": path.stem, "title": data.get("Title") or data.get("title") or "",
                                       "order": data.get("order"), "body": body, "path": str(path),
                                       "music_mode": data.get("music_mode"), "music_url": data.get("music_url")})
    metadata.update(metadata_overrides or {})
    # The saved legacy source spells this field Title; editors usually use a
    # lowercase title key. A proposed title must take precedence over the old
    # source value when both spellings are present after the overlay.
    if metadata_overrides and "title" in metadata_overrides and "Title" not in metadata_overrides:
        metadata["Title"] = metadata_overrides["title"]
    title = str(metadata.get("Title") or metadata.get("title") or "").strip()
    title = re.sub(r"\s*[—-]\s*Chapters\s*$", "", title, flags=re.I).strip()
    if not title:
        issues.append(_issue("error", "title_missing", "Add the book title displayed in the library and on the book page."))
    status = str(metadata.get("status") or "").strip()
    if status not in ("Complete", "Incomplete"):
        issues.append(_issue("error", "status_invalid", "Choose Complete or Incomplete; the public status filter uses those exact values."))
    blurb = str(metadata.get("blurb") or "").strip()
    if not blurb or blurb == "A captivating story.":
        issues.append(_issue("warning", "blurb_missing", "Add a specific synopsis for the discovery cards and book introduction."))
    for field, use in (("genre", "genre filters"), ("tone", "mood shelves"), ("setting", "discovery search")):
        if not str(metadata.get(field) or "").strip():
            issues.append(_issue("warning", f"{field}_missing", f"Add comma-separated {field} tags for {use}."))
        elif not isinstance(metadata[field], str):
            issues.append(_issue("error", "tags_invalid", f"Use text with comma, semicolon or newline-separated {field} tags; the current site ignores YAML arrays."))
    cover = str(metadata.get("cover") or f"/images/{slug}-cover.png")
    issues.extend(_asset_issues(repo_root, cover, "Cover", str(metadata.get("cover_source") or "")))
    gallery = metadata.get("gallery", metadata.get("gallery_items", [])) or []
    if not isinstance(gallery, list):
        issues.append(_issue("error", "gallery_invalid", "Artwork must be a list of URL and description pairs for the current pages."))
        gallery = []
    for number, item in enumerate(gallery, 1):
        item = item if isinstance(item, dict) else {"url": item}
        issues.extend(_asset_issues(repo_root, item.get("url"), f"Artwork {number}", str(item.get("source_path") or "")))
        if not str(item.get("description") or "").strip():
            issues.append(_issue("warning", "gallery_description_missing", f"Artwork {number} needs a scene description for its caption and popout."))
    if any(metadata.get(key) for key in ("chapter_music_url", "chapter_music_title")):
        issues.append(_issue("warning", "music_legacy", "Chapter music is retained for legacy pages; the current reader does not play it."))
    if metadata.get("hidden"):
        issues.append(_issue("warning", "hidden_legacy", "Legacy card visibility does not hide a book from the current library."))

    proposed = chapters if chapters is not None else saved_chapters
    chapter_summaries = []
    for entry in proposed:
        order = entry.get("order")
        valid_order = isinstance(order, int) and not isinstance(order, bool) and order > 0
        name = str(entry.get("slug") or (Path(entry["path"]).stem if entry.get("path") else f"Chapter{order}"))
        if not CHAPTER_FILE.fullmatch(name + ".md") or not re.fullmatch(r"[A-Za-z0-9_-]+", name):
            issues.append(_issue("error", "chapter_slug_invalid", f"'{name}' is not a filename exported by the current reader.", chapter=name))
        if not valid_order:
            issues.append(_issue("error", "chapter_order_invalid", f"{name} needs a positive integer order for the chapter directory.", chapter=name))
        chapter_title = str(entry.get("Title") or entry.get("title") or "").strip()
        if not chapter_title:
            issues.append(_issue("error", "chapter_title_missing", f"{name} needs a chapter title.", chapter=name))
        epilogue_type, epilogue_key = classify_epilogue(chapter_title)
        label = f"Epilogue {epilogue_key}".strip() if epilogue_type != "none" else f"Chapter {order}"
        body = str(entry.get("body") or "")
        words = count_words(body, chapter_title, label)
        if not words:
            issues.append(_issue("error", "chapter_body_empty", f"{name} has no readable story text.", chapter=name))
        if entry.get("music_url") or str(entry.get("music_mode") or "none") not in ("", "none"):
            if not any(issue["code"] == "music_legacy" for issue in issues):
                issues.append(_issue("warning", "music_legacy", "Chapter music is retained for legacy pages; the current reader does not play it."))
        chapter_summaries.append({"slug": name, "title": chapter_title, "display_title": chapter_display_title(chapter_title),
                                  "label": label, "order": order if valid_order else 0,
                                  "word_count": words, "reading_minutes": reading_minutes(words),
                                  "epilogue_type": epilogue_type, "epilogue_key": epilogue_key})
    for field, code, subject in (("slug", "chapter_filename_duplicate", "filename"), ("order", "chapter_order_duplicate", "order")):
        values = [chapter[field].lower() if field == "slug" else chapter[field] for chapter in chapter_summaries]
        for value, count in Counter(values).items():
            if count > 1:
                issues.append(_issue("error", code, f"{count} chapters share the same {subject} '{value}'; give each a unique value."))
    chapter_summaries.sort(key=lambda chapter: (chapter["order"], _natural_key(chapter["slug"])))
    if not chapter_summaries:
        issues.append(_issue("error", "chapters_missing", "Add at least one chapter before opening the reader."))

    if relationships is None:
        relationship_path = repo_root / "tools" / "novel_relationships.json"
        try:
            relationships = json.loads(relationship_path.read_text(encoding="utf-8-sig")) if relationship_path.exists() else {}
        except (ValueError, OSError):
            relationships = {}
            issues.append(_issue("error", "relationships_invalid", "The relationship metadata file cannot be read as JSON."))
    if not isinstance(relationships, dict):
        relationships = {}
        issues.append(_issue("error", "relationships_invalid", "Relationship metadata must be keyed by book slug."))
    relationship = relationships.get(slug, {}) or {}
    if not isinstance(relationship, dict):
        relationship = {}
        issues.append(_issue("error", "relationship_invalid", "This book's relationship metadata must be an object."))
    target = str(relationship.get("related_to") or "")
    if target == slug:
        issues.append(_issue("error", "relationship_self", "A book cannot be its own sequel, prequel or companion."))
    elif target and (not BOOK_SLUG.fullmatch(target) or not (repo_root / "novel" / target / "index.md").is_file()):
        issues.append(_issue("error", "relationship_target_missing", f"The connected book '{target}' has no public metadata page."))
    reading_order = relationship.get("reading_order")
    if reading_order is not None and (not isinstance(reading_order, int) or isinstance(reading_order, bool) or reading_order < 1):
        issues.append(_issue("error", "relationship_order_invalid", "Series reading order must be a positive integer."))
    if reading_order is not None and relationship.get("series_id"):
        duplicates = [key for key, rel in relationships.items() if key != slug and isinstance(rel, dict)
                      and rel.get("series_id") == relationship["series_id"] and rel.get("reading_order") == reading_order]
        if duplicates:
            issues.append(_issue("warning", "relationship_order_duplicate", "Another book shares this series reading position: " + ", ".join(duplicates)))

    total_words = sum(chapter["word_count"] for chapter in chapter_summaries)
    first = chapter_summaries[0]["slug"] if chapter_summaries else None
    try:
        urls = preview_urls(slug, first)
    except ValueError:
        urls = {"library": "http://127.0.0.1:4175/novel/#collection", "book": "", "reader": ""}
    errors = sum(issue["severity"] == "error" for issue in issues)
    warnings = sum(issue["severity"] == "warning" for issue in issues)
    return {"slug": slug, "title": title, "status": status, "blurb": blurb, "cover": cover,
            "chapter_count": len(chapter_summaries), "word_count": total_words,
            "reading_minutes": reading_minutes(total_words), "chapters": chapter_summaries,
            "relationship": relationship, "issues": issues, "error_count": errors,
            "warning_count": warnings, "ready": not errors, "urls": urls,
            "estimate_note": "Estimated from plain reader text at 220 words/minute. The site build calculates the final Markdown/GFM count."}
