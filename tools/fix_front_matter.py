#!/usr/bin/env python3
"""
Fix/normalize Jekyll front matter for chapter Markdown files.

- Ensures front matter exists with:
    layout: chapter
    novel: <slug>
    order: <int>
    Title: <string>   (capital T; migrates from 'title:' if present)

- Skips index.md
- Natural-sorts files by filename for stable ordering
- Can resequence all orders with --resequence

Usage:
  python3 tools/fix_front_matter.py novel/<slug> --novel <slug>
  python3 tools/fix_front_matter.py novel/<slug> --novel <slug> --resequence
  # Process ALL novel subfolders:
  python3 tools/fix_front_matter.py novel --all --resequence
"""

import argparse
import os
import re
from pathlib import Path
from typing import List, Tuple, Optional, Dict

FM_DELIM = "---\n"

def natural_key(s: str):
    # Split into digit/non-digit parts for natural sorting: ch10 > ch2
    return [int(t) if t.isdigit() else t.lower() for t in re.findall(r"\d+|\D+", s)]

def read_text(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def write_text(p: Path, text: str):
    p.write_text(text, encoding="utf-8")

def has_front_matter(text: str) -> bool:
    t = text.lstrip()
    return t.startswith(FM_DELIM)

def split_front_matter(text: str) -> Tuple[Optional[str], str]:
    """
    Returns (fm_block, body). If no valid FM, returns (None, original_text).
    """
    s = text.lstrip()
    if not s.startswith(FM_DELIM):
        return None, text
    end = s.find(FM_DELIM, len(FM_DELIM))
    if end == -1:
        # Malformed; treat as none
        return None, text
    fm_block = s[len(FM_DELIM):end]
    body = s[end+len(FM_DELIM):]
    # restore any original leading whitespace that was stripped
    prefix = text[:len(text) - len(s)]
    return fm_block, prefix + body

def parse_kv_lines(fm_block: str) -> Dict[str, str]:
    kv = {}
    for line in fm_block.splitlines():
        if not line.strip():
            continue
        m = re.match(r"^\s*([^:]+)\s*:\s*(.*)\s*$", line)
        if m:
            key = m.group(1).strip()
            val = m.group(2).strip()
            kv[key] = val
    return kv

def fm_from_kv(kv: Dict[str, str]) -> str:
    lines = []
    # stable ordering: layout, collection, novel, order, Title, then rest
    order_keys = ["layout", "collection", "novel", "order", "Title"]
    used = set()
    for k in order_keys:
        if k in kv:
            lines.append(f"{k}: {kv[k]}")
            used.add(k)
    for k in kv:
        if k not in used:
            lines.append(f"{k}: {kv[k]}")
    return FM_DELIM + "\n".join(lines) + "\n" + FM_DELIM

def extract_first_heading(body: str) -> Optional[str]:
    # Find first ATX heading: "# Something"
    for line in body.splitlines():
        m = re.match(r"^\s*#{1,6}\s+(.*\S)\s*$", line)
        if m:
            return m.group(1).strip()
    return None

def guess_title(name: str, body: str) -> str:
    heading = extract_first_heading(body)
    if heading:
        return heading
    base = os.path.splitext(name)[0]
    base = re.sub(r"[_-]+", " ", base).strip()
    if not base:
        return "Untitled"
    # Capitalize first char only, leave rest as-is (safer for acronyms)
    return base[0:1].upper() + base[1:]

def list_chapter_files(root: Path) -> List[Path]:
    return sorted(
        [p for p in root.iterdir()
         if p.is_file() and p.suffix.lower() == ".md" and p.name.lower() != "index.md"],
        key=lambda p: natural_key(p.name)
    )

def process_folder(folder: Path, novel_slug: Optional[str], resequence: bool, dry_run: bool=False) -> int:
    if novel_slug is None:
        novel_slug = folder.name  # infer from folder name

    files = list_chapter_files(folder)
    if not files:
        print(f"[INFO] No chapter .md files found in {folder} (excluding index.md).")
        return 0

    # Compute desired order by natural filename
    desired_order = {p: i+1 for i, p in enumerate(files)}
    changed = 0

    for p in files:
        original = read_text(p)
        fm_block, body = split_front_matter(original)

        if fm_block is None:
            # No FM → construct from scratch
            title = guess_title(p.name, original)  # original includes body
            kv = {
                "layout": "chapter",
                "novel": novel_slug,
                "order": str(desired_order[p]),
                "Title": title,      # Capital T
            }
            new_text = fm_from_kv(kv) + body.lstrip("\n")
            if not dry_run:
                write_text(p, new_text)
            changed += 1
            print(f"[ADD] {p.name} -> order={kv['order']} Title='{kv['Title']}'")
            continue

        # Parse and normalize existing FM
        kv = parse_kv_lines(fm_block)

        # Promote 'title' to 'Title' if present
        if "title" in kv and "Title" not in kv:
            kv["Title"] = kv.pop("title")

        # Ensure required keys
        if kv.get("layout", "").strip().lower() != "chapter":
            kv["layout"] = "chapter"

        # Keep collection if already present; it's harmless either way
        # kv.setdefault("collection", "chapters")  # optional

        kv["novel"] = novel_slug

        if resequence or "order" not in kv or not str(kv["order"]).isdigit():
            kv["order"] = str(desired_order[p])

        # Ensure Title present
        if "Title" not in kv or not kv["Title"].strip():
            kv["Title"] = guess_title(p.name, body)

        # Rebuild FM and file
        new_fm = fm_from_kv(kv)
        new_text = new_fm + body

        if new_text != original:
            if not dry_run:
                write_text(p, new_text)
            changed += 1
            action = "RESEQ" if resequence else "FIX"
            print(f"[{action}] {p.name} -> order={kv['order']} Title='{kv['Title']}'")
        else:
            print(f"[SKIP] {p.name} (no change)")

    return changed

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="Path to a novel folder (e.g., novel/as-if-you-never-left) OR 'novel' with --all")
    ap.add_argument("--novel", help="Novel slug (defaults to folder name)")
    ap.add_argument("--resequence", action="store_true", help="Rewrite 'order' for all chapters by filename order")
    ap.add_argument("--all", action="store_true", help="Process all subfolders under 'novel'")
    ap.add_argument("--dry-run", action="store_true", help="Show what would change without writing files")
    args = ap.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
      raise SystemExit(f"Path not found: {root}")

    total_changed = 0

    if args.all:
        # Expect root to be 'novel'; iterate subdirs
        for sub in sorted([p for p in root.iterdir() if p.is_dir()], key=lambda p: p.name):
            if sub.name.startswith("."):
                continue
            print(f"\n== Processing {sub} ==")
            total_changed += process_folder(sub, args.novel or sub.name, args.resequence, args.dry_run)
    else:
        if not root.is_dir():
            raise SystemExit(f"Expected a folder, got file: {root}")
        total_changed += process_folder(root, args.novel or root.name, args.resequence, args.dry_run)

    print(f"\nDone. Files changed: {total_changed}")

if __name__ == "__main__":
    main()
