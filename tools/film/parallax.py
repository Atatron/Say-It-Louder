"""Bring a still to life: a depth-aware camera move (2.5D parallax) rendered as a plate.

    /home/user/.venvs/cb/bin/python tools/film/parallax.py A1 [B1 ...]

Reads tools/film/build/stills/<id>.png, estimates depth (Depth Anything V2 Small), splits the image
and moves a virtual camera through it: every pixel is warped by its depth, so nearer things slide
and grow faster than far ones, like a slow dolly on a real set.
Writes 24 fps 1920x1080 frames to tools/film/build/plates/<id>/ for plates.py / the renderer.
Camera moves live in MOVES: keyframes (t, cx, cy, zoom) in image fractions, plus parallax strength.
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
    # following them in from the rain, toward the lit door
    "E1": {"dur": 5.0, "par": 0.10, "keys": [(0.0, 0.50, 0.52, 1.03), (5.0, 0.50, 0.46, 1.13)]},
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


def render(pid):
    mv = MOVES.get(pid, DEFAULT)
    src = cv2.cvtColor(cv2.imread(os.path.join(STILLS, pid + ".png")), cv2.COLOR_BGR2RGB)
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
