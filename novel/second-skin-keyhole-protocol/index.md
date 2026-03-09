---
layout: novel
Title: Second Skin - Keyhole Protocol
novel: second-skin-keyhole-protocol
status: Complete
blurb: >-
  When a deep-dive game leaves Haruto’s body, voice, and future feeling more real in the mirror than in his own skin, he must outwit the predator hiding inside the system before the life he chooses for himself is rewritten as someone else’s design.
gallery: |-
  /images/second-skin-keyhole-protocol-gallery-1.png
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
