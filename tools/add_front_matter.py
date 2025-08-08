#!/usr/bin/env python3
"""
Add (or resequence) Jekyll front matter for chapter Markdown files.

Usage:
  python3 tools/add_front_matter.py novel/<slug> --novel <slug> [--resequence]

Examples:
  python3 tools/add_front_matter.py novel/as-if-you-never-left --novel as-if-you-never-left
  python3 tools/add_front_matter.py novel/as-if-you-never-left --novel as-if-you-never-left --resequence
"""
import argparse
import os
import re
from pathlib import Path

FM_DELIM = '---\n'

def natural_key(s: str):
    # split into alpha + numeric parts: "chapter-12a.md" -> ["chapter-", 12, "a.md"]
    return [int(t) if t.isdigit() else t.lower() for t in re.findall(r'\d+|\D+', s)]

def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def write_text(p: Path, text: str):
    p.write_text(text, encoding="utf-8")

def has_front_matter(text: str) -> bool:
    t = text.lstrip()
    return t.startswith(FM_DELIM)

def parse_front_matter(text: str):
    """
    Returns (front_matter_str, body_str) if FM exists, else (None, original_text).
    """
    s = text.lstrip()
    if not s.startswith(FM_DELIM):
        return None, text
    # find second delimiter
    end = s.find(FM_DELIM, len(FM_DELIM))
    if end == -1:
        # malformed; treat as no FM
        return None, text
    fm_block = s[len(FM_DELIM):end]
    body = s[end+len(FM_DELIM):]
    # if we stripped leading whitespace, put back the exact original prefix spacing
    prefix_len = len(text) - len(s)
    body_with_prefix = text[:prefix_len] + body
    return fm_block, body_with_prefix

def extract_first_heading(body: str):
    # first ATX heading like "# Title"
    for line in body.splitlines():
        m = re.match(r'^\s*#{1,6}\s+(.*\S)\s*$', line)
        if m:
            return m.group(1).strip()
    return None

def title_from_filename(name: str):
    base = os.path.splitext(name)[0]
    base = re.sub(r'[_-]+', ' ', base).strip()
    # Capitalize words
    return base[:1].upper() + base[1:]

def ensure_kv_line(lines, key, value):
    """
    Ensure 'key: value' exists in fm lines; update if present, else append.
    Returns modified lines.
    """
    key_lower = key.lower()
    for i, line in enumerate(lines):
        if re.match(rf'^\s*{re.escape(key)}\s*:', line, flags=re.IGNORECASE):
            lines[i] = f"{key}: {value}"
            return lines
    lines.append(f"{key}: {value}")
    return lines

def build_front_matter(novel_slug: str, order: int, title: str):
    fm_lines = []
    fm_lines.append("layout: chapter")
    fm_lines.append("collection: chapters")
    fm_lines = ensure_kv_line(fm_lines, "novel", novel_slug)
    fm_lines = ensure_kv_line(fm_lines, "order", str(order))
    fm_lines = ensure_kv_line(fm_lines, "Title", title)
    return FM_DELIM + "\n".join(fm_lines) + "\n" + FM_DELIM

def resequence_orders(files, novel_slug):
    """
    Return dict: Path -> order (1..N) based on natural filename order
    """
    sorted_files = sorted(files, key=lambda p: natural_key(p.name))
    return {p: i+1 for i, p in enumerate(sorted_files)}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder", help="Path to novel folder (e.g., novel/as-if-you-never-left)")
    ap.add_argument("--novel", required=True, help="Novel slug (e.g., as-if-you-never-left)")
    ap.add_argument("--resequence", action="store_true", help="Rewrite 'order' for all chapters by filename order")
    args = ap.parse_args()

    root = Path(args.folder).resolve()
    if not root.exists() or not root.is_dir():
        raise SystemExit(f"Folder not found: {root}")

    md_files = [p for p in root.iterdir()
                if p.is_file() and p.suffix.lower() == ".md" and p.name.lower() != "index.md"]

    if not md_files:
        print("No chapter .md files found (excluding index.md).")
        return

    # Compute sequential orders
    order_map = resequence_orders(md_files, args.novel)

    changed = 0
    for p in md_files:
        text = read_text(p)
        fm_block, body = parse_front_matter(text)
        # derive title
        heading = extract_first_heading(body)
        title_guess = heading or title_from_filename(p.name)
        desired_order = order_map[p]

        if fm_block is None:
            # Insert brand-new FM
            fm = build_front_matter(args.novel, desired_order, title_guess)
            write_text(p, fm + body.lstrip("\n"))  # trim extra leading blank lines
            changed += 1
            print(f"[ADD] {p.name} -> order={desired_order}, Title='{title_guess}'")
        else:
            # Update existing FM if resequence or missing keys
            lines = [ln.rstrip("\n") for ln in fm_block.splitlines() if ln.strip() != ""]
            # guarantee required keys
            lines = ensure_kv_line(lines, "layout", "chapter")
            lines = ensure_kv_line(lines, "collection", "chapters")
            lines = ensure_kv_line(lines, "novel", args.novel)
            # Update order if --resequence, else keep existing if present
            if args.resequence:
                lines = ensure_kv_line(lines, "order", str(desired_order))
            else:
                # Ensure at least some order exists
                if not any(re.match(r'^\s*order\s*:', ln, re.IGNORECASE) for ln in lines):
                    lines = ensure_kv_line(lines, "order", str(desired_order))
            # Add Title if missing
            if not any(re.match(r'^\s*Title\s*:', ln, re.IGNORECASE) for ln in lines):
                lines = ensure_kv_line(lines, "Title", title_guess)

            new_fm = FM_DELIM + "\n".join(lines) + "\n" + FM_DELIM
            new_text = new_fm + body
            if new_text != text:
                write_text(p, new_text)
                changed += 1
                action = "RESEQ" if args.resequence else "FIX"
                print(f"[{action}] {p.name} -> order={desired_order}, Title='{title_guess}'")
            else:
                print(f"[SKIP] {p.name} (no change)")

    print(f"\nDone. Files changed: {changed}/{len(md_files)}")

if __name__ == "__main__":
    main()
