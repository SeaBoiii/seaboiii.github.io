#!/usr/bin/env python3
"""
Local CLI novel auto-generator.

Generates a complete novel package (story bible, outline, chapters, optional
epilogues, cover prompt + image attempt) using a local model backend, then
stages the output for human review under temp_logs/build/novel-gen/<slug>/.

Subcommands
-----------
  draft   Generate a novel into the staging area only. Never writes under novel/.
  commit  Promote a previously-staged draft into novel/<slug>/, then run the
          existing front-matter normalizer and index regenerator.
  dry-run Validate inputs and show the planned filenames/order without calling
          any model or writing files.

Provider
--------
Local text generation talks to an Ollama-compatible HTTP endpoint
(http://localhost:11434 by default). If unavailable, a deterministic
template-based fallback is used so the workflow remains testable.
Image generation tries an Automatic1111-compatible /sdapi/v1/txt2img endpoint
when --image-endpoint is supplied; otherwise the cover prompt is recorded and
a placeholder cover path is reserved.

Examples
--------
  python tools/generate_novel.py draft \\
      --slug ember-of-quiet-things \\
      --title "Ember of Quiet Things" \\
      --topic "two estranged friends restoring a bookshop together" \\
      --setting "rainy coastal town, modern day" \\
      --genre "slow-burn romance, literary" \\
      --tone "tender, restrained" \\
      --chapters 8 --words-per-chapter 1800 \\
      --epilogue branching --branches 2

  python tools/generate_novel.py commit --slug ember-of-quiet-things --yes

  python tools/generate_novel.py dry-run --slug demo --title Demo \\
      --topic x --chapters 3 --epilogue single
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import textwrap
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional

# --------------------------------------------------------------------------- #
# Paths and constants
# --------------------------------------------------------------------------- #

REPO_ROOT = Path(__file__).resolve().parent.parent
NOVEL_ROOT = REPO_ROOT / "novel"
IMAGES_ROOT = REPO_ROOT / "images"
STAGE_ROOT = REPO_ROOT / "temp_logs" / "build" / "novel-gen"
RELATIONSHIPS_JSON = REPO_ROOT / "tools" / "novel_relationships.json"
FIX_FRONT_MATTER = REPO_ROOT / "tools" / "fix_front_matter.py"
GENERATE_INDEXES = REPO_ROOT / "tools" / "generate_indexes.py"
ADD_FRONT_MATTER = REPO_ROOT / "tools" / "add_front_matter.py"

MANIFEST_NAME = "manifest.json"
SCHEMA_VERSION = 1

EPILOGUE_MODES = ("none", "single", "branching")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DEFAULT_OLLAMA_ENDPOINT = os.environ.get("NOVELGEN_OLLAMA", "http://localhost:11434")
DEFAULT_OLLAMA_MODEL = os.environ.get("NOVELGEN_MODEL", "llama3.1")


# --------------------------------------------------------------------------- #
# Logging helpers
# --------------------------------------------------------------------------- #

def log(msg: str) -> None:
    print(f"[novelgen] {msg}", flush=True)


def warn(msg: str) -> None:
    print(f"[novelgen][warn] {msg}", file=sys.stderr, flush=True)


def fail(msg: str, code: int = 2) -> "NoReturn":  # type: ignore[name-defined]
    print(f"[novelgen][error] {msg}", file=sys.stderr, flush=True)
    sys.exit(code)


# --------------------------------------------------------------------------- #
# Slug / title helpers
# --------------------------------------------------------------------------- #

def slugify(text: str) -> str:
    s = text.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def validate_slug(slug: str) -> None:
    if not SLUG_RE.match(slug):
        fail(f"Invalid slug '{slug}'. Use lowercase letters, digits, and hyphens only.")


def pretty_title(slug: str) -> str:
    s = re.sub(r"[-_]+", " ", slug).strip()
    return " ".join(w.capitalize() for w in s.split())


# --------------------------------------------------------------------------- #
# Spec / inputs
# --------------------------------------------------------------------------- #

@dataclass
class NovelSpec:
    slug: str
    title: str
    topic: str
    setting: str = ""
    genre: str = ""
    tone: str = ""
    blurb: str = ""
    status: str = "Incomplete"
    chapters: int = 10
    words_per_chapter: int = 1500
    epilogue: str = "none"          # none | single | branching
    branches: int = 0               # 0 unless epilogue == branching
    series_id: str = ""
    series_label: str = ""
    relation_type: str = ""
    related_to: str = ""
    reading_order: Optional[int] = None
    seed: Optional[int] = None

    def validate(self) -> None:
        validate_slug(self.slug)
        if not self.title.strip():
            fail("--title must not be empty.")
        if not self.topic.strip():
            fail("--topic must not be empty.")
        if self.chapters < 1:
            fail("--chapters must be >= 1.")
        if self.words_per_chapter < 100:
            fail("--words-per-chapter must be >= 100.")
        if self.epilogue not in EPILOGUE_MODES:
            fail(f"--epilogue must be one of {EPILOGUE_MODES}.")
        if self.epilogue == "branching":
            if self.branches < 2:
                fail("--branches must be >= 2 when --epilogue=branching.")
            if self.branches > 6:
                fail("--branches must be <= 6 (A..F).")
        else:
            if self.branches not in (0, ):
                fail("--branches is only valid when --epilogue=branching.")


# --------------------------------------------------------------------------- #
# Provider abstraction
# --------------------------------------------------------------------------- #

class TextProvider:
    name = "base"

    def generate(self, system: str, prompt: str, *, max_tokens: int = 2048,
                 temperature: float = 0.85, seed: Optional[int] = None) -> str:
        raise NotImplementedError


class OllamaProvider(TextProvider):
    name = "ollama"

    def __init__(self, endpoint: str, model: str):
        self.endpoint = endpoint.rstrip("/")
        self.model = model

    def available(self) -> bool:
        try:
            req = urllib.request.Request(f"{self.endpoint}/api/tags")
            with urllib.request.urlopen(req, timeout=2.0) as resp:
                return resp.status == 200
        except Exception:
            return False

    def generate(self, system: str, prompt: str, *, max_tokens: int = 2048,
                 temperature: float = 0.85, seed: Optional[int] = None) -> str:
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        if seed is not None:
            payload["options"]["seed"] = seed
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{self.endpoint}/api/generate",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=600) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                return (body.get("response") or "").strip()
        except urllib.error.URLError as e:
            raise RuntimeError(f"Ollama request failed: {e}") from e


class TemplateProvider(TextProvider):
    """Deterministic fallback when no local model is available.

    Produces structured prose-like output so the pipeline can be exercised
    end-to-end (front matter, ordering, epilogue handling) without a model.
    Output is clearly marked as a placeholder so it cannot be confused with
    a real draft.
    """
    name = "template"

    def generate(self, system: str, prompt: str, *, max_tokens: int = 2048,
                 temperature: float = 0.85, seed: Optional[int] = None) -> str:
        # Echo back a structured placeholder. Real callers parse JSON-like
        # blocks; the orchestrator handles non-model output specially.
        return ""


# --------------------------------------------------------------------------- #
# Generation pipeline
# --------------------------------------------------------------------------- #

@dataclass
class ChapterDraft:
    order: int
    filename: str           # e.g. Chapter1.md or EpilogueA.md
    title: str
    body: str
    is_epilogue: bool = False
    branch_key: str = ""    # "A", "B", ... for branching epilogues


@dataclass
class CoverArtifact:
    prompt: str
    relative_path: str = ""   # e.g. images/<slug>-cover.png
    generated: bool = False


@dataclass
class DraftManifest:
    schema_version: int
    slug: str
    spec: dict
    provider: str
    bible: str
    outline: list
    chapters: list  # list of dicts (ChapterDraft)
    cover: dict
    created_at: float
    notes: list = field(default_factory=list)


def system_prompt(spec: NovelSpec) -> str:
    return textwrap.dedent(f"""\
        You are a careful long-form fiction author. You write coherent,
        emotionally grounded prose with consistent characters and continuity.
        You target the requested chapter length within +/- 20%, write in
        third-person past tense unless the topic strongly suggests otherwise,
        avoid meta commentary, and never break the fourth wall.
        Title: {spec.title}
        Genre: {spec.genre or 'unspecified'}
        Tone: {spec.tone or 'unspecified'}
        Setting: {spec.setting or 'unspecified'}
        Topic: {spec.topic}
    """).strip()


def gen_bible(provider: TextProvider, spec: NovelSpec) -> str:
    if isinstance(provider, TemplateProvider):
        return (
            f"PLACEHOLDER STORY BIBLE for {spec.title}\n"
            f"Topic: {spec.topic}\nSetting: {spec.setting}\n"
            f"Genre: {spec.genre}\nTone: {spec.tone}\n"
            "Characters and continuity rules will be authored by the chosen model."
        )
    prompt = textwrap.dedent(f"""\
        Produce a concise STORY BIBLE for the novel. Include:
        - 2-4 main characters with one-line motivations
        - core conflict in 2 sentences
        - 3-5 continuity rules (places, recurring motifs, vocabulary)
        - the desired emotional arc across {spec.chapters} chapters
        Keep it under 500 words. No headings beyond bold labels.
    """).strip()
    return provider.generate(system_prompt(spec), prompt, max_tokens=900,
                             temperature=0.7, seed=spec.seed)


def gen_outline(provider: TextProvider, spec: NovelSpec, bible: str) -> list[dict]:
    if isinstance(provider, TemplateProvider):
        return [
            {"order": i, "title": f"Placeholder Chapter {i}",
             "summary": f"Placeholder summary for chapter {i} about {spec.topic}."}
            for i in range(1, spec.chapters + 1)
        ]
    prompt = textwrap.dedent(f"""\
        Using the story bible below, produce a chapter outline as STRICT JSON.
        Output ONLY a JSON array with exactly {spec.chapters} objects, each:
          {{"order": <int starting at 1>, "title": "<short chapter title>",
            "summary": "<2-4 sentence chapter summary>"}}
        Do not include markdown fences or commentary.

        STORY BIBLE:
        {bible}
    """).strip()
    raw = provider.generate(system_prompt(spec), prompt, max_tokens=1800,
                            temperature=0.7, seed=spec.seed)
    return _parse_outline(raw, spec.chapters)


def _parse_outline(raw: str, expected: int) -> list[dict]:
    text = raw.strip()
    # strip code fences if model added them
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.MULTILINE).strip()
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        raise RuntimeError("Outline parse failed: no JSON array found.")
    try:
        data = json.loads(text[start:end + 1])
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Outline parse failed: {e}") from e
    if not isinstance(data, list) or len(data) != expected:
        raise RuntimeError(
            f"Outline parse failed: expected {expected} items, got {len(data)}.")
    cleaned = []
    for i, item in enumerate(data, start=1):
        title = str(item.get("title", "")).strip() or f"Chapter {i}"
        summary = str(item.get("summary", "")).strip()
        cleaned.append({"order": i, "title": title, "summary": summary})
    return cleaned


def gen_chapter(provider: TextProvider, spec: NovelSpec, bible: str,
                outline: list[dict], idx: int,
                rolling_summaries: list[str]) -> str:
    item = outline[idx]
    if isinstance(provider, TemplateProvider):
        return _placeholder_prose(spec, item, kind="chapter")
    prior = "\n".join(
        f"- Ch{j+1}: {s}" for j, s in enumerate(rolling_summaries)) or "(none)"
    prompt = textwrap.dedent(f"""\
        Write Chapter {item['order']} titled "{item['title']}".
        Target ~{spec.words_per_chapter} words (+/- 20%).
        Maintain continuity with prior chapters (summaries below).
        Do not include the chapter number in the body; the title will be
        rendered separately. Begin directly with the opening line.

        PRIOR CHAPTER SUMMARIES:
        {prior}

        CURRENT CHAPTER OUTLINE:
        {item['summary']}

        STORY BIBLE:
        {bible}
    """).strip()
    return provider.generate(system_prompt(spec), prompt,
                             max_tokens=max(2048, spec.words_per_chapter * 2),
                             temperature=0.85, seed=spec.seed)


def gen_epilogue(provider: TextProvider, spec: NovelSpec, bible: str,
                 outline: list[dict], rolling_summaries: list[str],
                 branch_key: str = "") -> tuple[str, str]:
    """Returns (title, body)."""
    label = f" {branch_key}" if branch_key else ""
    if isinstance(provider, TemplateProvider):
        title = f"Epilogue{label} - Placeholder"
        body = _placeholder_prose(
            spec,
            {"order": "E", "title": title,
             "summary": f"Placeholder epilogue branch '{branch_key or 'single'}'."},
            kind="epilogue",
        )
        return title.replace(" - Placeholder", " — Placeholder"), body

    prior = "\n".join(
        f"- Ch{j+1}: {s}" for j, s in enumerate(rolling_summaries)) or "(none)"
    branch_note = (
        f"This is branch {branch_key} of a CHOICE-BASED epilogue set. "
        "Diverge meaningfully from other branches in outcome and tone, "
        "while remaining consistent with the established characters."
        if branch_key else
        "This is a single concluding epilogue."
    )
    prompt = textwrap.dedent(f"""\
        Write an Epilogue for the novel{(' (branch ' + branch_key + ')') if branch_key else ''}.
        {branch_note}
        Target ~{max(800, spec.words_per_chapter // 2)} words.
        Output exactly two parts separated by a single line containing only '---':
        1) A short title line (no 'Epilogue:' prefix).
        2) The epilogue prose body.

        PRIOR CHAPTER SUMMARIES:
        {prior}

        STORY BIBLE:
        {bible}
    """).strip()
    raw = provider.generate(system_prompt(spec), prompt,
                            max_tokens=max(1600, spec.words_per_chapter),
                            temperature=0.9, seed=spec.seed)
    title, body = _split_title_body(raw)
    if branch_key:
        title = f"Epilogue {branch_key} — {title}".strip(" —")
    else:
        title = f"Epilogue — {title}".strip(" —")
    return title, body


def _split_title_body(raw: str) -> tuple[str, str]:
    text = raw.strip()
    if "\n---\n" in text:
        head, _, body = text.partition("\n---\n")
        return head.strip().splitlines()[0].strip(), body.strip()
    # Fallback: first non-empty line is the title.
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if not lines:
        return "Untitled", ""
    return lines[0].strip(), "\n".join(lines[1:]).strip()


def _placeholder_prose(spec: NovelSpec, item: dict, *, kind: str) -> str:
    head = f"# {item['title']}\n\n" if kind == "epilogue" else ""
    para = textwrap.fill(
        f"PLACEHOLDER {kind.upper()} CONTENT for '{spec.title}'. "
        f"Outline: {item.get('summary', '')} "
        f"This text was produced by the deterministic fallback because no "
        f"local model endpoint was reachable. Re-run with a working provider "
        f"to generate real prose.",
        width=88,
    )
    body = "\n\n".join([para] * 3)
    return head + body + "\n"


def gen_cover_prompt(provider: TextProvider, spec: NovelSpec, bible: str) -> str:
    if isinstance(provider, TemplateProvider):
        bits = [spec.title, spec.genre, spec.tone, spec.setting, spec.topic]
        return ", ".join(b for b in bits if b)
    prompt = textwrap.dedent(f"""\
        Produce a single-line image generation prompt for the novel cover.
        Describe composition, lighting, palette, mood, and key visual motifs.
        Avoid character names. No quotes, no preamble. <= 60 words.

        STORY BIBLE:
        {bible}
    """).strip()
    return provider.generate(system_prompt(spec), prompt, max_tokens=200,
                             temperature=0.7, seed=spec.seed).splitlines()[0].strip()


def try_generate_cover(prompt: str, slug: str, image_endpoint: str,
                       stage_dir: Path) -> CoverArtifact:
    if not image_endpoint:
        return CoverArtifact(prompt=prompt, relative_path="", generated=False)
    try:
        payload = {
            "prompt": prompt,
            "steps": 28,
            "width": 768,
            "height": 1024,
            "sampler_name": "DPM++ 2M",
        }
        req = urllib.request.Request(
            f"{image_endpoint.rstrip('/')}/sdapi/v1/txt2img",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=600) as resp:
            body = json.loads(resp.read().decode("utf-8"))
        import base64
        b64 = body["images"][0]
        out = stage_dir / f"{slug}-cover.png"
        out.write_bytes(base64.b64decode(b64.split(",", 1)[-1]))
        return CoverArtifact(
            prompt=prompt,
            relative_path=f"images/{slug}-cover.png",
            generated=True,
        )
    except Exception as e:
        warn(f"Image generation failed, recording prompt only: {e}")
        return CoverArtifact(prompt=prompt, relative_path="", generated=False)


def summarize_chapter(provider: TextProvider, spec: NovelSpec, body: str) -> str:
    if isinstance(provider, TemplateProvider):
        first = body.strip().splitlines()[:1]
        return (first[0] if first else "")[:240]
    prompt = ("Summarize the following chapter in 2 sentences for use as "
              "continuity context.\n\nCHAPTER:\n" + body[:6000])
    try:
        return provider.generate(system_prompt(spec), prompt,
                                 max_tokens=200, temperature=0.3,
                                 seed=spec.seed).strip()
    except Exception as e:
        warn(f"Chapter summary failed, using truncated body: {e}")
        return body[:240]


# --------------------------------------------------------------------------- #
# Front-matter writers
# --------------------------------------------------------------------------- #

def chapter_front_matter(spec: NovelSpec, draft: ChapterDraft) -> str:
    return (
        "---\n"
        "layout: chapter\n"
        "collection: chapters\n"
        f"novel: {spec.slug}\n"
        f"order: {draft.order}\n"
        f"Title: {_yaml_inline(draft.title)}\n"
        "---\n\n"
    )


def novel_index_md(spec: NovelSpec) -> str:
    blurb = spec.blurb.strip() or f"Auto-generated novel about {spec.topic}."
    fm = [
        "---",
        "layout: novel",
        f"Title: {_yaml_inline(spec.title)}",
        f"novel: {spec.slug}",
        f"status: {spec.status}",
        "blurb: >-",
        f"  {blurb}",
    ]
    if spec.genre:
        fm += ["genre: >-", f"  {spec.genre}"]
    if spec.tone:
        fm += ["tone: >-", f"  {spec.tone}"]
    if spec.setting:
        fm += ["setting: >-", f"  {spec.setting}"]
    fm += ["order: 0", "---", ""]
    body = textwrap.dedent("""\
        <ul>
        {% assign pathprefix = '/novel/' | append: page.novel | append: '/' %}
        {% assign items = site.pages
          | where_exp: 'p', 'p.url contains pathprefix'
          | where_exp: 'p', 'p.name != "index.md"'
          | sort: 'order' %}
        {% for ch in items %}
          <li><a href="{{ ch.url | relative_url }}">Chapter {{ ch.order }} — {{ ch.Title | default: ch.title }}</a></li>
        {% endfor %}
        </ul>
    """)
    return "\n".join(fm) + body


def _yaml_inline(s: str) -> str:
    s = s.replace("\n", " ").strip()
    if any(ch in s for ch in [":", "#", "'", '"', "[", "]", "{", "}", ",", "&", "*", "!", "|", ">", "%", "@", "`"]):
        escaped = s.replace('"', '\\"')
        return f'"{escaped}"'
    return s


# --------------------------------------------------------------------------- #
# Pipeline driver
# --------------------------------------------------------------------------- #

def run_generation(spec: NovelSpec, provider: TextProvider, stage_dir: Path,
                   image_endpoint: str) -> DraftManifest:
    notes: list[str] = []
    if isinstance(provider, TemplateProvider):
        notes.append(
            "Generated with deterministic TEMPLATE fallback. Re-run with a "
            "reachable Ollama endpoint or set NOVELGEN_OLLAMA / NOVELGEN_MODEL "
            "to produce real prose.")

    log(f"provider: {provider.name}")
    log("stage 1/5: story bible")
    bible = gen_bible(provider, spec)

    log(f"stage 2/5: outline ({spec.chapters} chapters)")
    outline = gen_outline(provider, spec, bible)

    chapters: list[ChapterDraft] = []
    rolling: list[str] = []

    log(f"stage 3/5: chapter drafts (~{spec.words_per_chapter} words each)")
    for i in range(spec.chapters):
        order = i + 1
        log(f"  - chapter {order}/{spec.chapters}: {outline[i]['title']}")
        body = gen_chapter(provider, spec, bible, outline, i, rolling)
        chapters.append(ChapterDraft(
            order=order,
            filename=f"Chapter{order}.md",
            title=outline[i]["title"],
            body=body,
        ))
        rolling.append(summarize_chapter(provider, spec, body))

    log(f"stage 4/5: epilogue ({spec.epilogue})")
    if spec.epilogue == "single":
        order = spec.chapters + 1
        title, body = gen_epilogue(provider, spec, bible, outline, rolling)
        chapters.append(ChapterDraft(
            order=order, filename="Epilogue.md",
            title=title, body=body, is_epilogue=True,
        ))
    elif spec.epilogue == "branching":
        for k in range(spec.branches):
            key = chr(ord("A") + k)
            order = spec.chapters + 1 + k
            log(f"  - epilogue branch {key}")
            title, body = gen_epilogue(
                provider, spec, bible, outline, rolling, branch_key=key)
            chapters.append(ChapterDraft(
                order=order, filename=f"Epilogue{key}.md",
                title=title, body=body, is_epilogue=True, branch_key=key,
            ))

    log("stage 5/5: cover")
    cover_prompt = gen_cover_prompt(provider, spec, bible)
    cover = try_generate_cover(cover_prompt, spec.slug, image_endpoint, stage_dir)

    manifest = DraftManifest(
        schema_version=SCHEMA_VERSION,
        slug=spec.slug,
        spec=asdict(spec),
        provider=provider.name,
        bible=bible,
        outline=outline,
        chapters=[asdict(c) for c in chapters],
        cover=asdict(cover),
        created_at=time.time(),
        notes=notes,
    )
    _write_stage(stage_dir, manifest, chapters)
    return manifest


def _write_stage(stage_dir: Path, manifest: DraftManifest,
                 chapters: list[ChapterDraft]) -> None:
    stage_dir.mkdir(parents=True, exist_ok=True)
    (stage_dir / MANIFEST_NAME).write_text(
        json.dumps(asdict(manifest), indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    (stage_dir / "story-bible.md").write_text(
        f"# Story bible — {manifest.slug}\n\n{manifest.bible}\n",
        encoding="utf-8",
    )
    (stage_dir / "outline.md").write_text(
        "# Outline\n\n" + "\n".join(
            f"## Chapter {o['order']}: {o['title']}\n\n{o['summary']}\n"
            for o in manifest.outline
        ),
        encoding="utf-8",
    )
    for c in chapters:
        (stage_dir / c.filename).write_text(
            f"<!-- preview: {c.filename} order={c.order} -->\n"
            f"# {c.title}\n\n{c.body.strip()}\n",
            encoding="utf-8",
        )


# --------------------------------------------------------------------------- #
# Commit flow
# --------------------------------------------------------------------------- #

def load_manifest(stage_dir: Path) -> DraftManifest:
    path = stage_dir / MANIFEST_NAME
    if not path.exists():
        fail(f"No draft manifest found at {path}. Run 'draft' first.")
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema_version") != SCHEMA_VERSION:
        fail(f"Unsupported manifest schema_version={data.get('schema_version')}.")
    return DraftManifest(**data)


def commit_draft(manifest: DraftManifest, *, force: bool, run_post: bool,
                 update_relationships: bool) -> None:
    spec = NovelSpec(**manifest.spec)
    target = NOVEL_ROOT / spec.slug
    if target.exists() and not force:
        fail(f"Target {target} already exists. Re-run with --force to overwrite.")
    target.mkdir(parents=True, exist_ok=True)

    # Write novel index.
    (target / "index.md").write_text(novel_index_md(spec), encoding="utf-8")
    log(f"wrote {target / 'index.md'}")

    # Write chapter / epilogue files.
    for c in manifest.chapters:
        draft = ChapterDraft(**c)
        fm = chapter_front_matter(spec, draft)
        body = draft.body.strip() + "\n"
        (target / draft.filename).write_text(fm + body, encoding="utf-8")
        log(f"wrote {target / draft.filename}")

    # Cover handling.
    cover = manifest.cover or {}
    rel = cover.get("relative_path") or ""
    if rel:
        src_candidates = [
            STAGE_ROOT / spec.slug / Path(rel).name,
            REPO_ROOT / rel,
        ]
        src = next((p for p in src_candidates if p.exists()), None)
        if src:
            IMAGES_ROOT.mkdir(parents=True, exist_ok=True)
            dst = IMAGES_ROOT / Path(rel).name
            if src.resolve() != dst.resolve():
                shutil.copy2(src, dst)
            log(f"cover -> {dst.relative_to(REPO_ROOT)}")
        else:
            warn(f"cover file not found for relative_path={rel}")
    elif cover.get("prompt"):
        log("cover prompt recorded in manifest; no image generated.")

    # Relationships.
    if update_relationships and (spec.series_id or spec.related_to):
        _merge_relationships(spec)

    # Post-process: normalize front matter and refresh indexes.
    if run_post:
        _run_python(ADD_FRONT_MATTER, str(target), "--novel", spec.slug,
                    "--resequence")
        if FIX_FRONT_MATTER.exists():
            _run_python(FIX_FRONT_MATTER, str(target), "--novel", spec.slug,
                        "--resequence")
        _run_python(GENERATE_INDEXES)


def _merge_relationships(spec: NovelSpec) -> None:
    data: dict = {}
    if RELATIONSHIPS_JSON.exists():
        try:
            data = json.loads(RELATIONSHIPS_JSON.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            warn("novel_relationships.json is not valid JSON; skipping merge.")
            return
    entry: dict = {}
    if spec.series_id:
        entry["series_id"] = spec.series_id
    if spec.series_label:
        entry["series_label"] = spec.series_label
    if spec.relation_type:
        entry["relation_type"] = spec.relation_type
    if spec.related_to:
        entry["related_to"] = spec.related_to
    if spec.reading_order is not None:
        entry["reading_order"] = spec.reading_order
    if not entry:
        return
    data[spec.slug] = {**data.get(spec.slug, {}), **entry}
    RELATIONSHIPS_JSON.write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    log(f"updated relationships for {spec.slug}")


def _run_python(script: Path, *args: str) -> None:
    if not script.exists():
        warn(f"missing helper script: {script}")
        return
    log(f"$ python {script.name} {' '.join(args)}")
    res = subprocess.run(
        [sys.executable, str(script), *args],
        cwd=str(REPO_ROOT),
    )
    if res.returncode != 0:
        warn(f"{script.name} exited with code {res.returncode}")


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def _add_spec_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--slug", required=True, help="URL-safe novel slug.")
    p.add_argument("--title", default="", help="Display title (defaults to slug).")
    p.add_argument("--topic", default="", help="Core premise/topic.")
    p.add_argument("--setting", default="")
    p.add_argument("--genre", default="")
    p.add_argument("--tone", default="")
    p.add_argument("--blurb", default="")
    p.add_argument("--status", default="Incomplete")
    p.add_argument("--chapters", type=int, default=10)
    p.add_argument("--words-per-chapter", type=int, default=1500)
    p.add_argument("--epilogue", choices=EPILOGUE_MODES, default="none")
    p.add_argument("--branches", type=int, default=0,
                   help="Branch count for --epilogue=branching (2..6).")
    p.add_argument("--series-id", default="")
    p.add_argument("--series-label", default="")
    p.add_argument("--relation-type", default="")
    p.add_argument("--related-to", default="")
    p.add_argument("--reading-order", type=int, default=None)
    p.add_argument("--seed", type=int, default=None)


def _spec_from_args(a: argparse.Namespace) -> NovelSpec:
    title = a.title.strip() or pretty_title(a.slug)
    spec = NovelSpec(
        slug=a.slug.strip(),
        title=title,
        topic=a.topic.strip(),
        setting=a.setting.strip(),
        genre=a.genre.strip(),
        tone=a.tone.strip(),
        blurb=a.blurb.strip(),
        status=a.status.strip() or "Incomplete",
        chapters=a.chapters,
        words_per_chapter=a.words_per_chapter,
        epilogue=a.epilogue,
        branches=a.branches,
        series_id=a.series_id.strip(),
        series_label=a.series_label.strip(),
        relation_type=a.relation_type.strip(),
        related_to=a.related_to.strip(),
        reading_order=a.reading_order,
        seed=a.seed,
    )
    spec.validate()
    return spec


def _planned_filenames(spec: NovelSpec) -> list[str]:
    names = [f"Chapter{i}.md" for i in range(1, spec.chapters + 1)]
    if spec.epilogue == "single":
        names.append("Epilogue.md")
    elif spec.epilogue == "branching":
        names.extend(f"Epilogue{chr(ord('A') + i)}.md" for i in range(spec.branches))
    return names


def _select_provider(args: argparse.Namespace) -> TextProvider:
    if args.provider == "template":
        return TemplateProvider()
    ollama = OllamaProvider(args.ollama_endpoint, args.model)
    if ollama.available():
        return ollama
    if args.require_provider:
        fail(f"Ollama endpoint {args.ollama_endpoint} not reachable and "
             "--require-provider was set.")
    warn(f"Ollama endpoint {args.ollama_endpoint} not reachable; "
         "falling back to deterministic template provider.")
    return TemplateProvider()


def cmd_draft(args: argparse.Namespace) -> int:
    spec = _spec_from_args(args)
    stage_dir = STAGE_ROOT / spec.slug
    if stage_dir.exists():
        if not args.force:
            fail(f"Stage dir {stage_dir} exists. Re-run with --force to overwrite.")
        shutil.rmtree(stage_dir)
    provider = _select_provider(args)
    manifest = run_generation(spec, provider, stage_dir, args.image_endpoint)
    log(f"draft staged at {stage_dir.relative_to(REPO_ROOT)}")
    log(f"  manifest: {(stage_dir / MANIFEST_NAME).relative_to(REPO_ROOT)}")
    log(f"  files:    {len(manifest.chapters)} chapter/epilogue previews")
    if manifest.notes:
        for n in manifest.notes:
            warn(n)
    log("review the previews, then run: "
        f"python tools/generate_novel.py commit --slug {spec.slug} --yes")
    return 0


def cmd_commit(args: argparse.Namespace) -> int:
    validate_slug(args.slug)
    stage_dir = STAGE_ROOT / args.slug
    manifest = load_manifest(stage_dir)
    if not args.yes:
        fail("Commit requires --yes to confirm writing into novel/<slug>/.")
    commit_draft(
        manifest,
        force=args.force,
        run_post=not args.skip_post,
        update_relationships=not args.skip_relationships,
    )
    log("commit complete.")
    return 0


def cmd_dry_run(args: argparse.Namespace) -> int:
    spec = _spec_from_args(args)
    log(f"slug:   {spec.slug}")
    log(f"title:  {spec.title}")
    log(f"epilogue mode: {spec.epilogue}"
        + (f" (branches={spec.branches})" if spec.epilogue == 'branching' else ""))
    log(f"chapter count: {spec.chapters} @ ~{spec.words_per_chapter} words")
    log("planned files:")
    for n in _planned_filenames(spec):
        print(f"  novel/{spec.slug}/{n}")
    print(f"  novel/{spec.slug}/index.md")
    print(f"  images/{spec.slug}-cover.<ext>  (if cover generation succeeds)")
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="generate_novel.py",
        description="Local CLI novel auto-generator (draft-first).",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    common_provider = argparse.ArgumentParser(add_help=False)
    common_provider.add_argument(
        "--provider", choices=("auto", "ollama", "template"), default="auto",
        help="Text provider. 'auto' tries ollama then falls back to template.")
    common_provider.add_argument(
        "--ollama-endpoint", default=DEFAULT_OLLAMA_ENDPOINT,
        help="Ollama HTTP endpoint (default: %(default)s).")
    common_provider.add_argument(
        "--model", default=DEFAULT_OLLAMA_MODEL,
        help="Ollama model name (default: %(default)s).")
    common_provider.add_argument(
        "--image-endpoint", default="",
        help="Optional Automatic1111-compatible URL for cover generation.")
    common_provider.add_argument(
        "--require-provider", action="store_true",
        help="Fail instead of falling back to the template provider.")

    pd = sub.add_parser("draft", parents=[common_provider],
                        help="Generate into temp_logs/build/novel-gen/<slug>/.")
    _add_spec_args(pd)
    pd.add_argument("--force", action="store_true",
                    help="Overwrite an existing stage directory.")
    pd.set_defaults(func=cmd_draft)

    pc = sub.add_parser("commit",
                        help="Promote a staged draft into novel/<slug>/.")
    pc.add_argument("--slug", required=True)
    pc.add_argument("--yes", action="store_true",
                    help="Confirm writing files under novel/<slug>/.")
    pc.add_argument("--force", action="store_true",
                    help="Overwrite existing novel/<slug>/ contents.")
    pc.add_argument("--skip-post", action="store_true",
                    help="Skip running fix_front_matter and generate_indexes.")
    pc.add_argument("--skip-relationships", action="store_true",
                    help="Do not merge series metadata into novel_relationships.json.")
    pc.set_defaults(func=cmd_commit)

    pr = sub.add_parser("dry-run", help="Validate inputs and preview file plan.")
    _add_spec_args(pr)
    pr.set_defaults(func=cmd_dry_run)

    return p


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
