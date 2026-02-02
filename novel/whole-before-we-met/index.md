---
layout: novel
Title: Whole before we met — Chapters
novel: whole-before-we-met
status: Complete
blurb: >-
  Two people already rich in friendship and selfhood—Kira with her girls and Aleem with his bros—fall into a gentle, unhurried love that doesn’t rescue them from loneliness, but chooses them anyway, whole before they ever met.
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
