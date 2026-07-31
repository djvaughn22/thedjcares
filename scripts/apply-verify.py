#!/usr/bin/env python3
"""Apply yt-verify.json results to djCaresLibrary.ts:
- set real durations on every music item (overwrite stale ones)
- mark proper official music videos with musicVideo: true
- bench dead videos and the one non-official upload (active: false)
- refresh `verified` dates on touched music lines
"""
import json, re, sys

LIB = "app/lib/djCaresLibrary.ts"
TODAY = "2026-07-30"

verify = {v["videoId"]: v for v in json.load(open("scripts/yt-verify.json"))}
items = {i["videoId"]: i for i in json.load(open("scripts/yt-items.json"))}

BENCH = {
    "FgAzLKXqcDk": "not an official channel upload (fan lyric video) — benched 2026-07-30",
}
# dead Charles Stanley sermons (oEmbed 403, re-checked)
DEAD = [vid for vid, v in verify.items() if not v["ok"]]

def fmt(secs):
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"

def is_music_video(title):
    t = title.lower()
    if "official music video" in t or "official video" in t or re.search(r"\((official )?music video\)", t):
        return True
    if "lyric" in t or "audio" in t or "visualizer" in t:
        return False
    if "official live" in t or "live concert" in t or "(live" in t:
        return True
    return False

src = open(LIB).read().splitlines(keepends=True)
out = []
changed = {"duration": 0, "mv": 0, "benched": 0}

def add_extra(line, additions):
    """additions: ordered dict-ish list of (key, literal) to ensure present."""
    for key, lit in additions:
        if re.search(rf"\b{key}:", line):
            if key == "duration":
                line = re.sub(r'duration: "[^"]*"', f'duration: "{lit}"', line)
            continue
        if re.search(r"\}\),?\s*$", line):
            line = re.sub(r"\{ ", f"{{ {key}: {lit}, ", line, count=1)
        else:
            line = re.sub(r"\]\),(\s*)$", f'], {{ {key}: {lit} }}),\\1', line)
    return line

for line in src:
    m = re.search(r'(song|sermon|yt)\("', line)
    vid = None
    for candidate in re.findall(r'"([A-Za-z0-9_-]{11})"', line):
        if candidate in verify:
            vid = candidate
            break
    if not m or vid is None:
        out.append(line)
        continue
    v = verify[vid]
    it = items[vid]
    is_song = it["id"].startswith(("song-", "hymn-"))
    if vid in BENCH:
        line = add_extra(line, [("active", "false")])
        changed["benched"] += 1
    elif not v["ok"]:
        line = add_extra(line, [("active", "false")])
        changed["benched"] += 1
    else:
        if is_song and v["lengthSeconds"]:
            dur = fmt(v["lengthSeconds"])
            before = line
            if 'duration: "' in line:
                line = re.sub(r'duration: "[^"]*"', f'duration: "{dur}"', line)
            else:
                line = add_extra(line, [("duration", f'"{dur}"')])
            if line != before:
                changed["duration"] += 1
        if is_song and is_music_video(v["title"]):
            before = line
            line = add_extra(line, [("musicVideo", "true")])
            if line != before:
                changed["mv"] += 1
    out.append(line)

open(LIB, "w").write("".join(out))
print(changed, "dead:", len(DEAD))
