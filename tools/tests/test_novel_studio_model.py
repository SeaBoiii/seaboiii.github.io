"""Temporary-fixture checks for authoring/public-page compatibility."""

import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from novel_studio_model import (classify_epilogue, count_words, extract_import_sequence,
                                inspect_novel, preview_urls, read_front_matter,
                                reader_content, reading_minutes, render_reader_text)


class ReaderTextTests(unittest.TestCase):
    def test_only_matching_leading_heading_is_removed(self):
        body = "\n# Chapter 3 — A Quiet Door\n\nShe opened it.\n\n# Another heading\nThe end."
        clean = reader_content(body, "A Quiet Door", "Chapter 3")
        self.assertFalse(clean.startswith("\n# Chapter"))
        self.assertIn("# Another heading", clean)
        unrelated = "# A memory\n\nShe opened it."
        self.assertEqual(reader_content(unrelated, "A Quiet Door", "Chapter 3"), unrelated)

    def test_unicode_title_normalization_matches_reader(self):
        self.assertEqual(reader_content("# CHAPTER 1 - Café\nShe waited.", "Café", "Chapter 1"), "She waited.")

    def test_word_count_uses_visible_labels_not_image_or_link_urls(self):
        body = "# Door\n\n**She waited** beside [the door](https://example.test/secret_path).\n![Cover alt](asset.png)\n\nDon't fear ice-blue light."
        self.assertEqual(count_words(body, "Door", "Chapter 1"), 9)

    def test_word_count_handles_code_and_reference_links(self):
        body = "A [quiet door][id].\n\n[id]: https://example.test/not-visible\n\n```python\nhello world\n```\n\n`one` <strong>more</strong> &amp; again."
        self.assertEqual(count_words(body), 8)
        self.assertNotIn("https://", render_reader_text(body))

    def test_reading_minutes_match_220_word_estimate(self):
        self.assertEqual(reading_minutes(0), 1)
        self.assertEqual(reading_minutes(220), 1)
        self.assertEqual(reading_minutes(221), 2)
        self.assertEqual(reading_minutes(2200), 10)

    def test_sequential_and_branching_endings_remain_distinct(self):
        cases = {"Epilogue I — Dawn": ("sequential", "I"),
                 "Epilogue II": ("sequential", "II"),
                 "Epilogue IV - Return": ("sequential", "IV"),
                 "Epilogue 2: Return": ("sequential", "II"),
                 "Epilogue 9: Return": ("sequential", "9"),
                 "Epilogue A - Stay": ("branching", "A"),
                 "Epilogue B: Leave": ("branching", "B"),
                 "Epilogue - Quiet": ("single", ""),
                 "Chapter 4 - Door": ("none", "")}
        for title, expected in cases.items():
            with self.subTest(title=title):
                self.assertEqual(classify_epilogue(title), expected)

    def test_import_order_understands_roman_before_letter_index(self):
        filenames = {"EpilogueI.docx": ("epilogue", 1), "Epilogue II.md": ("epilogue", 2),
                     "EpilogueIV.docx": ("epilogue", 4), "Epilogue IX.md": ("epilogue", 9),
                     "Epilogue A.docx": ("epilogue", 1), "EpilogueB.md": ("epilogue", 2),
                     "Chapter12.docx": ("chapter", 12), "Chapter_4.md": ("chapter", 4)}
        for filename, expected in filenames.items():
            with self.subTest(filename=filename):
                self.assertEqual(extract_import_sequence(filename), expected)
        self.assertEqual(extract_import_sequence("Quiet.docx", 6), ("chapter", 6))
        self.assertIsNone(extract_import_sequence("Quiet.docx"))


class FrontMatterTests(unittest.TestCase):
    def test_scalar_block_and_gallery_written_by_wizard(self):
        raw = '\ufeff---\nTitle: "Quiet: A Door"\nstatus: Complete\nblurb: >-\n  She waits.\n  The city sleeps.\ngenre: >-\n  romance, fantasy\ngallery:\n  - url: "/images/door-gallery-1.png"\n    description: "Rain: on glass"\norder: 0\n---\n\nStory.'
        metadata, body, issues = read_front_matter(raw)
        self.assertEqual(metadata["Title"], "Quiet: A Door")
        self.assertEqual(metadata["blurb"], "She waits.\nThe city sleeps.")
        self.assertEqual(metadata["gallery"], [{"url": "/images/door-gallery-1.png", "description": "Rain: on glass"}])
        self.assertEqual(metadata["order"], 0)
        self.assertEqual(body, "\nStory.")
        self.assertEqual(issues, [])

    def test_invalid_yaml_and_duplicates_are_visible(self):
        raw = "---\nTitle: Quiet: A Door\nTitle: Again\ngenre: [romance, fantasy]\n---\nStory."
        _, _, issues = read_front_matter(raw)
        self.assertEqual({issue["code"] for issue in issues}, {"yaml_unquoted_colon", "yaml_duplicate", "yaml_unsupported"})


class NovelReadinessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        (self.repo / "novel" / "quiet-door").mkdir(parents=True)
        (self.repo / "images").mkdir()
        (self.repo / "tools").mkdir()
        self._write_cover("quiet-door")
        self.metadata = {"title": "Quiet Door", "status": "Complete", "blurb": "A quiet city holds an unexpected promise.",
                         "genre": "romance, fantasy", "tone": "tender", "setting": "city"}
        self.chapters = [{"slug": "Chapter1", "title": "The Door", "order": 1, "body": "# The Door\n\nShe opened the door."}]

    def _write_cover(self, slug):
        # Asset validation checks files, not image decoders; tiny fixtures avoid
        # importing Pillow or touching repository assets.
        for suffix in (".png", "-320.webp", "-640.webp", "-960.webp"):
            (self.repo / "images" / f"{slug}-cover{suffix}").write_bytes(b"fixture")

    def inspect(self, **overrides):
        kwargs = {"metadata_overrides": self.metadata, "chapters": self.chapters, "relationships": {}}
        kwargs.update(overrides)
        return inspect_novel(self.repo, "quiet-door", **kwargs)

    def test_complete_book_is_ready_with_derived_summary(self):
        report = self.inspect()
        self.assertTrue(report["ready"], report["issues"])
        self.assertEqual(report["word_count"], 4)
        self.assertEqual(report["reading_minutes"], 1)
        self.assertEqual(report["chapter_count"], 1)
        self.assertEqual(report["urls"]["reader"], "http://127.0.0.1:4175/novel/quiet-door/Chapter1/")
        self.assertIn("site build", report["estimate_note"])

    def test_missing_variant_is_an_error_because_site_requests_webp(self):
        (self.repo / "images" / "quiet-door-cover-640.webp").unlink()
        report = self.inspect()
        self.assertFalse(report["ready"])
        self.assertIn("640", next(issue["message"] for issue in report["issues"] if issue["code"] == "asset_variants_missing"))

    def test_custom_jpeg_cover_uses_its_actual_url(self):
        (self.repo / "images" / "custom.jpg").write_bytes(b"fixture")
        metadata = {**self.metadata, "cover": "/images/custom.jpg"}
        report = self.inspect(metadata_overrides=metadata)
        self.assertTrue(report["ready"], report["issues"])
        self.assertEqual(report["cover"], "/images/custom.jpg")

    def test_proposed_cover_upload_does_not_require_generated_files_yet(self):
        upload = self.repo / "upload.png"
        upload.write_bytes(b"fixture")
        for path in (self.repo / "images").iterdir():
            path.unlink()
        report = self.inspect(metadata_overrides={**self.metadata, "cover_source": str(upload)})
        self.assertTrue(report["ready"], report["issues"])

    def test_empty_story_and_duplicate_orders_are_errors(self):
        chapters = [*self.chapters, {"slug": "Chapter1", "order": 1, "title": "Empty", "body": "# Empty\n![](cover.png)"}]
        report = self.inspect(chapters=chapters)
        codes = {issue["code"] for issue in report["issues"]}
        self.assertTrue({"chapter_body_empty", "chapter_filename_duplicate", "chapter_order_duplicate"}.issubset(codes))

    def test_roman_and_a_b_summaries_sort_and_classify_correctly(self):
        chapters = [{"slug": "Epilogue2", "order": 3, "title": "Epilogue II - Dawn", "body": "Dawn returned."},
                    {"slug": "Chapter1", "order": 1, "title": "Door", "body": "The door opened."},
                    {"slug": "Epilogue1", "order": 2, "title": "Epilogue I - Dusk", "body": "Dusk returned."}]
        report = self.inspect(chapters=chapters)
        self.assertEqual([chapter["slug"] for chapter in report["chapters"]], ["Chapter1", "Epilogue1", "Epilogue2"])
        self.assertEqual([chapter["epilogue_type"] for chapter in report["chapters"]], ["none", "sequential", "sequential"])

    def test_relationship_errors_and_duplicate_series_warning(self):
        relationships = {"quiet-door": {"related_to": "quiet-door", "series_id": "doors", "reading_order": 1},
                         "other-door": {"series_id": "doors", "reading_order": 1}}
        codes = {issue["code"] for issue in self.inspect(relationships=relationships)["issues"]}
        self.assertTrue({"relationship_self", "relationship_order_duplicate"}.issubset(codes))
        codes = {issue["code"] for issue in self.inspect(relationships={"quiet-door": {"related_to": "missing-door"}})["issues"]}
        self.assertIn("relationship_target_missing", codes)

    def test_book_on_disk_uses_matching_reader_heading_removal(self):
        folder = self.repo / "novel" / "quiet-door"
        (folder / "index.md").write_text("---\nTitle: Quiet Door\nstatus: Complete\nblurb: A promise.\ngenre: romance\ntone: tender\nsetting: city\n---\n", encoding="utf-8")
        (folder / "Chapter1.md").write_text("---\nTitle: The Door\norder: 1\n---\n# Chapter 1 - The Door\n\nShe opened the door.", encoding="utf-8")
        (folder / "Draft.md").write_text("Private notes", encoding="utf-8")
        report = inspect_novel(self.repo, "quiet-door")
        self.assertTrue(report["ready"], report["issues"])
        self.assertEqual(report["word_count"], 4)
        self.assertIn("chapter_route_ignored", {issue["code"] for issue in report["issues"]})

    def test_lowercase_editor_title_overrides_saved_legacy_Title(self):
        folder = self.repo / "novel" / "quiet-door"
        (folder / "index.md").write_text("---\nTitle: Old Title\nstatus: Complete\n---\n", encoding="utf-8")
        report = self.inspect(metadata_overrides={**self.metadata, "title": "New Title"})
        self.assertEqual(report["title"], "New Title")

    def test_old_music_and_hidden_settings_are_advisory(self):
        metadata = {**self.metadata, "chapter_music_url": "/assets/audio/song.mp3", "hidden": True, "tone": ""}
        report = self.inspect(metadata_overrides=metadata)
        self.assertTrue(report["ready"], report["issues"])
        self.assertTrue({"music_legacy", "hidden_legacy", "tone_missing"}.issubset({issue["code"] for issue in report["issues"]}))

    def test_unsafe_asset_and_slug_do_not_escape_repo(self):
        report = self.inspect(metadata_overrides={**self.metadata, "cover": "/images/../../outside.png"})
        self.assertIn("asset_url_invalid", {issue["code"] for issue in report["issues"]})
        report = inspect_novel(self.repo, "../quiet-door", self.metadata, self.chapters)
        self.assertFalse(report["ready"])
        self.assertEqual(report["urls"]["book"], "")

    def test_inspection_does_not_modify_files(self):
        before = {str(path.relative_to(self.repo)): path.read_bytes() for path in self.repo.rglob("*") if path.is_file()}
        self.inspect()
        after = {str(path.relative_to(self.repo)): path.read_bytes() for path in self.repo.rglob("*") if path.is_file()}
        self.assertEqual(before, after)

    def test_malformed_relationship_file_is_reported(self):
        (self.repo / "tools" / "novel_relationships.json").write_text("{ broken", encoding="utf-8")
        report = self.inspect(relationships=None)
        self.assertIn("relationships_invalid", {issue["code"] for issue in report["issues"]})


class PreviewUrlTests(unittest.TestCase):
    def test_urls_match_current_trailing_slash_static_routes(self):
        self.assertEqual(preview_urls("quiet-door", "EpilogueA")["reader"], "http://127.0.0.1:4175/novel/quiet-door/EpilogueA/")
        self.assertEqual(preview_urls("quiet-door", base="https://example.test")["book"], "https://example.test/novel/quiet-door/")

    def test_invalid_route_inputs_are_rejected(self):
        for args in (("../quiet",), ("Quiet Door",), ("quiet-door", "../Chapter1")):
            with self.subTest(args=args), self.assertRaises(ValueError):
                preview_urls(*args)
        with self.assertRaises(ValueError):
            preview_urls("quiet-door", base="file:///tmp/preview")


if __name__ == "__main__":
    unittest.main()
