/* Host-side tests for yy_core.c: parity with the Python reference and
 * the safety rules of the fusion step. Build and run with `make`. */
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../firmware/you_yourself_edge/yy_core.h"

static int failures = 0;
#define CHECK(cond, ...) do { if (!(cond)) { failures++; printf("FAIL: " __VA_ARGS__); printf("\n"); } } while (0)

static void test_emg_parity(void) {
    FILE *f = fopen("vectors.csv", "r");
    CHECK(f != NULL, "vectors.csv missing; run python/train_emg.py first");
    if (!f) return;
    char line[16384];
    int n = 0;
    double worst_f = 0, worst_p = 0;
    while (fgets(line, sizeof line, f)) {
        float vals[2 + YY_WIN + YY_NFEAT + YY_NCLASS];
        int k = 0;
        for (char *tok = strtok(line, ",\n"); tok && k < (int)(sizeof vals / sizeof *vals); tok = strtok(NULL, ",\n"))
            vals[k++] = strtof(tok, NULL);
        float med = vals[0], sigma = vals[1];
        float *x = vals + 2, *ef = x + YY_WIN, *ep = ef + YY_NFEAT;
        float feat[YY_NFEAT], p[YY_NCLASS];
        yy_features(x, YY_WIN, med, sigma, feat);
        yy_mlp_proba(feat, p);
        for (int i = 0; i < YY_NFEAT; i++) {
            double d = fabs(feat[i] - ef[i]) / fmax(1.0, fabs(ef[i]));
            if (d > worst_f) worst_f = d;
            CHECK(d < 1e-3, "vector %d feature %d: C %f vs Python %f", n, i, feat[i], ef[i]);
        }
        for (int i = 0; i < YY_NCLASS; i++) {
            double d = fabs(p[i] - ep[i]);
            if (d > worst_p) worst_p = d;
            CHECK(d < 1e-3, "vector %d class %d: C %f vs Python %f", n, i, p[i], ep[i]);
        }
        n++;
    }
    fclose(f);
    printf("EMG parity: %d windows, worst feature diff %.2e, worst prob diff %.2e\n", n, worst_f, worst_p);
}

static void test_vad_parity(void) {
    FILE *f = fopen("vad_audio.f32", "rb");
    FILE *e = fopen("vad_expected.txt", "r");
    CHECK(f && e, "VAD vectors missing; run gen_vad_vectors.py");
    if (!f || !e) return;
    char expected[4096] = {0};
    size_t ne = fread(expected, 1, sizeof expected - 1, e);
    yy_vad_t v;
    yy_vad_init(&v);
    float frame[YY_FRAME];
    size_t i = 0;
    int mismatches = 0, speech = 0;
    while (fread(frame, sizeof(float), YY_FRAME, f) == YY_FRAME && i < ne) {
        bool s = yy_vad_frame(&v, frame, YY_FRAME);
        speech += s;
        if (s != (expected[i] == '1')) mismatches++;
        i++;
    }
    fclose(f); fclose(e);
    /* float32 vs float64 may flip a frame right at the 12 dB edge */
    CHECK(mismatches <= 2, "VAD: %d of %zu frames differ from Python", mismatches, i);
    CHECK(speech > 0, "VAD never detected the speech-like segment");
    printf("VAD parity: %zu frames, %d speech, %d mismatches\n", i, speech, mismatches);
}

static void test_fusion(void) {
    /* The tap is only ever given for muscle-active + no speech + cue enabled. */
    for (int in = 0; in < 3; in++)
        for (int out = 0; out < 2; out++)
            for (int cue = 0; cue < 2; cue++) {
                yy_outcome_t o = yy_decide((yy_inside_t)in, out);
                bool tap = yy_tap(o, cue);
                bool allowed = cue && in == YY_IN_ACTIVE && !out;
                CHECK(tap == allowed, "tap rule in=%d out=%d cue=%d", in, out, cue);
            }
    /* A lifted electrode is never read as silence or as speech. */
    CHECK(yy_decide(YY_IN_NO_CONTACT, false) == YY_CANNOT_TELL, "no contact, quiet room");
    CHECK(yy_decide(YY_IN_NO_CONTACT, true) == YY_SPEECH_ONLY, "no contact, speech");

    yy_history_t h;
    memset(&h, 0, sizeof h);
    CHECK(yy_inside_state(&h) == YY_IN_NO_CONTACT, "empty history must be uninformative");
    for (int k = 0; k < 20; k++) yy_history_push(&h, 0.1f, true, false);
    CHECK(yy_inside_state(&h) == YY_IN_NONE, "quiet history");
    yy_history_push(&h, 0.9f, true, false);
    CHECK(yy_inside_state(&h) == YY_IN_NONE, "one high window is not enough");
    yy_history_push(&h, 0.9f, true, false);
    CHECK(yy_inside_state(&h) == YY_IN_ACTIVE, "two consecutive high windows");
    for (int k = 0; k < 15; k++) yy_history_push(&h, 0.9f, false, false);
    CHECK(yy_inside_state(&h) == YY_IN_NO_CONTACT, "mostly lifted electrode");
    CHECK(!yy_outside_any(&h), "no outside speech");
    yy_history_push(&h, 0.1f, true, true);
    CHECK(yy_outside_any(&h), "outside speech seen");
    for (int k = 0; k < 20; k++) yy_history_push(&h, 0.1f, true, false);
    CHECK(!yy_outside_any(&h), "speech older than 10 s is forgotten");
    printf("fusion rules checked\n");
}

static void test_contact(void) {
    float flat[YY_WIN], rail[YY_WIN], ok[YY_WIN];
    for (int i = 0; i < YY_WIN; i++) { flat[i] = 0; rail[i] = 4095; ok[i] = 300 + (i % 7); }
    CHECK(!yy_contact_ok(flat, YY_WIN), "flat zero must be bad contact");
    CHECK(!yy_contact_ok(rail, YY_WIN), "rail must be bad contact");
    CHECK(yy_contact_ok(ok, YY_WIN), "normal trace is fine");
}

int main(void) {
    test_emg_parity();
    test_vad_parity();
    test_fusion();
    test_contact();
    printf(failures ? "\n%d FAILURE(S)\n" : "\nall host tests passed\n", failures);
    return failures ? 1 : 0;
}
