---
layout: novel
Title: Sheltered walkways — Chapters
novel: sheltered-walkways
status: Complete
blurb: >-
  In rain-soaked Singapore, rising actress Suyin and veteran host Adam are shoved into a viral “couple” narrative—until private rules, quiet suppers, and sheltered walkways become their refuge, and they choose a love built slowly, safely, and properly on their own terms.
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
