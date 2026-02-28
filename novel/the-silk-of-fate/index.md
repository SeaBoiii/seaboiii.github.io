---
layout: novel
Title: The Silk of Fate
novel: the-silk-of-fate
status: Complete
blurb: >-
  Bound by a red thread stretched across oceans and empires, a Majapahit prince and a Yuan princess must navigate faith, loyalty, and destiny in a world that forbids their love
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
