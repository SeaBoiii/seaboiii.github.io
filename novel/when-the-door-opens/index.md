---
layout: novel
Title: When The Door Opens
novel: when-the-door-opens
status: Complete
blurb: >-
  When a weary son returns to his mother’s home in Korea, he falls for the one woman he never should—his mother’s best friend—and what begins at the doorway as quiet longing becomes a love that risks breaking their home before it finally teaches them how to remake it.
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
