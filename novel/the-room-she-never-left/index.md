---
layout: novel
Title: The Room She Never Left
novel: the-room-she-never-left
status: Complete
blurb: >-
  A grieving man moves into an old apartment and begins hearing a woman’s song through the wall of a locked room, only to discover that love, memory, and time have been waiting for them on opposite sides.
genre: >-
  supernatural romance, emotional drama, bittersweet mystery
tone: >-
  poetic, melancholic, intimate, healing
setting: >-
  old apartment, rainy city, locked room, singapore-inspired urban setting
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
