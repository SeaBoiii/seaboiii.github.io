---
layout: novel
Title: The Cinder Crown
novel: the-cinder-crown
status: Complete
blurb: >-
  He brought Elara back from death by tearing the world’s magic apart—only for her to wake in a sunlit garden floating over nothingness, where love isn’t a rescue anymore, but the price they must learn to live with.
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
