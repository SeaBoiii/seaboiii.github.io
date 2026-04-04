---
layout: novel
Title: A Name of My Own
novel: a-name-of-my-own
status: Complete
blurb: >-
  A chance to discover oneself...
genre: >-
  coming-of-age, identity drama, contemporary drama
tone: >-
  introspective, tender, hopeful
setting: >-
  modern day, personal journey, everyday life
order: 0
---

{% assign pathprefix = '/novel/' | append: page.novel | append: '/' %}
<ul>
{% assign items = site.pages
  | where_exp: 'p', 'p.url contains pathprefix'
  | where_exp: 'p', 'p.name != "index.md"'
  | sort: 'order' %}
{% for ch in items %}
  <li><a href="{{ ch.url | relative_url }}">Chapter {{ ch.order }} — {{ ch.Title | default: ch.title }}</a></li>
{% endfor %}
</ul>
