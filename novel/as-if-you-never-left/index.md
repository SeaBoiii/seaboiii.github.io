---
layout: chapter
Title: As If You Never Left — Chapters
novel: as-if-you-never-left
order: 0
---

<ul>
{% assign items = site.pages
  | where_exp: "p", "p.path contains '/novel/'"
  | where_exp: "p", "p.path contains '/' | append: page.novel | append: '/'"
  | where_exp: "p", "p.name != 'index.md'"
  | sort: "order" %}
{% for ch in items %}
  <li><a href="{{ ch.url | relative_url }}">Chapter {{ ch.order }} — {{ ch.Title | default: ch.title }}</a></li>
{% endfor %}
</ul>
