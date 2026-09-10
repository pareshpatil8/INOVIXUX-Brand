#!/usr/bin/env python3
"""
Rasterize inovixux-icon-b2c.svg (INO-82) into the `resources/` source set the
@capacitor/assets CLI (`npx @capacitor/assets generate`) consumes to generate
the actual per-platform iOS Images.xcassets AppIcon set and Android
mipmap/adaptive-icon/splash directories. See INO-88.

Why a hand-rolled rasterizer and not an SVG library: this sandbox has no
system `cairo`/`rsvg` available for cairosvg/resvg to link against, and no
network access to a browser-based renderer — same constraint the
react-native track (INO-89) hit, see its scripts/gen-app-icons.py for the
same reasoning. The source glyph (`assets/brand/logo/inovixux-icon-b2c.svg`)
is simple enough — two round-capped strokes, one filled circle, four small
filled circles, one 2-stop linear gradient — to reproduce exactly from its
own path coordinates with PIL + numpy, at high supersampling for clean
edges. If the glyph is ever redrawn with more complex paths, redo this with
a real SVG renderer instead of extending the manual geometry below.

Usage: python3 scripts/gen-app-icons.py
"""
import math
import numpy as np
from PIL import Image, ImageDraw

def supersample_for(out_size):
    """Supersample factor for anti-aliasing, scaled down for large canvases (splash is 2732px —
    SS=8 there would render a ~21856px float64 gradient array, several GB and minutes slow, for
    an antialiasing improvement LANCZOS downscaling doesn't need at that resolution)."""
    if out_size >= 2048:
        return 1
    return 8

# Geometry straight from inovixux-icon-b2c.svg's 20x20 viewBox.
LINE1 = ((2, 3), (16, 17))
LINE2 = ((16, 3), (2, 17))
STROKE_W = 2.4
CENTER_CIRCLE = ((9, 10), 2.1)
CORNER_CIRCLES = [((2, 3), 1.2), ((16, 3), 1.2), ((2, 17), 1.2), ((16, 17), 1.2)]
CORNER_OPACITY = 0.5
GRAD_P0, GRAD_C0 = (2, 17), (0x7C, 0x5C, 0xFC)
GRAD_P1, GRAD_C1 = (18, 3), (0x4F, 0x46, 0xE5)
VB = 20  # viewBox is 0 0 20 20

# tokens.css primitives used for opaque backgrounds below — dark is the token contract's
# default theme (tokens.css §2), light is the explicit override.
SURFACE_DARK = (0x0A, 0x0A, 0x0A)  # --ino-primitive-black / dark --ino-color-surface
SURFACE_LIGHT = (0xFA, 0xFA, 0xFA)  # --ino-primitive-off-white / light --ino-color-surface


def gradient_array(size_px):
    """Per-pixel gradient RGB array, projected onto the SVG's gradient vector."""
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


def draw_mask(size_px, include_center_circle, include_corner_circles, scale=1.0, offset=0.0):
    """Alpha mask (0/255) for the glyph, in viewBox units mapped to size_px."""
    mask = Image.new("L", (size_px, size_px), 0)
    d = ImageDraw.Draw(mask)
    px_per_vb = size_px / VB

    def pt(p):
        return ((p[0] * scale + offset) * px_per_vb, (p[1] * scale + offset) * px_per_vb)

    w = STROKE_W * scale * px_per_vb
    d.line([pt(LINE1[0]), pt(LINE1[1])], fill=255, width=round(w))
    d.line([pt(LINE2[0]), pt(LINE2[1])], fill=255, width=round(w))
    # round caps
    for (a, b) in (LINE1, LINE2):
        for p in (a, b):
            cx, cy = pt(p)
            r = w / 2
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)

    if include_center_circle:
        (cx, cy), r = CENTER_CIRCLE
        cx, cy = pt((cx, cy))
        rr = r * scale * px_per_vb
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=255)

    corner_mask = None
    if include_corner_circles:
        corner_mask = Image.new("L", (size_px, size_px), 0)
        dc = ImageDraw.Draw(corner_mask)
        for (cx, cy), r in CORNER_CIRCLES:
            cx, cy = pt((cx, cy))
            rr = r * scale * px_per_vb
            dc.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=255)

    return mask, corner_mask


def render(out_size, include_corner_circles=True, bg=None, safe_zone_scale=1.0):
    """bg=None -> transparent; bg=(r,g,b) -> that color composited under the glyph."""
    render_px = out_size * supersample_for(out_size)
    grad = gradient_array(render_px)
    mask, corner_mask = draw_mask(
        render_px, include_center_circle=True,
        include_corner_circles=include_corner_circles,
        scale=safe_zone_scale, offset=(VB * (1 - safe_zone_scale) / 2 if safe_zone_scale != 1 else 0),
    )

    rgba = np.zeros((render_px, render_px, 4), dtype=np.uint8)
    rgba[:, :, :3] = grad
    rgba[:, :, 3] = np.array(mask)

    if corner_mask is not None:
        corner_alpha = (np.array(corner_mask).astype(np.float64) * CORNER_OPACITY).astype(np.uint8)
        existing = rgba[:, :, 3]
        rgba[:, :, 3] = np.maximum(existing, corner_alpha)

    img = Image.fromarray(rgba)
    if bg is not None:
        flat = Image.new("RGBA", img.size, (*bg, 255))
        flat.alpha_composite(img)
        img = flat
    return img.resize((out_size, out_size), Image.LANCZOS)


if __name__ == "__main__":
    import os
    out_dir = os.path.join(os.path.dirname(__file__), "..", "resources")
    os.makedirs(out_dir, exist_ok=True)

    # Main app icon: @capacitor/assets' single 1024x1024 source for both iOS
    # (Images.xcassets AppIcon set) and Android (mipmap set) generation.
    # Opaque, edge-to-edge — the OS applies its own corner mask per platform.
    render(1024, include_corner_circles=True, bg=SURFACE_DARK).save(
        os.path.join(out_dir, "icon.png"))

    # Android adaptive icon: foreground (transparent, glyph confined to the ~66% center
    # safe zone per Android's adaptive-icon spec — the OS masks this layer to
    # circle/squircle/etc. per launcher) + a flat background layer, composited by the OS.
    render(1024, include_corner_circles=True, bg=None, safe_zone_scale=0.62).save(
        os.path.join(out_dir, "icon-foreground.png"))
    Image.new("RGBA", (1024, 1024), (*SURFACE_DARK, 255)).save(
        os.path.join(out_dir, "icon-background.png"))

    # Splash: @capacitor/assets' 2732x2732 source, centered glyph over the flat
    # surface color (matches capacitor.config.ts's own `backgroundColor`) rather
    # than full-bleed art. Two files per its own naming convention: `splash.png`
    # (light/default) + `splash-dark.png` (OS dark mode) — dark is this app's
    # actual default theme, but the tool's own light/dark file split still
    # expects both regardless of which one a given app treats as primary.
    render(2732, include_corner_circles=True, bg=SURFACE_LIGHT, safe_zone_scale=0.34).save(
        os.path.join(out_dir, "splash.png"))
    render(2732, include_corner_circles=True, bg=SURFACE_DARK, safe_zone_scale=0.34).save(
        os.path.join(out_dir, "splash-dark.png"))

    print("Wrote icon.png, icon-foreground.png, icon-background.png, splash.png, "
          "splash-dark.png to", out_dir)
