#include "yy_core.h"

#include <math.h>
#include <stdlib.h>
#include <string.h>

#include "emg_model.h"

#define THR_SIGMAS 3.0
#define THR_FLOOR 25.0
#define MIN_BURST 3
#define P_SPEECH 0.6f
#define MIN_CONSEC 2

/* ---------------- inside channel ---------------- */

static int cmp_float(const void *a, const void *b) {
    float x = *(const float *)a, y = *(const float *)b;
    return (x > y) - (x < y);
}

static float median_inplace(float *a, int n) {
    qsort(a, n, sizeof(float), cmp_float);
    return (n % 2) ? a[n / 2] : 0.5f * (a[n / 2 - 1] + a[n / 2]);
}

void yy_calibrate(const float *rest, int n, float *med, float *sigma) {
    float *tmp = (float *)malloc(sizeof(float) * n);
    memcpy(tmp, rest, sizeof(float) * n);
    float m = median_inplace(tmp, n);
    for (int i = 0; i < n; i++) tmp[i] = fabsf(rest[i] - m);
    float mad = median_inplace(tmp, n);
    free(tmp);
    *med = m;
    *sigma = fmaxf(1.4826f * mad, 1.0f);
}

void yy_features(const float *x, int n, float med, float sigma, float out[YY_NFEAT]) {
    double thr = med + fmax(THR_SIGMAS * sigma, THR_FLOOR);
    double sz = 0, szz = 0, zmax = -1e30, xmax = -1e30;
    int n_above = 0, longest = 0, run = 0, run_start = 0;
    int n_bursts = 0, burst_total = 0;
    int onsets[YY_WIN];
    int n_onsets = 0;

    for (int i = 0; i <= n; i++) {
        bool above = false;
        if (i < n) {
            double z = (x[i] - med) / sigma;
            sz += z;
            szz += z * z;
            if (z > zmax) zmax = z;
            if (x[i] > xmax) xmax = x[i];
            above = x[i] > thr;
            if (above) n_above++;
        }
        if (above) {
            if (run == 0) run_start = i;
            run++;
        } else if (run > 0) {
            if (run > longest) longest = run;
            if (run >= MIN_BURST) {
                n_bursts++;
                burst_total += run;
                if (n_onsets < YY_WIN) onsets[n_onsets++] = run_start;
            }
            run = 0;
        }
    }

    double mean_z = sz / n;
    double max_z = fmin(fmax(zmax, 0.0), 50.0);
    double var = szz / n - mean_z * mean_z;
    double std_z = sqrt(var > 0 ? var : 0);
    double peak = fmin(fmax((xmax - med) / (thr - med), 0.0), 50.0);
    double ibi_cv = 1.0;
    if (n_onsets >= 3) {
        double s = 0, ss = 0;
        int k = n_onsets - 1;
        for (int i = 1; i < n_onsets; i++) {
            double d = onsets[i] - onsets[i - 1];
            s += d;
            ss += d * d;
        }
        double m = s / k, v = ss / k - m * m;
        ibi_cv = m > 0 ? sqrt(v > 0 ? v : 0) / m : 1.0;
    }

    out[0] = (float)mean_z;
    out[1] = (float)log1p(max_z);
    out[2] = (float)std_z;
    out[3] = (float)n_above / n;
    out[4] = (float)longest / YY_FS;
    out[5] = (float)n_bursts;
    out[6] = n_bursts ? (float)burst_total / n_bursts / YY_FS : 0.0f;
    out[7] = (float)log1p(peak);
    out[8] = (float)ibi_cv;
}

bool yy_contact_ok(const float *x, int n) {
    /* Placeholder limits until bench recordings exist (paper, stage 0). */
    double s = 0, ss = 0;
    for (int i = 0; i < n; i++) { s += x[i]; ss += (double)x[i] * x[i]; }
    double m = s / n, v = ss / n - m * m;
    double sd = sqrt(v > 0 ? v : 0);
    if (m < 5 && sd < 0.5) return false;   /* flat near zero: lead off */
    if (m > 4095 - 20) return false;       /* pinned at the rail */
    return true;
}

void yy_mlp_proba(const float feat[YY_NFEAT], float p[YY_NCLASS]) {
    float xn[YY_MLP_IN], h[YY_MLP_HID], z[YY_MLP_OUT];
    for (int i = 0; i < YY_MLP_IN; i++) xn[i] = (feat[i] - YY_MU[i]) / YY_SD[i];
    for (int j = 0; j < YY_MLP_HID; j++) {
        float a = YY_B1[j];
        for (int i = 0; i < YY_MLP_IN; i++) a += xn[i] * YY_W1[i * YY_MLP_HID + j];
        h[j] = a > 0 ? a : 0;
    }
    float zmax = -1e30f;
    for (int k = 0; k < YY_MLP_OUT; k++) {
        float a = YY_B2[k];
        for (int j = 0; j < YY_MLP_HID; j++) a += h[j] * YY_W2[j * YY_MLP_OUT + k];
        z[k] = a;
        if (a > zmax) zmax = a;
    }
    float sum = 0;
    for (int k = 0; k < YY_MLP_OUT; k++) { z[k] = expf(z[k] - zmax); sum += z[k]; }
    for (int k = 0; k < YY_MLP_OUT; k++) p[k] = z[k] / sum;
}

