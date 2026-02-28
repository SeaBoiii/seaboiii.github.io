---
layout: novel
Title: Lower Bracket Lovers
novel: lower-bracket-lovers
status: Complete
blurb: >-
  A broke Filipino pro and a rich Indonesian influencer fall in love through late-night Mobile Legends—then gamble everything on a lower-bracket miracle where winning isn’t just for the trophy, but for the right to choose each other.
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
