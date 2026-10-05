import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../../", import.meta.url);
const output = new URL("../public/portfolio-assets/media/", import.meta.url);
await mkdir(output, { recursive: true });
const media = [
  ["images/hub/classility-site.png", "classility.webp", 1000],
  ["images/hub/potionality-site.png", "potionality.webp", 720],
  ["images/hub/visual_novel-site.png", "visual-novel.webp", 720],
  ["images/hub/age_of_war-site.png", "age-of-war.webp", 720],
  ["images/hub/nizam-site.png", "nizam.webp", 720],
  ["images/hub/tetris-site.png", "tetris.webp", 720],
  ["images/hub/novel-site.png", "novels.webp", 720],
  ["img/a1e3m.jpg", "aleem.webp", 240],
  ["img/icm_buddy.gif", "icm-prototype.webp", 1000],
];
// Derived display assets only: all original files and route namespaces survive.
for (const [source, filename, width] of media) {
  const buffer = await sharp(fileURLToPath(new URL(source, root)), {
    animated: false,
  })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
  await writeFile(new URL(filename, output), buffer);
}
console.log(
  "Prepared nine lightweight portfolio images from existing project evidence.",
);
const socialSource = new URL(
  "../public/portfolio-assets/social-card.svg",
  import.meta.url,
);
await sharp(fileURLToPath(socialSource))
  .png()
  .toFile(
    fileURLToPath(
      new URL("../public/portfolio-assets/social-card.png", import.meta.url),
    ),
  );