/* ---------------- outside channel ---------------- */

typedef struct { float b0, b1, b2, a1, a2; } biquad_t;
static biquad_t HP, LP;
static bool coef_ready = false;

static biquad_t make_biquad(bool hp, double f0, double fs) {
    double w = 2 * M_PI * f0 / fs, c = cos(w), s = sin(w);
    double alpha = s / (2 * 0.7071), a0 = 1 + alpha;
    biquad_t q;
    if (hp) { q.b0 = (1 + c) / 2 / a0; q.b1 = -(1 + c) / a0; q.b2 = (1 + c) / 2 / a0; }
    else    { q.b0 = (1 - c) / 2 / a0; q.b1 = (1 - c) / a0;  q.b2 = (1 - c) / 2 / a0; }
    q.a1 = -2 * c / a0;
    q.a2 = (1 - alpha) / a0;
    return q;
}

static inline float step(const biquad_t *q, float *z, float x) {
    float y = q->b0 * x + z[0];
    z[0] = q->b1 * x - q->a1 * y + z[1];
    z[1] = q->b2 * x - q->a2 * y;
    return y;
}

void yy_vad_init(yy_vad_t *v) {
    if (!coef_ready) {
        HP = make_biquad(true, 300.0, YY_AUDIO_FS);
        LP = make_biquad(false, 3400.0, YY_AUDIO_FS);
        coef_ready = true;
    }
    memset(v, 0, sizeof(*v));
}

bool yy_vad_frame(yy_vad_t *v, const float *s, int n) {
    double acc = 0;
    for (int i = 0; i < n; i++) {
        float y = step(&LP, v->zl, step(&HP, v->zh, s[i]));
        acc += (double)y * y;
    }
    float db = (float)(10.0 * log10(acc / n + 1e-12));
    if (!v->have_floor) { v->floor_db = db; v->have_floor = true; }
    else if (db < v->floor_db) v->floor_db += 0.5f * (db - v->floor_db);
    else v->floor_db += 0.005f * (db - v->floor_db);
    v->hist = (uint16_t)((v->hist << 1) | (db > v->floor_db + 12.0f));
    v->last_db = db;
    /* at least 8 x 32 ms = 256 ms of the last 512 ms above the margin */
    return __builtin_popcount(v->hist) >= 8;
}

/* ---------------- fusion ---------------- */

void yy_history_push(yy_history_t *h, float p_speech, bool contact, bool outside) {
    h->p_speech[h->head] = p_speech;
    h->contact[h->head] = contact;
    h->outside[h->head] = outside;
    h->head = (h->head + 1) % YY_LOOKBACK_HOPS;
    if (h->count < YY_LOOKBACK_HOPS) h->count++;
}

/* index of the k-th oldest entry */
static int idx(const yy_history_t *h, int k) {
    return (h->head - h->count + k + YY_LOOKBACK_HOPS) % YY_LOOKBACK_HOPS;
}

yy_inside_t yy_inside_state(const yy_history_t *h) {
    int ok = 0, run = 0;
    for (int k = 0; k < h->count; k++) ok += h->contact[idx(h, k)];
    if (h->count == 0 || ok * 2 < h->count) return YY_IN_NO_CONTACT;
    for (int k = 0; k < h->count; k++) {
        int i = idx(h, k);
        run = (h->contact[i] && h->p_speech[i] >= P_SPEECH) ? run + 1 : 0;
        if (run >= MIN_CONSEC) return YY_IN_ACTIVE;
    }
    return YY_IN_NONE;
}

bool yy_outside_any(const yy_history_t *h) {
    for (int k = 0; k < h->count; k++) if (h->outside[idx(h, k)]) return true;
    return false;
}

yy_outcome_t yy_decide(yy_inside_t in, bool outside) {
    if (in == YY_IN_NO_CONTACT) return outside ? YY_SPEECH_ONLY : YY_CANNOT_TELL;
    if (in == YY_IN_ACTIVE) return outside ? YY_MUSCLE_AND_SPEECH : YY_MUSCLE_NO_SPEECH;
    return outside ? YY_SPEECH_ONLY : YY_NOTHING_NO_SPEECH;
}

bool yy_tap(yy_outcome_t o, bool cue_enabled) {
    return cue_enabled && o == YY_MUSCLE_NO_SPEECH;
}

