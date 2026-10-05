import { existsSync } from "node:fs";
import { cp, lstat, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  filesWithin,
  repositoryRoot,
  staticDirectories,
  staticFiles,
  verifyDeploy,
} from "./verify-deploy.mjs";

const outputDirectory = path.resolve(repositoryRoot, "deploy");
const webOutput = path.join(repositoryRoot, "web", "out");
const portfolioOutput = path.join(repositoryRoot, "portfolio", "dist");

async function assemble() {
  for (const directory of [webOutput, portfolioOutput]) {
    if (!existsSync(path.join(directory, "index.html")))
      throw new Error(`Build required before assembly: ${directory}`);
  }
  if (!existsSync(path.join(portfolioOutput, "portfolio-assets"))) {
    throw new Error("Vite build must emit its assets in portfolio-assets/");
  }
  // This script can clean only the repository's dedicated deploy directory.
  if (
    path.dirname(outputDirectory) !== path.resolve(repositoryRoot) ||
    path.basename(outputDirectory) !== "deploy"
  ) {
    throw new Error(`Unsafe deployment output directory: ${outputDirectory}`);
  }
  if (
    existsSync(outputDirectory) &&
    (await lstat(outputDirectory)).isSymbolicLink()
  ) {
    throw new Error("Refusing to replace a symlinked deploy directory");
  }
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });

  for (const directory of staticDirectories) {
    const source = path.join(repositoryRoot, directory);
    if (existsSync(source))
      await cp(source, path.join(outputDirectory, directory), {
        recursive: true,
      });
  }
  for (const filename of staticFiles) {
    const source = path.join(repositoryRoot, filename);
    if (existsSync(source))
      await cp(source, path.join(outputDirectory, filename));
  }
  for (const entry of await readdir(webOutput)) {
    await cp(path.join(webOutput, entry), path.join(outputDirectory, entry), {
      recursive: true,
    });
  }

  for (const source of await filesWithin(portfolioOutput)) {
    const relative = path.relative(portfolioOutput, source);
    if (
      relative !== "index.html" &&
      existsSync(path.join(outputDirectory, relative))
    ) {
      throw new Error(
        `Portfolio output would overwrite a preserved file: ${relative}`,
      );
    }
    const topLevel = relative.split(path.sep)[0];
    if (
      [
        "novel",
        "_next",
        "images",
        "img",
        "css",
        "js",
        "assets",
        "tetris",
        "wordle",
      ].includes(topLevel)
    ) {
      throw new Error(
        `Portfolio output uses a reserved legacy namespace: ${relative}`,
      );
    }
  }
  for (const entry of await readdir(portfolioOutput)) {
    await cp(
      path.join(portfolioOutput, entry),
      path.join(outputDirectory, entry),
      { recursive: true },
    );
  }
  await writeFile(path.join(outputDirectory, ".nojekyll"), "");
  await verifyDeploy(outputDirectory);
  console.log(`Deployment assembled at ${outputDirectory}`);
}

assemble().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
