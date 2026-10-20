"""Generate live-action stills locally with an open photoreal model. No service, no credits.

    /home/user/.venvs/cb/bin/python tools/film/genstills.py C1 D1 [--keep 1] [--tries 3] [--seed0 1]
    /home/user/.venvs/cb/bin/python tools/film/genstills.py pick C1=2 D1=1
    /home/user/.venvs/cb/bin/python tools/film/genstills.py decode     # finish an interrupted run

Uses RealVisXL V5.0 Lightning (SDXL, OpenRAIL++; download with
`hf download SG161222/RealVisXL_V5.0_Lightning --local-dir /home/user/models/realvisxl5l`).
It runs on the CPU in passes so it fits in 15 GB: the text encoders turn prompts into embeddings,
the UNet turns those into latents, and once it is freed the VAE decodes them.
Each try takes about 5 minutes on 4 cores. A face detector (YuNet, in /home/user/models/yunet) checks a
quick preview from the tiny SDXL decoder (taesdxl, in /home/user/models/taesdxl) and rejects any try that
shows her face. Candidates go to tools/film/build/stills/cand/<id>_s<seed>.png.
`pick` copies the chosen candidate to build/stills/<id>.png, where parallax.py looks for it.
The prompts follow tools/film/shotlist.md: her face is never shown, and the hair and cardigan
are the same in every shot. Each prompt has to fit CLIP's 77 tokens, and the script checks this.
"""
import argparse, gc, os, shutil, sys, time
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
STILLS = os.path.join(HERE, "build", "stills")
CAND = os.path.join(STILLS, "cand")
MODEL = os.environ.get("STILLS_MODEL", "/home/user/models/realvisxl5l")
W, H = 1344, 768  # SDXL's 16:9-ish bucket; parallax.py crops to 16:9
FACE_MAX = 0.72  # YuNet face score above which a candidate is rejected (her face is never shown)
FACE_OK = {"H2"}  # the one planned exception: lips and chin only, no eyes
NEG_PLUS = {  # per-shot additions to NEG, for mistakes a shot kept making
    "H1": "snow, snowy peaks",
    "H4": "two people, two women, duplicate person",
    "D3": "earphones, headphones",
    "F1": "pens, markers",
    "G1": "green lines, teal lines, colored lines, marker pen",
}

HER = "young Indonesian woman with long straight black hair in a low ponytail, dark teal cardigan"
STYLE = "35mm film still, natural light, shallow depth of field, film grain, muted colors, photorealistic"
NEG = ("face, eyes, nose, profile, side view, looking at camera, portrait, cartoon, illustration, painting, anime, 3d render, text, letters, "
       "watermark, logo, deformed hands, extra fingers, blurry, lowres, oversaturated, hijab, headscarf")

PROMPTS = {
    "A1": f"dusk, empty Indonesian classroom, back view of a {HER}, grading a tall stack of exam papers at the teacher's desk, "
          "wall clock, chalkboard, louvered windows, golden light",
    "B1": "night, close-up of a framed family photo on a cluttered desk under a warm lamp, the photo shows a family of five "
          "from behind facing green mountains",
    "B2": "early evening, a pair of worn men's leather sandals beside the open front door of a simple Indonesian house, "
          "dusty tiled floor, dim blue light, still",
    "C1": f"rear view from behind, a {HER}, face hidden, alone at night at a wooden desk piled with exercise books, "
          "head in her hands, one warm desk lamp, rain on the window",
    "D1": f"rear view from behind, a {HER}, face hidden, sitting very still at a desk at night in a small bedroom, "
          "rain on the window, cold blue moonlight",
    "D2": "night, dark corner of a small empty bedroom, a tall human-shaped shadow on the plain wall, "
          "rain light patterns on the wall, cold blue light, eerie, no people",
    "D3": f"close-up from behind, both hands pressed flat over her ears, fingers in her hair, a {HER}, face hidden, "
          "hunched, dark bedroom, cold blue night light",
    "E1": "rear view from behind, night, heavy rain, three people walking toward the one lit entrance door of a small "
          "single-storey hospital, two supporting a young woman, wet pavement, fog",
    "F1": "top-down view, an open cardboard box of eight colorful wax crayons beside a blank white sheet of paper "
          "on a wooden table, a nurse's hands in light blue sleeves, soft daylight",
    "G1": "close-up, tangled black crayon scribbles on white paper, a young woman's hand in a dark teal knitted sleeve "
          "gripping a black wax crayon, pressing hard, soft daylight",
    "G3": "close-up, a young woman's hand in a dark teal knitted sleeve drawing soft green crayon mountain lines "
          "on white paper, calm morning light",
    "M1": "nostalgic memory, a small child's hands drawing green crayon mountains and a yellow sun at a wooden table "
          "by a sunny window, parents' hands beside the paper, warm sepia",
    "H1": f"over-the-shoulder rear view, a {HER}, face hidden, at a desk by a window at dusk holding a smartphone, "
          "green volcanic mountains of Java outside",
    "H2": "extreme macro close-up in profile of a young woman's lips and chin only, cropped below the nose, "
          "a small round skin sensor taped below her lower lip, soft window light",
    "H3": "close-up of a small matte grey clip-on device with a tiny teal light, clipped to the collar of a dark teal "
          "knitted cardigan, strands of long black hair, warm dusk light",
    "H4": f"rear view from behind, one {HER}, alone, face hidden, sitting back calmly at a desk by a window, "
          "warm golden dusk light fills the small bedroom",
    "I1": "morning light, close-up, a young woman's hand in a dark teal knitted sleeve pinning a child's crayon drawing "
          "of green mountains and a yellow sun to a pale wall",
}


