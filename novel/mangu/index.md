---
layout: novel
Title: Mangu
novel: mangu
status: Complete
blurb: >-
  In the rain-soaked heart of Kuala Lumpur, two souls from different faiths fall deeply, tenderly in love—only to discover that sometimes the truest love is the one that cannot become a life.
genre: >-
  cross-cultural romance, faith romance, contemporary romance
tone: >-
  aching, tender, bittersweet
setting: >-
  Malaysia, Kuala Lumpur, modern city
gallery:
  - url: "/images/mangu-gallery-1.png"
  - url: "/images/mangu-gallery-2.png"
  - url: "/images/mangu-gallery-3.png"
  - url: "/images/mangu-gallery-4.png"
  - url: "/images/mangu-gallery-5.png"
  - url: "/images/mangu-gallery-6.png"
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
