"""Validate a PRIVATE verified manifest and generate owner-only publication SQL.

Never connects to a database or reads .env files. Real answers must stay outside
the repository. Output is new, mode 0600, and must also be outside the repository.
"""
import argparse
import json
import math
import os
from pathlib import Path
import re
import sys
import unicodedata
from urllib.parse import urlsplit
import uuid

ROOT = Path(__file__).resolve().parents[1]
CATEGORIES = {"kampus", "akademik", "yurt-yemek", "tarih-kultur", "eymir-doga", "bilim-topluluklar"}
DATES = {"demo": None, "2026-11-22": "2026-11-22"}


def validate_manifest(payload):
    if not isinstance(payload, dict) or set(payload) != {"episodes"}:
        raise ValueError("Expected an episodes manifest")
    episodes = payload["episodes"]
    if not isinstance(episodes, list) or len(episodes) != 2:
        raise ValueError("Exactly two episodes are required")
    seen_slugs, seen_prompts = set(), set()
    for ep in episodes:
        if not isinstance(ep, dict) or set(ep) != {"slug", "title", "date", "questions"}:
            raise ValueError("Invalid episode fields")
        slug = ep["slug"]
        if not isinstance(slug, str) or slug not in DATES or slug in seen_slugs or ep["date"] != DATES[slug]:
            raise ValueError("Invalid or duplicate episode identity/date")
        seen_slugs.add(slug)
        if not isinstance(ep["title"], str) or not 1 <= len(ep["title"].strip()) <= 80:
            raise ValueError("Invalid episode title")
        if not isinstance(ep["questions"], list) or len(ep["questions"]) != 5:
            raise ValueError("Each episode needs exactly five verified questions")
        positions = set()
        for q in ep["questions"]:
            required = {"position", "prompt", "unit", "answer", "reasoning", "sourceUrl", "verified", "verifiedBy"}
            if not isinstance(q, dict) or not required <= set(q) or set(q) - required - {"category"}:
                raise ValueError("Invalid question fields")
            if type(q["position"]) is not int or q["position"] not in range(1, 6) or q["position"] in positions:
                raise ValueError("Invalid or duplicate position")
            positions.add(q["position"])
            for field, maximum in [("prompt", 1000), ("unit", 100), ("reasoning", 4000), ("sourceUrl", 2048), ("verifiedBy", 100)]:
                if not isinstance(q[field], str) or not 1 <= len(q[field].strip()) <= maximum or "\x00" in q[field]:
                    raise ValueError("Missing or oversized content field")
            prompt = " ".join(unicodedata.normalize("NFKC", q["prompt"]).split()).lower()
            if prompt in seen_prompts:
                raise ValueError("All ten question prompts must be different")
            seen_prompts.add(prompt)
            if q["verified"] is not True:
                raise ValueError("Every question requires explicit human verification")
            if type(q["answer"]) not in (int, float) or not 0 < q["answer"] <= 1e15 or not math.isfinite(q["answer"]):
                raise ValueError("Invalid numerical answer")
            if q.get("category") is not None and q["category"] not in CATEGORIES:
                raise ValueError("Invalid category key")
            url = urlsplit(q["sourceUrl"])
            if url.scheme != "https" or not url.hostname or url.username or url.password or re.search(r"\s", q["sourceUrl"]):
                raise ValueError("An HTTPS source without embedded credentials is required")
    return sorted(episodes, key=lambda ep: ep["slug"] != "demo")


def publication_sql(payload):
    episodes = validate_manifest(payload)
    lines = ["-- PRIVATE: contains correct answers. Do not commit or log.", "begin;", "set local statement_timeout = '30s';"]
    for ep in episodes:
        data = json.dumps(ep, ensure_ascii=False, allow_nan=False)
        delimiter = "$manifest_" + uuid.uuid4().hex + "$"
        while delimiter in data:
            delimiter = "$manifest_" + uuid.uuid4().hex + "$"
        lines.append(f"select soraban_private.import_episode(m->>'slug', m->>'title', (m->>'date')::date, m->'questions') "
                     f"from (select {delimiter}{data}{delimiter}::jsonb as m) input;")
    return "\n".join(lines + ["commit;", ""])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    try:
        source, target = args.input.resolve(), args.output.resolve()
        if source.is_relative_to(ROOT) or target.is_relative_to(ROOT):
            raise ValueError("Private input and output must be outside the repository")
        if source.stat().st_size > 1_048_576:
            raise ValueError("Manifest is too large")
        text = publication_sql(json.loads(source.read_text()))
        descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
        with os.fdopen(descriptor, "w") as output:
            output.write(text)
        print("Validated ten questions and wrote private publication SQL. No database was contacted.")
    except (ValueError, TypeError, OSError, OverflowError):
        # Never print a parser error that might include private manifest contents.
        print("Import preparation failed: check manifest fields, verification, paths and permissions.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
