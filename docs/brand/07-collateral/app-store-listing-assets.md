# App Store Listing Assets — Capacitor / React Native / Flutter (register item M-12)

**Status:** Spec + non-icon-dependent deliverables done. Screenshots not captured (needs a
build/simulator step outside this role — see §2). Final feature graphic and in-app icon set wait
on **INO-82** (Brand Logo, still `in_review`); everything below uses the same placeholder glyph
the three mobile tracks already ship (`assets/brand/logo/inovixux-icon-b2c.svg`), structured so
the swap is a source-file substitution, not a rework.

**Scope note:** all three tracks (`mobile/capacitor`, `mobile/react-native`, `mobile/flutter`) are
one product under one identity — `appId`/`bundleIdentifier`/`package` is `com.inovixux.app`,
app name `INOVIXUX` on all three (`mobile/capacitor/capacitor.config.ts`, `mobile/react-native/app.json`,
`mobile/flutter/pubspec.yaml`) — per the board's "all three frameworks in parallel" bake-off
decision on INO-85 (`13-mobile-app-patterns.md` §5), not three different apps. So the assets below
are **one shared spec covering all three listings**, not three independent copies; where a track's
build pipeline changes *how* an asset is produced, that's called out per track, not per brand
decision.

**INO-14 non-commercial hold — still active** (`INO-14` is `in_review`). Nothing here authorizes
an actual store submission. This is preparation for that future submission, written under the same
constraint every other external-facing surface in this repo already follows
(`05-verbal-identity.md` §3): no "launch," "live," "available now," or commercial claim. Store copy
below is drafted, reviewed against that rule, and ready to go **once INO-14 lifts and INO-82
resolves** — not before.

---

## 1. Icon sizes

Each track already owns a rasterizer that turns the placeholder glyph into its platform's full
icon set — this spec doesn't re-derive those sizes by hand (that would drift from what the tools
actually produce and go stale the next time a pipeline version bumps). The tracks:

| Track | Generator | Source → output |
|---|---|---|
| Capacitor | `mobile/capacitor/scripts/gen-app-icons.py` → `resources/` | `icon.png` (1024, opaque) + `icon-foreground.png`/`icon-background.png` (Android adaptive) + `splash.png`/`splash-dark.png` (2732), consumed by `npx @capacitor/assets generate` into the real iOS `Images.xcassets` AppIcon set and Android `mipmap`/`adaptive-icon` directories |
| React Native (Expo) | `mobile/react-native/scripts/gen-app-icons.py` → `assets/` | `icon.png`, `adaptive-icon.png`, `favicon.png`, `splash-icon.png`, consumed by Expo's own prebuild icon pipeline from `app.json`'s `icon`/`adaptiveIcon`/`favicon` fields |
| Flutter | `mobile/flutter/scripts/gen_app_icons.py` → `assets/icon/`, `assets/splash/` | `app_icon_1024.png`, `app_icon_foreground_1024.png`, `splash_logo_1024.png`, consumed by `flutter_launcher_icons`/`flutter_native_splash` (configured in `pubspec.yaml`) into the real iOS `Assets.xcassets` and Android `mipmap`/`adaptive-icon` sets |

**One size each store's listing console needs that none of those pipelines produce**, because it's
a listing asset, not an in-app resource:

| Asset | Spec | Source |
|---|---|---|
| Google Play Store hi-res icon | 512×512, 32-bit PNG, no alpha | Downsample any track's already-generated `icon.png` (1024, opaque, identical across tracks — same source glyph, same `SURFACE_DARK` background) — no new generator needed, this is a resize of an existing file |
| Apple App Store marketing icon | 1024×1024, PNG, no alpha, no rounded corners (Apple applies the mask) | Same `icon.png`, used as-is |

