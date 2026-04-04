---
layout: novel
Title: Under My Protection
novel: under-my-protection
status: Complete
blurb: >-
  He was assigned to protect her—but the closer he gets, the more dangerous the truth becomes, because the woman he’s sworn to guard may be the only one who can bring down everything he was trained to defend.
genre: >-
  romantic suspense, bodyguard romance, contemporary romance
tone: >-
  tense, protective, cinematic
setting: >-
  modern city, high-security world, hidden danger
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
