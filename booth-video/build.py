#!/usr/bin/env python3
"""
Builds the conference booth loop video from the site's own assets.

    python3 booth-video/build.py            # full build -> booth-video/out/X-traordinary-booth-loop.mp4
    python3 booth-video/build.py --desktop  # ...and copy the result to ~/Desktop
    python3 booth-video/build.py --only cards,final   # re-run just some steps (logo, record, cards, segments, final)
    python3 booth-video/build.py --only segments,final --seg pnp   # rebuild one segment, then re-stitch

Needs: ffmpeg + ffprobe (brew install ffmpeg) and Google Chrome.

How it works
  1. logo      pulls the big X logo out of images/xavierthurman-1080.mp4 and keys out the black
  2. record    records each live site in Chrome (hero video playing, scroll animations) -> out/rec/*.webm   [node record.mjs]
  3. cards     renders every card in cards.html to a 1920x1080 PNG with headless Chrome
  4. segments  makes one short mp4 per SEQUENCE entry (scrolling screenshots, overlays on video, slow push-ins)
  5. export    saves each trimmed site recording as its own mp4 in EXPORT_DIR (reusable clips)
  6. final     crossfades all segments together, no audio

To change wording -> edit cards.html.   To change order / timing -> edit SEQUENCE below.
"""
import os, sys, shutil, subprocess, argparse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")
SEG = os.path.join(OUT, "seg")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FINAL_NAME = "X-traordinary-booth-loop.mp4"
EXPORT_DIR = os.path.expanduser("~/Desktop/X-traordinary site recordings")   # standalone copies of each site recording
XFADE = 0.7   # seconds of crossfade between segments

# ---------------------------------------------------------------------------
# The video, in order. Each entry is one segment.
#   kind="video"   : a clip from the repo, optionally with a card overlaid (overlay fades in at `fade_at`)
#   kind="record"  : a portfolio card with the live-site recording out/rec/<name>.webm playing inside the browser frame
#   kind="scroll"  : a portfolio card with a static screenshot `shot` scrolling inside the frame (fallback)
#   kind="card"    : a static card with a slow push-in
#   dur            : seconds on screen
# ---------------------------------------------------------------------------
HERO = "images/xtraherosection-1080.mp4"
SEQUENCE = [
    dict(name="intro",   kind="video", src=HERO, start=0,  dur=11, card="intro", fade_at=2.5, fade_dur=1.2),
    dict(name="motion",  kind="video", src="images/xavierthurman-1080.mp4", start=0, dur=17.8),   # cut before its old end card
    dict(name="woh",   kind="record", dur=19),   # longer: record.mjs scrolls this one further
    dict(name="grid",  kind="record", dur=10.3),
    dict(name="vsc",   kind="record", dur=17),
    dict(name="lf",    kind="record", dur=10.3),
    dict(name="trk",   kind="record", dur=10.3),
    dict(name="pnp",   kind="record", dur=10.3),
    dict(name="build",   kind="video", src="images/The_build_timelapse_A_contain.mp4", start=0, dur=7, card="build", fade_at=0.8, fade_dur=0.8),
    dict(name="nda",     kind="card",  dur=7),
    dict(name="logos",   kind="card",  dur=6),
    dict(name="start",   kind="record", dur=10.3),
    dict(name="offer",   kind="video", src="images/video.mp4", start=0, dur=8, loop=True, card="offer", fade_at=0.6, fade_dur=0.9),
    dict(name="close",   kind="video", src=HERO, start=14, dur=9, card="close", fade_at=0.4, fade_dur=1.0),
]

ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-an", "-movflags", "+faststart"]

def sh(args, what):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"FAILED: {what}\n{r.stderr[-1500:]}")
    print("  ok", what)

def ff(args, what):
    sh(["ffmpeg", "-v", "error", "-y", *args], what)

def probe(path, entry):
    return subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", entry, "-of", "csv=p=0", path]).decode().strip()

def rp(p):  # repo-relative or out-relative path -> absolute
    return p if os.path.isabs(p) else os.path.join(HERE if p.startswith("out/") else REPO, p)

# ---- steps -----------------------------------------------------------------
def step_logo():
    ff(["-ss", "19.6", "-i", rp("images/xavierthurman-1080.mp4"), "-frames:v", "1", "-update", "1",
        "-vf", "crop=820:435:550:240,colorkey=0x000000:0.28:0.12", os.path.join(OUT, "logo.png")], "logo.png")

def step_record():
    names = [s["name"] for s in SEQUENCE if s["kind"] == "record"]
    sh(["node", os.path.join(HERE, "record.mjs"), *names], "record live sites")

def step_cards():
    import re
    ids = re.findall(r'<div class="card[^"]*" id="([^"]+)"', open(os.path.join(HERE, "cards.html")).read())
    for cid in ids:
        sh([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080",
            "--default-background-color=00000000", "--virtual-time-budget=6000",
            f"--screenshot={os.path.join(OUT, f'card-{cid}.png')}",
            f"file://{os.path.join(HERE, 'cards.html')}?card={cid}"], f"card-{cid}.png")