**Icon-swap procedure (all six generators + the two listing crops above):** once INO-82 lands a
final mark, re-point each script's `SOURCE`/geometry constants at the new SVG and rerun — the
per-track READMEs already document this as the intended flow (see each track's "Why a hand-rolled
rasterizer" note). Nothing in this document or in `store-assets/gen-feature-graphic.py` needs to
change structurally, only the constants each script draws from.

---

## 2. Screenshots (per device class)

**Not captured — flagged, not silently skipped.** Producing real screenshots means running each
track's actual build in a simulator/emulator (or, for the Capacitor track, a headless browser
against the built Angular app) and capturing every screen in `15-mobile-screen-inventory.md` §1 at
each required device class. This sandbox has no simulator, no emulator, and no headless-browser
binary on `PATH` (checked: no `playwright`/`puppeteer` in `node_modules/.bin`, no `xcrun simctl`,
no Android SDK) — the same class of tooling gap the icon rasterizers in §1 already had to work
around by hand-drawing the glyph instead of rendering the SVG. Screenshots don't have that
workaround available (they're pixels of the real running UI, not a redrawable vector), so this is a
genuine **build/visual-verification task, not a spec-writing one** — handing to QALead per my own
role boundary ("Browser/visual verification → hand to QALead with a reproducible test plan")
rather than faking placeholder screenshots that would misrepresent unbuilt UI as shipped.

### 2.1 Required device classes and counts

| Store | Device class | Size (px, portrait) | Min / Max screenshots | Notes |
|---|---|---|---|---|
| Apple App Store | iPhone 6.9" (iPhone 16 Pro Max class) | 1320 × 2868 | 3–10 | Mandatory size class as of the current App Store Connect requirements |
| Apple App Store | iPad 13" (iPad Pro class) | 2064 × 2752 | 3–10 | Only required if the app supports iPad — **Capacitor and Flutter tracks do** (no `supportsTablet: false` equivalent set); **React Native/Expo track explicitly sets `"supportsTablet": false"`** (`mobile/react-native/app.json`) — iPad screenshots apply to 2 of 3 tracks, not all 3 |
| Google Play | Phone | 1080 × 1920 (or actual device aspect, 16:9–21:9) | 2–8 | |
| Google Play | 7" tablet | 1200 × 1920 | 0–8 (optional) | Only if the track ships a tablet-adapted layout — none of the three tracks currently have tablet-specific layouts (`15-mobile-screen-inventory.md` doesn't record one), so this class is a deliberate omission until a tablet layout exists |
| Google Play | 10" tablet | 1600 × 2560 | 0–8 (optional) | Same omission reason as 7" |

### 2.2 Screen list to capture (per track, once buildable)

Same 13-row inventory for every track (`15-mobile-screen-inventory.md` §1 — already built on all
three per that doc's §4 as-built map), reduced to the subset that makes sense as *store* screenshots
(splash and modal-overlay states don't stand alone as listing images):

1. Onboarding
2. Sign in
3. Home / dashboard
4. Detail
5. Search / filter
6. Notifications (populated or empty-state, whichever a reviewer picks)
7. Settings / account

That's 7 screens × device classes above × 3 tracks = the capture matrix. Empty-state and
error/offline screens are deliberately excluded from the store set (they're not first-impression
material); modal actions are deliberately excluded (an overlay doesn't read as a standalone
screenshot).

### 2.3 Reproducible capture plan (for QALead / whoever picks this up)

- **Capacitor:** `npm run build:web` (builds the Angular app `capacitor.config.ts` wraps), then
  either `npx cap open ios`/`android` for a real simulator/emulator capture, or — faster — run the
  built output in a headless browser sized to each device-class viewport and screenshot each of
  `app.routes.ts`'s routes for the 7 screens above. Dark theme only for v1 (matches the token
  contract's default; light/high-contrast capture is a follow-up if the listing wants theme
  variety).
- **React Native (Expo):** `npx expo run:ios` / `run:android` against a simulator/emulator at each
  required device class, or `expo start --web` + headless-browser capture for a first pass. Skip
  iPad captures — `supportsTablet: false`.
- **Flutter:** `flutter build ios`/`apk` + simulator/emulator capture at each device class, or
  `flutter run -d chrome` + headless-browser capture for a first pass.
- Land captures under `mobile/<track>/store/screenshots/<device-class>/<screen>.png` (new
  directories, not yet created — left for whoever runs the capture so the file layout matches
  what they actually produce rather than an empty scaffold guessed here).

---

## 3. Feature graphic

Google Play requires one **1024×500** feature graphic per listing; Apple has no direct equivalent
(App Store Connect's "App Preview" is a video, out of scope here — no motion asset requested by
this ticket).

**Delivered now:** `store-assets/gen-feature-graphic.py` → `store-assets/feature-graphic-placeholder.png`,
1024×500, opaque, the same `inovixux-icon-b2c.svg` placeholder glyph centered on the dark
`--ino-color-surface` background, rasterized by hand for the same reason the per-track icon
generators are (§1) — no SVG renderer on `PATH` in this sandbox. One shared file, not three — same
brand, same app, same graphic serves all three listings (§ scope note above); if a track-specific
variant is ever wanted (e.g. to visually signal "React Native build" during an internal bake-off
comparison), fork the script per the repo's existing "parallel independently-editable copies"
convention (`mobile/flutter/README.md`'s icon-generator note) rather than parameterizing this one.

**Icon-swap:** rerun `gen-feature-graphic.py` after INO-82 lands and the geometry constants are
re-pointed (§1's swap procedure) — the compose step (glyph centered on `SURFACE_DARK`) doesn't
change.

---

## 4. Store copy

Drafted under `05-verbal-identity.md`'s discipline — anchor vocabulary, banned-word list (no
"launch," "live," "available now," no commercial claim), and the brief's core rule ("we describe a
system that surfaces evidence for a human to act on, never one that decides"). **Not cleared for
submission** — see the INO-14 note at the top of this doc. One shared copy block for all three
listings (same product, same identity); character limits below are the binding constraint per
store field, not a style choice.

### 4.1 Apple App Store

| Field | Limit | Copy |
|---|---|---|
| App name | 30 chars | `INOVIXUX` |
| Subtitle | 30 chars | `Verified review, traced` |
| Promotional text | 170 chars | `A working-direction preview of how INOVIXUX traces a review from open item to resolved state — built for a human reviewer, not to replace one.` |
| Description | 4000 chars | See §4.3 below (shared long-form copy) |
| Keywords | 100 chars, comma-separated | `verification,audit trail,review,compliance,governance,kyb,risk,traced,evidence,resilience` |
| Support URL | — | Placeholder — no support channel stood up yet; flag before submission |
| Marketing URL | — | Placeholder — `web/` is the marketing/docs site per `13-mobile-app-patterns.md` §5, use its eventual public URL once one exists |

### 4.2 Google Play

| Field | Limit | Copy |
|---|---|---|
| App name | 30 chars | `INOVIXUX` |
| Short description | 80 chars | `Verified review, traced — a working-direction preview, human-approved always` |
| Full description | 4000 chars | See §4.3 below (shared long-form copy) |

### 4.3 Shared long-form description (App Store "Description" / Play "Full description")

```
INOVIXUX is a working-direction preview of a verification workflow for regulated review —
payments, banking, healthcare, and telecom teams checking beneficial-owner data, KYB documents,
and compliance evidence before a human signs off.

Every item this app surfaces is traced to its source and resolved by a person, not the system.
INOVIXUX shows what was checked and what state it's in — it does not decide, approve, or flag
anything as final on its own. Augmented control stays with the reviewer at every step.

What's in this preview:
— A dashboard of items awaiting review, with their current traced state
— Detail views that show the evidence behind each item, not just a verdict
— Search and filter across open items
— Notifications when an item's state changes
— Full dark, light, and high-contrast accessibility support, WCAG 2.2 AA

This is a design-direction build, not a commercial release — nothing here represents a live
production system or a validated product claim. It exists to test the interaction and visual
model this brand is building toward.
```

**Verbal-identity check:** no banned words present (`05-verbal-identity.md` §3); "working-direction
preview" / "design-direction build" is the same INO-14-safe framing already used in `03-vetra-
structural-foundation.md`'s pricing-tier disclosure and `08-website-sitemap.md`'s hold statement.
Anchor vocabulary used correctly: "traced," "resolved," "Augmented control," "Verification."

---

## 5. Deliberate omissions

- **No App Preview video** — not requested by this ticket (M-12 names screenshots, feature
  graphic, icon sizes, and store copy only); would need real running captures same as §2.
- **7"/10" Google Play tablet screenshots** — no track currently has a tablet-adapted layout to
  screenshot (§2.1).
- **iPad App Store screenshots for the React Native track** — `supportsTablet: false` in that
  track's `app.json`; iPad screenshots apply to Capacitor and Flutter only (§2.1).
- **Actual screenshot capture** — needs a build/simulator/headless-browser step this environment
  doesn't have; handed to QALead with the reproducible plan in §2.3.
- **Final icon/feature-graphic artwork** — blocked on INO-82; placeholder in use throughout,
  structured for a source-constant swap (§1, §3).
- **Support/marketing URLs** — no support channel or public marketing URL stood up yet; both
  fields left as explicit placeholders in §4.1 rather than invented values.
- **Actual store submission** — blocked on the INO-14 non-commercial hold; this document is
  preparation, not authorization.

---

## 6. Verification

- Ran `python3 docs/brand/07-collateral/store-assets/gen-feature-graphic.py` — produced a
  1024×500 opaque PNG (`store-assets/feature-graphic-placeholder.png`), verified via `PIL`
  (`Image.open(...).size == (1024, 500)`, `mode == "RGB"`, no alpha).
- Confirmed all three tracks share one `appId`/`bundleIdentifier`/`package`
  (`com.inovixux.app`) and one app name (`INOVIXUX`) directly from
  `capacitor.config.ts` / `app.json` / `pubspec.yaml` — basis for the "one shared listing spec"
  scope decision in this doc's header.
- Confirmed no headless-browser or simulator tooling is present (`node_modules/.bin` has no
  `playwright`/`puppeteer` entry) before writing §2's "not captured" disposition, rather than
  assuming the gap.
- Checked `05-verbal-identity.md` §3's banned-word list against §4.3's copy by hand — no matches.
- `check-theme-parity.mjs` not run — this ticket touches no `tokens.css` roles and no component
  CSS; not applicable.