def text(pid):
    return f"{PROMPTS[pid]}, {STYLE}"


def encode(texts):
    """{key: text} -> {key: (prompt_embeds, pooled)} with SDXL's two CLIP encoders, then free them."""
    from transformers import CLIPTextModel, CLIPTextModelWithProjection, CLIPTokenizer
    toks = [CLIPTokenizer.from_pretrained(MODEL, subfolder=s) for s in ("tokenizer", "tokenizer_2")]
    encs = [CLIPTextModel.from_pretrained(MODEL, subfolder="text_encoder", variant="fp16", torch_dtype=torch.float32),
            CLIPTextModelWithProjection.from_pretrained(MODEL, subfolder="text_encoder_2", variant="fp16", torch_dtype=torch.float32)]
    out = {}
    with torch.no_grad():
        for key, t in texts.items():
            n = len(toks[0](t).input_ids)
            if n > 77:
                print(f"warning: {key} is {n} tokens; CLIP reads only the first 77", file=sys.stderr)
            hidden = []
            for tok, enc in zip(toks, encs):
                ids = tok(t, padding="max_length", max_length=77, truncation=True, return_tensors="pt").input_ids
                o = enc(ids, output_hidden_states=True)
                hidden.append(o.hidden_states[-2])
                pooled = o[0]  # the second encoder's projected text embedding
            out[key] = (torch.cat(hidden, dim=-1), pooled)
    del encs
    gc.collect()
    return out


_yunet = None


def face_score(rgb):
    """Highest face-detector confidence in an RGB image (0 if none)."""
    global _yunet
    import cv2
    if _yunet is None:
        _yunet = cv2.FaceDetectorYN.create(os.path.join(os.path.dirname(MODEL), "yunet", "face_detection_yunet_2023mar.onnx"),
                                           "", (320, 320), 0.5)
    k = 960 / rgb.shape[1]
    small = cv2.resize(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), (960, round(rgb.shape[0] * k)))
    _yunet.setInputSize((small.shape[1], small.shape[0]))
    faces = _yunet.detect(small)[1]
    return 0.0 if faces is None else float(faces[:, -1].max())


def rgb8(img):
    return ((img / 2 + 0.5).clamp(0, 1).permute(1, 2, 0).numpy() * 255).round().astype("uint8")


