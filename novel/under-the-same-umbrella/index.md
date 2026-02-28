---
layout: novel
Title: Under The Same Umbrella
novel: under-the-same-umbrella
status: Incomplete
blurb: >-
  When a quiet Singaporean cybersecurity student and a poised Japanese exchange student fake a relationship to satisfy watchful eyes—parents, sponsors, and a rumor page—their borrowed shelter under one umbrella starts to feel dangerously like home.
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
