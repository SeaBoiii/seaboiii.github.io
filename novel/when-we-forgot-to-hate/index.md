---
layout: novel
Title: When We Forgot To Hate
novel: when-we-forgot-to-hate
status: Complete
blurb: >-
  Two rival heirs raised to hate each other lose their memories after a mountain accident, fall in love as mistaken husband and wife, and must decide whether that love can survive once they remember everything.
genre: >-
  contemporary romance, enemies to lovers, amnesia romance, family rivalry, heir romance
tone: >-
  emotional, cinematic, bittersweet, tender, dramatic
setting: >-
  modern china, wealthy business circles, rural mountain village, county hospital, qingshui village
gallery:
  - url: "/images/when-we-forgot-to-hate-gallery-1.png"
    description: "A young Yutong stands fiercely in front of young Junhao during a wealthy family banquet, her white dress dirtied and her knee scraped after defending him from bullies. Junhao clutches his puzzle cube behind her, stunned by the first person who protected him without caring about family rivalry. This scene becomes the emotional origin of his hidden love for her."
  - url: "/images/when-we-forgot-to-hate-gallery-2.png"
    description: "In an elegant private restaurant room, Yutong sits through a stiff blind date arranged by her father when Junhao appears at the doorway with a teasing, jealous smile. His interruption destroys the date, humiliates the man across from her, and exposes the possessiveness Junhao refuses to admit. It is sharp, glamorous, tense, and filled with unresolved attraction beneath anger."
  - url: "/images/when-we-forgot-to-hate-gallery-3.png"
    description: "On a rain-lashed mountain road near Qingshui Village, their damaged SUV tilts dangerously amid mudslide debris and shattered glass. In the chaos, Junhao instinctively shields Yutong with his body, taking the worst of the impact before either of them understands what the gesture means. This is the moment their rivalry breaks open and their love begins beneath fear and survival."
  - url: "/images/when-we-forgot-to-hate-gallery-4.png"
    description: "After waking with amnesia and believing they are husband and wife, Junhao and Yutong share a tender kiss on an old stone bridge in Qingshui Village. Red lanterns glow above them, mist drifts over the river, and a small paper rabbit lantern shines between their hands. The scene captures their love at its purest--before memory, pride, and family hatred return."
  - url: "/images/when-we-forgot-to-hate-gallery-5.png"
    description: "After waking with amnesia and believing they are husband and wife, Junhao and Yutong share a tender kiss on an old stone bridge in Qingshui Village. Red lanterns glow above them, mist drifts over the river, and a small paper rabbit lantern shines between their hands. The scene captures their love at its purest--before memory, pride, and family hatred return."
  - url: "/images/when-we-forgot-to-hate-gallery-6.png"
    description: "After remembering everything and choosing each other anyway, Junhao brings Yutong back to the same bridge where they first kissed. Under winter lanterns and village mist, he kneels with a ring and asks her to become his wife for real--not because of the hospital mistake, not because of the pregnancy, but because he remembers everything and still chooses her. This is the emotional resolution of the novella: love no longer born from forgetting, but strengthened by remembering."
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
