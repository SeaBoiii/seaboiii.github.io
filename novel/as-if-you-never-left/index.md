---
layout: chapter
Title: As If You Never Left — Chapters
novel: as-if-you-never-left
order: 0
---

{% assign pathprefix = '/novel/' | append: page.novel | append: '/' %}
<ul>
{% assign items = site.pages
  | where: "dir", page.dir
  | where_exp: "p", "p.name != 'index.md'"
  | sort: "order" %}
{% for ch in items %}
  <li><a href="{{ ch.url | relative_url }}">Chapter {{ ch.order }} — {{ ch.Title | default: ch.title }}</a></li>
{% endfor %}
</ul>

<hr>
<p><strong>Debug</strong>: listing pages in this folder</p>
{% assign items = site.pages | where: "dir", page.dir | sort: "name" %}
{% for p in items %}
<pre>{{ p.path }} | dir={{ p.dir }} | name={{ p.name }} | order={{ p.order }}</pre>
{% endfor %}

