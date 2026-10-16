#!/usr/bin/env python3
"""
Builds the premium Meta ad set from phone-viewport site recordings + caption cards in ads.html.

    MOBILE=1 node booth-video/record.mjs vsc pnp woh trk   # (once) phone recordings of the sites the ads show
    python3 booth-video/ads/build_ads.py                    # -> booth-video/out/ads/  and  ~/Desktop/X-traordinary Meta ads/

Outputs
  P1_premium_9x16.mp4    type hook (3.5s) -> VSC Peptides -> Plates & Playmakers -> R3D Key, each ~4.2s with a caption -> end card
  P2_selective_9x16.mp4  opens straight on the work: Plates -> VSC -> Works of Heart -> end card
  P2_selective_4x5.mp4   feed version
  S1_premium_4x5.png / S1_premium_1x1.png / S2_not-templated_4x5.png / S3_before-you-commit_4x5.png
All silent, captions burned in. Every visual is a real site you built; no stock, no generated footage.
"""
import os, sys, json, shutil, subprocess, re

HERE = os.path.dirname(os.path.abspath(__file__))
BOOTH = os.path.dirname(HERE)
OUT = os.path.join(BOOTH, "out", "ads")
RECDIR = os.path.join(BOOTH, "out", "rec-mobile")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DESK = os.path.expanduser("~/Desktop/X-traordinary Meta ads")
SIZES = {"9x16": (1080, 1920), "4x5": (1080, 1350), "1x1": (1080, 1080)}
PHONE = {"9x16": (220, 430, 640, 1386), "4x5": (330, 300, 420, 909)}   # x, y, w, h of the transparent screen (matches ads.html)
ENC = ["-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-r", "30", "-an", "-movflags", "+faststart"]
XF = 0.6

def sh(args, what):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode: sys.exit(f"FAILED: {what}\n{r.stderr[-1500:]}")
    print("  ok", what)
def ff(args, what): sh(["ffmpeg", "-v", "error", "-y", *args], what)
def dur(p): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).decode().strip())

WINDOW_FALLBACK = {"vsc": 9.4, "pnp": 9.4, "woh": 9.4, "trk": 11.6}   # hold+scroll+tail for recordings made before `window` was written
def rec(name):
    """(webm path, start) for a phone recording. The pass is the last `window` seconds of the file."""
    j = os.path.join(RECDIR, f"{name}.json")
    if not os.path.exists(j): sys.exit(f"missing phone recording for '{name}': run  MOBILE=1 node booth-video/record.mjs {name}")
    mp4 = os.path.join(RECDIR, f"{name}.mp4")   # raw-screencast recordings (60fps) are mp4; older Playwright ones are webm
    webm = mp4 if os.path.exists(mp4) else os.path.join(RECDIR, f"{name}.webm"); meta = json.load(open(j))
    window = meta.get("window", WINDOW_FALLBACK.get(name))
    start = max(0.0, dur(webm) - window) if window else meta["trimStart"]
    return webm, start

os.makedirs(OUT, exist_ok=True)

# 1) stills for the static ads
print("[frames]")
for name in ("vsc", "pnp", "woh", "trk"):
    webm, trim = rec(name)
    ff(["-ss", f"{trim + 0.6:.2f}", "-i", webm, "-frames:v", "1", "-update", "1", os.path.join(OUT, f"{name}-mobile.png")], f"{name}-mobile.png")

# 2) render every card
print("[cards]")
html = open(os.path.join(HERE, "ads.html")).read()
for cid, size in re.findall(r'<div class="card[^"]*" id="([^"]+)" data-size="([^"]+)"', html):
    w, h = SIZES[size]
    sh([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
        "--default-background-color=00000000", "--virtual-time-budget=6000",
        f"--screenshot={os.path.join(OUT, f'card-{cid}.png')}", f"file://{os.path.join(HERE, 'ads.html')}?card={cid}"], f"card-{cid}.png")

# 3) segments
print("[segments]")
S = os.path.join(OUT, "seg"); os.makedirs(S, exist_ok=True)

def card_seg(cid, size, d, dest):
    w, h = SIZES[size]
    ff(["-loop", "1", "-framerate", "30", "-t", str(d), "-i", os.path.join(OUT, f"card-{cid}.png"),
        "-vf", f"scale={w}:{h},format=yuv420p", *ENC, dest], os.path.basename(dest))

