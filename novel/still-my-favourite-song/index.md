---
layout: novel
Title: Still My Favourite Song
novel: still-my-favourite-song
status: Complete
blurb: >-
  A reclusive billionaire who’d always loved an overlooked K-pop idol from the shadows finds her struggling in a failing café after disbandment—and by choosing hands over money, he helps her rebuild her life, her voice and a love neither of them expected.
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
