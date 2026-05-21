---
layout: novel
Title: A Place Beside You
novel: a-place-beside-you
status: Complete
blurb: >-
  A Place Beside You follows Xu Cheng’an and Lin Zhixia through a tender lifetime of love in Hangzhou, where every confession, shared home, family milestone, and aging season begins with the simple courage of reaching for each other’s hand.
genre: >-
  Literary Romance, Contemporary Fiction, Slice of Life, Family Drama, Bittersweet Romance
tone: >-
  Tender, Nostalgic, Intimate, Poetic, Quietly Devastating
setting: >-
  Hangzhou, China, West Lake, Modern China, Lakeside Romance, Urban Domestic Life
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