def step_segments(only=None):
    os.makedirs(SEG, exist_ok=True)
    for s in SEQUENCE:
        if only and s["name"] not in only: continue
        dest = os.path.join(SEG, f"{s['name']}.mp4")
        dur = s["dur"]
        if s["kind"] == "record":
            import json
            rec = os.path.join(OUT, "rec", f"{s['name']}.webm")
            meta = json.load(open(os.path.join(OUT, "rec", f"{s['name']}.json")))
            # the pass is the last `window` seconds of the file (robust to recorder time drift); older jsons fall back to trimStart
            trim = max(0.0, float(probe(rec, "format=duration").split("\n")[-1]) - meta["window"]) if "window" in meta else meta["trimStart"]
            ff(["-loop", "1", "-framerate", "30", "-t", str(dur), "-i", os.path.join(OUT, f"card-{s['name']}.png"),
                "-ss", f"{trim:.2f}", "-t", str(dur), "-i", rec,
                "-filter_complex", "[1:v]scale=1180:796:flags=lanczos,fps=30[rv];[0:v][rv]overlay=80:164:shortest=1,format=yuv420p",
                *ENC, dest], f"seg {s['name']}")
        elif s["kind"] == "scroll":
            shot = rp(s["shot"])
            w, h = map(int, probe(shot, "stream=width,height").split(","))
            scaled_h = h * 1180 / w
            maxy = max(0, scaled_h - 796)
            if "max_scroll" in s: maxy = min(maxy, s["max_scroll"])
            speed = min(maxy / 5.4, 420)               # px/s, so the scroll finishes ~1s before the cut
            y = f"min({maxy:.0f},max(0,t-0.9)*{speed:.1f})"
            ff(["-loop", "1", "-framerate", "30", "-t", str(dur), "-i", os.path.join(OUT, f"card-{s['name']}.png"),
                "-loop", "1", "-framerate", "30", "-t", str(dur), "-i", shot,
                "-filter_complex", f"[1:v]scale=1180:-2:flags=lanczos,crop=1180:796:0:'{y}'[sc];[0:v][sc]overlay=80:164:shortest=1,format=yuv420p",
                *ENC, dest], f"seg {s['name']}")
        elif s["kind"] == "card":
            ff(["-loop", "1", "-framerate", "30", "-t", str(dur), "-i", os.path.join(OUT, f"card-{s['name']}.png"),
                "-vf", f"scale=2400:1350:flags=lanczos,zoompan=z='1+0.03*in/({dur}*30)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,format=yuv420p",
                *ENC, dest], f"seg {s['name']}")
        else:  # video
            inp = []
            if s.get("loop"): inp += ["-stream_loop", "-1"]
            inp += ["-ss", str(s.get("start", 0)), "-t", str(dur), "-i", rp(s["src"])]
            if s.get("card"):
                ff([*inp, "-loop", "1", "-framerate", "30", "-t", str(dur), "-i", os.path.join(OUT, f"card-{s['card']}.png"),
                    "-filter_complex", f"[0:v]scale=1920:1080:flags=lanczos[bg];[1:v]format=rgba,fade=t=in:st={s['fade_at']}:d={s['fade_dur']}:alpha=1[ov];[bg][ov]overlay=0:0:shortest=1,format=yuv420p",
                    *ENC, dest], f"seg {s['name']}")
            else:
                ff([*inp, "-vf", "scale=1920:1080:flags=lanczos,format=yuv420p", *ENC, dest], f"seg {s['name']}")

def step_export():
    import json, datetime
    os.makedirs(EXPORT_DIR, exist_ok=True)
    stamp = datetime.date.today().isoformat()
    for s in SEQUENCE:
        if s["kind"] != "record": continue
        rec = os.path.join(OUT, "rec", f"{s['name']}.webm")
        meta = json.load(open(os.path.join(OUT, "rec", f"{s['name']}.json")))
        site = meta["url"].replace("https://", "").replace("http://", "").split("/")[0] if meta["url"].startswith("http") else "x-traordinarydevelopment.com-start"
        dest = os.path.join(EXPORT_DIR, f"{site}-{stamp}.mp4")
        ff(["-ss", f"{meta['trimStart']:.2f}", "-t", str(s["dur"]), "-i", rec, "-vf", "fps=30,format=yuv420p",
            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-an", "-movflags", "+faststart", dest], os.path.basename(dest))
    print(f"  site recordings saved in {EXPORT_DIR}")

def step_final(to_desktop):
    files = [os.path.join(SEG, f"{s['name']}.mp4") for s in SEQUENCE]
    durs = [float(probe(f, "format=duration").split("\n")[-1] or probe(f, "stream=duration")) for f in files]
    inputs = []
    for f in files: inputs += ["-i", f]
    chain, prev, off = [], "[0:v]", 0.0
    for i in range(1, len(files)):
        off += durs[i - 1] - XFADE
        out = f"[v{i}]" if i < len(files) - 1 else "[vout]"
        chain.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XFADE}:offset={off:.3f}{out}")
        prev = out
    dest = os.path.join(OUT, FINAL_NAME)
    ff([*inputs, "-filter_complex", ";".join(chain), "-map", "[vout]",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30", "-an", "-movflags", "+faststart", dest], FINAL_NAME)
    total = sum(durs) - XFADE * (len(files) - 1)
    print(f"\nDone: {dest}  ({total:.0f}s, {os.path.getsize(dest)/1e6:.0f} MB)")
    if to_desktop:
        d = os.path.expanduser(f"~/Desktop/{FINAL_NAME}")
        shutil.copy2(dest, d); print(f"Copied to {d}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="logo,record,cards,segments,export,final", help="comma list of steps to run")
    ap.add_argument("--desktop", action="store_true", help="also copy the finished video to ~/Desktop")
    ap.add_argument("--seg", default="", help="with segments: only rebuild these segment names, e.g. --seg pnp,close")
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    steps = a.only.split(",")
    for name, fn in (("logo", step_logo), ("record", step_record), ("cards", step_cards)):
        if name in steps:
            print(f"[{name}]"); fn()
    if "segments" in steps:
        print("[segments]"); step_segments(a.seg.split(",") if a.seg else None)
    if "export" in steps:
        print("[export]"); step_export()
    if "final" in steps:
        print("[final]"); step_final(a.desktop)
