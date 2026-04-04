---
layout: novel
Title: The ABIX Chronicle
novel: the-abix-chronicle
status: Complete
blurb: >-
  Embark on an unforgettable journey through the twists and turns of The Abix Chronicle.
genre: >-
  ensemble drama, music-industry drama, friendship drama
tone: >-
  dramatic, emotional, uplifting
setting: >-
  Seoul, entertainment industry, found family
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
