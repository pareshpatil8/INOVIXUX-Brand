#!/usr/bin/env python3
"""
Rasterize `assets/brand/logo/inovixux-ic-stat.svg` into the Android notification small-icon set
(`ic_stat_inovixux`) required by docs/brand/13-mobile-app-patterns.md §6.1, for INO-112.

Why this generator lives at the repo root and not under `mobile/<track>/scripts/` like the three
`gen-app-icons.py` scripts do: those produce *different* artifacts per track, because each
framework consumes a different source-set format (@capacitor/assets vs Expo vs
flutter_launcher_icons). This produces the *same* five PNGs for all three tracks — they are raw
Android `res/drawable-*/` files, below the level where the frameworks differ. Three copies of one
generator would be three things to keep in sync for no gain, so it is written once and fans out.

Why a hand-rolled rasterizer and not an SVG library: same constraint the three app-icon scripts
document — no system cairo/rsvg to link cairosvg/resvg against. The glyph is four round-capped
line segments and one filled circle, reproduced from the SVG's own coordinates below. If the
source is ever redrawn with real path curves, replace this with an SVG renderer rather than
extending the geometry.

iOS needs nothing here: the OS draws the app icon in the tray (§6.1 row 3), which the existing
per-track app-icon export already covers.

Usage: python3 scripts/gen-notification-icon.py
"""
import math
import pathlib

from PIL import Image, ImageDraw

SS = 16  # supersample factor — these canvases top out at 96px, so a big factor is cheap

# Geometry straight from inovixux-ic-stat.svg's 24x24 viewBox. Keep in lockstep with that file.
VB = 24
STROKE_W = 2.4
ARMS = [
    ((3.4, 3.4), (8.606, 8.606)),
    ((15.394, 15.394), (20.6, 20.6)),
    ((20.6, 3.4), (15.394, 8.606)),
    ((8.606, 15.394), (3.4, 20.6)),
]
NODE_CENTER, NODE_R = (12.0, 12.0), 2.5

# Android density buckets for res/drawable-*/. 24dp rendered at each bucket's scale factor —
# these are the five sizes §6.1 names (mdpi -> xxxhdpi).
DENSITIES = [
    ("mdpi", 24),
    ("hdpi", 36),
    ("xhdpi", 48),
    ("xxhdpi", 72),
    ("xxxhdpi", 96),
]

# One asset, three consumers. Each path mirrors where that track already keeps its raw image
# source set, so the existing per-track asset story stays intact.
OUT_ROOTS = [
    "mobile/capacitor/resources/notification",
    "mobile/react-native/assets/notification",
    "mobile/flutter/assets/notification",
]


def draw_round_capped_line(draw, p0, p1, width, scale):
    """PIL's line() has no round-cap mode, so cap it explicitly with a disc at each endpoint.
    Matches the SVG's stroke-linecap="round"."""
    r = width * scale / 2.0
    draw.line(
        [(p0[0] * scale, p0[1] * scale), (p1[0] * scale, p1[1] * scale)],
        fill=255,
        width=int(round(width * scale)),
    )
    for p in (p0, p1):
        cx, cy = p[0] * scale, p[1] * scale
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)


def render(size):
    """Render the glyph as a white-on-transparent PNG at `size` px square.

    Only the alpha channel carries information — Android discards RGB and re-tints the mask with
    setColor() (`--ino-color-accent`, §6.1 row 2). White RGB is the convention so the file also
    previews correctly against a dark surface.
    """
    scale = size * SS / VB
    mask = Image.new("L", (size * SS, size * SS), 0)
    draw = ImageDraw.Draw(mask)

    for p0, p1 in ARMS:
        draw_round_capped_line(draw, p0, p1, STROKE_W, scale)

    cx, cy = NODE_CENTER[0] * scale, NODE_CENTER[1] * scale
    r = NODE_R * scale
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)

    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    out.putalpha(mask)
    return out


def gap_check():
    """Assert the §6.1 acceptance bar — 'a silhouette that keeps the verified-node dot legible at
    24dp' — is actually met by the geometry above, rather than asserted in a comment.

    The dot is only legible if transparent space separates it from the X arms. Measure that gap in
    mdpi pixels (24dp == 24px, the worst case): distance from centre to the nearest arm cap edge,
    minus the node radius.
    """
    inner = min(
        min(math.dist(NODE_CENTER, p0), math.dist(NODE_CENTER, p1)) for p0, p1 in ARMS
    )
    gap = (inner - STROKE_W / 2.0) - NODE_R
    return gap


def main():
    repo = pathlib.Path(__file__).resolve().parent.parent
    gap = gap_check()
    print(f"verified-node gap at mdpi: {gap:.2f}px")
    if gap < 1.0:
        raise SystemExit(
            f"Node/arm gap is {gap:.2f}px at 24dp — below the 1px floor, the dot will close up. "
            "Per 13-mobile-app-patterns.md §6.1, widen the knockout ring or drop the dot; do not "
            "ship the smudge."
        )

    for bucket, size in DENSITIES:
        img = render(size)
        for root in OUT_ROOTS:
            out_dir = repo / root / f"drawable-{bucket}"
            out_dir.mkdir(parents=True, exist_ok=True)
            path = out_dir / "ic_stat_inovixux.png"
            img.save(path)
            print(f"  wrote {path.relative_to(repo)} ({size}x{size})")


if __name__ == "__main__":
    main()
