#!/usr/bin/env python3
# pip install pillow
from PIL import Image
from pathlib import Path

SIZES = [320, 640, 960]
SRC_DIR = Path("images_src")   # originals here
DST_DIR = Path("images")       # outputs to your site

def save_variant(img, base, w, fmt, quality):
    out = DST_DIR / f"{base}-{w}.{fmt}"
    im = img.copy().convert("RGB")
    im.thumbnail((w, w*3000), Image.LANCZOS)  # keep aspect
    if fmt == "webp":
        im.save(out, format="WEBP", quality=78, method=6)
    else:  # jpg
        im.save(out, format="JPEG", quality=80, optimize=True, progressive=True)
    print("wrote", out)

def main():
    DST_DIR.mkdir(parents=True, exist_ok=True)
    for p in SRC_DIR.glob("*.*"):
        if p.suffix.lower() not in {".png",".jpg",".jpeg",".webp"}:
            continue
        base = p.stem.replace(" ", "-").lower()
        img = Image.open(p)
        for w in SIZES:
            save_variant(img, base, w, "webp", 78)
            save_variant(img, base, w, "jpg", 80)

if __name__ == "__main__":
    main()