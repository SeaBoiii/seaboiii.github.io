---
layout: chapter
Title: As If You Never Left — Chapters
novel: as-if-you-never-left
order: 0
---

<ul>
{% assign items = site.chapters | where: "novel", page.novel | sort: "order" %}
{% for ch in items %}
  <li><a href="{{ ch.url | relative_url }}">Chapter {{ ch.order }} — {{ ch.Title | default: ch.title }}</a></li>
{% endfor %}
</ul>
