# Aleem Siddique’s portfolio

Personal engineering portfolio, fiction library and browser experiments, published through GitHub Pages. The current `revamp/aleem-facets` comparison adds a Higgsfield-authored fractured specimen and an interactive 3D novel archive. See [changes.md](changes.md) for design decisions, provenance and review evidence.

The `revamp/cinematic-dark` branch adds a cinematic dark portfolio in [`showcase/`](showcase/README.md): a three-world 3D journey, native scroll chapters, six on-page project stories, twelve project identities, popout details, AMD experience and fiction. The earlier light fieldbook is preserved at commit `7f497cf4` in its own worktree. The original root `index.html` remains available for comparison. The existing novel reader and standalone pages are assembled alongside the new homepage.

## Run the portfolio

This branch starts from the latest remote main and integrates the approved novel library and authoring studio before adding the shared 3D direction. It uses **4176** for the combined portfolio and archive. Earlier designs remain in their existing branches and worktrees.

Use **Node.js 24**. Run these commands from the repository root:

```powershell
npm --prefix web ci
npm --prefix showcase ci
npm --prefix web run build
npm --prefix showcase run build
npm --prefix showcase run assemble
npm --prefix showcase run preview:facets
```

Open **http://127.0.0.1:4176/** for the portfolio and **http://127.0.0.1:4176/novel/** for the 3D collection and reader. The feature branch produces a review artifact; only `main` publishes to GitHub Pages.

For portfolio development alone, run `npm --prefix showcase run dev`. Astro’s development server does not include the root reader or cover assets; use the combined preview to verify writing links, covers and preserved pages. See the [showcase guide](showcase/README.md) for browser checks and implementation details.

## Repository structure

| Location | Purpose |
| --- | --- |
| `showcase/` | Astro portfolio, isolated React/Three.js interactions, case studies and new media |
| `web/` | Next.js static-export novel library and chapter reader |
| `novel/` | Markdown stories, chapter metadata and legacy indexes |
| `index.html` | Original portfolio homepage, retained for comparison |
| `images/`, `img/`, `assets/`, `css/`, `js/` | Existing covers, photographs and static-page resources |
| `tools/` | Novel authoring, metadata and image utilities |
| `.github/workflows/` | Build, comparison artifacts and deployment automation |

The build combines the existing 875-page reader export with the new portfolio. The Astro homepage overlays the reader’s root entrypoint; the `/novel/` routes, reading settings, bookmarks and alternate endings remain available.

## Deployment and comparison

The workflow builds `main`, `revamp/**` branches and pull requests targeting `main`. Comparison builds upload a **`portfolio-comparison`** artifact containing `showcase/site-dist/`. Only `main` uploads and deploys a GitHub Pages artifact. Working on the revamp branch does not automatically publish the redesign live.

Asset sources, generation prompts and estimated provider costs are documented in [`showcase/ASSETS.md`](showcase/ASSETS.md). The current paid media estimate is **about US$0.83**, within the **SGD$28 Gemini cap** and **US$30 combined asset cap**. Credentials are used only during offline generation and are absent from the website.

## Novel workflow

Use the wizard to create or append chapters and keep the novel index up to date:

1. Run `python tools/novel_wizard.py` from this novels worktree, or double-click `tools/launch_novel_wizard.cmd`. The rebuilt Literary Studio includes book/chapter/artwork workspaces, draft recovery, current-page checks and background preview builds. See the [tool guide](tools/README.md).
2. Fill in the novel details and chapters, then select **Create / Append**.
3. The wizard also runs the optimizer to update `novel/index.html` and image variants.
4. Rebuild `web/` and assemble the site to preview the updated reader.

The wizard supports novel creation and chapter appending, automatic slugs and ordering, formatted HTML/RTF paste, DOCX import, and chapter navigation. Its legacy index output remains useful to the content workflow; the deployed reader is generated from the Markdown content by `web/`.

### Image optimization

The optimizer updates legacy cover markup with responsive image sources and generates 320/640/960 JPG and WebP variants:

```powershell
pip install pillow beautifulsoup4
python3 tools/optimize_and_update_index.py
```

### Useful authoring scripts

- `tools/novel_wizard.py`: primary authoring tool.
- `tools/optimize_and_update_index.py`: cover optimization and legacy-index updates.
- `tools/optimize_images.py`: legacy image optimizer.
- `tools/generate_indexes.py`: index helpers.
- `tools/add_front_matter.py`, `tools/fix_front_matter.py`: metadata maintenance.

## Contact

[LinkedIn](https://www.linkedin.com/in/a1e3m/) · [GitHub](https://github.com/SeaBoiii) · [Email](mailto:seaboiiigamer@gmail.com)

## Acknowledgments

Billy’s original website template remains the starting point for the legacy homepage. The redesigned portfolio uses the project’s existing photographs, screenshots and writing alongside newly authored 3D and documented generated media.
