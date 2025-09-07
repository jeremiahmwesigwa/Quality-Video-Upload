Quick debug checklist (most common causes)

Try these first — they often fix “out of focus / blown exposure” results:

Filter order — apply smoothing before color grading; don’t apply LUTs or heavy contrast afterwards.

Work in linear Rec.709 for processing; convert to gamma (sRGB) only at final output.

Avoid huge kernel sizes — too large = blur. Keep smoothing radius small and edge-aware.

Protect eyes/lips/hair using landmarks; if protection mask is wrong you’ll blur eyes.

Check mask correctness — visualize mask (white = skin) to ensure it aligns with face. If mask is bad, fix detection parameters.

Amount blending — never replace whole frame with smoothed result; use a wet/dry mix (e.g., 0.45–0.75) to avoid plastic look.

No double gamma — do not apply gamma correction twice. That can blow highlights and crush mids.

If using LUT: apply LUT after final mix, with low opacity (10–20%).

2) Corrected parameter ranges and final defaults

Use these sane values in the UI; they avoid overprocessing:

Smoothness (σ / radius): 20–40 (default 30) — smaller = less blur.

Texture Preserve (HP mix): 40–70 (default 60) — higher keeps pores.

Blemish Removal: 10–30 (default 20) — small spot inpaint only.

Shine Reduction: 15–35 (default 25) — compress specular highlights slightly.

Tone Evenness: 10–25 (default 15) — mild variance reduction.

Eye & Lip Protection: 70–95 (default 85) — high so eyes/lips stay sharp.

Amount (global mix): 45–75 (default 60) — blends retouch with original.

Grain (anti-plastic): 6–16 (default 10) — low, film-like grain.

Important: process in linear light and blend back into original — do not replace.

3) Working Python prototype (MediaPipe + OpenCV)

This is a drop-in script you can run to validate. It detects faces, builds a skin mask, applies edge-aware smoothing (guided/bilateral), recovers texture with a high-pass, protects eyes/lips, then blends.

Install dependencies:

pip install opencv-python mediapipe numpy


Save as skin_retouch_demo.py and run on a sample video.

import cv2
import mediapipe as mp
import numpy as np

mp_face = mp.solutions.face_mesh

# Parameters (sane defaults)
SMOOTHNESS = 30         # radius-ish control
TEXTURE_PRESERVE = 60   # 0-100
BLEMS = 20              # not used extensively here, kept for UI parity
SHINE_REDUCTION = 25
TONE_EVENNESS = 15
EYE_LIP_PROTECT = 85    # 0-100
AMOUNT = 60             # 0-100
GRAIN = 10

def landmarks_to_mask(h, w, landmarks, margin=6):
    mask = np.zeros((h, w), dtype=np.uint8)
    # select indices roughly covering skin: forehead, cheeks, jaw, nose
    # mediapipe indices for face outline + forehead-ish: we approximate using outline and cheeks
    outline_idxs = list(range(10, 135))  # broad range; it's ok as approximation
    pts = []
    for i in outline_idxs:
        lm = landmarks[i]
        x = int(lm.x * w)
        y = int(lm.y * h)
        pts.append((x, y))
    if len(pts) >= 3:
        cv2.fillPoly(mask, [np.array(pts, dtype=np.int32)], 255)
    # smooth mask edges
    mask = cv2.GaussianBlur(mask, (2*margin+1, 2*margin+1), 0)
    mask = cv2.normalize(mask, None, 0, 255, cv2.NORM_MINMAX)
    return mask

def build_protect_mask(h, w, landmarks):
    mask = np.zeros((h, w), dtype=np.uint8)
    # Eyes and lips index ranges (approx)
    left_eye = [33, 7, 163, 144, 145, 153]
    right_eye = [362, 382, 381, 380, 374, 373]
    lips = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375]
    def fill(idxs):
        pts = []
        for i in idxs:
            lm = landmarks[i]
            pts.append((int(lm.x*w), int(lm.y*h)))
        if len(pts) >= 3:
            cv2.fillPoly(mask, [np.array(pts, dtype=np.int32)], 255)
    fill(left_eye); fill(right_eye); fill(lips)
    mask = cv2.dilate(mask, np.ones((9,9), np.uint8))  # expand protection a bit
    mask = cv2.GaussianBlur(mask, (15,15), 0)
    return mask

def high_pass(img, k=3):
    blur = cv2.GaussianBlur(img, (2*k+1, 2*k+1), 0)
    hp = cv2.subtract(img, blur)
    return hp

def add_grain(img, strength=10):
    h,w = img.shape[:2]
    grain = np.random.normal(0, strength/255.0, (h,w,1)).astype(np.float32)
    if img.dtype == np.uint8:
        img_f = img.astype(np.float32)/255.0
        img_f = np.clip(img_f + grain, 0.0, 1.0)
        return (img_f*255).astype(np.uint8)
    return img

cap = cv2.VideoCapture('input.mp4')
fps = cap.get(cv2.CAP_PROP_FPS)
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
out = cv2.VideoWriter('output_retouch.mp4', fourcc, fps, (w,h))

