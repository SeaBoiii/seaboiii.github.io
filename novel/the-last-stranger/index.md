---
layout: novel
Title: The Last Stranger
novel: the-last-stranger
status: Complete
blurb: >-
  After months of silence, blocked accounts, and separate futures, Farid and Cindy accidentally re-meet on Omegle at two in the morning—only to discover that some goodbyes still need a voice.
genre: >-
  contemporary romance, bittersweet novella, second-chance-adjacent, emotional drama
tone: >-
  melancholic, intimate, tender, reflective, quietly heartbreaking
setting: >-
  modern Jakarta, rainy nights, apartment rooms, late-night video chat, wedding season
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
