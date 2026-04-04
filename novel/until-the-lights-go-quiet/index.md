---
layout: novel
Title: Until the Lights Go Quiet
novel: until-the-lights-go-quiet
status: Complete
blurb: >-
  Two K-pop idols—raised as “sisters” under nine-member spotlights—reach contract’s end and choose a quiet, unlabelled life together, refusing to let the industry own the meaning of their love when the lights finally go quiet.
genre: >-
  queer romance, celebrity romance, contemporary drama
tone: >-
  intimate, soft, bittersweet
setting: >-
  Seoul, entertainment industry, post-idol life
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
