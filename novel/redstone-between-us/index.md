---
layout: novel
Title: Redstone Between Us
novel: redstone-between-us
status: Complete
blurb: >-
  Aleem, a grounded, logical Singaporean (ABIX’s steady chaos-brain) meets a “girl” on a Minecraft survival server and becomes her survival mate. Night after night, their pixel world turns into a sanctuary—until voice chat becomes confession, and confession becomes a video call… where “Sharon” is revealed to be Myoui Mina. Now their romance isn’t just long-distance—it’s high-risk, high-stakes, and built on the fragile trust between a fan and the woman behind an idol.
genre: >-
  fan-idol romance, gaming romance, contemporary romance
tone: >-
  intimate, romantic, high-stakes
setting: >-
  gaming world, Singapore, Seoul
gallery:
  - url: "/images/redstone-between-us-gallery-1.png"
  - url: "/images/redstone-between-us-gallery-2.png"
  - url: "/images/redstone-between-us-gallery-3.png"
  - url: "/images/redstone-between-us-gallery-4.png"
  - url: "/images/redstone-between-us-gallery-5.png"
  - url: "/images/redstone-between-us-gallery-6.png"
  - url: "/images/redstone-between-us-gallery-7.png"
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
