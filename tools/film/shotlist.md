# You, Yourself — live-action shot list (AI-generated dramatization)

The animated story shots are replaced by live-action plates generated with an AI video model.
Everything else stays: the narration, score, captions, timing (`film/timeline.json`), the data /
science / device graphics, and the film look from `encode.py`.

## Rules

- **Never Senja's face.** Backs, silhouettes against windows, over-the-shoulder, hands, out of
  focus; the one exception is an extreme close-up of lips and chin for the sensor (no eyes).
  This keeps the anonymised case anonymous, and no viewer can take an AI actor for the real woman.
- **No identifiable people at all.** The family, the nurses and the shadow are hands, backs,
  silhouettes. No real places, no readable signs, no school or hospital names.
- **Disclosure** on the opening card and in the end credits:
  "Dramatization. Scenes are recreated with AI-generated imagery; no one shown is a real person
  from this story."
- **Continuity (Senja):** a young Indonesian woman in her twenties, dusty-rose hijab, dark teal
  cardigan over a cream blouse. Same words in every prompt.
- **Look:** 35 mm film, natural motivated light, shallow depth of field, slow deliberate camera,
  muted colour; dusk amber for the day, cold blue for the night. 24 fps, 16:9. No text, no
  subtitles, no logos, no music in the clips (the film has its own sound).

Common prompt suffix (`STYLE`):
> cinematic 35mm film still in motion, natural light, shallow depth of field, subtle film grain,
> muted colours, realistic, documentary drama, 24 fps, no text, no subtitles, no logos

Common negative prompt (`AVOID`):
> face, facial features, eyes, looking at camera, text, captions, watermark, logo, cartoon,
> animation, illustration, distorted hands, extra fingers

## Plates

Times are film seconds (from `film/timeline.json`). Clips are generated at the model's clip
length and trimmed to the window.

| id | window (s) | over the narration | prompt (+ STYLE) |
|----|-----------|--------------------|------------------|
| A1 | 8.79–16.42 | "We'll call her Senja. It isn't her real name. She's a young teacher, paid very little." | Dusk in an empty Indonesian junior-high classroom. The camera starts on a plain round wall clock, second hand moving, and slowly tilts down and pulls back to reveal a young Indonesian woman in a dusty-rose hijab and dark teal cardigan sitting alone at the teacher's desk, grading a tall stack of exam papers, seen from behind. Wooden desks and chairs, a chalkboard, louvered windows with palm trees outside, low golden sun, dust in the light beams. |
| B1 | 16.42–17.88 | "The eldest child." | Night, close on a family photograph in a simple wooden frame on a cluttered desk under a warm lamp: a family of five seen from behind, standing in front of green mountains. Slow push in. |
| B2 | 17.88–21.62 | "When her father died, the family began to lean on her." | Early evening, close shot of a pair of worn men's leather sandals beside a front door, unmoved, dust on the floor, dim blue light through the doorway, very still, slow push in. |
| C1 | 21.62–28.02 | "Her mother. Her younger siblings. Her students. And she has no one to tell." | Night in a small home: the same young woman in a dusty-rose hijab and dark teal cardigan sits alone at a desk piled with students' exercise books under a single lamp, seen from behind; she slowly lowers her head into her hands; the camera slowly pulls back to show how alone she is in the dim room; rain on the window. |
| D1 | 28.02–31.00 | "Then the whispers begin." | Night, rain streaming down a window, the desk lamp flickers; the young woman in a dusty-rose hijab at the desk goes still and slowly turns her head toward the dark corner of the room, seen from behind; cold blue moonlight. |
| D2 | 31.00–35.10 | "Four, five times a day. A black shadow walks toward her." | In the dark corner of a small room at night a tall human-shaped shadow on the wall slowly grows closer; rain-light patterns ripple on the wall; unsettling and subtle; no person visible. |
| D3 | 35.10–36.50 | "She covers her ears." | Close, from behind and slightly to the side: the young woman in a dusty-rose hijab presses both hands over her ears, shoulders trembling; blue night light; out-of-focus lamp. |
| E1 | 37.00–40.98 | "Her family takes her to a psychiatric hospital." | Night, heavy rain, the exterior of a modest single-storey hospital with one lit entrance door; three figures seen from behind walk slowly toward the door, two of them supporting a young woman in a dusty-rose hijab between them; wet pavement reflecting the light; fog. |
| F1 | 50.99–55.45 | "Her nurses try something simple. Paper. And a box of crayons." | Soft daylight in a quiet hospital activity room: a nurse's hands in light blue sleeves place a sheet of white paper and then an open box of eight wax crayons on a wooden table. Top-down. |
| G1 | 55.45–57.00 | "Day one: a tangle of black thread." | Close-up of a young woman's hand in a dark teal cardigan sleeve gripping a black wax crayon, scribbling hard in tangled loops on white paper, the drawing out of focus. |
| G3 | 63.23–65.00 | "Day three: the mountains…" | Close-up of the same hand drawing gentle green crayon lines on white paper in soft morning light, calm, the drawing out of focus. |
| M1 | 65.00–67.50 | "…she used to draw as a child, with her parents." | Warm nostalgic memory: a small child's hands drawing green crayon mountains on paper at a wooden table by a sunny window, a man's hand and a woman's hand resting beside the paper; soft, slightly overexposed, sepia warmth. |
| H1 | 124.90–128.30 | "Now imagine Senja, with it." | Dusk, her small room: over-the-shoulder of the young woman in a dusty-rose hijab and dark teal cardigan at a desk by a window, a child's crayon drawing of green mountains pinned on the wall, a smartphone in her hand, a thin cable from her chin to a small clip-on device at her collar; seen from behind. |
| H2 | 128.30–131.40 | "Her lips move, barely. No one else is speaking." | Extreme close-up in profile of a young woman's lower lip and chin only, no eyes: a small round sensor electrode taped just below the lower lip, the lips moving very slightly as if whispering to herself, soft window light, quiet room. |
| H3 | 131.40–137.30 | (button press, two taps) "Two soft taps. This is you. She hums one soft note," | Close-up of a small clip-on device on a dark teal cardigan collar, a tiny teal light blinks twice and it gives two soft vibrations; her shoulders relax; warm dusk light. |
| H4 | 137.30–146.28 | "…and the voice grows quiet. Each moment is saved in a diary, for her doctors and nurses." | From behind, the young woman sits back, breathes out slowly and rests her hands calmly on the desk; warm golden light slowly fills the room; the dark corner of the room is empty; the phone lies on the desk. |
| I1 | 155.00–159.30 | "Senja found her way home with crayons." | Morning light, over the shoulder: the young woman's hand in a dark teal sleeve pins a child-like crayon drawing of green mountains and a yellow sun onto a wall with a red push-pin, then rests her palm on it. |

Kept as graphics: the opening card, data (40.98–50.99), the three drawings and the chart (57–74),
science, title, machine, app, outside channel, the phone HUD over H1–H4, the promise, the final
drawing with "come home", and the end card.

## Order of work

1. Two test clips (A1, D3) to lock the look and the wardrobe.
2. Optionally a reference still of Senja from behind (image model) to use as the first frame of
   the clips in the same location, for continuity.
3. The rest, then cut, grade (`encode.py`), mix (unchanged), render, review.
