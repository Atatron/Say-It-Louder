"""The scripted recording session, shared by the recorder and the simulator.

Each block is (prompt, label, seconds). Labels:
  rest, speech_motor (silent mouthing or speaking), swallow, chew  -> trained on
  hum, inner_count, inner_read                                      -> not trained;
      inner_* is the decisive test (H1): inner speech with the mouth kept still.
  "" (blank)                                                        -> guard time, ignored
"""
from __future__ import annotations

FS = 100
CAL_SECONDS = 30          # the first 30 s of "rest" are the baseline


def _repeat(n, *blocks):
    return [b for _ in range(n) for b in blocks]


def build_script(include_decisive: bool = True):
    s = []
    s.append(("REST. Sit still, mouth relaxed, jaw loose. (30 s of this is your baseline)", "rest", 60))
    s += _repeat(10,
                 ("Silently MOUTH a sentence (lips move, no sound): 'selamat pagi, apa kabar'", "speech_motor", 3),
                 ("relax", "", 1), ("rest", "rest", 3))
    s += _repeat(10,
                 ("SWALLOW once, now", "swallow", 3),
                 ("relax", "", 1), ("rest", "rest", 3))
    s += [("CHEW (gum, or mime chewing) steadily", "chew", 30), ("relax", "", 2), ("rest", "rest", 10)]
    s += _repeat(10,
                 ("SPEAK a short sentence out loud", "speech_motor", 3),
                 ("relax", "", 1), ("rest", "rest", 3))
    s += [("HUM one soft steady note", "hum", 30), ("relax", "", 2), ("rest", "rest", 10)]
    if include_decisive:
        for _ in range(2):
            s += [("DECISIVE TEST: count 1 to 20 SILENTLY in your head. Mouth, lips and jaw completely still.", "inner_count", 30),
                  ("relax", "", 2), ("rest", "rest", 10)]
            s += [("DECISIVE TEST: read a paragraph SILENTLY, face still, no mouthing.", "inner_read", 30),
                  ("relax", "", 2), ("rest", "rest", 10)]
    s += [("REST. Done soon.", "rest", 20)]
    return s


def total_seconds(script):
    return sum(sec for _, _, sec in script)


if __name__ == "__main__":
    sc = build_script()
    print(f"{len(sc)} blocks, {total_seconds(sc) / 60:.1f} minutes")
