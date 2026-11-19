/* You, Yourself: portable on-device core (no Arduino dependencies).
 *
 * Inside channel: features from the MyoWare ENV output + a tiny MLP.
 * Outside channel: band-energy voice activity detection, no audio stored.
 * Fusion: the paper's four outcomes, with the "this is you" tap gated.
 *
 * Mirrors the Python modules in edge/python/yy. edge/host_test checks that both agree.
 * Research prototype. Not a medical device. Does not diagnose anything.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ---- inside channel (100 Hz envelope) ---- */
#define YY_FS 100
#define YY_WIN 200          /* 2.0 s */
#define YY_HOP 50           /* 0.5 s */
#define YY_NFEAT 9
#define YY_NCLASS 4         /* rest, speech_motor, swallow, chew */
#define YY_CLASS_SPEECH 1

void yy_calibrate(const float *rest, int n, float *med, float *sigma);
void yy_features(const float *x, int n, float med, float sigma, float out[YY_NFEAT]);
bool yy_contact_ok(const float *x, int n);
void yy_mlp_proba(const float feat[YY_NFEAT], float p[YY_NCLASS]);

/* ---- outside channel (16 kHz mic) ---- */
#define YY_AUDIO_FS 16000
#define YY_FRAME 512        /* 32 ms */

typedef struct {
    float zh[2], zl[2];
    float floor_db;
    bool have_floor;
    uint16_t hist;          /* bit i: frame i ago was above the margin */
    float last_db;          /* the only two numbers kept per frame */
} yy_vad_t;

void yy_vad_init(yy_vad_t *v);
bool yy_vad_frame(yy_vad_t *v, const float *samples, int n);

/* ---- fusion ---- */
typedef enum { YY_IN_ACTIVE, YY_IN_NONE, YY_IN_NO_CONTACT } yy_inside_t;
typedef enum {
    YY_MUSCLE_NO_SPEECH,
    YY_MUSCLE_AND_SPEECH,
    YY_NOTHING_NO_SPEECH,
    YY_SPEECH_ONLY,
    YY_CANNOT_TELL
} yy_outcome_t;

#define YY_LOOKBACK_HOPS 20 /* 10 s of 0.5 s hops */

typedef struct {
    float p_speech[YY_LOOKBACK_HOPS];
    bool contact[YY_LOOKBACK_HOPS];
    bool outside[YY_LOOKBACK_HOPS];
    int head, count;
} yy_history_t;

void yy_history_push(yy_history_t *h, float p_speech, bool contact, bool outside_speech);
yy_inside_t yy_inside_state(const yy_history_t *h);
bool yy_outside_any(const yy_history_t *h);
yy_outcome_t yy_decide(yy_inside_t in, bool outside_speech);
bool yy_tap(yy_outcome_t o, bool cue_enabled);
const char *yy_wording(yy_outcome_t o);
const char *yy_wording_id(yy_outcome_t o);   /* Indonesian draft, needs clinical review */

/* ---- simulator: replays a scripted scenario through the SAME core ----
 * For demos when an electrode fails. Output is always SIMULATED data; it never
 * enables the tap and never touches a person's saved settings. */
typedef enum { YY_SIM_QUIET, YY_SIM_MOUTHING, YY_SIM_SPEECH_ONLY, YY_SIM_LEAD_OFF, YY_SIM_COUNT } yy_sim_t;
const char *yy_sim_name(yy_sim_t sc);
yy_outcome_t yy_sim_run(yy_sim_t sc);

#ifdef __cplusplus
}
#endif
