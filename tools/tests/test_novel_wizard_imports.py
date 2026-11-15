"""Regression coverage for filename import order, without touching a library.

Run from the repository root:
    python -m unittest discover -s tools/tests -p 'test_novel_wizard_imports.py'
"""

from pathlib import Path
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True


TOOLS_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS_DIR))
import novel_wizard as wizard  # noqa: E402
import novel_studio_model as model  # noqa: E402


class ImportSequenceTests(unittest.TestCase):
    def test_roman_epilogues_sort_in_reading_order(self):
        names = [
            "EpilogueIV - A home.docx",
            "Epilogue III - A promise.md",
            "Epilogue_II_Returning.markdown",
            "Epilogue-I-Daylight.md",
        ]
        ordered = sorted(names, key=lambda name: wizard._extract_import_sequence(name)[1])
        self.assertEqual(ordered, list(reversed(names)))
        for number, name in enumerate(reversed(names), start=1):
            with self.subTest(filename=name):
                self.assertEqual(wizard._extract_import_sequence(name), ("epilogue", number))

    def test_lettered_epilogues_are_ordered_as_branches(self):
        for name, number in [("EpilogueA.md", 1), ("Epilogue B - Mercy.docx", 2)]:
            with self.subTest(filename=name):
                self.assertEqual(wizard._extract_import_sequence(name), ("epilogue", number))

    def test_reader_classifies_roman_and_numeric_as_sequential(self):
        for marker, key in [("I", "I"), ("II", "II"), ("III", "III"), ("IV", "IV"), ("1", "I"), ("2", "II"), ("3", "III")]:
            with self.subTest(marker=marker):
                self.assertEqual(model.classify_epilogue(f"Epilogue {marker} -- Afterward"), ("sequential", key))

    def test_reader_classifies_a_and_b_as_parallel_choices(self):
        for marker in ["A", "B"]:
            with self.subTest(marker=marker):
                self.assertEqual(model.classify_epilogue(f"Epilogue {marker} -- Mercy"), ("branching", marker))
        self.assertEqual(model.classify_epilogue("Epilogue -- Still Whole"), ("single", ""))
        self.assertEqual(model.classify_epilogue("Chapter 5 -- A Return"), ("none", ""))

    def test_dash_separators_do_not_change_order(self):
        for separator in ["-", ":", ".", "\u2013", "\u2014"]:
            with self.subTest(separator=separator):
                self.assertEqual(wizard._extract_import_sequence(f"Epilogue {separator} II.md"), ("epilogue", 2))
                self.assertEqual(wizard._extract_import_sequence(f"Chapter {separator} 12.md"), ("chapter", 12))

    def test_numeric_epilogues_and_chapters_keep_natural_order(self):
        expected = {
            "Chapter10.md": ("chapter", 10),
            "Chapter_2 - Arrival.docx": ("chapter", 2),
            "Chapter 1: Beginning.markdown": ("chapter", 1),
            "Epilogue1.md": ("epilogue", 1),
            "Epilogue 2 - A seat.md": ("epilogue", 2),
            "Epilogue_3_Landed.mdown": ("epilogue", 3),
        }
        for name, slot in expected.items():
            with self.subTest(filename=name):
                self.assertEqual(wizard._extract_import_sequence(name), slot)
        names = list(expected)
        names.sort(key=lambda name: (wizard._extract_import_sequence(name)[0] != "chapter", wizard._extract_import_sequence(name)[1]))
        self.assertEqual([expected[name] for name in names], [("chapter", 1), ("chapter", 2), ("chapter", 10), ("epilogue", 1), ("epilogue", 2), ("epilogue", 3)])

    def test_filename_marker_precedes_front_matter_fallback(self):
        self.assertEqual(wizard._extract_import_sequence("Epilogue II.md", 14), ("epilogue", 2))
        self.assertEqual(wizard._extract_import_sequence("Chapter7.md", 11), ("chapter", 7))
        self.assertEqual(wizard._extract_import_sequence("A quiet return.md", 6), ("chapter", 6))
        self.assertEqual(wizard._extract_import_sequence("Epilogue.md", 9), ("epilogue", 9))

    def test_unknown_filenames_and_invalid_fallbacks(self):
        for fallback in [None, 0, -1, "not an order"]:
            with self.subTest(fallback=fallback):
                self.assertIsNone(wizard._extract_import_sequence("Draft.md", fallback))
        self.assertEqual(wizard._extract_chapter_num_from_name("Draft.md"), 10**9)
        self.assertEqual(wizard._extract_chapter_num_from_name("Chapter12.md"), 12)

    def test_actual_library_filename_conventions(self):
        # The source library uses numbered Chapter files for many sequential
        # epilogues, and literal EpilogueA/B files for one branching book.
        for name, expected in {
            "Chapter13.md": ("chapter", 13),
            "Chapter14.md": ("chapter", 14),
            "Chapter15.md": ("chapter", 15),
            "Chapter16.md": ("chapter", 16),
            "EpilogueA.md": ("epilogue", 1),
            "EpilogueB.md": ("epilogue", 2),
        }.items():
            with self.subTest(filename=name):
                self.assertEqual(wizard._extract_import_sequence(name), expected)

    def test_markdown_import_reads_epilogue_title_and_order(self):
        with tempfile.TemporaryDirectory(prefix="novel-wizard-import-test-") as directory:
            path = Path(directory) / "Chapter14.md"
            source = "---\nTitle: Epilogue II -- The Shape of Returning\norder: 14\n---\n\nThe story continues.\n"
            path.write_text(source, encoding="utf-8")
            info = wizard.import_file_info(path)
            self.assertEqual(info["title"], "Epilogue II -- The Shape of Returning")
            self.assertEqual(info["order"], 14)
            self.assertEqual(info["kind"], "markdown")
            self.assertIn("The story continues.", info["body"])
            self.assertEqual(path.read_text(encoding="utf-8"), source)


if __name__ == "__main__":
    unittest.main()
