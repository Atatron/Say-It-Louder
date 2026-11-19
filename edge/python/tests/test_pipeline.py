import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from yy import emg_features as F, fusion, synth, vad  # noqa: E402
from yy.fusion import Inside, Outcome  # noqa: E402


def test_quiet_sensor_is_never_evidence():
    r = fusion.decide(Inside.NONE, outside_speech=False, cue_enabled=True)
    assert r.outcome is Outcome.NOTHING_NO_SPEECH
    assert not r.tap
    assert "says nothing about where the voice came from" in r.text


def test_lifted_electrode_gives_no_muscle_claim():
    assert fusion.inside_state([0.99] * 20, [False] * 20) is Inside.NO_CONTACT
    r = fusion.decide(Inside.NO_CONTACT, outside_speech=False, cue_enabled=True)
    assert r.outcome is Outcome.CANNOT_TELL and not r.tap


def test_tap_only_when_earned():
    for inside in Inside:
        for speech in (False, True):
            for cue in (False, True):
                r = fusion.decide(inside, speech, cue)
                assert r.tap == (cue and inside is Inside.ACTIVE and not speech)


def test_no_text_calls_a_voice_real_or_not_real():
    for text in fusion.WORDING.values():
        low = text.lower()
        assert "not real" not in low and "hallucinat" not in low
        assert "definitely" not in low


def test_inside_needs_two_consecutive_windows():
    ok = [True] * 20
    assert fusion.inside_state([0.1] * 19 + [0.9], ok) is Inside.NONE
    assert fusion.inside_state([0.1] * 18 + [0.9, 0.9], ok) is Inside.ACTIVE


def test_coupling_null_rarely_passes():
    rng = np.random.default_rng(0)
    passes = 0
    trials = 2000
    for _ in range(trials):
        v = list(rng.random(80) < 0.2)
        c = list(rng.random(80) < 0.2)
        passes += fusion.coupling_passes(v, c)
    assert passes / trials < 0.05


def test_coupling_strong_link_passes_and_needs_30():
    v = [True] * 18 + [False] * 12          # 60 %
    c = [True] * 6 + [False] * 24           # 20 %
    assert fusion.coupling_passes(v, c)
    assert not fusion.coupling_passes(v[:29], c[:29])


def test_vad_quiet_room_and_speech():
    fs = vad.FS
    noise = synth.audio_noise(10.0, fs, 0.01)
    assert not any(vad.run(noise))
    audio = noise.copy()
    audio[4 * fs:7 * fs] += synth.audio_speechlike(3.0, fs, 0.15)
    flags = vad.run(audio)
    frame_s = vad.FRAME / fs
    first = flags.index(True) * frame_s
    assert 4.0 <= first <= 4.6
    assert not any(flags[: int(3.9 / frame_s)])


def test_emg_features_shape_and_rest_baseline():
    med, sigma = F.calibrate(synth.rest_recording())
    rng = np.random.default_rng(5)
    f_rest = F.features(synth.rest(rng), med, sigma)
    f_sp = F.features(synth.speech_motor(rng), med, sigma)
    assert f_rest.shape == (F.N_FEATURES,)
    assert f_rest[3] < 0.05 and f_sp[3] > 0.3   # fraction above threshold


def test_contact_check():
    assert not F.contact_ok(np.zeros(200))
    assert not F.contact_ok(np.full(200, 4095.0))
    assert F.contact_ok(synth.rest_recording(2.0))
