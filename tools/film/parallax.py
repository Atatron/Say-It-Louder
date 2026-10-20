"""Bring a still to life: a depth-aware camera move (2.5D parallax) rendered as a plate.

    /home/user/.venvs/cb/bin/python tools/film/parallax.py A1 [B1 ...]

Reads tools/film/build/stills/<id>.png, estimates depth (Depth Anything V2 Small), splits the image
and moves a virtual camera through it: every pixel is warped by its depth, so nearer things slide
and grow faster than far ones, like a slow dolly on a real set.
Writes 24 fps 1920x1080 frames to tools/film/build/plates/<id>/ for plates.py / the renderer.
Camera moves live in MOVES: keyframes (t, cx, cy, zoom) in image fractions, plus parallax strength,
and optional touch-ups on the still (a grade, drawn-in electrodes, a mirror).
"""
import os, sys
import numpy as np
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
STILLS, PLATES = os.path.join(HERE, "build", "stills"), os.path.join(HERE, "build", "plates")
FPS, OUT_W, OUT_H, WORK_W, WORK_H = 24, 1920, 1080, 2560, 1440

# keyframes: (seconds, centre x, centre y, zoom); par: how much nearer layers out-move far ones
MOVES = {
    # close on her back and the stack of papers, then a long pull back: the whole empty classroom around her
    "A1": {"dur": 8.8, "par": 0.10, "keys": [(0.0, 0.64, 0.60, 1.38), (5.2, 0.56, 0.52, 1.06), (8.8, 0.55, 0.52, 1.04)]},
    # the family photo: a slow push into the frame
    "B1": {"dur": 2.6, "par": 0.08, "keys": [(0.0, 0.58, 0.48, 1.04), (2.6, 0.60, 0.47, 1.11)]},
    # his sandals by the door, unmoved: settle down toward them
    "B2": {"dur": 4.8, "par": 0.10, "keys": [(0.0, 0.46, 0.54, 1.03), (4.8, 0.40, 0.60, 1.13)]},
    # alone at her desk at night: the camera backs away and leaves her there
    "C1": {"dur": 7.4, "par": 0.10, "keys": [(0.0, 0.48, 0.47, 1.18), (7.4, 0.49, 0.52, 1.03)]},
    # the whispers begin: creeping in on her back
    "D1": {"dur": 4.0, "par": 0.08, "keys": [(0.0, 0.44, 0.50, 1.04), (4.0, 0.42, 0.47, 1.12)]},
    # the shadow on the wall: closing in on it
    "D2": {"dur": 5.1, "par": 0.10, "keys": [(0.0, 0.45, 0.50, 1.02), (5.1, 0.40, 0.52, 1.16)]},
    # following them in from the rain, toward the lit door
    "E1": {"dur": 5.0, "par": 0.10, "keys": [(0.0, 0.50, 0.52, 1.03), (5.0, 0.50, 0.46, 1.13)]},
    # day three: drifting toward the green lines as she draws
    "G3": {"dur": 2.8, "par": 0.08, "keys": [(0.0, 0.50, 0.50, 1.04), (2.8, 0.55, 0.52, 1.10)]},
    # the device at her collar, framed below her chin; plates.py's H3 blink follows this move
    "H3": {"dur": 6.9, "par": 0.06, "keys": [(0.0, 0.50, 0.57, 1.22), (6.9, 0.50, 0.58, 1.28)]},
    # her hand pressed to her head; graded from lamplight to the blue night of D1 and D2, and mirrored so
    # the hand is clear of the callout the voice scene draws top right
    "D3": {"dur": 2.9, "par": 0.08, "keys": [(0.0, 0.50, 0.50, 1.05), (2.9, 0.48, 0.48, 1.11)],
           "grade": {"wb": (0.66, 1.0, 1.32), "exp": 0.95}, "flip": True},
    # her lips, barely moving; the model left out the sensor, so its two electrodes are drawn on the skin
    # (flipped so her lips sit left of the signal panels the imagine scene draws on the right)
    "H2": {"dur": 4.1, "par": 0.06, "keys": [(0.0, 0.47, 0.52, 1.10), (4.1, 0.47, 0.53, 1.15)], "flip": True,
           "electrodes": {"at": [(910, 462), (948, 486)], "r": 17, "wire_to": (640, 770)}},
    # calm at last: warm dusk, a slow drift in (plates.py adds the light filling the room); flipped to keep
    # her clear of the phone panel on the right
    "H4": {"dur": 10.0, "par": 0.08, "keys": [(0.0, 0.50, 0.50, 1.03), (10.0, 0.49, 0.48, 1.12)], "flip": True},
    # the nurse's hands, the paper, the box of crayons: settling onto the box
    "F1": {"dur": 5.5, "par": 0.06, "keys": [(0.0, 0.48, 0.50, 1.04), (5.5, 0.44, 0.45, 1.13)]},
    # day one: in on the black tangle
    "G1": {"dur": 2.6, "par": 0.08, "keys": [(0.0, 0.50, 0.50, 1.04), (2.6, 0.46, 0.46, 1.12)]},
    # the memory: a child's hand and a parent's, warm and soft like an old photo
    "M1": {"dur": 3.5, "par": 0.08, "keys": [(0.0, 0.50, 0.50, 1.03), (3.5, 0.52, 0.48, 1.09)],
           "grade": {"wb": (1.1, 1.0, 0.84), "exp": 1.06, "soft": 0.35}},
    # imagine: her room at dusk, the mountains outside
    "H1": {"dur": 4.4, "par": 0.10, "keys": [(0.0, 0.50, 0.50, 1.03), (4.4, 0.50, 0.48, 1.10)]},
    # home: the drawing goes up on the wall
    "I1": {"dur": 5.3, "par": 0.06, "keys": [(0.0, 0.50, 0.50, 1.03), (5.3, 0.48, 0.48, 1.10)]},
}
DEFAULT = {"dur": 8.0, "par": 0.08, "keys": [(0.0, 0.5, 0.5, 1.03), (8.0, 0.5, 0.5, 1.10)]}

