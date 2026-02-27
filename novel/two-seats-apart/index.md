---
layout: novel
Title: Two Seats Apart
novel: two-seats-apart
status: Complete
blurb: >-
  Two colleagues who were never meant to cross the line discover that sometimes the smallest distance between two seats is the hardest one to keep.
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
