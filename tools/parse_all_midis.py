# -*- coding: utf-8 -*-
"""Parse all midis in 参考/ into assets/midi/*.json with ASCII names."""
import json
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "参考"
OUT = ROOT / "assets" / "midi"
OUT.mkdir(parents=True, exist_ok=True)

# Explicit mapping: short_id -> filename prefix match
# (order: first match wins)
NAME_MAP = [
    ("th08_05", "TH08_05"),
    ("th08_09", "TH08_09"),
    ("th08_10", "TH08_10"),
    ("th08_15", "TH08_15"),
    ("th08_16", "TH08_16"),
    ("th08_18", "TH08_18"),
    ("th10_10", "TH10_10"),
    ("th10_11", "TH10_11"),
    ("th10_13", "TH10_13"),
    ("th11_09", "TH11_09"),
    ("th11_15", "TH11_15"),
    ("th12_08", "TH12_08"),
]


def read_vlq(buf, i):
    v = 0
    while True:
        b = buf[i]
        i += 1
        v = (v << 7) | (b & 0x7F)
        if not (b & 0x80):
            break
    return v, i


def parse_midi(path: Path):
    data = path.read_bytes()
    assert data[0:4] == b"MThd", path
    header_len = struct.unpack(">I", data[4:8])[0]
    fmt, ntrks, division = struct.unpack(">HHH", data[8:14])
    if division & 0x8000:
        # SMPTE - rare; treat as 480
        division = 480
    i = 8 + header_len
    tracks = []
    for _ in range(ntrks):
        if data[i : i + 4] != b"MTrk":
            break
        i += 4
        length = struct.unpack(">I", data[i : i + 4])[0]
        i += 4
        tracks.append(data[i : i + length])
        i += length

    tempos = [(0, 500000)]
    events = []
    for ti, tr in enumerate(tracks):
        tick = 0
        i = 0
        running = None
        while i < len(tr):
            delta, i = read_vlq(tr, i)
            tick += delta
            if i >= len(tr):
                break
            status = tr[i]
            if status < 0x80:
                status = running
            else:
                i += 1
                running = status
            if status is None:
                break
            if status == 0xFF:
                meta = tr[i]
                i += 1
                ln, i = read_vlq(tr, i)
                payload = tr[i : i + ln]
                i += ln
                if meta == 0x51 and ln == 3:
                    us = (payload[0] << 16) | (payload[1] << 8) | payload[2]
                    tempos.append((tick, us))
                continue
            if status >= 0xF0:
                ln, i = read_vlq(tr, i)
                i += ln
                continue
            stype = status & 0xF0
            ch = status & 0x0F
            if stype in (0x80, 0x90, 0xA0, 0xB0, 0xE0):
                if i + 1 >= len(tr):
                    break
                a, b = tr[i], tr[i + 1]
                i += 2
                if stype == 0x90 and b == 0:
                    stype = 0x80
                events.append((tick, stype, a, b, ch, ti))
            elif stype in (0xC0, 0xD0):
                i += 1
            else:
                break

    events.sort(key=lambda e: e[0])
    active = {}
    notes = []
    for tick, stype, note, vel, ch, ti in events:
        key = (ch, note)
        if stype == 0x90:
            active[key] = (tick, vel, ch)
        elif stype == 0x80 and key in active:
            st, sv, sch = active.pop(key)
            notes.append(
                {"start": st, "end": tick, "note": note, "vel": sv, "ch": sch}
            )

    tempos.sort(key=lambda x: x[0])
    # dedupe consecutive same tick tempos keep last
    clean_t = []
    for t in tempos:
        if clean_t and clean_t[-1][0] == t[0]:
            clean_t[-1] = t
        else:
            clean_t.append(t)
    tempos = clean_t

    def tick_to_sec(tick):
        t = 0.0
        cur_us = 500000
        prev = 0
        for ct, us in tempos:
            if tick < ct:
                break
            t += (ct - prev) * (cur_us / division) / 1e6
            prev = ct
            cur_us = us
        t += (tick - prev) * (cur_us / division) / 1e6
        return t

    out = []
    for n in notes:
        t0 = tick_to_sec(n["start"])
        t1 = tick_to_sec(n["end"])
        dur = max(0.03, t1 - t0)
        if dur > 0.02:
            out.append(
                {
                    "t": round(t0, 4),
                    "d": round(min(dur, 6.0), 4),
                    "n": n["note"],
                    "v": n["vel"],
                    "ch": n["ch"],
                }
            )
    out.sort(key=lambda x: x["t"])
    end = max((x["t"] + x["d"] for x in out), default=0)
    return {
        "source": path.name,
        "division": division,
        "duration": round(end, 3),
        "notes": out,
    }


def short_id(filename: str) -> str:
    for sid, prefix in NAME_MAP:
        if filename.startswith(prefix) or prefix in filename:
            return sid
    # fallback sanitize
    s = re.sub(r"[^\w\-]+", "_", filename)[:40]
    return s.lower()


def main():
    midis = list(SRC.glob("*.mid")) + list(SRC.glob("*.MID"))
    if not midis:
        # windows encoding fallback
        midis = [p for p in SRC.iterdir() if p.suffix.lower() == ".mid"]
    print("found", len(midis), "midis in", SRC)
    manifest = {}
    for p in sorted(midis, key=lambda x: x.name):
        sid = short_id(p.name)
        print("parse", sid, "<-", p.name[:60])
        try:
            data = parse_midi(p)
        except Exception as e:
            print("  FAIL", e)
            continue
        outp = OUT / f"{sid}.json"
        outp.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
        # also copy mid with ascii name
        (OUT / f"{sid}.mid").write_bytes(p.read_bytes())
        manifest[sid] = {
            "file": f"assets/midi/{sid}.json",
            "source": p.name,
            "notes": len(data["notes"]),
            "duration": data["duration"],
        }
        print("  ->", len(data["notes"]), "notes", data["duration"], "s")

    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print("manifest written", len(manifest))


if __name__ == "__main__":
    main()
