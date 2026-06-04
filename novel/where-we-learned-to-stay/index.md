---
layout: novel
Title: Where We Learned to Stay
novel: where-we-learned-to-stay
status: Complete
blurb: >-
  At a wedding where old wounds resurface, Rai and Nadia choose not to fall back into love, but to rebuild it slowly—learning that after heartbreak, love is not proven by returning once, but by staying.
genre: >-
  second-chance romance, emotional drama, contemporary romance, relationship fiction
tone: >-
  quiet, aching, intimate, tender, reflective, hopeful
setting: >-
  singapore, wedding ballrooms, cafés, family homes, therapy rooms, everyday city life
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
