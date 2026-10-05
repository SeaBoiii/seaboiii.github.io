import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
export const staticDirectories = [
  "assets",
  "images",
  "img",
  "css",
  "js",
  "tetris",
  "wordle",
];
export const standaloneFiles = ["foryou.html", "hny.html", "vday.html"];
export const staticFiles = [
  ...standaloneFiles,
  "README.md",
  "site.webmanifest",
  "CNAME",
  "favicon.ico",
  "favicon-16x16.png",
  "favicon-32x32.png",
  "apple-touch-icon.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
];

export async function filesWithin(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesWithin(absolute)));
    else if (entry.isFile()) files.push(absolute);
    else
      throw new Error(
        `Unsupported symbolic link in deployment input: ${absolute}`,
      );
  }
  return files;
}

const relativeUrl = (filename) => filename.split(path.sep).join("/");
const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function sameFile(source, destination, failures) {
  if (!existsSync(destination)) {
    failures.push(`Missing preserved file: ${destination}`);
    return;
  }
  const [sourceBytes, outputBytes] = await Promise.all([
    readFile(source),
    readFile(destination),
  ]);
  if (digest(sourceBytes) !== digest(outputBytes))
    failures.push(`Preserved file changed: ${destination}`);
}

async function checkResources(htmlFile, outputDirectory, failures) {
  const html = await readFile(htmlFile, "utf8");
  const route = "/" + relativeUrl(path.relative(outputDirectory, htmlFile));
  for (const match of html.matchAll(
    /\b(src|poster|href)\s*=\s*["']([^"']+)["']/gi,
  )) {
    const [, attribute, rawUrl] = match;
    if (
      /^(?:https?:|data:|blob:|mailto:|tel:|javascript:|#|\/\/)/i.test(rawUrl)
    )
      continue;
    // Navigation to another project deployment is outside this root artifact.
    if (
      attribute.toLowerCase() === "href" &&
      !/\.(?:css|js|woff2?|ttf|ico|png|jpg|webp|svg|webmanifest)(?:[?#]|$)/i.test(
        rawUrl,
      )
    )
      continue;
    const resourceUrl = new URL(rawUrl, `https://artifact.invalid${route}`);
    const filename = path.join(
      outputDirectory,
      decodeURIComponent(resourceUrl.pathname),
    );
    if (!existsSync(filename))
      failures.push(`Missing local resource ${rawUrl} referenced by ${route}`);
  }
}

export async function verifyDeploy(
  outputDirectory = path.join(repositoryRoot, "deploy"),
) {
  const failures = [];
  const webOutput = path.join(repositoryRoot, "web", "out");
  const portfolioOutput = path.join(repositoryRoot, "portfolio", "dist");
  for (const buildOutput of [webOutput, portfolioOutput]) {
    if (!existsSync(path.join(buildOutput, "index.html")))
      throw new Error(`Build required before verification: ${buildOutput}`);
  }
  if (!existsSync(path.join(outputDirectory, ".nojekyll")))
    failures.push("Missing .nojekyll marker");
  if (!existsSync(path.join(outputDirectory, "portfolio-assets")))
    failures.push("Missing portfolio-assets namespace");

  let novelCount = 0;
  let chapterCount = 0;
  const novelSource = path.join(repositoryRoot, "novel");
  const expectedRoutes = ["novel/index.html"];
  for (const entry of await readdir(novelSource, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    novelCount += 1;
    expectedRoutes.push(`novel/${entry.name}/index.html`);
    for (const file of await readdir(path.join(novelSource, entry.name))) {
      // Matches web/src/lib/chapters.ts without changing filename case.
      if (
        !file.endsWith(".md") ||
        !/^(?:Chapter\d+|Epilogue.*)\.md$/i.test(file)
      )
        continue;
      chapterCount += 1;
      expectedRoutes.push(
        `novel/${entry.name}/${file.slice(0, -3)}/index.html`,
      );
    }
  }
  for (const route of expectedRoutes) {
    const filename = path.join(outputDirectory, route);
    if (!existsSync(filename))
      failures.push(
        `Missing reader route: /${route.replace(/index\.html$/, "")}`,
      );
  }

  let preservedCount = 0;
  for (const source of await filesWithin(webOutput)) {
    const relative = path.relative(webOutput, source);
    if (relative === "index.html") continue;
    await sameFile(source, path.join(outputDirectory, relative), failures);
    preservedCount += 1;
  }
  for (const directory of staticDirectories) {
    const absolute = path.join(repositoryRoot, directory);
    if (!existsSync(absolute)) continue;
    for (const source of await filesWithin(absolute)) {
      await sameFile(
        source,
        path.join(outputDirectory, path.relative(repositoryRoot, source)),
        failures,
      );
      preservedCount += 1;
    }
  }
  for (const filename of staticFiles) {
    const source = path.join(repositoryRoot, filename);
    if (!existsSync(source)) continue;
    await sameFile(source, path.join(outputDirectory, filename), failures);
    preservedCount += 1;
  }
  for (const source of await filesWithin(portfolioOutput)) {
    await sameFile(
      source,
      path.join(outputDirectory, path.relative(portfolioOutput, source)),
      failures,
    );
  }
  for (const filename of ["index.html", ...standaloneFiles]) {
    const absolute = path.join(outputDirectory, filename);
    if (existsSync(absolute))
      await checkResources(absolute, outputDirectory, failures);
    else failures.push(`Missing landing or standalone page: ${filename}`);
  }
  // Confirm emitted reader resource references resolve without involving external URLs.
  const readerEntry = path.join(outputDirectory, "novel", "index.html");
  if (existsSync(readerEntry))
    await checkResources(readerEntry, outputDirectory, failures);
  if (failures.length)
    throw new Error(
      `Deployment verification failed (${failures.length}):\n${failures.join("\n")}`,
    );

  const portfolioHtml = await readFile(
    path.join(outputDirectory, "index.html"),
    "utf8",
  );
  if (!portfolioHtml.includes("/portfolio-assets/"))
    throw new Error(
      "Root landing does not reference the isolated portfolio build",
    );
  const outputSize = (await stat(path.join(outputDirectory, "index.html")))
    .size;
  const result = {
    novelCount,
    chapterCount,
    preservedCount,
    landingBytes: outputSize,
  };
  console.log(
    `Verified ${novelCount} novels, ${chapterCount} chapter/epilogue routes, and ${preservedCount} preserved files.`,
  );
  return result;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const output = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : undefined;
  verifyDeploy(output).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
