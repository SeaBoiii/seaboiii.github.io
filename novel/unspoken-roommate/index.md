---
layout: novel
Title: Unspoken Roommate
novel: unspoken-roommate
status: Complete
blurb: >-
  A roommate, a friend's sister... What if these boundaries were crossed?
genre: >-
  roommate romance, forbidden romance, contemporary romance
tone: >-
  intimate, yearning, tense
setting: >-
  domestic life, shared apartment, modern day
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
