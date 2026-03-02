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

import re
from pathlib import Path
from PIL import Image
from bs4 import BeautifulSoup

REPO = Path.cwd()
NOVEL_INDEX = REPO / "novel" / "index.html"
IMAGES_DIR = REPO / "images"
IMAGES_SRC = REPO / "images_src"  # optional fallback for originals
SIZES = [320, 640, 960]


def variant_paths(base_out: str) -> list[Path]:
    paths = []
    for w in SIZES:
        paths.append(IMAGES_DIR / f"{base_out}-{w}.webp")
        paths.append(IMAGES_DIR / f"{base_out}-{w}.jpg")
    return paths


def variants_need_regen(base_out: str, source_path: Path | None) -> bool:
    """
    Return True when variants are missing or when source_path is newer than
    any generated variant.
    """
    paths = variant_paths(base_out)
    for p in paths:
        if not p.exists():
            return True
    if source_path is None or not source_path.exists():
        return False

    try:
        src_mtime = source_path.stat().st_mtime
    except OSError:
        return False

    for p in paths:
        try:
            if p.stat().st_mtime < src_mtime:
                return True
        except OSError:
            return True
    return False


def _is_variant_stem(stem: str) -> bool:
    m = re.match(r"^(.*)-(\d+)$", stem or "")
    return bool(m and int(m.group(2)) in SIZES)


def find_original_image(src_url: str, base_out: str) -> Path | None:
    """
    src_url like '/images/when-the-song-began-cover.png'
    Try that. If missing, try images_src/<base>.(png|jpg|jpeg|webp).
    """
    fallback_variant = None
    if src_url.startswith("/"):
        candidate = REPO / src_url.lstrip("/")
    else:
        candidate = REPO / src_url
    if candidate.exists():
        if not _is_variant_stem(candidate.stem):
            return candidate
        fallback_variant = candidate

    # Prefer the original non-resized source for this base name.
    for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        cand = IMAGES_DIR / f"{base_out}{ext}"
        if cand.exists():
            return cand

    for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        cand = IMAGES_SRC / f"{base_out}{ext}"
        if cand.exists():
            return cand

    return fallback_variant


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
    ref_img = IMAGES_DIR / f"{base_out}-640.jpg"
    if ref_img.exists():
        try:
            with Image.open(ref_img) as im_ref:
                w_ref, h_ref = im_ref.size
                if w_ref > 0 and h_ref > 0:
                    return w_ref, h_ref
        except Exception:
            pass
    if w0 and h0:
        if w0 <= 640:
            return w0, h0
        h_ref = round(h0 * 640 / w0)
        return 640, h_ref
    return 640, 960


def variant_dimensions(base_out: str, source_path: Path | None) -> tuple[int, int]:
    ref_img = IMAGES_DIR / f"{base_out}-640.jpg"
    if ref_img.exists():
        try:
            with Image.open(ref_img) as im_ref:
                w_ref, h_ref = im_ref.size
                if w_ref > 0 and h_ref > 0:
                    return w_ref, h_ref
        except Exception:
            pass
    if source_path and source_path.exists():
        try:
            with Image.open(source_path) as im_src:
                w0, h0 = im_src.size
                if w0 > 0 and h0 > 0:
                    if w0 <= 640:
                        return w0, h0
                    return 640, round(h0 * 640 / w0)
        except Exception:
            pass
    return 640, 960


def picture_markup(soup, base_out: str, alt: str, loading: str, width: int, height: int):
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
    img["width"] = str(max(1, int(width or 640)))
    img["height"] = str(max(1, int(height or 960)))
    if loading == "eager":
        img["fetchpriority"] = "high"
    picture.append(img)

    return picture


def normalize_base_from_src(src_url: str) -> str:
    """Turn '/images/name-cover.png' or '/images/name-cover-640.jpg' into 'name-cover'."""
    stem = Path(src_url).stem.replace(" ", "-").lower()
    m = re.match(r"^(.*)-(\d+)$", stem)
    if m and int(m.group(2)) in SIZES:
        return m.group(1)
    return stem


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

    # Keep one eager image to improve LCP without overloading the critical path.
    eager_anchor = None
    for a in anchors:
        img = a.find("img")
        if not img or not img.has_attr("src"):
            continue
        card = a.find_parent("li")
        if card is not None and str(card.get("data-hidden", "")).strip().lower() == "true":
            continue
        eager_anchor = a
        break
    if eager_anchor is None:
        for a in anchors:
            img = a.find("img")
            if img and img.has_attr("src"):
                eager_anchor = a
                break

    for a in anchors:
        img = a.find("img")
        if not img or not img.has_attr("src"):
            continue

        media_node = a.find("picture") or img
        before_media = str(media_node)

        src = img.get("src", "").strip()
        alt = img.get("alt", "").strip()
        base_out = normalize_base_from_src(src)

        if not base_out:
            continue

        orig = find_original_image(src, base_out)
        if not orig:
            for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
                probe = IMAGES_DIR / f"{base_out}{ext}"
                if probe.exists():
                    orig = probe
                    break
                probe = IMAGES_SRC / f"{base_out}{ext}"
                if probe.exists():
                    orig = probe
                    break

        dims = None
        if variants_need_regen(base_out, orig):
            if orig and orig.exists():
                print(f"Optimizing {orig} -> /images/{base_out}-{{320,640,960}}.webp/.jpg")
                dims = make_variants(orig, base_out)
            else:
                print(f"Warning: no source found for {src}. Skipping this card.")
                continue

        if dims is None:
            dims = variant_dimensions(base_out, orig)

        loading = "eager" if a is eager_anchor else "lazy"
        picture = picture_markup(soup, base_out, alt, loading, dims[0], dims[1])
        media_node.replace_with(picture)
        if before_media != str(picture):
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
