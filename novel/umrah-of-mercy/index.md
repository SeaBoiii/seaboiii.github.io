---
layout: novel
Title: Umrah of Mercy
novel: umrah-of-mercy
status: Complete
blurb: >-
  On a healing Umrah to escape heartbreak, Aleem is forced to walk beside the very woman who once broke him—until mercy teaches him that forgiveness isn’t always reunion, but the courage to choose love (or let go) with dignity.
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
