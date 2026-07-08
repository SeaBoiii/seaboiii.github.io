---
layout: novel
Title: Bukan Kita Kawan Je
novel: bukan-kita-kawan-je
status: Complete
blurb: >-
  When Harith calls their almost-love “just friendship,” Aleesya learns that the hardest part of walking away is realizing she had been waiting for a love he only named after losing her.
genre: >-
  Contemporary Romance, Bittersweet Romance, Friends-to-Almost-Lovers, Emotional Drama
tone: >-
  Tender, Heartbreaking, Reflective, Slow Burn, Mature
setting: >-
  Singapore, HDB Estates, Malay Wedding, Rainy City Nights, Hotel Ballroom
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
