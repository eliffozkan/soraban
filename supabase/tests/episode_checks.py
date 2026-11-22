"""Additional database assertions, executed ONLY by the approval-gated harness.

All questions, answers and verification attestations here are explicitly SYNTHETIC.
"""
import json
from concurrent.futures import ThreadPoolExecutor


def check_episodes(sql, as_player):
    def manifest(slug):
        return [{"position": i, "prompt": f"SYNTHETIC {slug} question {i}", "unit": "test units",
                 "answer": i * 1000, "reasoning": "SYNTHETIC reasoning", "sourceUrl": "https://example.org/synthetic",
                 "verified": True, "verifiedBy": "SYNTHETIC fixture, not real verification"} for i in range(1, 6)]

    def publish(slug, questions=None, *, expect_error=False):
        date = "null" if slug == "demo" else "date '2026-11-22'"
        data = json.dumps(questions if questions is not None else manifest(slug))
        return sql(f"select soraban_private.import_episode('{slug}', 'SYNTHETIC {slug}', {date}, $fixture${data}$fixture$);",
                   expect_error=expect_error)

    demo_id = publish("demo")
    duplicate = manifest("2026-11-22"); duplicate[0]["prompt"] = manifest("demo")[0]["prompt"]
    publish("2026-11-22", duplicate, expect_error=True)
    dated_id = publish("2026-11-22")
    assert publish("demo") == demo_id and publish("2026-11-22") == dated_id
    changed = manifest("demo"); changed[0]["answer"] = 9999
    publish("demo", changed, expect_error=True)
    unverified = manifest("demo"); unverified[0]["verified"] = False
    publish("demo", unverified, expect_error=True)
    listing = json.loads(sql("set role anon; select public.soraban_episodes();"))
    assert [e["slug"] for e in listing["episodes"]] == ["demo", "2026-11-22"]
    assert listing["episodes"][0]["date"] is None and listing["episodes"][1]["date"] == "2026-11-22"
    assert sql("select count(*) from public.game_days where episode_key is null;") == "30"
    # Existing season rows/scores must remain untouched during this test.
    ids = {}
    for slug in ("demo", "2026-11-22"):
        data = json.loads(as_player(f"select public.soraban_episode('{slug}', false);"))
        assert not any(field in json.dumps(data) for field in ("correctAnswer", "reasoning", "sourceUrl"))
        ids[slug] = [q["id"] for q in data["questions"]]
    assert set(ids["demo"]).isdisjoint(ids["2026-11-22"])
    sql("set role anon; select public.soraban_episode('demo', true);", expect_error=True)
    print("PASS: calendar-independent episodes, unique content and idempotent frozen publication")

    def submit(slug, pos, player=1, factor=1):
        return json.loads(as_player(f"select public.soraban_submit_guess('{ids[slug][pos-1]}', {pos*1000*factor});", player))

    with ThreadPoolExecutor(2) as pool:
        racing = list(pool.map(lambda factor: submit("demo", 1, factor=factor), (1, 2)))
    assert racing[0]["guess"] == racing[1]["guess"]
    for player in (1, 2):
        for pos in range(1, 6):
            # Player 2 matches player 1's first raw score so the final means tie.
            factor = racing[0]["guess"]["guess"] / 1000 if pos == 1 else 1
            submit("demo", pos, player=player, factor=factor)
    for pos in range(1, 6): submit("2026-11-22", pos, factor=10)
    assert len(json.loads(as_player("select public.soraban_episode('2026-11-22',true);", 2))["guesses"]) == 0
    assert len(json.loads(as_player("select public.soraban_episode('demo',true);"))["guesses"]) == 5
    assert publish("demo") == demo_id
    a = json.loads(as_player("select public.soraban_episode_leaderboard('demo',1,1);"))
    b = json.loads(as_player("select public.soraban_episode_leaderboard('2026-11-22');"))
    assert a["playerCount"] == 2 and a["me"]["rank"] == 1 and len(a["entries"]) == 1
    assert b["playerCount"] == 1 and b["me"]["scoreRaw"] == 50
    whole = json.loads(sql("set role anon; select public.soraban_episode_leaderboard('demo');"))
    assert [e["rank"] for e in whole["entries"]] == [1, 1] and whole["me"] is None
    assert all(e["nickname"] == "Anonim oyuncu" for e in whole["entries"])
    assert not any(s in json.dumps(whole) for s in ("a0000000-", "player_id", "email", "access_token"))
    assert sql("select count(*) from public.daily_scores s join public.game_days d on d.id=s.game_day_id where d.episode_key is null;") == "2"
    print("PASS: both episode completions, reload/race retry, tied ranks and isolated scores")

    identity = "a0000000-0000-4000-8000-000000000001"
    response = json.loads(as_player("select public.soraban_set_nickname('  Elif   Çığ  ');"))
    assert response["nickname"] == "Elif Çığ" and response["displayName"] == "Anonim oyuncu"
    assert json.loads(as_player("select public.soraban_profile();", 2))["nickname"] is None
    as_player("select public.soraban_set_nickname('a m k');", expect_error=True)
    as_player("select public.soraban_set_nickname('Other name');", expect_error=True)
    assert json.loads(as_player("select public.soraban_set_nickname('Elif Çığ');"))["nickname"] == "Elif Çığ"
    as_player("update public.player_profiles set nickname_approved=true;", expect_error=True)
    as_player(f"select soraban_private.moderate_profile('{identity}','Elif Çığ',true,false,false,'SYNTHETIC');", expect_error=True)
    sql(f"select soraban_private.moderate_profile('{identity}','wrong name',true,false,false,'SYNTHETIC');", expect_error=True)
    sql(f"select soraban_private.moderate_profile('{identity}','Elif Çığ',true,false,false,'SYNTHETIC');")
    approved = json.loads(as_player("select public.soraban_episode_leaderboard('demo');"))
    assert approved["entries"][0]["nickname"] == "Elif Çığ"
    for i in range(4):
        sql(f"update public.player_profiles set nickname_changed_at=clock_timestamp()-interval '61 seconds' where player_id='{identity}';")
        as_player(f"select public.soraban_set_nickname('SYNTHETIC {i}');")
    sql(f"update public.player_profiles set nickname_changed_at=clock_timestamp()-interval '61 seconds' where player_id='{identity}';")
    as_player("select public.soraban_set_nickname('Sixth name');", expect_error=True)
    sql(f"select soraban_private.moderate_profile('{identity}','SYNTHETIC 3',false,true,true,'SYNTHETIC hide');")
    as_player("select public.soraban_set_nickname('SYNTHETIC 3');", expect_error=True)
    sql(f"select soraban_private.moderate_profile('{identity}','SYNTHETIC 3',false,true,false,'SYNTHETIC hide');")
    sql(f"update public.player_profiles set nickname_window_start=clock_timestamp()-interval '2 hours' where player_id='{identity}';")
    renamed = json.loads(as_player("select public.soraban_set_nickname('Changed hidden');"))
    assert renamed["leaderboardHidden"] and not renamed["nicknameApproved"]
    hidden = json.loads(as_player("select public.soraban_episode_leaderboard('demo');"))
    assert hidden["playerCount"] == 1 and hidden["me"] is None
    # Voiding uses the same transaction/projection path on standalone episodes.
    sql(f"select soraban_private.void_question('{ids['demo'][4]}','SYNTHETIC void');")
    restored = json.loads(as_player("select public.soraban_episode('demo',true);"))
    assert restored["progress"]["answeredCount"] == 4 and restored["progress"]["completed"]
    assert json.loads(as_player("select public.soraban_episode('2026-11-22',true);"))["progress"]["answeredCount"] == 5
    print("PASS: nickname isolation/limits, moderation-only approval/hide and episode void recalculation")
