---
layout: novel
Title: Little Hands Between Us
novel: little-hands-between-us
status: Complete
blurb: >-
  Bound together by loss and a child who needs them, two reluctant guardians slowly learn that healing—and love—can grow in the most unexpected family.
genre: >-
  family drama, contemporary romance, slow-burn romance
tone: >-
  tender, healing, domestic
setting: >-
  domestic life, family home, childcare
gallery:
  - url: "/images/little-hands-between-us-gallery-1.png"
  - url: "/images/little-hands-between-us-gallery-2.png"
  - url: "/images/little-hands-between-us-gallery-3.png"
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
