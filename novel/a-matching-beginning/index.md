---
layout: novel
Title: A Matching Beginning
novel: a-matching-beginning
status: Complete
blurb: >-
  He fell in love with her at first sight on Hari Raya afternoon, when a Korean woman in a green kebaya was asked to stand beside him in matching gold-threaded clothes—and years later, at their wedding reception, they would tell everyone that love had begun with a photograph they were never meant to take.
gallery:
  - url: "/images/a-matching-beginning-gallery-1.png"
    description: "An unused cover concept where it shows a slightly more intimate scene"
  - url: "/images/a-matching-beginning-gallery-2.png"
    description: "An unused cover concept of split visuals. The original photo in the foreground with a wedding reception in the background."
  - url: "/images/a-matching-beginning-gallery-3.png"
    description: "An unsued cover concept of a softer post-marriage edition. With a baby bump."
  - url: "/images/a-matching-beginning-gallery-4.png"
    description: "Beneath warm lights and a sky that feels impossibly close, he kneels with a trembling hope, asking her to turn their beginning into forever."
  - url: "/images/a-matching-beginning-gallery-5.png"
    description: "With rain tracing silver lines through the city lights, they finally choose each other in a moment too fragile and too real to take back."
  - url: "/images/a-matching-beginning-gallery-6.png"
    description: "As the first snow falls between them, their hands meet in the cold--soft, hesitant, and certain in a way neither of them can explain."
  - url: "/images/a-matching-beginning-gallery-7.png"
    description: "Under the dim glow of a quiet evening street, he gathers just enough courage to ask for her number before she disappears back into a life far from his."
  - url: "/images/a-matching-beginning-gallery-8.png"
    description: "In a room softened by curtain-filtered light, he pauses mid-step as the world fades, seeing her for the first time as if everything had quietly rearranged itself around her."
  - url: "/images/a-matching-beginning-gallery-9.png"
    description: "In a room softened by curtain-filtered light, he pauses mid-step as the world fades, seeing her for the first time as if everything had quietly rearranged itself around her."
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