const char *yy_wording(yy_outcome_t o) {
    switch (o) {
    case YY_MUSCLE_NO_SPEECH:
        return "Your speech muscles were active and no one near you was speaking. "
               "This voice may be your own inner speech.";
    case YY_MUSCLE_AND_SPEECH:
        return "There was real speech near you, and your speech muscles were active. "
               "This check can't separate the two.";
    case YY_NOTHING_NO_SPEECH:
        return "The sensor picked up nothing this time. That is common, and it says "
               "nothing about where the voice came from.";
    case YY_SPEECH_ONLY:
        return "The microphone heard real speech near you.";
    default:
        return "The muscle sensor isn't reading properly right now, so this check "
               "can't say anything about your muscles.";
    }
}

/* Indonesian DRAFT. Not yet reviewed by a clinician. */
const char *yy_wording_id(yy_outcome_t o) {
    switch (o) {
    case YY_MUSCLE_NO_SPEECH:
        return "Otot bicara Anda aktif dan tidak ada orang di dekat Anda yang berbicara. "
               "Suara ini mungkin berasal dari ucapan batin Anda sendiri.";
    case YY_MUSCLE_AND_SPEECH:
        return "Ada orang berbicara di dekat Anda, dan otot bicara Anda aktif. "
               "Pemeriksaan ini tidak dapat membedakan keduanya.";
    case YY_NOTHING_NO_SPEECH:
        return "Sensor tidak menangkap apa pun kali ini. Itu hal yang umum dan tidak "
               "menunjukkan dari mana suara itu berasal.";
    case YY_SPEECH_ONLY:
        return "Mikrofon mendengar ada orang berbicara di dekat Anda.";
    default:
        return "Sensor otot belum terbaca dengan baik saat ini, jadi pemeriksaan ini "
               "tidak dapat mengatakan apa pun tentang otot Anda.";
    }
}

/* ---------------- simulator ---------------- */

#define SIM_REST_N 1500                      /* 15 s of simulated rest for calibration */
#define SIM_N (19 * YY_HOP + YY_WIN)         /* 20 hops = 10 s of look-back */
#define SIM_BASE 300.0f

static float sim_rest[SIM_REST_N];
static float sim_stream[SIM_N];

static float sim_noise(uint32_t *r) {         /* about N(0, 6) */
    float a = 0;
    for (int i = 0; i < 4; i++) {
        *r ^= *r << 13; *r ^= *r >> 17; *r ^= *r << 5;
        a += ((*r & 0xFFFF) / 32768.0f) - 1.0f;
    }
    return a * 5.2f;
}

const char *yy_sim_name(yy_sim_t sc) {
    static const char *n[] = {"quiet room", "silent mouthing", "someone else speaking", "electrode lifted"};
    return (unsigned)sc < YY_SIM_COUNT ? n[sc] : "?";
}

static void sim_burst(float *x, int n, int start, int len, float amp) {
    for (int i = 0; i < len && start + i < n; i++) {
        float t = (float)i / YY_FS;
        x[start + i] += amp * (0.6f + 0.4f * fabsf(sinf(6.2831853f * 2.5f * t)));
    }
}

yy_outcome_t yy_sim_run(yy_sim_t sc) {
    uint32_t r = 2463534242u + (uint32_t)sc * 7919u;
    for (int i = 0; i < SIM_REST_N; i++) sim_rest[i] = SIM_BASE + sim_noise(&r);
    float med, sigma;
    yy_calibrate(sim_rest, SIM_REST_N, &med, &sigma);

    for (int i = 0; i < SIM_N; i++) sim_stream[i] = SIM_BASE + sim_noise(&r);
    if (sc == YY_SIM_MOUTHING) {
        sim_burst(sim_stream, SIM_N, 600, 180, 110.0f);
        sim_burst(sim_stream, SIM_N, 900, 150, 110.0f);
    }
    if (sc == YY_SIM_LEAD_OFF)
        for (int i = 0; i < SIM_N; i++) sim_stream[i] = 0;

    yy_history_t h;
    memset(&h, 0, sizeof h);
    for (int k = 0; k < YY_LOOKBACK_HOPS; k++) {
        const float *w = sim_stream + k * YY_HOP;
        bool ok = yy_contact_ok(w, YY_WIN);
        float p[YY_NCLASS] = {0};
        if (ok) {
            float f[YY_NFEAT];
            yy_features(w, YY_WIN, med, sigma, f);
            yy_mlp_proba(f, p);
        }
        bool outside = (sc == YY_SIM_SPEECH_ONLY) && k >= 8 && k <= 12;
        yy_history_push(&h, p[YY_CLASS_SPEECH], ok, outside);
    }
    return yy_decide(yy_inside_state(&h), yy_outside_any(&h));
}
