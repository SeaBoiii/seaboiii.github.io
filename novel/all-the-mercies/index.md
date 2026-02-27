---
layout: novel
Title: All the Mercies
novel: all-the-mercies
status: Complete
blurb: >-
  When Isabelle’s future shatters overnight, she expects to drown in the quiet aftermath—until Aleem, her steadfast friend, keeps showing up with a kind of care that never asks to be repaid, and as grief turns to love, they must learn how to build a life that honours faith, family, and the mercy of staying without taking.
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
