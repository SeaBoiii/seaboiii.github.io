---
layout: novel
Title: Between Two Prayers
novel: between-two-prayers
status: Complete
blurb: >-
  Between snowy Hokkaido confessions and quiet Singapore nights, Aleem—a steadfast Muslim man—and Belle—a tender-hearted Chinese woman—fall into a love that asks for patience, faith, and family, learning that the truest devotion is choosing each other gently, one prayer at a time.
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
