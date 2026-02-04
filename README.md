<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/SeaBoiii/seaboiii.github.io">
    <img src="img/A1E3M-logos_black.png" alt="Logo" width="500" height="500">
  </a>

<h3 align="center">My Portfolio Website</h3>

  <p align="center">
    A website to display everything about me!
    <br />
    <br />
    <br />
  </p>
</div>

# SeaBoiii.github.io

Personal portfolio + novels hub + mini projects, published via GitHub Pages.

This repo powers:
- A portfolio homepage and static pages
- A novels library under `novel/`
- Mini web projects (`tetris/`, `wordle/`)
- Utility scripts that keep the novel index and chapters consistent

## What’s Inside
- `index.html`: main landing page
- `novel/`: novel listings and chapter content
- `_layouts/`: Jekyll layouts used by the novel pages
- `images/`: cover images and optimized variants
- `assets/`, `css/`, `js/`: site styling and scripts
- `tools/`: helper scripts for novels and images
- `.github/workflows/`: automation (CI/maintenance)

## Novel Workflow (Recommended)
Use the wizard to create or append chapters and keep the index up to date.

1. Run the wizard from the repo root:
```bash
python3 tools/novel_wizard.py
```
2. Fill in the novel details and chapters, then click `Create / Append`.
3. The wizard will also run the optimizer to update `novel/index.html` and image variants.

### Wizard Features
- Create a new novel or append chapters to an existing one
- Auto-slug and order handling
- Formatted paste (HTML/RTF → Markdown)
- DOCX import (single or bulk)
- Chapter navigation with prev/next and horizontal scroll

## Image Optimization
This script upgrades the novel index cards to `<picture>` + responsive `srcset` and generates 320/640/960 JPG+WebP variants.

```bash
python3 tools/optimize_and_update_index.py
```

Dependencies:
```bash
pip install pillow beautifulsoup4
```

## Helpful Scripts
- `tools/novel_wizard.py`: primary authoring tool
- `tools/optimize_and_update_index.py`: optimize covers + update `novel/index.html`
- `tools/optimize_images.py`: legacy/utility image optimizer
- `tools/generate_indexes.py`: index helpers
- `tools/add_front_matter.py`, `tools/fix_front_matter.py`: front-matter maintenance

## Development Notes
This is a static site. You can open `index.html` directly or serve the repo with any static file server.

## Contact
[![LinkedIn][linkedin-shield]][linkedin-url]
[![Facebook][facebook-shield]][facebook-url]
[![Instagram][insta-shield]][insta-url]

## Acknowledgments
- Billy – original website template inspiration

<!-- Reference links -->
[linkedin-shield]: https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white
[linkedin-url]: https://linkedin.com/in/a1e3m
[facebook-shield]: https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white
[facebook-url]: https://www.facebook.com/seaboiii/
[insta-shield]: https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white
[insta-url]: https://www.instagram.com/a1e3m/
