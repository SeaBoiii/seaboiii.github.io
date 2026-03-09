---
layout: novel
Title: The Warmth You Asked For
novel: the-warmth-you-asked-for
status: Complete
blurb: >-
  Six months into a relationship that feels quietly perfect, Ethan begins changing in ways he can’t explain—until a hidden truth turns every act of care into betrayal, and he must fight to reclaim his body and his story before someone else rewrites both.
gallery: |-
  /images/the-warmth-you-asked-for-gallery-1.png
  /images/the-warmth-you-asked-for-gallery-2.png
  /images/the-warmth-you-asked-for-gallery-3.png
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
