# Tools Guide

This folder contains two primary authoring workflows:

- `generate_novel.py`: CLI-first, draft/commit flow for auto-generating a novel package.
- `novel_wizard.py`: desktop GUI (Tkinter) for creating and editing novels manually.

Run all commands from the repository root.

## 1) generate_novel.py (CLI Auto-Generation)

### What it does

- Generates a novel draft package from your inputs (topic, setting, tone, chapter count, target words).
- Supports epilogue modes:
  - `none`
  - `single`
  - `branching` (A/B/C...)
- Creates review artifacts under `temp_logs/build/novel-gen/<slug>/`.
- Promotes approved drafts to `novel/<slug>/` on explicit commit.

### Subcommands

#### A. `dry-run`
Validate inputs and preview planned files.

```powershell
python tools/generate_novel.py dry-run \
  --slug ember-of-rain \
  --title "Ember of Rain" \
  --topic "two estranged friends restoring a bookshop" \
  --chapters 8 \
  --words-per-chapter 1500 \
  --epilogue branching \
  --branches 2
```

#### B. `draft`
Generate draft content to staging only (safe review mode).

```powershell
python tools/generate_novel.py draft \
  --slug ember-of-rain \
  --title "Ember of Rain" \
  --topic "two estranged friends restoring a bookshop" \
  --setting "rainy coastal town, modern day" \
  --genre "slow-burn romance" \
  --tone "tender, restrained" \
  --chapters 8 \
  --words-per-chapter 1500 \
  --epilogue branching \
  --branches 2
```

Review outputs in:

- `temp_logs/build/novel-gen/<slug>/manifest.json`
- `temp_logs/build/novel-gen/<slug>/Chapter*.md`
- `temp_logs/build/novel-gen/<slug>/Epilogue*.md` (if selected)

#### C. `commit`
Write staged draft into `novel/<slug>/`.

```powershell
python tools/generate_novel.py commit --slug ember-of-rain --yes
```

### Provider behavior (local-first)

- Default provider mode: `auto`.
- Tries local Ollama endpoint first (`http://localhost:11434` by default).
- Falls back to deterministic template text if endpoint is unavailable (good for testing workflow).

You can set environment variables:

```powershell
$env:NOVELGEN_OLLAMA = "http://localhost:11434"
$env:NOVELGEN_MODEL = "llama3.1"
```

Or pass explicit flags:

```powershell
python tools/generate_novel.py draft ... --provider ollama --ollama-endpoint http://localhost:11434 --model llama3.1
```

If you want the command to fail instead of fallback:

```powershell
python tools/generate_novel.py draft ... --require-provider
```

### Cover image generation

- Optional image generation is available via `--image-endpoint` using an Automatic1111-compatible API (`/sdapi/v1/txt2img`).
- If image generation is unavailable, a cover prompt is still saved in the draft manifest.

Example:

```powershell
python tools/generate_novel.py draft ... --image-endpoint http://127.0.0.1:7860
```

### Important guardrails

- Slug must be lowercase letters, digits, hyphens only.
- `branching` epilogue requires `--branches 2..6`.
- `commit` requires `--yes`.
- Existing stage folders require `--force` for overwrite in `draft` mode.

## 2) novel_wizard.py (GUI Authoring + Editing)

### What it does

- Opens a desktop GUI for novel operations:
  - Create new novel and chapters
  - Edit existing novel metadata and relationships
  - Import chapter content (Markdown/DOCX/formatted paste)
  - Replace/upload cover assets
  - Optional built-in git commit step (manual push still required)

### Start the wizard

```powershell
python tools/novel_wizard.py
```

If the command reports missing repo structure, make sure your working directory is the project root (the folder containing `novel/`).

### Optional Python packages for richer features

The wizard runs without these, but some features improve when installed:

- `markdownify`
- `mammoth`
- `striprtf`
- `beautifulsoup4`
- `pillow`
- `wordfreq`

Install all optional packages:

```powershell
python -m pip install markdownify mammoth striprtf beautifulsoup4 pillow wordfreq
```

### Typical wizard workflow

1. Launch wizard.
2. Choose create or edit mode.
3. Fill metadata (title, blurb, status, genre, tone, setting).
4. Add/import chapter content.
5. Configure relationships/series as needed.
6. Save and optionally run wizard commit.
7. Push manually:

```powershell
git push
```

## 3) Which tool should I use?

Use `generate_novel.py` when you want fast AI-assisted draft generation with review before writing files.

Use `novel_wizard.py` when you want hands-on manual control, rich editing/import actions, and GUI-driven metadata management.

Many authors combine both:

1. Generate draft with `generate_novel.py draft`.
2. Commit generated files with `generate_novel.py commit --yes`.
3. Fine-tune in `novel_wizard.py`.
