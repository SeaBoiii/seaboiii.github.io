---
layout: chapter
Title: Echoes of us — Chapters
novel: echoes-of-us
order: 0
---

{% assign pathprefix = '/novel/' | append: page.novel | append: '/' %}
<ul>
{% assign items = site.pages
  | where_exp: 'p', 'p.url contains pathprefix'
  | where_exp: 'p', 'p.name != "index.md"'
  | sort: 'order' %}
{% for ch in items %}
  <li><a href="{ '{ ch.url | relative_url ' }}">Chapter { '{ ch.order ' }} — { '{ ch.Title | default: ch.title ' }}</a></li>
{% endfor %}
</ul>
