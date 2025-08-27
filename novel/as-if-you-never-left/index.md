---
layout: novel
Title: As if you never left — Chapters
novel: as-if-you-never-left
status: Complete
blurb: >-
  A man haunted by loss begins to heal when a familiar presence reenters his life, blurring the lines between memory, love, and letting go
order: 0
---

<ul>
{% assign pathprefix = '/novel/' | append: page.novel | append: '/' %}
{% assign items = site.pages
  | where_exp: 'p', 'p.url contains pathprefix'
  | where_exp: 'p', 'p.name != "index.md"'
  | sort: 'order' %}
{% for ch in items %}
  <li><a href="{{ ch.url | relative_url }}">Chapter {{ ch.order }} — {{ ch.Title | default: ch.title }}</a></li>
{% endfor %}
</ul>