_depth = None


def depth_of(img_rgb):
    global _depth
    if _depth is None:
        from transformers import pipeline
        _depth = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
    from PIL import Image
    d = np.array(_depth(Image.fromarray(img_rgb))["predicted_depth"].squeeze(), dtype=np.float32)
    d = cv2.resize(d, (img_rgb.shape[1], img_rgb.shape[0]), interpolation=cv2.INTER_CUBIC)
    lo, hi = np.percentile(d, 2), np.percentile(d, 98)
    return np.clip((d - lo) / (hi - lo + 1e-6), 0, 1)  # 1 = nearest


def cam(keys, t):
    if t <= keys[0][0]:
        return keys[0][1:]
    for (t0, *a), (t1, *b) in zip(keys, keys[1:]):
        if t <= t1:
            u = (t - t0) / (t1 - t0)
            u = u * u * (3 - 2 * u)
            return [x + (y - x) * u for x, y in zip(a, b)]
    return keys[-1][1:]


def electrodes(img, at, r, wire_to, angle=-25):
    """Small round skin electrodes (foam patch, grey snap) with soft shadows and a thin lead each,
    drawn 4x oversampled in a box around them, then softened to the plate's focus. img: float RGB."""
    S = 4
    pts = np.array(list(at) + [wire_to], np.float32)
    x0, y0 = np.maximum(np.floor(pts.min(0) - 3 * r), 0).astype(int)
    x1, y1 = np.minimum(np.ceil(pts.max(0) + 3 * r), [img.shape[1], img.shape[0]]).astype(int)
    rh, rw = (y1 - y0) * S, (x1 - x0) * S
    pre, alpha = np.zeros((rh, rw, 3), np.float32), np.zeros((rh, rw), np.float32)  # premultiplied layer
    P = lambda x, y: (int(round((x - x0) * S)), int(round((y - y0) * S)))
    ax = lambda k: (int(r * k * 0.8 * S), int(r * k * S))  # foreshortened on the curve of the chin

    def stamp(draw, color, a, blur=0.0):
        m = np.zeros((rh, rw), np.float32)
        draw(m)
        if blur:
            m = cv2.GaussianBlur(m, (0, 0), blur * S)
        m *= a
        pre[:] = np.array(color, np.float32) * m[..., None] + pre * (1 - m[..., None])
        alpha[:] = m + alpha * (1 - m)

    def lead(m, x, y, dx=0, dy=0, w=2.2):
        c, e = np.array([x + dx, y + dy + r * 0.6]), np.array(wire_to, np.float32) + [dx, dy]
        k = np.array([c[0] - 40, (c[1] + e[1]) / 2 + 30])  # sags toward the jaw
        u = np.linspace(0, 1, 60)[:, None]
        curve = (1 - u) ** 2 * c + 2 * (1 - u) * u * k + u ** 2 * e
        cv2.polylines(m, [np.round((curve - [x0, y0]) * S).astype(np.int32)], False, 1.0, int(w * S), cv2.LINE_AA)

    for x, y in at:
        stamp(lambda m: lead(m, x, y, 1.5, 2.0), (0, 0, 0), 0.25, 1.5)
        stamp(lambda m: lead(m, x, y, w=1.8), (196, 196, 204), 0.85)
    for x, y in at:
        stamp(lambda m: cv2.ellipse(m, P(x + 3, y + 4), ax(1), angle, 0, 360, 1.0, -1, cv2.LINE_AA), (0, 0, 0), 0.35, 3.0)
        stamp(lambda m: cv2.ellipse(m, P(x, y), ax(1), angle, 0, 360, 1.0, -1, cv2.LINE_AA), (228, 221, 210), 1.0)
        stamp(lambda m: cv2.ellipse(m, P(x, y), ax(0.9), angle, 0, 360, 1.0, int(1.5 * S), cv2.LINE_AA), (200, 192, 182), 0.8)
        stamp(lambda m: cv2.ellipse(m, P(x, y), ax(0.34), angle, 0, 360, 1.0, -1, cv2.LINE_AA), (140, 140, 146), 1.0)
        stamp(lambda m: cv2.ellipse(m, P(x - r * 0.25, y - r * 0.3), ax(0.18), angle, 0, 360, 1.0, -1, cv2.LINE_AA),
              (255, 255, 255), 0.45, 1.5)
    pre = cv2.GaussianBlur(cv2.resize(pre, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA), (0, 0), 0.9)
    alpha = cv2.GaussianBlur(cv2.resize(alpha, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA), (0, 0), 0.9)
    img[y0:y1, x0:x1] = pre + img[y0:y1, x0:x1] * (1 - alpha[..., None])
    return img