def phone_seg(cid, site, size, d, dest):
    """One caption card over one site recording playing inside the phone frame. Caption fades in."""
    w, h = SIZES[size]; x, y, pw, ph = PHONE[size]
    webm, trim = rec(site)
    ff(["-ss", f"{trim:.2f}", "-t", str(d), "-i", webm,
        "-loop", "1", "-framerate", "30", "-t", str(d), "-i", os.path.join(OUT, f"card-{cid}.png"),
        "-filter_complex",
        f"color=c=0x141311:s={w}x{h}:r=30:d={d}[bg];[0:v]scale={pw}:{ph}:flags=lanczos,fps=30[rv];[bg][rv]overlay={x}:{y}[b];"
        f"[1:v]format=rgba,fade=t=in:st=0.15:d=0.5:alpha=1[c];[b][c]overlay=0:0:shortest=1,format=yuv420p",
        *ENC, dest], os.path.basename(dest))

def stitch(parts, dest):
    durs = [dur(p) for p in parts]
    inputs = []
    for p in parts: inputs += ["-i", p]
    chain, prev, off = [], "[0:v]", 0.0
    for i in range(1, len(parts)):
        off += durs[i - 1] - XF
        o = f"[v{i}]" if i < len(parts) - 1 else "[vout]"
        chain.append(f"{prev}[{i}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}{o}"); prev = o
    ff([*inputs, "-filter_complex", ";".join(chain), "-map", "[vout]", *ENC, dest], os.path.basename(dest))

# P1 premium (9:16)
card_seg("p1_hook", "9x16", 3.6, f"{S}/p1_0.mp4")
phone_seg("p1_vsc", "vsc", "9x16", 4.4, f"{S}/p1_1.mp4")
phone_seg("p1_pnp", "pnp", "9x16", 4.4, f"{S}/p1_2.mp4")
phone_seg("p1_trk", "trk", "9x16", 4.4, f"{S}/p1_3.mp4")
card_seg("end_9x16", "9x16", 4.6, f"{S}/p1_4.mp4")
stitch([f"{S}/p1_{i}.mp4" for i in range(5)], os.path.join(OUT, "P1_premium_9x16.mp4"))

# P2 selective (9:16 + 4:5)
for size, tag in (("9x16", "9x16"), ("4x5", "4x5")):
    phone_seg(f"p2_a_{tag}", "pnp", size, 4.6, f"{S}/p2{tag}_0.mp4")
    phone_seg(f"p2_b_{tag}", "vsc", size, 4.6, f"{S}/p2{tag}_1.mp4")
    phone_seg(f"p2_c_{tag}", "woh", size, 4.6, f"{S}/p2{tag}_2.mp4")
    card_seg(f"end_{tag}", size, 4.6, f"{S}/p2{tag}_3.mp4")
    stitch([f"{S}/p2{tag}_{i}.mp4" for i in range(4)], os.path.join(OUT, f"P2_selective_{tag}.mp4"))

# 4) statics -> opaque PNG
print("[statics]")
for cid, name in (("s1_4x5", "S1_premium_4x5.png"), ("s1_1x1", "S1_premium_1x1.png"),
                  ("s2_4x5", "S2_not-templated_4x5.png"), ("s3_4x5", "S3_before-you-commit_4x5.png")):
    ff(["-i", os.path.join(OUT, f"card-{cid}.png"), "-vf", "format=rgb24", "-frames:v", "1", "-update", "1", os.path.join(OUT, name)], name)

# 5) deliverables -> Desktop (old bargain-set files removed so the folder only holds the current set)
os.makedirs(DESK, exist_ok=True)
for f in os.listdir(DESK):
    if f.startswith(("V1_", "V2_", "S1_costing", "S2_anti", "S3_free")): os.remove(os.path.join(DESK, f))
DELIVER = ["P1_premium_9x16.mp4", "P2_selective_9x16.mp4", "P2_selective_4x5.mp4",
           "S1_premium_4x5.png", "S1_premium_1x1.png", "S2_not-templated_4x5.png", "S3_before-you-commit_4x5.png"]
for f in DELIVER: shutil.copy2(os.path.join(OUT, f), DESK)
shutil.copy2(os.path.join(HERE, "COPY.md"), os.path.join(DESK, "AD COPY + LAUNCH PLAN.md"))
print(f"\nDone. Deliverables in {DESK}")
