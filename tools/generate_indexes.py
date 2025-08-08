#!/usr/bin/env python3
# Generate/refresh index.md for every subfolder in /novel
# - Title: "<Slug Pretty> — Chapters"
# - Front matter: layout: chapter, novel: <slug>, order: 0
# - Proper Liquid in the body (no escaping)
# - Renames index.html -> index_old.html if present

import re
from pathlib import Path

def pretty(slug: str) -> str:
    s = re.sub(r"[-_]+", " ", slug).strip()
    return s[:1].upper() + s[1:]

def index_md_content(slug: str) -> str:
    title = f"{pretty(slug)} — Chapters"
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
    return f"""---
layout: chapter
Title: {title}
novel: {slug}
order: 0
---

{body}"""

def main():
    root = Path("novel")
    if not root.exists():
        raise SystemExit("No 'novel' directory found at repo root.")

    for sub in sorted([p for p in root.iterdir() if p.is_dir()], key=lambda p: p.name):
        slug = sub.name
        # rename old index.html if present
        old = sub / "index.html"
        if old.exists():
            old.rename(sub / "index_old.html")
            print(f"renamed {old} -> index_old.html")

        out = sub / "index.md"
        out.write_text(index_md_content(slug), encoding="utf-8")
        print("wrote", out)

if __name__ == "__main__":
    main()
