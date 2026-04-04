---
layout: novel
Title: Second Skin
novel: second-skin
status: Complete
blurb: >-
  A broke Tokyo salaryman buys a full-sensory deep-dive game to live as a breathtaking female avatar—until a hacker breaches his “safe” room and leaves a lingering afterimage that makes his real body feel like the wrong one.
genre: >-
  speculative thriller, identity drama, cyber thriller
tone: >-
  eerie, intimate, tense
setting: >-
  Tokyo, virtual world, near future
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
