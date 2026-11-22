"""Approval-gated disposable PostgreSQL integration checks. Never reads .env files."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import math
import os
from pathlib import Path
from episode_checks import check_episodes
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--approved-disposable-execution", action="store_true",
                    help="Use only AFTER Elif explicitly approves migration execution")


def main():
    if not parser.parse_args().approved_disposable_execution:
        parser.error("Separate human approval is required before running migrations, even locally.")
    endpoint = None if os.environ.get("DOCKER_CONTEXT") else os.environ.get("DOCKER_HOST")
    endpoint = endpoint or subprocess.check_output(
        ["docker", "context", "inspect", "--format", "{{.Endpoints.docker.Host}}"], text=True).strip()
    if not endpoint.startswith("unix://"):
        raise SystemExit("Disposable tests require a local Docker Unix-socket endpoint.")
    container = "soraban-sql-test-" + uuid.uuid4().hex[:10]

    def sql(statement, *, expect_error=False):
        result = subprocess.run(
            ["docker", "exec", "-i", container, "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "postgres"],
            input=statement, text=True, capture_output=True, timeout=25,
        )
        if expect_error:
            assert result.returncode != 0, "Expected database denial"
        elif result.returncode:
            raise AssertionError(result.stderr)
        return result.stdout.strip()

    def as_player(statement, player=1, *, expect_error=False, rollback=False):
        identity = f"a0000000-0000-4000-8000-{player:012d}"
        return sql(f"begin; set local role authenticated; set local request.jwt.claim.sub = '{identity}'; "
                   + statement + (" rollback;" if rollback else " commit;"), expect_error=expect_error)

    def question(day, position):
        return f"20000000-0000-4000-8000-{day * 10 + position:012d}"

    def submit(position, guess, player=1, day=2, *, expect_error=False):
        return as_player(f"select public.soraban_submit_guess('{question(day, position)}', {guess});",
                         player, expect_error=expect_error)

    start = "(clock_timestamp() at time zone 'Europe/Istanbul')::date - 1"

    def publish(day, *, expect_error=False):
        return sql(f"select soraban_private.publish_game_day('10000000-0000-4000-8000-{day:012d}', {start});",
                   expect_error=expect_error)

    subprocess.run(["docker", "run", "--detach", "--rm", "--network", "none",
                    "--tmpfs", "/var/lib/postgresql/data:rw,size=256m",
                    "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "--name", container,
                    "postgres:17-alpine"], check=True, capture_output=True, text=True, timeout=180)
    try:
        for _ in range(100):
            ready = subprocess.run(["docker", "exec", container, "pg_isready", "-U", "postgres"], capture_output=True)
            if ready.returncode == 0:
                break
            time.sleep(0.1)
        else:
            raise AssertionError("Disposable PostgreSQL did not become ready")
        for file in ["tests/bootstrap.sql", "drafts/0001_initial_schema.sql",
                     "drafts/0002_gameplay.sql", "drafts/0003_episodes_profiles.sql", "tests/fixtures.sql"]:
            sql((ROOT / "supabase" / file).read_text())

        # Publication: exactly configured positions, answer coverage and schedule.
        q5 = question(2, 5)
        sql(f"delete from soraban_private.private_answers where question_id = '{q5}';")
        publish(2, expect_error=True)
        sql(f"delete from public.public_questions where id = '{q5}';")
        publish(2, expect_error=True)
        sql(f"insert into public.public_questions(id,game_day_id,position,prompt,unit) values "
            f"('{q5}','10000000-0000-4000-8000-000000000002',5,'SYNTHETIC fixture 5','synthetic units'); "
            f"insert into soraban_private.private_answers values ('{q5}',5000,'SYNTHETIC reasoning','https://example.org/synthetic');")
        sql("update public.game_days set play_date = play_date + 100 where day_number = 30;")
        publish(2, expect_error=True)
        sql("update public.game_days set play_date = play_date - 100 where day_number = 30;")
        for d in (1, 2, 3):
            publish(d)
        print("PASS: publication count, private answers and consecutive schedule")

        # Direct-role permission tests exercise PostgreSQL RLS/ACLs, not mocked JS.
        assert sql("set role anon; select count(id) from public.game_days;") == "2"
        assert sql("set role anon; select count(id) from public.public_questions;") == "10"
        for role in ("anon", "authenticated", "service_role"):
            for statement in ["select * from soraban_private.private_answers;",
                              "select void_reason from public.public_questions;",
                              "insert into public.guesses(player_id,question_id,guess,score) values "
                              f"('a0000000-0000-4000-8000-000000000001','{question(2, 1)}',1,100);",
                              "select soraban_private.progress(null,null);"]:
                sql(f"set role {role}; {statement}", expect_error=True)
        sql("set role anon; select public.soraban_today();", expect_error=True)
        sql("set role authenticated; select public.soraban_today();", expect_error=True)
        before = json.loads(as_player("select public.soraban_today();"))
        assert before["progress"] == {"answeredCount": 0, "totalCount": 5, "completed": False, "scoreRaw": None}
        assert not any(key in json.dumps(before) for key in ("correctAnswer", "reasoning", "sourceUrl"))
        print("PASS: client ACLs, private-answer secrecy, auth and released-day RLS")

        for factor in (1, 2, 3, 10, 30, 100):
            actual = float(sql(f"select soraban_private.score_guess(100, {100 * factor});"))
            assert math.isclose(actual, max(0, 100 - 50 * math.log10(factor)), abs_tol=1e-10)
        assert float(sql("select soraban_private.score_guess('4.9406564584124654e-324', 1e15);")) == 0
        assert float(sql("select soraban_private.score_guess('4.9406564584124654e-324','4.9406564584124654e-324');")) == 100
        for invalid in ("0", "-1", "'NaN'::float8", "'Infinity'::float8", "1e16", "null"):
            submit(1, invalid, expect_error=True)
        print("PASS: SQL/TypeScript golden scores, extreme finite values and invalid guesses")

        # Same question race: both responses must be the first immutable result.
        with ThreadPoolExecutor(2) as pool:
            competing = list(pool.map(lambda value: json.loads(submit(1, value)), [1000, 2000]))
        assert competing[0]["guess"] == competing[1]["guess"]
        original = competing[0]["guess"]
        assert json.loads(submit(1, 3000))["guess"] == original
        submit(2, 2000)
        submit(3, 3000)
        # Different final questions: the player lock must prevent a lost completion.
        with ThreadPoolExecutor(2) as pool:
            list(pool.map(lambda p: submit(p, p * 1000), [4, 5]))
        completed = json.loads(as_player("select public.soraban_my_today();"))
        assert completed["progress"]["completed"] and len(completed["guesses"]) == 5
        assert math.isclose(completed["progress"]["scoreRaw"], sum(g["scoreRaw"] for g in completed["guesses"]) / 5, abs_tol=1e-12)
        assert sql("select count(*) from public.daily_scores;") == "1"
        assert as_player("select count(id) from public.guesses;", 2) == "0"
        assert json.loads(as_player("select public.soraban_my_today();", 2))["guesses"] == []
        submit(1, 1000, day=1, expect_error=True)
        submit(1, 1000, day=3, expect_error=True)
        as_player(f"select public.soraban_submit_guess('{question(2, 1)}',1000);", 3, rollback=True)
        assert json.loads(as_player("select public.soraban_my_today();", 3))["guesses"] == []
        print("PASS: immutable/concurrent guesses, completion, caller isolation, closed days and rollback")

        for p in range(1, 5):
            submit(p, p * 1000, player=2)
        sql(f"select soraban_private.void_question('{q5}', 'SYNTHETIC invalid question');")
        for player in (1, 2):
            result = json.loads(as_player("select public.soraban_my_today();", player))
            assert result["progress"]["completed"] and result["progress"]["answeredCount"] == 4
            assert result["progress"]["totalCount"] == 5
        assert sql("select count(*) from public.daily_scores where question_count = 4;") == "2"
        submit(5, 5000, player=2, expect_error=True)
        for p in (1, 2, 3):
            sql(f"select soraban_private.void_question('{question(2, p)}','SYNTHETIC void');")
        sql(f"select soraban_private.void_question('{question(2, 4)}','SYNTHETIC last void');", expect_error=True)
        print("PASS: void recalculation, newly completed player and final-question protection")
        check_episodes(sql, as_player)
    finally:
        subprocess.run(["docker", "stop", container], check=True, capture_output=True, text=True, timeout=30)


if __name__ == "__main__":
    main()
