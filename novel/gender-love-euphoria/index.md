---
layout: novel
Title: Gender love euphoria — Chapters
novel: gender-love-euphoria
status: Complete
blurb: >-
  Two childhood rivals from a Malaysian kampung reunite at university under a fragile disguise, only to discover that love, identity, and euphoria were never meant to be separated.
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
