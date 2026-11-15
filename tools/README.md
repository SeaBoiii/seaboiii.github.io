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

## 2) novel_wizard.py (Literary Studio)

Novel Wizard now matches the dark literary library and the current Next.js book and reader pages. It remains a local desktop app; stories stay in the existing Markdown files.

### Start

From the **novels worktree** (`seaboiii.github.io-novels`, branch `revamp/novels-library`):

```powershell
python tools/novel_wizard.py
```

You can also double-click `tools/launch_novel_wizard.cmd`. The tool resolves its repository from its own script path. The original comparison worktrees keep their earlier authoring tool.

### Workspaces

- **Book:** searchable library, title, synopsis, status, catalogue genres/moods/settings, series and reading order. The overview derives word counts and reading time at 220 words per minute.
- **Chapters:** searchable contents, Markdown editing, formatted paste and DOCX/Markdown import, a selectable plain-text reading preview, four appearance themes, and writing focus. Actual A/B ending filenames and sequential Roman epilogues retain their identities.
- **Artwork:** existing cover previews, replacement cover upload, illustration gallery and scene notes. New uploads become canonical PNG originals with the 320/640/960px WebP variants required by the current pages. Only this book's assets are prepared.
- **Review:** checks the current draft against the page metadata, routes, images, chapter order and relationships. Errors block saving. Optional commit summary and description live here, alongside the preview address and build action.

Use comma-separated discovery terms that readers understand. The current library displays all Markdown books. Hidden-card and audio settings are retained for the legacy pages and are clearly labeled; the current reader has no audio player. Reader font preferences and reading progress remain on each reader's device.

### Drafts, saves and Git

Edits recover automatically in the ignored `tools/novel_wizard_state.db`; JSON remains the fallback when SQLite is unavailable. Recovery copies survive book switches, app restarts and temporary reductions in the new chapter count. They do not update public story files. “Discard recovered draft” reloads the saved source after confirmation. Saving one editing mode retains unsaved work in the other mode.

**Save files** writes the reviewed book without committing. **Save & commit** writes the files and creates a local commit containing only this save's changed paths, preserving unrelated staged work. Both keep the app open. No push or website publication occurs automatically.

File saves preflight inputs and roll back manuscript, media, relationships and compatibility-index changes if a write fails. Existing epilogue paths, unknown YAML fields, shelf order and novel index body are preserved. A chapter changed in another editor since it was loaded blocks saving; keep the recovery copy and reload before reconciling the two versions.

Name replacement works on saved files. Save pending edits first; after replacement, the editor reloads the resulting manuscript.

Shortcuts: **Ctrl+S** saves files, **Ctrl+Shift+S** saves and commits, and **Ctrl+F** focuses library search. Use Tab for controls and Ctrl+Page Up / Ctrl+Page Down for chapter navigation.

### Public-page preview

The inline reading preview is a plain-text composition aid; final Markdown formatting belongs to the actual browser reader. “Open saved book page” and “Open saved chapter” preserve the public URLs, including literal epilogue filenames.

The default browser preview address is **http://127.0.0.1:4175**. Save first, then use **Build saved preview** to export the current Next.js pages and assemble them with the cinematic portfolio. The build runs in the background and shows its output. It can start the local combined preview when needed; a matching preview from this worktree is reused. Other comparisons and servers are left alone. If a port belongs to another worktree or an older server cannot identify itself, choose an unused local port.

Node.js 24 and the installed `web/` and `showcase/` dependencies are needed for preview builds. On a fresh checkout:

```powershell
npm --prefix web ci
npm --prefix showcase ci
```

### Optional import libraries

Use **Import setup** to check available libraries and install missing ones explicitly. The app no longer interrupts startup with dependency prompts. Optional packages:

```powershell
python -m pip install markdownify mammoth striprtf beautifulsoup4 pillow wordfreq
```

`beautifulsoup4` is required to maintain the compatibility index's shelf order during save; `pillow` is required for new image uploads and responsive variants. DOCX conversion uses `mammoth`. The other libraries improve formatted paste and name extraction.

### Verification

The isolated tests use temporary repositories and in-memory draft state. They do not edit the live novels, artwork, or saved preferences:

```powershell
python -m unittest discover -s tools/tests -p "test_novel*"
node web/qa/content-audit.mjs
```

Real Tk UI tests require a desktop session and use a transparent window outside the screen. The Windows visual capture helper is `tools/tests/capture_novel_wizard.py`; it writes ignored images to `tools/qa-artifacts/`.

Verified on 7 October 2026: 81 Python tests passed, including 16 real Tk interaction tests. The actual background preview action rebuilt all 875 exported pages and assembled the combined site. The 889-check content audit passed, and no live manuscript or artwork files were changed during verification.

## 3) Which tool should I use?

Use `generate_novel.py` when you want fast AI-assisted draft generation with review before writing files.

Use `novel_wizard.py` when you want hands-on manual control, rich editing/import actions, and GUI-driven metadata management.

Many authors combine both:

1. Generate draft with `generate_novel.py draft`.
2. Commit generated files with `generate_novel.py commit --yes`.
3. Fine-tune in `novel_wizard.py`.
