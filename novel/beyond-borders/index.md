---
layout: novel
Title: Beyond borders — Chapters
novel: beyond-borders
status: Complete
blurb: >-
  Lost in Jeonju and found by a woman the world once claimed, Aleem discovers that love isn’t a spectacle—it’s a steady hand in his pocket, a choice made properly, and a forever that begins where they first got lost.
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
