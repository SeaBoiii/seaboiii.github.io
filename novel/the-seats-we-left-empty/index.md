---
layout: novel
Title: The Seats We Left Empty
novel: the-seats-we-left-empty
status: Complete
blurb: >-
  Reunited at a wedding by a seating chart that doesn’t care what they broke, Nadia and Rai must decide whether love deserves a second chance—or if some empty seats were left that way for a reason.
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
