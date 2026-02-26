---
layout: novel
Title: Two Seats Closer
novel: two-seats-closer
status: Complete
blurb: >-
  Forced to balance love, ambition, and office politics, Faris and Jiawen discover that getting closer is easy—staying steady under pressure is the real test.
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
