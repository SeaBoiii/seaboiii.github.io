"""Exercise the real Tk editor without writing stories, assets, or preferences.

Tk needs a desktop session. The test window is fully transparent and placed
outside the screen; it is never an interactive foreground helper.
"""

from contextlib import ExitStack
import copy
import hashlib
from pathlib import Path
import shutil
import sys
import tempfile
import tkinter as tk
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True

TOOLS_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS_DIR))
import novel_wizard as wizard  # noqa: E402
import novel_studio_model as model  # noqa: E402
import novel_studio_ui as studio_ui  # noqa: E402


class WizardUiTests(unittest.TestCase):
    def setUp(self):
        self.patches = ExitStack()
        self.addCleanup(self.patches.close)
        self.state = {"wizard_ui": {"mode": wizard.MODE_CREATE, "chapter_count": 3}}
        self.callback_errors = []

        def callback_error(app, exception, value, traceback):
            self.callback_errors.append((exception.__name__, str(value)))

        self.patches.enter_context(patch.object(tk.Tk, "report_callback_exception", callback_error))
        self.patches.enter_context(patch.object(wizard, "load_wizard_state", side_effect=lambda: copy.deepcopy(self.state)))
        self.patches.enter_context(patch.object(wizard, "save_wizard_state", side_effect=self._save_state))
        self.patches.enter_context(patch.object(wizard.Wizard, "_configure_app_icon"))
        self.patches.enter_context(patch.object(wizard.Wizard, "_prompt_optional_dependency_install"))
        self.patches.enter_context(patch.object(wizard.messagebox, "showinfo"))
        self.patches.enter_context(patch.object(wizard.messagebox, "showwarning"))
        self.patches.enter_context(patch.object(wizard.messagebox, "showerror"))

        def invisible_window(app):
            app.withdraw()
            app.attributes("-alpha", 0.0)
            app.geometry("1360x920+4000+4000")
            app.minsize(940, 620)

        self.patches.enter_context(patch.object(wizard.Wizard, "_configure_window", invisible_window))
        try:
            self.app = wizard.Wizard()
            self.app.deiconify()
            self.app.update()
        except tk.TclError as exc:
            self.patches.close()
            if "no display name" in str(exc).lower() or "couldn't connect to display" in str(exc).lower():
                self.skipTest(f"A Tk desktop session is required: {exc}")
            raise
        self.addCleanup(self._close_app)

    def tearDown(self):
        self.assertEqual(self.callback_errors, [], "Tk callbacks failed during the interaction")

    def _save_state(self, state):
        self.state = copy.deepcopy(state)

    def _select_book(self, slug):
        self.app.mode_var.set(wizard.MODE_EDIT)
        self.app.edit_submode_var.set(wizard.EDIT_SUBMODE_EDIT)
        self.app.existing_slug_var.set(slug)
        self.app._on_mode_change()
        self.app.update()

    def _settle_layout(self):
        ready = tk.BooleanVar(self.app, value=False)
        self.app.after(180, lambda: ready.set(True))
        self.app.wait_variable(ready)
        self.app.update_idletasks()

    def _restart(self):
        self.app._save_ui_state()
        for callback in self.app.tk.splitlist(self.app.tk.call("after", "info")):
            self.app.after_cancel(callback)
        self.app.destroy()
        self.app = wizard.Wizard()
        self.app.deiconify()
        self.app.update()

    def _close_app(self):
        try:
            self.app.withdraw()
            for callback in self.app.tk.splitlist(self.app.tk.call("after", "info")):
                self.app.after_cancel(callback)
            # Destroy directly. The normal close path writes preferences;
            # isolated in-memory state is enough for these checks.
            self.app.destroy()
        finally:
            self.patches.close()

    def test_startup_has_catalog_and_usable_chapter_buffer(self):
        self.assertIn("Novel", self.app.title())
        self.assertGreaterEqual(len(self.app.catalog), 50)
        self.assertGreaterEqual(len(self.app.chapter_tabs), 1)
        self.assertTrue(self.app.chapter_tabs[0]["text"].winfo_exists())
        self.assertEqual(float(self.app.attributes("-alpha")), 0.0)

    def test_chapter_rebuild_preserves_typed_title_and_prose(self):
        self.app.count_var.set(2)
        self.app.update()
        record = self.app.chapter_tabs[0]
        record["title_var"].set("A window at midnight")
        story = "The room was quiet.\n\n**One promise** remained.\n"
        record["text"].delete("1.0", "end")
        record["text"].insert("1.0", story)
        self.app.count_var.set(3)
        self.app.update()
        self.assertEqual(len(self.app.chapter_tabs), 3)
        self.assertEqual(self.app.chapter_tabs[0]["title_var"].get(), "A window at midnight")
        self.assertEqual(self.app.chapter_tabs[0]["text"].get("1.0", "end-1c"), story)

    def test_bulk_import_retains_ending_identity(self):
        names = ["Epilogue IV - A home.md", "Chapter2.md", "Epilogue II - A return.md", "Epilogue A - Mercy.md", "Chapter1.md"]
        with tempfile.TemporaryDirectory(prefix="novel-wizard-ui-import-") as directory:
            paths = []
            for name in names:
                path = Path(directory) / name
                path.write_text("A story without an extracted heading.\n\nIt continues.\n", encoding="utf-8")
                paths.append(str(path))
            with patch.object(wizard.filedialog, "askopenfilenames", return_value=tuple(paths)):
                self.app._bulk_import_docx()
            self.app.update()
            self.assertEqual(len(self.app.chapter_tabs), len(names))
            titles = [record["title_var"].get() for record in self.app.chapter_tabs]
            endings = [model.classify_epilogue(title) for title in titles[2:]]
            self.assertEqual(endings, [("branching", "A"), ("sequential", "II"), ("sequential", "IV")])
            for path in paths:
                self.assertEqual(Path(path).read_text(encoding="utf-8"), "A story without an extracted heading.\n\nIt continues.\n")

    def test_reader_preview_themes_and_shared_statistics(self):
        record = self.app.chapter_tabs[0]
        record["title_var"].set("Dawn")
        story = "# Dawn\n\nA quiet room—two promises.\n"
        record["text"].delete("1.0", "end")
        record["text"].insert("1.0", story)
        self.app.studio._changed_now()
        preview = self.app.studio.reader_text.get("1.0", "end-1c")
        self.assertEqual(preview, "Dawn\n\nA quiet room—two promises.")
        words = model.count_words(story, title="Dawn", label="Chapter 1")
        self.assertTrue(self.app.studio.chapter_stats.get().startswith(f"{words:,} words"))
        self.assertIn(f"{words:,} words", self.app.studio.summary.get())
        for theme, (background, foreground) in studio_ui.READER_THEMES.items():
            with self.subTest(theme=theme):
                self.app.studio.preview_theme.set(theme)
                self.app.update()
                self.assertEqual(self.app.studio.reader_text.cget("background"), background)
                self.assertEqual(self.app.studio.reader_text.cget("foreground"), foreground)
                self.assertEqual(self.app.studio.reader_text.cget("state"), "disabled")

    def test_library_and_chapter_search_select_real_content(self):
        self.app.studio.library_search.set("senior")
        self.app.update()
        self.assertEqual(self.app.studio.library_tree.get_children(), ("senior-i-m-serious",))
        self.app.studio.library_tree.selection_set("senior-i-m-serious")
        self.app.studio._library_selected()
        self.app.update()
        self.app.edit_submode_var.set(wizard.EDIT_SUBMODE_EDIT)
        self.app._on_edit_submode_change()
        self.app.studio.chapter_search.set("Epilogue")
        self.app.update()
        entries = self.app.studio.chapter_tree.get_children()
        self.assertEqual(len(entries), 4)
        self.app.studio.chapter_tree.selection_set(entries[-1])
        self.app.studio._chapter_selected()
        self.app.update()
        active = self.app.chapter_tabs[self.app.nb.index(self.app.nb.select())]
        self.assertEqual(model.classify_epilogue(active["title_var"].get()), ("sequential", "IV"))

    def test_draft_is_recovered_after_book_switch_and_restart(self):
        slug = "as-if-you-never-left"
        source = wizard.NOVEL_DIR / slug / "EpilogueA.md"
        original = source.read_bytes()
        self._select_book(slug)
        record = next(item for item in self.app.chapter_tabs if item.get("source_slug") == "EpilogueA")
        record["title_var"].set("Epilogue A -- A recovered draft")
        draft_body = "A new paragraph remains in the recovery copy.\n"
        record["text"].delete("1.0", "end")
        record["text"].insert("1.0", draft_body)
        self.app.studio._changed_now()
        key = self.app.studio.active_key
        self.assertIn(key, self.state["studio_drafts"])
        self._select_book("the-cinder-crown")
        self._select_book(slug)
        record = next(item for item in self.app.chapter_tabs if item.get("source_slug") == "EpilogueA")
        self.assertEqual(record["text"].get("1.0", "end-1c"), draft_body)
        self.assertEqual(record["title_var"].get(), "Epilogue A -- A recovered draft")
        self.assertEqual(source.read_bytes(), original)
        self._restart()
        record = next(item for item in self.app.chapter_tabs if item.get("source_slug") == "EpilogueA")
        self.assertEqual(record["text"].get("1.0", "end-1c"), draft_body)
        self.assertEqual(source.read_bytes(), original)

    def test_preview_routes_preserve_literal_epilogue_filename(self):
        self._select_book("as-if-you-never-left")
        index = next(index for index, item in enumerate(self.app.chapter_tabs) if item.get("source_slug") == "EpilogueA")
        self.app.nb.select(index)
        with patch.object(studio_ui.webbrowser, "open", return_value=True) as open_browser:
            self.app.studio.open_page("reader")
            open_browser.assert_called_once_with("http://127.0.0.1:4175/novel/as-if-you-never-left/EpilogueA/")

    def test_library_preview_is_available_for_an_untitled_book(self):
        self.assertEqual(self.app.slug_var.get(), "")
        with patch.object(studio_ui.webbrowser, "open", return_value=True) as open_browser:
            self.app.studio.open_page("library")
            open_browser.assert_called_once_with("http://127.0.0.1:4175/novel/#collection")

    def test_geometry_keeps_actions_and_editor_usable(self):
        for width, height in [(1280, 800), (940, 620)]:
            self.app.geometry(f"{width}x{height}+4000+4000")
            for title in ("Book", "Chapters", "Artwork", "Review"):
                with self.subTest(size=(width, height), workspace=title):
                    self.app.studio.workspace.select(self.app.studio.pages[title])
                    self.app.update()
                    self._settle_layout()
                    action = self.app.btn_commit
                    x = action.winfo_rootx() - self.app.winfo_rootx()
                    y = action.winfo_rooty() - self.app.winfo_rooty()
                    self.assertGreaterEqual(x, 0)
                    self.assertGreaterEqual(y, 0)
                    self.assertLessEqual(x + action.winfo_width(), self.app.winfo_width())
                    self.assertLessEqual(y + action.winfo_height(), self.app.winfo_height())
                    if title == "Book":
                        opener = self.app.studio.book_open_button
                        self.assertTrue(opener.winfo_ismapped())
                        opener_x = opener.winfo_rootx() - self.app.winfo_rootx()
                        opener_y = opener.winfo_rooty() - self.app.winfo_rooty()
                        self.assertGreaterEqual(opener_x, 0)
                        self.assertGreaterEqual(opener_y, 0)
                        self.assertLessEqual(opener_x + opener.winfo_width(), self.app.winfo_width())
                        self.assertLessEqual(opener_y + opener.winfo_height(), self.app.winfo_height())
                    if title == "Chapters":
                        editor = self.app.chapter_tabs[self.app.nb.index(self.app.nb.select())]["text"]
                        self.assertGreaterEqual(editor.winfo_width(), 200)
                        self.assertGreaterEqual(editor.winfo_height(), 180)
                        if self.app.studio.reader_text.winfo_ismapped():
                            self.assertGreaterEqual(self.app.studio.reader_text.winfo_width(), 250)

    def test_hidden_draft_chapter_survives_count_changes_title_edit_and_restart(self):
        record = self.app.chapter_tabs[2]
        record["title_var"].set("A last page kept safe")
        story = "This chapter survives temporarily reducing the draft count.\n"
        record["text"].insert("1.0", story)
        self.app.count_var.set(1)
        self.app.update()
        self.app.title_var.set("A new title for this draft")
        self.app.count_var.set(3)
        self.app.update()
        self.assertEqual(self.app.chapter_tabs[2]["title_var"].get(), "A last page kept safe")
        self.assertEqual(self.app.chapter_tabs[2]["text"].get("1.0", "end-1c"), story)
        self.app.count_var.set(1)
        self.app.update()
        self.app.studio._changed_now()
        self._restart()
        self.assertEqual(len(self.app.chapter_tabs), 1)
        self.app.count_var.set(3)
        self.app.update()
        self.assertEqual(self.app.chapter_tabs[2]["title_var"].get(), "A last page kept safe")
        self.assertEqual(self.app.chapter_tabs[2]["text"].get("1.0", "end-1c"), story)

    def test_recovery_keeps_original_digest_when_source_changes_externally(self):
        slug = "as-if-you-never-left"
        with tempfile.TemporaryDirectory(prefix="novel-wizard-external-change-") as directory:
            root = Path(directory)
            novel_dir = root / "novel"
            book_dir = novel_dir / slug
            book_dir.mkdir(parents=True)
            for source in (wizard.NOVEL_DIR / slug).glob("*.md"):
                shutil.copyfile(source, book_dir / source.name)
            with patch.object(wizard, "NOVEL_DIR", novel_dir), patch.object(wizard, "REPO_ROOT", root), patch.object(wizard, "RELATIONSHIPS_JSON", root / "tools" / "novel_relationships.json"):
                self.app._refresh_catalog()
                self._select_book(slug)
                record = next(item for item in self.app.chapter_tabs if item.get("source_slug") == "EpilogueA")
                digest = record["source_digest"]
                source = book_dir / "EpilogueA.md"
                self.assertEqual(digest, hashlib.sha256(source.read_bytes()).hexdigest())
                record["text"].insert("end", "\nA paragraph held in the recovery copy.\n")
                self.app.studio.stash()
                self.app.mode_var.set(wizard.MODE_CREATE)
                self.app._on_mode_change()
                source.write_bytes(source.read_bytes() + b"\nAn external editor changed this source.\n")
                changed_digest = hashlib.sha256(source.read_bytes()).hexdigest()
                self.assertNotEqual(digest, changed_digest)
                self._select_book(slug)
                recovered = next(item for item in self.app.chapter_tabs if item.get("source_slug") == "EpilogueA")
                self.assertEqual(recovered["source_digest"], digest)
                self.assertIn("A paragraph held in the recovery copy.", recovered["text"].get("1.0", "end-1c"))
                self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), changed_digest)

    def test_save_shortcuts_choose_explicit_commit_behavior(self):
        with patch.object(self.app, "_commit", return_value=True) as save:
            self.assertEqual(self.app.studio._save_shortcut(), "break")
            save.assert_called_once_with(commit_to_git=False)
            save.reset_mock()
            self.assertEqual(self.app.studio._save_shortcut(commit=True), "break")
            save.assert_called_once_with(commit_to_git=True)

    def test_reader_preview_toggle_and_focus_return_remain_usable(self):
        self.app.geometry("1280x800+4000+4000")
        self.app.studio.workspace.select(self.app.studio.pages["Chapters"])
        self.app.update()
        self._settle_layout()
        if self.app.studio.reader_text.winfo_ismapped():
            self.app.studio.toggle_reader()
            self.app.update()
        self.app.studio.toggle_reader()
        self.app.update()
        self._settle_layout()
        self.assertTrue(self.app.studio.reader_text.winfo_ismapped())
        self.assertGreaterEqual(self.app.studio.reader_text.winfo_width(), 250)
        self.app.studio.toggle_focus()
        self.app.update()
        self.assertTrue(self.app.studio.focus_mode)
        self.assertFalse(self.app.studio.library_tree.winfo_ismapped())
        self.app.studio.toggle_focus()
        self.app.update()
        self.assertFalse(self.app.studio.focus_mode)
        self.assertTrue(self.app.studio.library_tree.winfo_ismapped())

    def test_blank_new_story_is_blocked_before_writing_or_git(self):
        with patch.object(wizard, "write_text") as write, patch.object(wizard.subprocess, "run") as git:
            self.assertFalse(self.app._commit(commit_to_git=False))
            write.assert_not_called()
            git.assert_not_called()
        self.assertEqual(self.app.studio.workspace.select(), str(self.app.studio.pages["Review"]))
        wizard.messagebox.showerror.assert_called_once()

    def test_missing_responsive_asset_blocks_save_without_mutation(self):
        slug = "validation-fixture"
        image_source = wizard.IMAGES_DIR / "the-cinder-crown-cover.png"
        with tempfile.TemporaryDirectory(prefix="novel-wizard-readiness-") as directory:
            root = Path(directory)
            novels = root / "novel"
            images = root / "images"
            book = novels / slug
            book.mkdir(parents=True)
            images.mkdir()
            (root / "tools").mkdir()
            (root / "tools" / "novel_relationships.json").write_text("{}\n", encoding="utf-8")
            (book / "index.md").write_text("---\nTitle: Validation Fixture\nstatus: Complete\nimage: /images/validation-fixture-cover.png\nblurb: A complete test synopsis.\ngenre: fantasy\ntone: hopeful\nsetting: a city\n---\n\nSaved book introduction.\n", encoding="utf-8")
            (book / "Chapter1.md").write_text("---\nTitle: Opening\norder: 1\n---\n\nA complete story with a small beginning.\n", encoding="utf-8")
            index = novels / "index.html"
            index.write_text('<ul><li class="novel-card" data-status="complete"><a href="/novel/validation-fixture/"><img src="/images/validation-fixture-cover.png"><h2 class="novel-title">Validation Fixture</h2></a></li></ul>', encoding="utf-8")
            shutil.copyfile(image_source, images / f"{slug}-cover.png")
            for width in (320, 640, 960):
                shutil.copyfile(wizard.IMAGES_DIR / f"the-cinder-crown-cover-{width}.webp", images / f"{slug}-cover-{width}.webp")
            with patch.object(wizard, "NOVEL_DIR", novels), patch.object(wizard, "REPO_ROOT", root), patch.object(wizard, "IMAGES_DIR", images), patch.object(wizard, "NOVELS_INDEX_HTML", index), patch.object(wizard, "RELATIONSHIPS_JSON", root / "tools" / "novel_relationships.json"):
                self.app._refresh_catalog()
                self._select_book(slug)
                self.app.studio.validate_for_save()
                (images / f"{slug}-cover-960.webp").unlink()
                before = {path.relative_to(root): path.read_bytes() for path in root.rglob("*") if path.is_file()}
                with patch.object(wizard, "write_text") as write, patch.object(wizard.subprocess, "run") as git:
                    self.assertFalse(self.app._commit(commit_to_git=False))
                    write.assert_not_called()
                    git.assert_not_called()
                after = {path.relative_to(root): path.read_bytes() for path in root.rglob("*") if path.is_file()}
                self.assertEqual(after, before)
                self.assertIn("responsive", str(wizard.messagebox.showerror.call_args).lower())
                self.assertEqual(self.app.studio.workspace.select(), str(self.app.studio.pages["Review"]))

    def test_saving_append_mode_preserves_edit_draft_and_newer_source_details(self):
        slug = "the-cinder-crown"
        self._select_book(slug)
        draft_body = "This chapter edit stays in its own recovery copy.\n"
        self.app.chapter_tabs[0]["text"].delete("1.0", "end")
        self.app.chapter_tabs[0]["text"].insert("1.0", draft_body)
        self.app.studio._changed_now()
        edit_key = self.app.studio.active_key
        edit_draft = copy.deepcopy(self.state["studio_drafts"][edit_key])
        self.app.edit_submode_var.set(wizard.EDIT_SUBMODE_APPEND)
        self.app._on_edit_submode_change()
        self.app.chapter_tabs[0]["text"].insert("1.0", "An appended draft.\n")
        self.app.studio._changed_now()
        append_key = self.app.studio.active_key
        self.assertNotEqual(edit_key, append_key)
        self.assertIn(append_key, self.state["studio_drafts"])
        # Mark the active mode saved without touching source. Fresh source is
        # supplied below by read-only mocks to model the subsequent reload.
        self.app.studio.mark_saved()
        self.assertNotIn(append_key, self.state["studio_drafts"])
        self.assertEqual(self.state["studio_drafts"][edit_key], edit_draft)
        read_metadata = wizard.read_novel_index_metadata
        read_chapters = wizard.load_existing_chapter_entries
        fresh_body = "An unchanged chapter now reflects the newer saved source.\n"

        def updated_metadata(book_slug):
            data = read_metadata(book_slug)
            return {**data, "title": "The Cinder Crown refreshed", "blurb": "A more recent saved synopsis."} if book_slug == slug else data

        def updated_chapters(book_slug):
            entries = read_chapters(book_slug)
            if book_slug == slug:
                entries[1] = {**entries[1], "body": fresh_body}
            return entries

        with patch.object(wizard, "read_novel_index_metadata", side_effect=updated_metadata), patch.object(wizard, "load_existing_chapter_entries", side_effect=updated_chapters):
            self.app._on_existing_selected()
            self.app.edit_submode_var.set(wizard.EDIT_SUBMODE_EDIT)
            self.app._on_edit_submode_change()
            self.app.update()
            self.assertEqual(self.app.title_var.get(), "The Cinder Crown refreshed")
            self.assertEqual(self.app.blurb_var.get(), "A more recent saved synopsis.")
            self.assertEqual(self.app.chapter_tabs[0]["text"].get("1.0", "end-1c"), draft_body)
            self.assertEqual(self.app.chapter_tabs[1]["text"].get("1.0", "end-1c"), fresh_body)


if __name__ == "__main__":
    unittest.main()
