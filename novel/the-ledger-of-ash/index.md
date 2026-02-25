---
layout: novel
Title: The ledger of ash — Chapters
novel: the-ledger-of-ash
status: Complete
blurb: >-
  A soot-born “utility” girl discovers she’s a weightwright—able to shift burden, bend gravity, and even make the world forget—then turns that quiet, overlooked power into a weapon against a guild that would rather burn truth than lose control.
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
