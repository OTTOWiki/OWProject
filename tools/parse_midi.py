import struct
import json
from pathlib import Path

path = Path("assets/midi/moonlight3.mid")
data = path.read_bytes()


def read_vlq(buf, i):
    v = 0
    while True:
        b = buf[i]
        i += 1
        v = (v << 7) | (b & 0x7F)
        if not (b & 0x80):
            break
    return v, i


assert data[0:4] == b"MThd"
header_len = struct.unpack(">I", data[4:8])[0]
fmt, ntrks, division = struct.unpack(">HHH", data[8:14])
print("format", fmt, "tracks", ntrks, "division", division)
i = 8 + header_len

tracks = []
for _ in range(ntrks):
    assert data[i : i + 4] == b"MTrk"
    i += 4
    length = struct.unpack(">I", data[i : i + 4])[0]
    i += 4
    tracks.append(data[i : i + length])
    i += length

events = []
tempos = [(0, 500000)]

for ti, tr in enumerate(tracks):
    tick = 0
    i = 0
    running = None
    while i < len(tr):
        delta, i = read_vlq(tr, i)
        tick += delta
        status = tr[i]
        if status < 0x80:
            status = running
        else:
            i += 1
            running = status

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
        active[key] = (tick, vel)
    elif stype == 0x80 and key in active:
        st, sv = active.pop(key)
        notes.append({"start": st, "end": tick, "note": note, "vel": sv, "ch": ch})

print("notes", len(notes))
print("tempos", tempos[:8], "count", len(tempos))


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


for n in notes:
    n["t0"] = tick_to_sec(n["start"])
    n["t1"] = tick_to_sec(n["end"])
    n["dur"] = max(0.03, n["t1"] - n["t0"])

notes.sort(key=lambda n: n["t0"])
print("duration sec", notes[-1]["t1"] if notes else 0)
print("pitch", min(n["note"] for n in notes), max(n["note"] for n in notes))

out_notes = [
    {
        "t": round(n["t0"], 4),
        "d": round(min(n["dur"], 4.0), 4),
        "n": n["note"],
        "v": n["vel"],
    }
    for n in notes
    if n["dur"] > 0.02
]

out_path = Path("assets/midi/moonlight3_notes.json")
out_path.write_text(
    json.dumps(
        {"source": "bitmidi moonlight 3rd (public domain work)", "notes": out_notes},
        separators=(",", ":"),
    ),
    encoding="utf-8",
)
print("exported", len(out_notes), "notes", out_path.stat().st_size, "bytes")
for n in out_notes[:25]:
    print(n)
