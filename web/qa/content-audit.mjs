import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

// Exercise the real server data modules without introducing a second test runtime.
const webRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = path.dirname(webRoot);
process.chdir(webRoot);
const require = createRequire(path.join(webRoot, "package.json"));
const ts = require("typescript");
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "novel-content-qa-"));
let checks = 0;
const check = (message, callback) => {
  try { callback(); checks++; }
  catch (error) { error.message = `${message}: ${error.message}`; throw error; }
};

try {
  for (const name of ["paths", "chapters", "novels"]) {
    const source = fs.readFileSync(path.join(webRoot, "src/lib", `${name}.ts`), "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText.replace(/from (["'])([^"']+)\1/g, (match, quote, specifier) => {
      if (specifier.startsWith("node:")) return match;
      if (specifier.startsWith("./")) return `from ${quote}${specifier}.mjs${quote}`;
      return `from ${quote}${pathToFileURL(require.resolve(specifier)).href}${quote}`;
    });
    fs.writeFileSync(path.join(scratch, `${name}.mjs`), compiled);
  }
  const { getAllNovels, getNovel, getNovelReadingSequence } = await import(pathToFileURL(path.join(scratch, "novels.mjs")));
  const { getChapterList, getChapter, allChapterParams, getBranchChoicesAfter } = await import(pathToFileURL(path.join(scratch, "chapters.mjs")));
  const novels = getAllNovels();
  const params = allChapterParams();
  check("Complete route inventory", () => {
    assert.equal(novels.length, 50);
    assert.equal(params.length, 820);
    assert.equal(new Set(params.map(({ slug, chapter }) => `/novel/${slug}/${chapter}/`)).size, 820);
    for (const { slug, chapter } of params) assert.ok(fs.existsSync(path.join(repoRoot, "novel", slug, `${chapter}.md`)));
  });
  check("Curated catalogue order survives checkout", () => {
    const html = fs.readFileSync(path.join(repoRoot, "novel/index.html"), "utf8");
    const slugs = new Set(novels.map((novel) => novel.slug));
    const expected = [...new Set([...html.matchAll(/href=["']\/novel\/([^"'\/]+)\/["']/gi)].map((match) => match[1].toLowerCase()))].filter((slug) => slugs.has(slug));
    assert.deepEqual(novels.slice(0, expected.length).map((novel) => novel.slug), expected);
    assert.ok(novels.every((novel) => !Object.hasOwn(novel, "lastChapterMtime")));
  });
  for (const novel of novels) {
    const chapters = getChapterList(novel.slug);
    check(`Valid reading estimates: ${novel.slug}`, () => {
      assert.equal(novel.chapterCount, chapters.length);
      assert.ok(novel.wordCount > 0 && Number.isInteger(novel.wordCount));
      assert.equal(novel.wordCount, chapters.reduce((total, chapter) => total + chapter.wordCount, 0));
      assert.ok(novel.readingMinutes > 0);
      assert.equal(new Set(chapters.map((chapter) => chapter.slug)).size, chapters.length);
      for (const chapter of chapters) {
        assert.ok(chapter.wordCount > 0 && chapter.readingMinutes > 0);
        assert.equal(chapter.novelSlug, novel.slug);
      }
    });
  }
  for (const [slug, first, keys] of [["the-warmth-you-asked-for", 21, ["I", "II"]], ["senior-i-m-serious", 13, ["I", "II", "III", "IV"]], ["two-seats-reserved", 11, ["I", "II", "III"]]]) {
    for (let index = 0; index < keys.length; index++) {
      const chapter = await getChapter(slug, `Chapter${first + index}`);
      check(`Sequential epilogue ${slug}/${chapter.slug}`, () => {
        assert.equal(chapter.epilogueType, "sequential");
        assert.equal(chapter.epilogueKey, keys[index]);
        assert.equal(chapter.prev?.slug, `Chapter${first + index - 1}`);
        assert.equal(chapter.next?.slug, index < keys.length - 1 ? `Chapter${first + index + 1}` : undefined);
        assert.equal(getBranchChoicesAfter(slug, chapter.slug).length, 0);
      });
    }
  }
  for (const slug of ["as-if-you-never-left", "umrah-of-mercy"]) {
    const list = getChapterList(slug);
    const endings = list.filter((chapter) => chapter.epilogueType === "branching");
    const last = list.filter((chapter) => chapter.epilogueType !== "branching").at(-1);
    const chapter = await getChapter(slug, last.slug);
    check(`Parallel A/B choices: ${slug}`, () => {
      assert.deepEqual(endings.map((ending) => ending.epilogueKey), ["A", "B"]);
      assert.equal(chapter.next, undefined);
      assert.deepEqual(getBranchChoicesAfter(slug, last.slug).map((ending) => ending.slug), endings.map((ending) => ending.slug));
    });
    for (const ending of endings) {
      const chapter = await getChapter(slug, ending.slug);
      check(`Independent ending ${slug}/${ending.slug}`, () => {
        assert.equal(chapter.prev?.slug, last.slug);
        assert.equal(chapter.next, undefined);
        assert.equal(chapter.branchSiblings?.length, 1);
        assert.notEqual(chapter.branchSiblings[0].slug, ending.slug);
      });
    }
  }
  check("Only the two authored books expose alternate endings", () => {
    assert.deepEqual(novels.filter((novel) => getChapterList(novel.slug).some((chapter) => chapter.epilogueType === "branching")).map((novel) => novel.slug).sort(), ["as-if-you-never-left", "umrah-of-mercy"]);
  });
  check("Known series and standalone sequel order", () => {
    assert.deepEqual(getNovelReadingSequence(getNovel("two-seats-closer")).map((novel) => novel.slug), ["two-seats-apart", "two-seats-closer", "two-seats-reserved"]);
    assert.deepEqual(getNovelReadingSequence(getNovel("the-silk-of-fate")).map((novel) => novel.slug), ["crossroads-of-the-heart", "the-silk-of-fate"]);
    assert.deepEqual(getNovelReadingSequence(getNovel("where-we-learned-to-stay")).map((novel) => novel.slug), ["the-seats-we-left-empty", "where-we-learned-to-stay"]);
    assert.deepEqual(getNovelReadingSequence(getNovel("echoes-of-us")).slice(0, 2).map((novel) => novel.slug), ["the-abix-chronicle", "echoes-of-us"]);
  });

  // Compare every chapter with its original renderer. Only a redundant leading H1
  // may disappear; dialogue, scene headings and all other rendered content stay intact.
  const matter = require("gray-matter");
  const { unified } = await import(pathToFileURL(require.resolve("unified")));
  const plugin = async (name) => (await import(pathToFileURL(require.resolve(name)))).default;
  const originalRenderer = unified().use(await plugin("remark-parse")).use(await plugin("remark-gfm")).use(await plugin("remark-rehype"), { allowDangerousHtml: true }).use(await plugin("rehype-stringify"), { allowDangerousHtml: true });
  const normalize = (title) => title.normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  let redundantHeadings = 0;
  for (const { slug, chapter: chapterSlug } of params) {
    const { content } = matter(fs.readFileSync(path.join(repoRoot, "novel", slug, `${chapterSlug}.md`), "utf8"));
    const chapter = await getChapter(slug, chapterSlug);
    let expected = String(await originalRenderer.process(content));
    const leading = content.match(/^\s*#\s+(.+?)(?:\s+#+)?\s*(?:\r?\n|$)/);
    if (leading && [chapter.title, chapter.label, chapter.displayTitle, `${chapter.label} ${chapter.displayTitle}`].some((title) => title && normalize(title) === normalize(leading[1]))) {
      expected = expected.replace(/^<h1>[\s\S]*?<\/h1>\n?/, "");
      redundantHeadings++;
    }
    check(`Prose unchanged: ${slug}/${chapterSlug}`, () => assert.equal(chapter.html, expected));
  }
  assert.ok(redundantHeadings > 0, "The duplicate-heading preservation check must exercise real chapters.");
  console.log(`Content audit passed: ${checks} checks, 50 books, 820 chapter/end routes, ${redundantHeadings} redundant headings removed without prose changes.`);
} finally {
  const resolved = fs.realpathSync(scratch);
  const tempRoot = fs.realpathSync(os.tmpdir());
  if (resolved.startsWith(`${tempRoot}${path.sep}novel-content-qa-`)) fs.rmSync(resolved, { recursive: true, force: true });
}
