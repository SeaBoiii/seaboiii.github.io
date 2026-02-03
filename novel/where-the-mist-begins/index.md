---
layout: novel
Title: Where the mist begins — Chapters
novel: where-the-mist-begins
status: Complete
blurb: >-
  On a fog-laced summit in Vietnam, Aleem—always the careful one—meets Dasha, a fearless solo traveller, and what begins as a fleeting encounter becomes a quiet promise to stop running and choose love properly, even across distance.
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
