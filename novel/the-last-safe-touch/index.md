---
layout: novel
Title: The Last Safe Touch
novel: the-last-safe-touch
status: Complete
blurb: >-
  A wounded stabilizer and a feared woman whose touch destroys everything she loves must outrun Korea’s Ability Bureau while learning that the safest kind of love is not control, but choice.
genre: >-
  superpower romance, urban fantasy, romantic thriller, speculative fiction, slow-burn romance
tone: >-
  emotional, cinematic, intimate, tense, healing, bittersweet
setting: >-
  modern korea, near-future seoul, gangneung coast, secret bureau facilities, rainy city streets, seaside guesthouse
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
