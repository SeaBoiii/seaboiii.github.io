import { copyFile, mkdir, writeFile } from "node:fs/promises";
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
  [
    "portfolio/assets/images/compute-core-exploded-v2.png",
    "compute-core-exploded-v2.webp",
    1200,
  ],
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
  `Prepared ${media.length} optimized portfolio images from tracked source assets.`,
);
// Generated once and committed: builds never contact an audio-generation API.
await copyFile(
  new URL("../assets/audio/quiet-mechanisms.mp3", import.meta.url),
  new URL("quiet-mechanisms.mp3", output),
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
