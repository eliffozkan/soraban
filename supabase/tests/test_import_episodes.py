"""Pure import validation/file tests, never database execution. All data SYNTHETIC."""
import copy
import importlib.util
import json
from pathlib import Path
import stat
import sys
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("import_episodes", Path(__file__).parents[1] / "import_episodes.py")
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def synthetic_manifest():
    return {"episodes": [{"slug": slug, "title": "SYNTHETIC " + slug, "date": date,
        "questions": [{"position": n, "prompt": f"SYNTHETIC {slug} question {n}", "unit": "test",
            "answer": n * 1000, "reasoning": "SYNTHETIC reasoning", "sourceUrl": "https://example.org/synthetic",
            "verified": True, "verifiedBy": "SYNTHETIC test only"} for n in range(1, 6)]}
        for slug, date in [("demo", None), ("2026-11-22", "2026-11-22")]]}


class ImportTests(unittest.TestCase):
    def test_complete_manifest_generates_one_atomic_owner_only_transaction(self):
        statement = importer.publication_sql(synthetic_manifest())
        self.assertEqual(statement.count("soraban_private.import_episode("), 2)
        self.assertTrue(statement.endswith("commit;\n"))
        self.assertNotIn("insert into public", statement)

    def test_rejects_unverified_duplicate_wrong_date_and_invalid_answers(self):
        for mutate in [
            lambda p: p["episodes"][0]["questions"][0].update(verified=False),
            lambda p: p["episodes"][1]["questions"][0].update(prompt=p["episodes"][0]["questions"][0]["prompt"]),
            lambda p: p["episodes"][1].update(date="2026-11-23"),
            lambda p: p["episodes"][0]["questions"][0].update(answer=float("inf")),
            lambda p: p["episodes"][0]["questions"].pop(),
        ]:
            payload = copy.deepcopy(synthetic_manifest()); mutate(payload)
            with self.assertRaises(ValueError): importer.validate_manifest(payload)

    def test_output_is_private_and_existing_files_are_not_overwritten(self):
        with tempfile.TemporaryDirectory() as folder:
            source, target = Path(folder) / "private.json", Path(folder) / "private.sql"
            source.write_text(json.dumps(synthetic_manifest()))
            with patch.object(sys, "argv", ["import", "--input", str(source), "--output", str(target)]):
                self.assertEqual(importer.main(), 0)
                self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o600)
                original = target.read_text()
                self.assertEqual(importer.main(), 1)
                self.assertEqual(target.read_text(), original)


if __name__ == "__main__": unittest.main()
