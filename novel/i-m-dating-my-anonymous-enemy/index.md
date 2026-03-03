---
layout: novel
Title: I'm Dating My Anonymous Enemy
novel: i-m-dating-my-anonymous-enemy
status: Complete
blurb: >-
  In Seoul’s neon underworld, an investigative blogger who swore to unmask the infamous K-pop dating leaker falls for her “safe” fake boyfriend—only to discover he’s the very ghost she’s been hunting, and loving him might cost her everything she believes in.
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
