#!/usr/bin/env python3
"""Generate/refresh index.md for every subfolder in /novel.
- Title becomes "<Slug Pretty> — Chapters"
- Adds front matter: layout: chapter, novel: <slug>, order: 0
- Uses robust Liquid that lists chapters by URL prefix and sorts by 'order'.
"""
import os, re
from pathlib import Path

def pretty(slug: str) -> str:
    s = re.sub(r"[-_]+", " ", slug).strip()
    return s[:1].upper() + s[1:]

def index_md(slug: str) -> str:
    title = f"{pretty(slug)} — Chapters"
    return f"""---
layout: chapter
Title: {title}
novel: {slug}
order: 0
---

{{% assign pathprefix = '/novel/' | append: page.novel | append: '/' %}}
<ul>
{{% assign items = site.pages
  | where_exp: 'p', 'p.url contains pathprefix'
  | where_exp: 'p', 'p.name != "index.md"'
  | sort: 'order' %}}
{{% for ch in items %}}
  <li><a href="{{ '{{ ch.url | relative_url ' }}}}">Chapter {{ '{{ ch.order ' }}}} — {{ '{{ ch.Title | default: ch.title ' }}}}</a></li>
{{% endfor %}}
</ul>
"""

def main():
    root = Path('novel')
    for sub in sorted([p for p in root.iterdir() if p.is_dir()]):
        slug = sub.name
        # write/overwrite index.md
        out = sub / 'index.md'
        out.write_text(index_md(slug), encoding='utf-8')
        print('wrote', out)

if __name__ == '__main__':
    main()