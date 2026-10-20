"""Encode the film: rendered frames + master audio → MP4, with the film look applied.

The frames from capture.js are clean digital paintings. This adds what a lens and a print
would: halation (warm glow bleeding from highlights), a faint mist bloom, the colour grade
(build/film.cube from lut.py) and a fine, moving grain.

Run: python3 tools/film/encode.py [--frames /home/user/filmframes] [--out film/you-yourself-film.mp4]
     python3 tools/film/encode.py --still in.jpg out.jpg      (preview the look on one frame)
"""
import argparse, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
LUT = os.path.join(HERE, "build", "film.cube")


def look(src="0:v", grain=True):
    """ffmpeg filtergraph for the film look, reading [src] and producing [out]."""
    thr = "clip((val-228)*5\\,0\\,255)"  # only real light sources: lamps, windows, the doorway
    g = (f"[{src}]format=gbrp,split=3[base][h][m];"
         # halation: highlights only, blurred, tinted warm red-orange
         f"[h]scale=480:270:flags=area,lutrgb=r='{thr}':g='{thr}':b='{thr}',gblur=sigma=9:steps=3,"
         "scale=1920:1080:flags=bicubic,colorchannelmixer=rr=1.0:gg=0.6:bb=0.4[hal];"
         # mist: the whole frame, very soft, very faint
         "[m]scale=240:135:flags=area,gblur=sigma=5:steps=3,scale=1920:1080:flags=bicubic[mist];"
         "[base][hal]blend=all_mode=screen:all_opacity=0.32[b1];"
         "[b1][mist]blend=all_mode=screen:all_opacity=0.07[b2];"
         f"[b2]lut3d='{LUT}',format=yuv420p")
    if grain:
        g += ",noise=c0s=3:c0f=t+u"  # fine and light: heavier grain costs megabytes and gets smeared by the codec anyway
    return g + "[out]"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", default="/home/user/filmframes")
    ap.add_argument("--out", default=os.path.join(ROOT, "film", "you-yourself-film.mp4"))
    ap.add_argument("--audio", default=os.path.join(HERE, "build", "master.wav"))
    ap.add_argument("--crf", default="18")
    ap.add_argument("--still", nargs=2)
    a = ap.parse_args()
    if not os.path.exists(LUT):
        subprocess.run([sys.executable, os.path.join(HERE, "lut.py")], check=True)
    if a.still:
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.still[0], "-filter_complex", look(),
                        "-map", "[out]", "-q:v", "2", a.still[1]], check=True)
        return
    tl = json.load(open(os.path.join(ROOT, "film", "timeline.json")))
    fps = tl.get("fps", 24)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-stats",
           "-framerate", str(fps), "-i", os.path.join(a.frames, "f%05d.jpg"), "-i", a.audio,
           "-filter_complex", look(), "-map", "[out]", "-map", "1:a",
           "-c:v", "libx264", "-preset", "slow", "-crf", a.crf, "-tune", "film", "-profile:v", "high",
           "-pix_fmt", "yuv420p", "-g", str(fps * 2), "-r", str(fps),
           "-c:a", "aac", "-b:a", "224k", "-shortest", "-movflags", "+faststart",
           "-metadata", "title=You, Yourself", a.out]
    subprocess.run(cmd, check=True)
    print("wrote", a.out, round(os.path.getsize(a.out) / 1e6, 1), "MB")


if __name__ == "__main__":
    main()