def generate(ids, seed0, tries, keep, steps, cfg):
    """For each id, try seeds until `keep` candidates pass the face check (a tiny decoder previews each one).
    Then the UNet is freed and the full VAE decodes the keepers: both at once overflow 15 GB, and a tiled
    decode would show seams."""
    from diffusers import (AutoencoderKL, AutoencoderTiny, DPMSolverMultistepScheduler, StableDiffusionXLPipeline,
                           UNet2DConditionModel)
    from PIL import Image
    emb = encode({**{pid: text(pid) for pid in ids},
                  **{pid + "_neg": f"{NEG}, {NEG_PLUS[pid]}" if pid in NEG_PLUS else NEG for pid in ids}})
    vae = AutoencoderKL.from_pretrained(MODEL, subfolder="vae", variant="fp16", torch_dtype=torch.float32)
    tiny = AutoencoderTiny.from_pretrained(os.path.join(os.path.dirname(MODEL), "taesdxl"), torch_dtype=torch.float32)
    unet = UNet2DConditionModel.from_pretrained(MODEL, subfolder="unet", variant="fp16", torch_dtype=torch.float32)
    # DPM++ 2M SDE: one UNet call per step (DPM++ SDE costs two)
    sched = DPMSolverMultistepScheduler.from_pretrained(MODEL, subfolder="scheduler", algorithm_type="sde-dpmsolver++",
                                                        use_karras_sigmas=True)
    pipe = StableDiffusionXLPipeline(vae=vae, text_encoder=None, text_encoder_2=None, tokenizer=None, tokenizer_2=None,
                                     unet=unet, scheduler=sched, add_watermarker=False)
    pipe.set_progress_bar_config(disable=True)
    os.makedirs(CAND, exist_ok=True)
    todo = []
    for pid in ids:
        (pe, pooled), (neg, neg_pooled), kept = emb[pid], emb[pid + "_neg"], 0
        for seed in range(seed0, seed0 + tries):
            t0, lat = time.time(), os.path.join(CAND, f"{pid}_s{seed}.pt")
            with torch.no_grad():
                z = pipe(prompt_embeds=pe, pooled_prompt_embeds=pooled, negative_prompt_embeds=neg,
                         negative_pooled_prompt_embeds=neg_pooled, width=W, height=H, num_inference_steps=steps,
                         guidance_scale=cfg, generator=torch.Generator().manual_seed(seed), output_type="latent").images
                look = rgb8(tiny.decode(z).sample[0])
            f = 0.0 if pid in FACE_OK else face_score(look)
            took = f"{time.time() - t0:.0f} s"
            if f >= FACE_MAX:
                Image.fromarray(look).save(os.path.join(CAND, f"{pid}_s{seed}_face.jpg"))
                print(f"{pid} seed {seed}: shows a face ({f:.2f}), rejected ({took})", flush=True)
                continue
            torch.save(z, lat)  # kept until decoded, so a crash loses nothing
            todo.append(lat)
            kept += 1
            print(f"{pid} seed {seed}: kept, face score {f:.2f} ({took})", flush=True)
            if kept == keep:
                break
    del pipe, unet
    gc.collect()
    decode(vae, todo)


def decode(vae, lats):
    from PIL import Image
    for lat in lats:
        with torch.no_grad():
            img = vae.decode(torch.load(lat) / vae.config.scaling_factor).sample[0]
        Image.fromarray(rgb8(img)).save(lat[:-3] + ".png")
        os.remove(lat)
        print(f"-> {os.path.relpath(lat[:-3] + '.png', HERE)}", flush=True)


def pick(choices):
    for c in choices:
        pid, seed = c.split("=")
        shutil.copyfile(os.path.join(CAND, f"{pid}_s{seed}.png"), os.path.join(STILLS, pid + ".png"))
        stale = os.path.join(STILLS, pid + "_depth.png")  # parallax.py caches depth per still
        if os.path.exists(stale):
            os.remove(stale)
        print(f"{pid}: seed {seed} -> build/stills/{pid}.png")


def main():
    if sys.argv[1:2] == ["pick"]:
        return pick(sys.argv[2:])
    if sys.argv[1:2] == ["decode"]:  # latents left by an interrupted run
        from diffusers import AutoencoderKL
        vae = AutoencoderKL.from_pretrained(MODEL, subfolder="vae", variant="fp16", torch_dtype=torch.float32)
        return decode(vae, sorted(os.path.join(CAND, f) for f in os.listdir(CAND) if f.endswith(".pt")))
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--keep", type=int, default=1, help="face-free candidates wanted per id")
    ap.add_argument("--tries", type=int, default=3, help="seeds to try per id")
    ap.add_argument("--seed0", type=int, default=1)
    ap.add_argument("--steps", type=int, default=7)
    ap.add_argument("--cfg", type=float, default=1.5)
    a = ap.parse_args()
    ids = a.ids or [p for p in PROMPTS if not os.path.exists(os.path.join(STILLS, p + ".png"))]
    unknown = [p for p in ids if p not in PROMPTS]
    if unknown:
        sys.exit(f"unknown still id(s) {', '.join(unknown)}; known: {', '.join(PROMPTS)}")
    torch.set_num_threads(os.cpu_count() or 4)
    generate(ids, a.seed0, a.tries, a.keep, a.steps, a.cfg)


if __name__ == "__main__":
    main()
