---
layout: novel
Title: Ink That Reached Me
novel: ink-that-reached-me
status: Complete
blurb: >-
  When a modern woman finds her life entwined with a Sengoku retainer through a mysterious notebook, she must uncover whether ink alone was enough to rewrite fate across centuries.
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
