---
layout: novel
Title: Shards of Winterlight
novel: shards-of-winterlight
status: Complete
blurb: >-
  Bound by ice and separated by worlds, Sylra and Kaelen must rewrite the very laws of reality to turn a fleeting winter miracle into a forever home.
genre: >-
  fantasy romance, portal fantasy, adventure fantasy
tone: >-
  atmospheric, hopeful, lyrical
setting: >-
  fantasy world, winter landscape, magical kingdoms
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
