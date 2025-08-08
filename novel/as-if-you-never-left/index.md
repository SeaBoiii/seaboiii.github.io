---
layout: chapter
Title: As If You Never Left — Chapters
novel: as-if-you-never-left
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

<hr>
<p><strong>Debug — pages under this novel</strong></p>
{% assign prefix = '/novel/as-if-you-never-left/' %}
{% for p in site.pages %}
  {% if p.url contains prefix %}
    <pre>{{ p.path }} | url={{ p.url }} | dir={{ p.dir }} | name={{ p.name }} | layout={{ p.layout }} | order={{ p.order }} | Title={{ p.Title }}</pre>
  {% endif %}
{% endfor %}

