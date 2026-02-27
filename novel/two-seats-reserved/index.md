---
layout: novel
Title: Two Seats Reserved
novel: two-seats-reserved
status: Complete
blurb: >-
  In a glass-walled office and two worlds of family and faith, Faris and Jiawen choose each other—properly, publicly, and without erasure—until two seats become a home they’ve reserved with their own hands.
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