def touch_up(src, mv):
    """Fixes on the still itself, so they move with it: a white balance and exposure grade (to match the
    shots around it), drawn-in electrodes (coordinates in the still's own pixels), a mirror."""
    if not ({"grade", "electrodes", "flip"} & set(mv)):
        return src
    img = src.astype(np.float32)
    if "grade" in mv:
        g = mv["grade"]
        img *= np.array(g.get("wb", (1, 1, 1)), np.float32) * g.get("exp", 1.0)
        if g.get("soft"):  # a glow of its own blurred copy: the soft focus of a memory
            img = img * (1 - g["soft"]) + cv2.GaussianBlur(img, (0, 0), 9) * g["soft"]
    if "electrodes" in mv:
        img = electrodes(img, **mv["electrodes"])
    if mv.get("flip"):  # mirrored, after the touch-ups (their coordinates are the still's own)
        img = img[:, ::-1]
    return np.clip(img, 0, 255).astype(np.uint8)


def render(pid):
    mv = MOVES.get(pid, DEFAULT)
    src = touch_up(cv2.cvtColor(cv2.imread(os.path.join(STILLS, pid + ".png")), cv2.COLOR_BGR2RGB), mv)
    h, w = src.shape[:2]
    s = max(WORK_W / w, WORK_H / h)
    img = cv2.resize(src, (round(w * s), round(h * s)), interpolation=cv2.INTER_CUBIC if s > 1 else cv2.INTER_AREA)
    y0, x0 = (img.shape[0] - WORK_H) // 2, (img.shape[1] - WORK_W) // 2
    img = img[y0:y0 + WORK_H, x0:x0 + WORK_W]
    dpath = os.path.join(STILLS, pid + "_depth.png")
    if os.path.exists(dpath):
        d = cv2.imread(dpath, cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535
    else:
        d = depth_of(img)
        cv2.imwrite(dpath, (d * 65535).astype(np.uint16))
    d = cv2.GaussianBlur(d, (0, 0), 2.0)  # soften depth edges: less tearing at object borders
    out = os.path.join(PLATES, pid)
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))
    n = int(round(mv["dur"] * FPS))
    k0 = mv["keys"][0][1:]
    u, v = np.meshgrid(np.arange(OUT_W, dtype=np.float32), np.arange(OUT_H, dtype=np.float32))
    for i in range(n):
        t = i / FPS
        cx, cy, z = cam(mv["keys"], t)
        cx += 0.0012 * np.sin(t * 0.9) + 0.0007 * np.sin(t * 2.3 + 1)  # a breath of handheld drift
        cy += 0.0010 * np.sin(t * 1.1 + 2)
        # keep the frame inside the image (no mirrored borders), with a margin for the parallax
        m = 0.5 / z + mv["par"] * 0.15
        cx, cy = float(np.clip(cx, m, 1 - m)), float(np.clip(cy, m, 1 - m))
        sc = z * OUT_W / WORK_W

        def src_of(dd):
            # a point at depth dd (1 = near) sees the camera move exaggerated: it slides and scales more
            p = 1 + mv["par"] * (dd - 0.5) * 2
            zz = sc * (1 + mv["par"] * 0.6 * (dd - 0.5) * (z - k0[2]))
            lx = (k0[0] + (cx - k0[0]) * p) * WORK_W
            ly = (k0[1] + (cy - k0[1]) * p) * WORK_H
            return (u - OUT_W / 2) / zz + lx, (v - OUT_H / 2) / zz + ly

        # backward warp: find each output pixel's source with the depth found there (two refinements)
        mx, my = src_of(0.5)
        for _ in range(2):
            dd = cv2.remap(d, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            mx, my = src_of(dd)
        frame = cv2.remap(img, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        cv2.imwrite(os.path.join(out, f"f{i + 1:04d}.jpg"), cv2.cvtColor(frame, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 94])
    print(f"{pid}: {n} frames ({mv['dur']} s)")


if __name__ == "__main__":
    for pid in sys.argv[1:]:
        render(pid)
