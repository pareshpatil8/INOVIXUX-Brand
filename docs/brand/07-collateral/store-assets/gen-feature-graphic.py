#!/usr/bin/env python3
"""
Rasterize inovixux-icon-b2c.svg (INO-82 placeholder) into a Google Play
"feature graphic" (1024x500, opaque, no transparency) for the app store
listing spec at ../app-store-listing-assets.md (register item M-12).

Same hand-rolled-rasterizer approach as mobile/capacitor/scripts/gen-app-icons.py
and mobile/flutter/scripts/gen_app_icons.py, for the same reason: no
cairo/rsvg/inkscape/imagemagick on PATH in this sandbox to render the SVG
directly. Geometry constants are copied from those scripts rather than
imported, matching this repo's existing pattern of parallel, independently
-editable per-consumer copies of the same rasterizer (see the Flutter
track's README, "no shared code" note) rather than a shared module.

Icon-swap note: when INO-82 lands a final mark, re-point SOURCE below (or
replace the geometry constants against the new SVG's own path coordinates)
and rerun. Nothing else in the store-listing spec changes.

Usage: python3 gen-feature-graphic.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw

SOURCE = "assets/brand/logo/inovixux-icon-b2c.svg"  # INO-82 placeholder

# Geometry straight from inovixux-icon-b2c.svg's 20x20 viewBox — identical to
# mobile/capacitor/scripts/gen-app-icons.py's constants.
LINE1 = ((2, 3), (16, 17))
LINE2 = ((16, 3), (2, 17))
STROKE_W = 2.4
CENTER_CIRCLE = ((9, 10), 2.1)
CORNER_CIRCLES = [((2, 3), 1.2), ((16, 3), 1.2), ((2, 17), 1.2), ((16, 17), 1.2)]
CORNER_OPACITY = 0.5
GRAD_P0, GRAD_C0 = (2, 17), (0x7C, 0x5C, 0xFC)
GRAD_P1, GRAD_C1 = (18, 3), (0x4F, 0x46, 0xE5)
VB = 20

SURFACE_DARK = (0x0A, 0x0A, 0x0A)  # --ino-primitive-black / dark --ino-color-surface (tokens.css)

OUT_W, OUT_H = 1024, 500  # Google Play feature graphic spec, exact
GLYPH_PX = 360  # glyph rendered at this square size, then centered on the canvas
SS = 8  # supersample factor, matches gen-app-icons.py's small-canvas branch


def gradient_array(size_px):
    ys, xs = np.mgrid[0:size_px, 0:size_px].astype(np.float64)
    xs = xs / size_px * VB
    ys = ys / size_px * VB
    dx, dy = GRAD_P1[0] - GRAD_P0[0], GRAD_P1[1] - GRAD_P0[1]
    denom = dx * dx + dy * dy
    t = ((xs - GRAD_P0[0]) * dx + (ys - GRAD_P0[1]) * dy) / denom
    t = np.clip(t, 0, 1)
    out = np.empty((size_px, size_px, 3), dtype=np.uint8)
    for c in range(3):
        out[:, :, c] = (GRAD_C0[c] + (GRAD_C1[c] - GRAD_C0[c]) * t).astype(np.uint8)
    return out


def draw_mask(size_px):
    mask = Image.new("L", (size_px, size_px), 0)
    d = ImageDraw.Draw(mask)
    px_per_vb = size_px / VB

    def pt(p):
        return (p[0] * px_per_vb, p[1] * px_per_vb)

    w = STROKE_W * px_per_vb
    d.line([pt(LINE1[0]), pt(LINE1[1])], fill=255, width=round(w))
    d.line([pt(LINE2[0]), pt(LINE2[1])], fill=255, width=round(w))
    for (a, b) in (LINE1, LINE2):
        for p in (a, b):
            cx, cy = pt(p)
            r = w / 2
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)

    (cx, cy), r = CENTER_CIRCLE
    cx, cy = pt((cx, cy))
    rr = r * px_per_vb
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=255)

    corner_mask = Image.new("L", (size_px, size_px), 0)
    dc = ImageDraw.Draw(corner_mask)
    for (ccx, ccy), cr in CORNER_CIRCLES:
        ccx, ccy = pt((ccx, ccy))
        crr = cr * px_per_vb
        dc.ellipse([ccx - crr, ccy - crr, ccx + crr, ccy + crr], fill=255)

    return mask, corner_mask


def render_glyph(out_size):
    render_px = out_size * SS
    grad = gradient_array(render_px)
    mask, corner_mask = draw_mask(render_px)

    rgba = np.zeros((render_px, render_px, 4), dtype=np.uint8)
    rgba[:, :, :3] = grad
    rgba[:, :, 3] = np.array(mask)
    corner_alpha = (np.array(corner_mask).astype(np.float64) * CORNER_OPACITY).astype(np.uint8)
    rgba[:, :, 3] = np.maximum(rgba[:, :, 3], corner_alpha)

    img = Image.fromarray(rgba)
    return img.resize((out_size, out_size), Image.LANCZOS)


if __name__ == "__main__":
    canvas = Image.new("RGB", (OUT_W, OUT_H), SURFACE_DARK)
    glyph = render_glyph(GLYPH_PX)
    x = (OUT_W - GLYPH_PX) // 2
    y = (OUT_H - GLYPH_PX) // 2
    canvas.paste(glyph, (x, y), glyph)

    out_path = os.path.join(os.path.dirname(__file__), "feature-graphic-placeholder.png")
    canvas.save(out_path)
    print(f"Wrote {OUT_W}x{OUT_H} feature-graphic-placeholder.png from {SOURCE} (INO-82 placeholder)")
