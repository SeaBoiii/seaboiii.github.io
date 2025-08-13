#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Optimize cover images and upgrade <img> to <picture> in /novel/index.html.

- For each <li><a><img ...> in /novel/index.html:
  * Locate the source image (prefer /images/<file>, fallback to /images_src/<file base>.*)
  * Generate 320/640/960 WebP + JPG variants into /images/
  * Replace the <img> with a <picture> (WebP source + JPG fallback)
  * First image gets loading="eager"; others loading="lazy"
- Writes the modified /novel/index.html back to disk.

Run from repo root:
  pip install pillow beautifulsoup4
  python3 tools/optimize_and_update_index.py
"""

from pathlib import Path
import re
from PIL import Image
try:
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess
    import sys
    print("BeautifulSoup4 not found, installing via pip...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "beautifulsoup4"])
    from bs4 import BeautifulSoup

REPO = Path.cwd()
NOVEL_INDEX = REPO / "novel" / "index.html"
IMAGES_DIR = REPO / "images"
IMAGES_SRC = REPO / "images_src"   # optional fallback for originals
SIZES = [320, 640, 960]

def find_original_image(src_url: str) -> Path | None:
    """
    src_url like '/images/when-the-song-began-cover.png'
    Try that. If missing, try images_src/<base>.(png|jpg|jpeg|webp).
    """
    # Prefer the image path exactly as referenced
    if src_url.startswith("/"):
        candidate = REPO / src_url.lstrip("/")
    else:
        candidate = REPO / src_url
    if candidate.exists():
        return candidate

    # Fallback: search images_src by base name (no extension)
    base = Path(src_url).stem  # 'when-the-song-began-cover'
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        cand = IMAGES_SRC / f"{base}{ext}"
        if cand.exists():
            return cand
    return None

def make_variants(orig_path: Path, base_out: str) -> tuple[int, int]:
    """
    Create /images/<base_out>-{320,640,960}.{webp,jpg}.
    Return (w_ref, h_ref) dimensions for width=640 fallback <img>.
    """
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    with Image.open(orig_path) as img0:
        img0 = img0.convert("RGB")  # normalize
        w0, h0 = img0.size
        for w in SIZES:
            # create a correctly scaled copy (max width=w)
            im = img0.copy()
            im.thumbnail((w, w * 5000), Image.LANCZOS)  # preserve aspect
            # webp
            webp_path = IMAGES_DIR / f"{base_out}-{w}.webp"
            im.save(webp_path, format="WEBP", quality=78, method=6)
            # jpg
            jpg_path = IMAGES_DIR / f"{base_out}-{w}.jpg"
            im.save(jpg_path, format="JPEG", quality=80, optimize=True, progressive=True)
    # compute reference height at 640
    h_ref = round(h0 * 640 / w0) if w0 else 960
    return 640, h_ref

def picture_markup(soup, base_out: str, alt: str, eager: bool, width: int, height: int):
    picture = soup.new_tag("picture")

    source = soup.new_tag("source")
    source["type"] = "image/webp"
    source["srcset"] = (
        f"/images/{base_out}-320.webp 320w, "
        f"/images/{base_out}-640.webp 640w, "
        f"/images/{base_out}-960.webp 960w"
    )
    picture.append(source)

    img = soup.new_tag("img")
    img["src"] = f"/images/{base_out}-640.jpg"
    img["srcset"] = (
        f"/images/{base_out}-320.jpg 320w, "
        f"/images/{base_out}-640.jpg 640w, "
        f"/images/{base_out}-960.jpg 960w"
    )
    img["sizes"] = "(max-width: 480px) 45vw, (max-width: 900px) 30vw, 240px"
    img["alt"] = alt or ""
    img["width"] = str(width)
    img["height"] = str(height)
    img["decoding"] = "async"
    img["loading"] = "eager" if eager else "lazy"
    img["style"] = "aspect-ratio: 2 / 3; object-fit: cover; border-radius: 8px;"
    picture.append(img)

    return picture

def normalize_base_from_src(src_url: str) -> str:
    """
    Turn '/images/when-the-song-began-cover.png' into 'when-the-song-began-cover'
    and squash spaces just in case.
    """
    name = Path(src_url).stem
    name = name.replace(" ", "-").lower()
    return name

def main():
    if not NOVEL_INDEX.exists():
        raise SystemExit(f"Cannot find {NOVEL_INDEX}. Run from repo root.")

    html = NOVEL_INDEX.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    imgs = soup.select("li a img")
    if not imgs:
        print("No <img> tags found under novel cards.")
        return

    updated = 0
    for i, img in enumerate(imgs):
        src = img.get("src", "").strip()
        alt = img.get("alt", "").strip()
        if not src:
            print("⚠️  Skipping an <img> with no src.")
            continue

        # find original
        orig = find_original_image(src)
        if not orig:
            print(f"⚠️  Could not locate original for {src}. Skipping optimization; replacing markup anyway.")
            # still replace with a picture using existing base
        base_out = normalize_base_from_src(src)

        # make variants if we found the file
        if orig and orig.exists():
            print(f"Optimizing {orig} → /images/{base_out}-{{320,640,960}}.webp/.jpg")
            w, h = make_variants(orig, base_out)
        else:
            # fallback dimensions if we can't read the image
            w, h = 640, 960

        eager = (i == 0)  # first card eager, others lazy
        picture = picture_markup(soup, base_out, alt, eager, w, h)
        img.replace_with(picture)
        updated += 1

    NOVEL_INDEX.write_text(soup.prettify(), encoding="utf-8")
    print(f"✅ Updated {NOVEL_INDEX} — converted {updated} card(s) to <picture> and wrote image variants.")
    print("Next:")
    print("  git add -A && git commit -m 'perf(images): responsive covers + lazy loading' && git push")

if __name__ == "__main__":
    main()