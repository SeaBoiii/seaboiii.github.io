---
layout: novel
Title: The time we were — Chapters
novel: the-time-we-were
status: Complete
blurb: >-
  A failed musician discovers a way to relive yesterday, hoping to win back the love he lost—only to confront the quiet cost of rewriting what was once real
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
