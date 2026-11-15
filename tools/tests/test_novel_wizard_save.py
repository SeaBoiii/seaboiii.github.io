"""Headless, temporary-repository checks for the desktop author's save boundary."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

MODULE_PATH = Path(__file__).resolve().parents[1] / "novel_wizard.py"
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("novel_wizard_save_under_test", MODULE_PATH)
wizard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wizard)


class Value:
    def __init__(self, value=""):
        self.value = value

    def get(self, *_):
        return self.value

    def set(self, value):
        self.value = value


class SaveFixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="novel-wizard-save-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.novels = self.root / "novel"
        self.images = self.root / "images"
        self.audio = self.root / "assets" / "audio"
        self.novels.mkdir()
        self.images.mkdir()
        self.slug = "test-story"
        self.folder = self.novels / self.slug
        self.folder.mkdir()
        self.registry = self.root / "tools" / "novel_relationships.json"
        self.registry.parent.mkdir()
        self.registry.write_text(json.dumps({"other-story": {"series_label": "Other", "future": {"keep": True}}}), encoding="utf-8")
        self.index = self.novels / "index.html"
        self.index.write_text('''<html><body><ul class="novel-grid" id="novelGrid">
          <li class="novel-card" data-status="incomplete"><a href="/novel/test-story/">
          <img src="/images/test-story-cover.png"/><h2 class="novel-title">Old Title</h2>
          <div class="novel-meta"></div></a></li></ul></body></html>''', encoding="utf-8")
        self.index_md = self.folder / "index.md"
        self.index_md.write_text('''---
layout: novel
Title: Old Title
novel: test-story
status: Incomplete
blurb: >-
  Original synopsis.
cover: /images/test-story-cover.png
order: 42
custom_metadata:
  audience: adults
  checklist:
    - first
    - second
---

Author-owned custom index body.\x20\x20
''', encoding="utf-8")
        self.chapter = self.folder / "Chapter1.md"
        self.chapter.write_text('''---
layout: chapter
Title: Beginning
novel: test-story
order: 1
custom_chapter:
  note: preserve this
---

# Beginning

The story begins.\x20\x20
''', encoding="utf-8")
        self.ending = self.folder / "EpilogueA.md"
        self.ending.write_text('''---
layout: chapter
Title: Epilogue A — At home
novel: test-story
order: 2
---

The ending stays here.
''', encoding="utf-8")
        if wizard._PILImage:
            wizard._PILImage.new("RGB", (640, 960), "#61567a").save(self.images / f"{self.slug}-cover.png")
        constants = dict(REPO_ROOT=self.root, NOVEL_DIR=self.novels, IMAGES_DIR=self.images,
                         AUDIO_DIR=self.audio, NOVELS_INDEX_HTML=self.index,
                         RELATIONSHIPS_JSON=self.registry)
        self.constants = patch.multiple(wizard, **constants)
        self.constants.start()
        self.addCleanup(self.constants.stop)
        self.messages = []
        for name in ("showerror", "showinfo", "showwarning"):
            mock = patch.object(wizard.messagebox, name, side_effect=lambda *args, kind=name, **kw: self.messages.append((kind, args)))
            mock.start()
            self.addCleanup(mock.stop)

    def files(self):
        return {str(p.relative_to(self.root)): p.read_bytes() for p in self.root.rglob("*") if p.is_file() and ".git" not in p.parts}

    def record(self, path=None, order=1, title="Beginning", body="The story has changed."):
        return {"order": order, "source_path": path, "title_var": Value(title), "text": Value(body),
                "music_mode_var": Value("None"), "music_source_var": Value(), "music_title_var": Value()}

    def app(self, records=None, create=False):
        events = []
        app = SimpleNamespace(
            mode_var=Value(wizard.MODE_CREATE if create else wizard.MODE_EDIT),
            title_var=Value("Updated: A Story #1"), slug_var=Value(self.slug), existing_slug_var=Value(self.slug),
            status_var=Value("Incomplete"), blurb_var=Value("Updated synopsis."), genre_var=Value("Fantasy"),
            tone_var=Value("Hopeful"), setting_var=Value("Singapore"), cover_var=Value(), hidden_var=Value(False),
            shared_music_source_var=Value(), shared_music_title_var=Value(), gallery_items=[],
            commit_summary_var=Value(), edit_submode_var=Value(wizard.EDIT_SUBMODE_EDIT),
            chapter_tabs=records if records is not None else [self.record(self.chapter)],
            _get_commit_description=lambda: "", _is_edit_chapter_mode=lambda: not create,
            _build_relationship_entry_from_form=lambda slug: (None, None),
            studio=SimpleNamespace(mark_saved=lambda: events.append("mark_saved")),
            _refresh_catalog=lambda: None, _on_existing_selected=lambda: events.append("reload"),
            _on_mode_change=lambda: events.append("mode_change"), _refresh_selected_cover_preview=lambda: None,
            _refresh_upload_cover_preview=lambda: None, _refresh_chapter_music_widgets=lambda: None,
            _refresh_related_cover_preview=lambda: None,
        )
        app._stage_and_commit = lambda paths, summary, description: wizard.Wizard._stage_and_commit(app, paths, summary, description)
        app.events = events
        return app

    def save(self, app, commit=False):
        return wizard.Wizard._commit(app, commit_to_git=commit)

    @unittest.skipUnless(wizard._PILImage and wizard._BeautifulSoup, "pillow and beautifulsoup4 are required")
    def test_save_files_without_git_preserves_epilogue_filename(self):
        app = self.app([self.record(self.ending, 2, "Epilogue A — Tomorrow", "A revised ending.")])
        self.assertTrue(self.save(app))
        self.assertFalse((self.folder / "Chapter2.md").exists())
        self.assertIn("A revised ending.", self.ending.read_text(encoding="utf-8"))
        self.assertEqual(app.events[:2], ["mark_saved", "reload"])

    @unittest.skipUnless(wizard._PILImage and wizard._BeautifulSoup, "pillow and beautifulsoup4 are required")
    def test_metadata_preserves_unknown_yaml_order_body_and_updated_title(self):
        old_body = wizard._split_front_matter_and_body(self.index_md.read_text(encoding="utf-8"))[1]
        self.assertTrue(self.save(self.app()))
        text = self.index_md.read_text(encoding="utf-8")
        self.assertIn("order: 42", text)
        self.assertIn("custom_metadata:\n  audience: adults\n  checklist:\n    - first\n    - second", text)
        self.assertEqual(wizard._split_front_matter_and_body(text)[1], old_body)
        self.assertEqual(wizard.read_novel_index_metadata(self.slug)["title"], "Updated: A Story #1")
        self.assertEqual(json.loads(wizard._extract_front_matter_field(wizard._split_front_matter_and_body(text)[0], "Title")[0]), "Updated: A Story #1")
        self.assertEqual(json.loads(self.registry.read_text(encoding="utf-8"))["other-story"]["future"], {"keep": True})

    @unittest.skipUnless(wizard._PILImage and wizard._BeautifulSoup, "pillow and beautifulsoup4 are required")
    def test_metadata_edit_does_not_rewrite_manuscript_body_or_custom_fields(self):
        original = self.chapter.read_text(encoding="utf-8")
        body = wizard._split_front_matter_and_body(original)[1]
        app = self.app([self.record(self.chapter, title="A title: with punctuation", body=body.rstrip())])
        self.assertTrue(self.save(app))
        updated = self.chapter.read_text(encoding="utf-8")
        self.assertEqual(wizard._split_front_matter_and_body(updated)[1], body)
        self.assertIn("custom_chapter:\n  note: preserve this", updated)
        self.assertEqual(wizard.load_existing_chapter_entries(self.slug)[0]["title"], "A title: with punctuation")

    @unittest.skipUnless(wizard._PILImage and wizard._BeautifulSoup, "pillow and beautifulsoup4 are required")
    def test_only_active_cover_is_converted_and_optimized(self):
        upload = self.root / "new-cover.jpg"
        wizard._PILImage.new("RGB", (1000, 1500), "#6d3245").save(upload)
        foreign = self.images / "other-story-cover.png"
        wizard._PILImage.new("RGB", (40, 60), "green").save(foreign)
        original_foreign = foreign.read_bytes()
        app = self.app()
        app.cover_var.set(str(upload))
        self.assertTrue(self.save(app))
        self.assertEqual(wizard.read_novel_index_metadata(self.slug)["cover"], "/images/test-story-cover.png")
        with wizard._PILImage.open(self.images / "test-story-cover.png") as image:
            self.assertEqual(image.format, "PNG")
        for width in (320, 640, 960):
            for extension in ("webp", "jpg"):
                self.assertTrue((self.images / f"test-story-cover-{width}.{extension}").is_file())
        self.assertEqual(foreign.read_bytes(), original_foreign)
        self.assertFalse((self.images / "other-story-cover-320.webp").exists())

    @unittest.skipUnless(wizard._PILImage and wizard._BeautifulSoup, "pillow and beautifulsoup4 are required")
    def test_gallery_upload_matches_responsive_asset_contract(self):
        upload = self.root / "artwork.jpg"
        wizard._PILImage.new("RGB", (960, 1280), "#3d526e").save(upload)
        app = self.app()
        app.gallery_items = [{"source_path": str(upload), "url": "", "description": 'An evening: "quiet".'}]
        self.assertTrue(self.save(app))
        gallery = wizard.read_novel_index_metadata(self.slug)["gallery"]
        self.assertEqual(gallery[0]["url"], "/images/test-story-gallery-1.png")
        self.assertEqual(gallery[0]["description"], 'An evening: "quiet".')
        self.assertTrue((self.images / "test-story-gallery-1-640.webp").is_file())

    def test_missing_gallery_is_rejected_before_any_manuscript_write(self):
        before = self.files()
        app = self.app()
        app.gallery_items = [{"source_path": str(self.root / "missing.png"), "url": ""}]
        self.assertFalse(self.save(app))
        self.assertEqual(self.files(), before)

    def test_missing_cover_never_removes_existing_cover_or_variants(self):
        before = self.files()
        app = self.app()
        app.cover_var.set(str(self.root / "gone.jpg"))
        self.assertFalse(self.save(app))
        self.assertEqual(self.files(), before)

    @unittest.skipUnless(wizard._PILImage and wizard._BeautifulSoup, "pillow and beautifulsoup4 are required")
    def test_late_error_rolls_back_manuscript_assets_index_and_relationships(self):
        upload = self.root / "replacement.jpg"
        wizard._PILImage.new("RGB", (960, 1280), "#ba7644").save(upload)
        before = self.files()
        app = self.app()
        app.cover_var.set(str(upload))
        app.gallery_items = [{"source_path": str(upload), "url": "", "description": "New scene"}]
        with patch.object(wizard, "sync_relationship_badges_in_novels_index", side_effect=OSError("simulated late disk failure")):
            self.assertFalse(self.save(app))
        self.assertEqual(self.files(), before)
        self.assertNotIn("mark_saved", app.events)

    @unittest.skipUnless(wizard._PILImage and wizard._BeautifulSoup, "pillow and beautifulsoup4 are required")
    def test_failed_new_novel_save_removes_created_folder(self):
        self.slug = "new-story"
        app = self.app(create=True)
        app.cover_var.set(str(self.images / "test-story-cover.png"))
        app.chapter_tabs = [self.record()]
        before = self.files()
        with patch.object(wizard, "sync_relationship_badges_in_novels_index", side_effect=OSError("late failure")):
            self.assertFalse(self.save(app))
        self.assertEqual(self.files(), before)
        self.assertFalse((self.novels / "new-story").exists())

    @unittest.skipUnless(wizard._PILImage and wizard._BeautifulSoup, "pillow and beautifulsoup4 are required")
    def test_successful_new_novel_writes_modern_and_compatibility_metadata(self):
        self.slug = "new-story"
        app = self.app(create=True)
        app.cover_var.set(str(self.images / "test-story-cover.png"))
        app.chapter_tabs = [self.record()]
        self.assertTrue(self.save(app))
        metadata = wizard.read_novel_index_metadata("new-story")
        self.assertEqual(metadata["title"], "Updated: A Story #1")
        self.assertEqual(metadata["cover"], "/images/new-story-cover.png")
        self.assertTrue((self.novels / "new-story" / "Chapter1.md").is_file())
        self.assertTrue((self.images / "new-story-cover-320.webp").is_file())
        self.assertIn('/novel/new-story/', self.index.read_text(encoding="utf-8"))
        self.assertEqual(app.mode_var.get(), wizard.MODE_EDIT)

    def test_external_chapter_change_is_not_overwritten_by_recovered_draft(self):
        record = self.record(self.chapter)
        record["source_digest"] = wizard.hashlib.sha256(self.chapter.read_bytes()).hexdigest()
        self.chapter.write_text(self.chapter.read_text(encoding="utf-8") + "External editor's new paragraph.\n", encoding="utf-8")
        before = self.files()
        self.assertFalse(self.save(self.app([record])))
        self.assertEqual(self.files(), before)

    def test_malformed_registry_does_not_overwrite_other_relationships(self):
        self.registry.write_text('{"broken":', encoding="utf-8")
        before = self.files()
        self.assertFalse(self.save(self.app()))
        self.assertEqual(self.files(), before)

    def test_empty_existing_chapter_is_rejected(self):
        before = self.files()
        self.assertFalse(self.save(self.app([self.record(self.chapter, body="")])) )
        self.assertEqual(self.files(), before)

    def test_duplicate_destinations_are_rejected_before_write(self):
        before = self.files()
        self.assertFalse(self.save(self.app([self.record(self.chapter), self.record(self.chapter)])))
        self.assertEqual(self.files(), before)

    def test_paths_cannot_escape_repository_or_novel(self):
        self.assertIsNone(wizard._site_url_to_local_path("/../../outside.png"))
        with self.assertRaises(ValueError):
            wizard._chapter_save_path(self.slug, {"order": 1, "source_path": self.registry}, True)
        with self.assertRaises(ValueError):
            wizard._chapter_save_path(self.slug, {"order": 1, "source_slug": "../../outside"}, True)

    def test_shared_gallery_file_is_not_deleted_on_entry_removal(self):
        shared = self.images / "another-book-gallery-1.png"
        shared.write_bytes(b"shared artwork")
        wizard.materialize_gallery_items_for_commit([], self.slug, [{"url": "/images/another-book-gallery-1.png"}])
        self.assertEqual(shared.read_bytes(), b"shared artwork")

    def test_atomic_text_write_failure_leaves_original_intact(self):
        before = self.chapter.read_bytes()
        with patch.object(wizard.os, "replace", side_effect=OSError("write refused")):
            with self.assertRaises(OSError):
                wizard.write_text(self.chapter, "Replacement")
        self.assertEqual(self.chapter.read_bytes(), before)
        self.assertFalse(list(self.folder.glob("*.tmp")))

    def git(self, *arguments):
        result = subprocess.run(["git", *arguments], cwd=self.root, text=True, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        return result.stdout.strip()

    def test_git_commit_includes_only_save_paths_and_preserves_unrelated_staged_file(self):
        self.git("init", "-q")
        self.git("config", "user.name", "Wizard Test")
        self.git("config", "user.email", "wizard@example.invalid")
        unrelated = self.root / "unrelated.txt"
        unrelated.write_text("Initial", encoding="utf-8")
        remove = self.images / "test-story-cover-old.webp"
        remove.write_bytes(b"obsolete variant")
        self.git("add", "--", ".")
        self.git("commit", "-q", "-m", "Fixture")
        unrelated.write_text("Already staged user work", encoding="utf-8")
        self.git("add", "--", "unrelated.txt")
        self.chapter.write_text("An intended changed chapter", encoding="utf-8")
        new = self.folder / "Chapter3.md"
        new.write_text("New chapter", encoding="utf-8")
        remove.unlink()
        committed, _ = wizard.Wizard._stage_and_commit(self.app(), {self.chapter, new, remove}, "Save one novel", "Explicit save scope")
        self.assertTrue(committed)
        names = set(self.git("diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD").splitlines())
        self.assertEqual(names, {"novel/test-story/Chapter1.md", "novel/test-story/Chapter3.md", "images/test-story-cover-old.webp"})
        self.assertEqual(self.git("diff", "--cached", "--name-only"), "unrelated.txt")
        self.assertEqual(self.git("show", "HEAD:unrelated.txt"), "Initial")


if __name__ == "__main__":
    unittest.main(verbosity=2)
