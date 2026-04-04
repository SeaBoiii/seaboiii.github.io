---
layout: novel
Title: Senior I'm Serious
novel: senior-i-m-serious
status: Complete
blurb: >-
  A careful senior who never believed in casual love finds his world quietly undone by a fearless freshman whose sincerity refuses to let him hide from the future.
gallery:
  - url: "/images/senior-i-m-serious-gallery-1.png"
    description: "Saiful helping Xin Yue with her first day in University"
  - url: "/images/senior-i-m-serious-gallery-2.png"
    description: "Xin Yue passing an ice lemon tea to Saiful"
  - url: "/images/senior-i-m-serious-gallery-3.png"
    description: "Xin Yue flirting with Saiful during lunch"
  - url: "/images/senior-i-m-serious-gallery-4.png"
    description: "Saiful confronting with Xin Yue after lectures"
  - url: "/images/senior-i-m-serious-gallery-5.png"
    description: "Xin Yue asking Saiful for academic advice"
  - url: "/images/senior-i-m-serious-gallery-6.png"
    description: "At a dinner party together"
  - url: "/images/senior-i-m-serious-gallery-7.png"
    description: "Xin Yue observing Saiful leading the prayers"
  - url: "/images/senior-i-m-serious-gallery-8.png"
    description: "Saiful graduated. Xin Yue arrives."
  - url: "/images/senior-i-m-serious-gallery-9.png"
    description: "Xin Yue graduated. Saiful arrives."
  - url: "/images/senior-i-m-serious-gallery-10.png"
    description: "Saiful proposing to Xin Yue #1"
  - url: "/images/senior-i-m-serious-gallery-11.png"
    description: "Saiful proposing to Xin Yue #2"
  - url: "/images/senior-i-m-serious-gallery-12.png"
    description: "Wedding Day #1"
  - url: "/images/senior-i-m-serious-gallery-13.png"
    description: "Wedding Day #2"
  - url: "/images/senior-i-m-serious-gallery-14.png"
    description: "Xin Yue resting at their new BTO with Saiful"
  - url: "/images/senior-i-m-serious-gallery-15.png"
    description: "Xin Yue finding out she's pregnant."
  - url: "/images/senior-i-m-serious-gallery-16.png"
    description: "Another cover image"
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
