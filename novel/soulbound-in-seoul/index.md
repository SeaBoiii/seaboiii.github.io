---
layout: novel
Title: Soulbound in seoul — Chapters
novel: soulbound-in-seoul
status: Complete
blurb: >-
  When Seoul becomes a living RPG, a feared two-person raid team must survive shifting identities and a bond that turns one choice into destiny—before the new world can claim them.
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