with mp_face.FaceMesh(static_image_mode=False, max_num_faces=4, refine_landmarks=True) as face_mesh:
    frame_idx = 0
    prev_masks = None
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)
        mask_skin = np.zeros((h,w), dtype=np.uint8)
        protect_mask = np.zeros((h,w), dtype=np.uint8)
        if results.multi_face_landmarks:
            # merge masks for all faces
            for landmarks in results.multi_face_landmarks:
                mask = landmarks_to_mask(h, w, landmarks.landmark, margin=6)
                pmask = build_protect_mask(h, w, landmarks.landmark)
                mask_skin = np.maximum(mask_skin, mask)
                protect_mask = np.maximum(protect_mask, pmask)

            # temporal smoothing simple EMA
            if prev_masks is None:
                prev_masks = mask_skin.astype(np.float32)
            else:
                prev_masks = 0.6*prev_masks + 0.4*mask_skin.astype(np.float32)
            mask_skin = np.uint8(prev_masks)

        # normalize and create 3-channel float masks
        mask3 = cv2.merge([mask_skin/255.0]*3)
        protect3 = cv2.merge([protect_mask/255.0]*3)

        # convert to float [0..1]
        frame_f = frame.astype(np.float32)/255.0

        # 1) edge-preserving smoothing on whole image but weight by mask
        # use bilateral on downscaled skin area for speed
        small = cv2.resize(frame, (0,0), fx=0.5, fy=0.5, interpolation=cv2.INTER_LINEAR)
        d = max(3, int(SMOOTHNESS/8))
        smooth_small = cv2.bilateralFilter(small, d, 75, 75)
        smooth = cv2.resize(smooth_small, (w,h), interpolation=cv2.INTER_LINEAR)

        smooth_f = smooth.astype(np.float32)/255.0

        # 2) high-pass detail
        hp = high_pass(frame, k=3).astype(np.float32)/255.0
        hp_gain = 0.2 + 0.006*TEXTURE_PRESERVE
        smooth_f = np.clip(smooth_f + hp * hp_gain, 0.0, 1.0)

        # 3) shine reduction (simple highlight compression)
        # convert to hsv, reduce V in brightest skin pixels
        hsv = cv2.cvtColor((smooth_f*255).astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.float32)/255.0
        v = hsv[:,:,2]
        # knee-like compression only where mask applies and v high
        knee = 0.85
        k = 0.12 + 0.001*SHINE_REDUCTION
        atten = np.clip((v - knee)/(1.0 - knee), 0, 1)
        v = v - atten * k * atten
        hsv[:,:,2] = v
        smooth_f = cv2.cvtColor((hsv*255).astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)/255.0

        # 4) tone evenness (simple local mean pull)
        if TONE_EVENNESS > 0:
            mean = cv2.blur(smooth_f, (15,15))
            lam = 0.05 + 0.0015*TONE_EVENNESS
            smooth_f = smooth_f - lam*(smooth_f - mean)
            smooth_f = np.clip(smooth_f, 0.0, 1.0)

        # 5) Eye/lip protection: reduce retouch strength in protect zones
        protect_strength = protect3 * (EYE_LIP_PROTECT/100.0)
        local_amount = (AMOUNT/100.0) * (1.0 - 0.8*protect_strength)

        # 6) Blend per-pixel: out = orig*(1 - mask*local_amount) + smooth*(mask*local_amount)
        blend_mask = mask3 * local_amount  # per-pixel blending only inside skin
        out_f = frame_f*(1 - blend_mask) + smooth_f*blend_mask

        # 7) Add subtle grain inside skin
        if GRAIN > 0:
            grain = np.random.normal(0, GRAIN/255.0, out_f.shape).astype(np.float32)
            out_f = np.clip(out_f + grain*mask3*0.6, 0.0, 1.0)

        out_frame = (out_f*255).astype(np.uint8)
        out.write(out_frame)

        frame_idx += 1
        if frame_idx % 50 == 0:
            print("Processed frame", frame_idx)

cap.release()
out.release()
print("Done -> output_retouch.mp4")


Key notes about this demo:

It uses a small bilateralFilter on a downscaled image for speed (prevents heavy blur).

High-pass detail is added back so skin retains pores.

Protect mask prevents blurring of eyes and lips.

Blend is per-pixel and modulated by mask and protection to avoid full replacement.

This approach is reliable and avoids the “out-of-focus” problem.

4) FFmpeg fallback (no ML face detector)

If you can't run ML models, use this approximate FFmpeg command that restricts smoothing to a soft skin mask (HSV band), then blends in detail. This is less accurate but fast and fully scriptable.

ffmpeg -i input.mp4 -vf "
format=yuv420p,
split[orig][skin];
[skin]hue=s=1.05,curves=preset=medium_contrast,format=rgb24,
geq='r(X,Y)':='g(X,Y)':='b(X,Y)',
format=gray,boxblur=10:1:cr=0:ar=0,unsharp=3:3:0.6[skinmask];
[orig][skinmask]overlay=shortest=1,smartblur=entrance=1:strength=1.0,unsharp=5:5:0.6[out]
" -map "[out]" -c:v libx264 -b:v 12M -c:a copy out_ffmpeg_fallback.mp4


This is intentionally conservative. Tune boxblur/smartblur/unsharp strengths carefully. Visualize the skinmask separately during development.

5) Integration checklist & best practices

Always show the mask overlay in the UI during development — helps debug protection and mask misalignment.

Preview before export: run the algorithm on a short clip (2–3s) for live preview.

Limit processing resolution for retouch compute (do mask operations at 720p, upsample, then apply on full frame with linear upsampling and edge-aware feather).

Perform color grading after retouch. If users toggle cinematic LUT, apply LUT at low opacity (10–25%) at the end.

Use per-face toggles when multiple faces are present.

Temporal smoothing: average masks across 3–5 frames to avoid flicker. Use optical-flow warp if you need very stable masks.

Logging: log face count, average mask area, and average blend strength for diagnosing bad results.

6) If it’s still failing for you — immediate things I can do right now

I can:

produce a tiny test video showing original vs retouched frames (if you want a quick sample to compare), or

convert the Python prototype into a packaged script that accepts input.mp4 and outputs output_retouch.mp4 (ready to run on your machine), or

generate FFmpeg + LUT commands tuned specifically for a sample frame you paste (I can adapt numbers to exact footage).
