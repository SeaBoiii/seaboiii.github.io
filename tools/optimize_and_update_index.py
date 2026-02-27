#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Optimize cover images and upgrade <img> to <picture> in /novel/index.html.

- For each <li><a><img ...> in /novel/index.html:
  * Locate the source image (prefer /images/<file>, fallback to /images_src/<file base>.*)
  * Generate 320/640/960 WebP + JPG variants into /images/
  * Replace the <img> with a <picture> (WebP source + JPG fallback)
  * Preserve loading preference when present; otherwise keep one eager image site-wide.
- Writes the modified /novel/index.html back to disk.

Run from repo root:
  pip install pillow beautifulsoup4
  python3 tools/optimize_and_update_index.py
"""

from pathlib import Path
from PIL import Image
from bs4 import BeautifulSoup

REPO = Path.cwd()
NOVEL_INDEX = REPO / "novel" / "index.html"
IMAGES_DIR = REPO / "images"
IMAGES_SRC = REPO / "images_src"  # optional fallback for originals
SIZES = [320, 640, 960]


def variants_exist(base_out: str) -> bool:
    """Return True if all webp/jpg variants for base_out exist in /images."""
    for w in SIZES:
        if not (IMAGES_DIR / f"{base_out}-{w}.webp").exists():
            return False
        if not (IMAGES_DIR / f"{base_out}-{w}.jpg").exists():
            return False
    return True


def find_original_image(src_url: str) -> Path | None:
    """
    src_url like '/images/when-the-song-began-cover.png'
    Try that. If missing, try images_src/<base>.(png|jpg|jpeg|webp).
    """
    if src_url.startswith("/"):
        candidate = REPO / src_url.lstrip("/")
    else:
        candidate = REPO / src_url
    if candidate.exists():
        return candidate

    base = Path(src_url).stem
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
        img0 = img0.convert("RGB")
        w0, h0 = img0.size
        for w in SIZES:
            im = img0.copy()
            im.thumbnail((w, w * 5000), Image.LANCZOS)
            im.save(IMAGES_DIR / f"{base_out}-{w}.webp", format="WEBP", quality=78, method=6)
            im.save(
                IMAGES_DIR / f"{base_out}-{w}.jpg",
                format="JPEG",
                quality=80,
                optimize=True,
                progressive=True,
            )
    h_ref = round(h0 * 640 / w0) if w0 else 960
    return 640, h_ref


def picture_markup(soup, base_out: str, alt: str, loading: str):
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
    img["decoding"] = "async"
    img["loading"] = "eager" if loading == "eager" else "lazy"
    picture.append(img)

    return picture


def normalize_base_from_src(src_url: str) -> str:
    """Turn '/images/name-cover.png' into 'name-cover'."""
    return Path(src_url).stem.replace(" ", "-").lower()


def card_is_converted(anchor_tag) -> bool:
    return anchor_tag.find("picture") is not None


def card_loading_value(anchor_tag) -> str:
    img = anchor_tag.find("img")
    if not img:
        return ""
    return str(img.get("loading", "")).strip().lower()


def main():
    if not NOVEL_INDEX.exists():
        raise SystemExit(f"Cannot find {NOVEL_INDEX}. Run from repo root.")

    html = NOVEL_INDEX.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    anchors = soup.select("li a")
    if not anchors:
        print("No novel cards found (li > a).")
        return

    updated = 0
    # Preserve existing eager image if one already exists in the document.
    eager_given = any(card_loading_value(a) == "eager" for a in anchors)

    for a in anchors:
        if card_is_converted(a):
            continue

        img = a.find("img")
        if not img or not img.has_attr("src"):
            continue

        src = img.get("src", "").strip()
        alt = img.get("alt", "").strip()
        base_out = normalize_base_from_src(src)

        if not variants_exist(base_out):
            orig = find_original_image(src)
            if not orig:
                for ext in (".png", ".jpg", ".jpeg", ".webp"):
                    probe = IMAGES_DIR / f"{base_out}{ext}"
                    if probe.exists():
                        orig = probe
                        break
                    probe = IMAGES_SRC / f"{base_out}{ext}"
                    if probe.exists():
                        orig = probe
                        break
            if orig and orig.exists():
                print(f"Optimizing {orig} -> /images/{base_out}-{{320,640,960}}.webp/.jpg")
                make_variants(orig, base_out)
            else:
                print(f"Warning: no source found for {src}. Skipping this card.")
                continue

        loading_pref = str(img.get("loading", "")).strip().lower()
        if loading_pref in {"eager", "lazy"}:
            loading = loading_pref
        else:
            loading = "lazy" if eager_given else "eager"
        if loading == "eager":
            eager_given = True

        picture = picture_markup(soup, base_out, alt, loading)
        img.replace_with(picture)
        updated += 1

    new_html = soup.prettify()
    if new_html != html:
        NOVEL_INDEX.write_text(new_html, encoding="utf-8")
        print(f"Updated {NOVEL_INDEX} - converted {updated} card(s) to <picture> and wrote image variants.")
    else:
        print("No HTML changes needed.")
    print("Next:")
    print("  git add -A && git commit -m 'perf(images): responsive covers + lazy loading' && git push")


if __name__ == "__main__":
    main()
