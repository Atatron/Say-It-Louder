"""Combine the two channels into one of the paper's four outcomes (Table 5).

The device never decides whether a voice is "real". It reports two outside
facts (were your speech muscles active? was anyone nearby speaking?) and
words them as likelihoods. A silent or unreadable muscle channel is always
uninformative, never evidence about where a voice came from.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from math import comb

LOOKBACK_S = 10.0
P_SPEECH = 0.6              # window counts as speech-motor above this
MIN_CONSEC = 2              # ... for at least 2 consecutive windows (about 1 s)


class Inside(Enum):
    ACTIVE = "active"
    NONE = "none"
    NO_CONTACT = "no_contact"


class Outcome(Enum):
    MUSCLE_NO_SPEECH = "muscle_no_speech"
    MUSCLE_AND_SPEECH = "muscle_and_speech"
    NOTHING_NO_SPEECH = "nothing_no_speech"
    SPEECH_ONLY = "speech_only"
    CANNOT_TELL = "cannot_tell"


# Wording copied from the paper, Table 5. A psychiatrist must review the
# Indonesian version before anyone with lived experience sees it.
WORDING = {
    Outcome.MUSCLE_NO_SPEECH: (
        "Your speech muscles were active and no one near you was speaking. "
        "This voice may be your own inner speech."),
    Outcome.MUSCLE_AND_SPEECH: (
        "There was real speech near you, and your speech muscles were active. "
        "This check can't separate the two."),
    Outcome.NOTHING_NO_SPEECH: (
        "The sensor picked up nothing this time. That is common, and it says "
        "nothing about where the voice came from."),
    Outcome.SPEECH_ONLY: "The microphone heard real speech near you.",
    Outcome.CANNOT_TELL: (
        "The muscle sensor isn't reading properly right now, so this check "
        "can't say anything about your muscles."),
}


def inside_state(p_speech: list[float], contact: list[bool]) -> Inside:
    """Summarise the look-back windows of the muscle channel."""
    if not contact or sum(contact) < len(contact) / 2:
        return Inside.NO_CONTACT
    run = 0
    for p, ok in zip(p_speech, contact):
        run = run + 1 if (ok and p >= P_SPEECH) else 0
        if run >= MIN_CONSEC:
            return Inside.ACTIVE
    return Inside.NONE


@dataclass
class Result:
    outcome: Outcome
    text: str
    tap: bool


def decide(inside: Inside, outside_speech: bool, cue_enabled: bool) -> Result:
    if inside is Inside.NO_CONTACT:
        o = Outcome.SPEECH_ONLY if outside_speech else Outcome.CANNOT_TELL
    elif inside is Inside.ACTIVE:
        o = Outcome.MUSCLE_AND_SPEECH if outside_speech else Outcome.MUSCLE_NO_SPEECH
    else:
        o = Outcome.SPEECH_ONLY if outside_speech else Outcome.NOTHING_NO_SPEECH
    # The "this is you" tap is earned: only this cell, and only once the
    # person's own data passed the coupling test and their clinician agreed.
    tap = cue_enabled and o is Outcome.MUSCLE_NO_SPEECH
    return Result(o, WORDING[o], tap)


# ---- personal coupling test (paper, section 5.7) -------------------------

LOOKS = (30, 55, 80)        # tested only at these fixed points


def fisher_one_sided(a: int, b: int, c: int, d: int) -> float:
    """P(X >= a) for the 2x2 table [[a, b], [c, d]].

    Rows: voice windows, control windows. Columns: muscle active, not active.
    """
    r1, c1, n = a + b, a + c, a + b + c + d
    denom = comb(n, c1)
    hi = min(r1, c1)
    return sum(comb(r1, k) * comb(n - r1, c1 - k) for k in range(a, hi + 1)) / denom


def coupling_passes(voice: list[bool], control: list[bool]) -> bool:
    """Whether the per-person test passes at the latest fixed look reached.

    voice / control: muscle-active flag for each voice window and each
    control window, in the order collected. Only the first 30, 55 or 80 of
    each are used, so pressing more often cannot pass someone by luck. Needs
    one-sided Fisher p < 0.05 and at least a twofold rate. A pass is a
    screening rule, not proof; the clinician still decides.
    """
    n = min(len(voice), len(control))
    look = max((k for k in LOOKS if k <= n), default=None)
    if look is None:
        return False
    va, ca = sum(voice[:look]), sum(control[:look])
    p = fisher_one_sided(va, look - va, ca, look - ca)
    twofold = va >= 2 * ca and va > 0
    return p < 0.05 and twofold
