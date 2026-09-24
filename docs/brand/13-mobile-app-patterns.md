# 13 — Mobile App Pattern Set (proposal, ahead of any screens existing)

**Responds to:** the "mobile app" line in `12-branding-completeness-checklist.md` §5, and your
instruction to define the system "in detailed for the web application, mobile application... and
our Website."

**Status:** Pattern-level proposal only — no native codebase exists to build screens *in* yet
(no React Native/Flutter/Capacitor workspace in this repo, by design, same reasoning as
`06-angular-components/README.md`'s "no target Angular workspace" note). This is the contract a
future mobile build inherits, written now so the token system doesn't have to be reverse-engineered
later. Nothing here touches the paused KYB product surface (`00-INDEX.md` §5).

---

## 1. Navigation pattern

- **Primary nav = bottom tab bar**, 3–5 items max, each tap target ≥ `--ino-target-comfortable`
  (44px) with `--ino-target-spacing` (8px) between adjacent tabs. Icon + label, never icon-only
  (WCAG 2.2 target-identification, and this audience includes non-technical vendor/compliance
  users per the brief's DPI context).
- **Secondary nav = stack push** (native back gesture/button), not tabs-within-tabs — keeps the
  fluid density's whitespace-first feel from `[data-density="fluid"]` (§6 of `11-…
  mobile-accessibility.md`) instead of cramming a second nav layer into a phone-width screen.
- **Safe areas**: tab bar bottom padding = `--ino-safe-area-bottom` + base spacing, never just the
  raw inset — matches the token's own doc comment ("always safe to consume unconditionally").

## 2. Screen templates (structural, token-mapped — not visual mockups)

| Template | Composition | Token notes |
|---|---|---|
| **Auth / onboarding** | Single-column, `ino-card` (`variant="default"`) form shell, large tap targets throughout | `--ino-target-comfortable` on every input/button; `--ino-type-display-size-sm` (38px) for the headline step, not the desktop 56px |
| **List** | Vertically stacked `ino-card` (`padding="sm"`, `interactive`) rows, or a dense list row using `--ino-row-min-height` (44px, fluid) | Row height token already exists (`tokens.css` §10, `fluid` variant) — reuse, don't invent a new row height for mobile |
| **Detail** | Header (back + title) → `ino-card` sections stacked, sunken variant for read-only/reference blocks | `variant="sunken"` for anything that should read as "reference data," e.g. a submitted document's extracted fields |
| **Modal / bottom sheet** | `ino-card` (`variant="overlay"`) sliding up from the bottom edge, full-width, `--ino-color-overlay-scrim` backdrop behind it | This is the mobile home of the overlay tokens added this round (see `11-…mobile-accessibility.md` §9) — a bottom sheet *is* an overlay card, just anchored to the bottom edge instead of centered |
| **Empty state** | Centered icon/illustration slot + headline + optional single CTA | Icon system decided (`14-icon-system.md`) — use the 32px icon row, `--ino-color-on-surface-muted` by default |
| **Settings / account** | Grouped `ino-card` sections, list-row pattern inside each group | Reuses the List template's row pattern, grouped instead of flat |

## 3. Theming on mobile

- **Default = OS `prefers-color-scheme`**, with an explicit in-app override using the same
  `ThemeService` pattern already shipped for web (`web/src/app/services/theme.service.ts`),
  backed by platform storage (`AsyncStorage`/`SharedPreferences`/Capacitor `Preferences`) instead
  of `localStorage`. No new token work — both themes are already fully audited (`11-…
  mobile-accessibility.md` §4).
- **Density is always `fluid`**, never `dense` — dense mode's 32px rows/12.5px type target a
  desktop risk-desk operator with a mouse, not a phone (already stated in `11-…
  mobile-accessibility.md` §6, restated here because it's the single most common mistake when a
  dense-mode web pattern gets ported to mobile without re-checking).

## 4. Motion

- Reuse `--ino-motion-duration-*` / `--ino-motion-easing-*` as-is — these are plain
  duration/easing values, not CSS-specific, so they map directly to whatever the native animation
  API is (Reanimated, `Animated`, Flutter `Curves`/`Duration`). Bottom-sheet enter/exit should use
  `--ino-motion-duration-base` (200ms) with `--ino-motion-easing-decelerate` on the way in and
  `--ino-motion-easing-accelerate` on the way out — standard sheet-motion convention, and the two
  easing curves already exist for exactly this split.
- Respect the platform's reduced-motion setting (`prefers-reduced-motion` equivalent:
  `AccessibilityInfo.isReduceMotionEnabled` / OS-level check) the same way the web components do —
  disable transform/slide animations, keep opacity/state changes.

## 5. Framework decision (resolved on INO-85)

- ~~Which framework~~ — resolved 2026-09-09: the board answered the INO-85 confirmation with
  **all three** — Capacitor, React Native, and Flutter — built in parallel rather than picking
  one, each maintained in its own top-level folder so the codebases stay fully independent:
  - `mobile/capacitor/` — wraps the existing Angular web app (`web/`); reuses components, design
    tokens, and `ThemeService` directly.
  - `mobile/react-native/` — standalone RN codebase; re-implements the token contract and screen
    templates from this doc natively (no direct code reuse from `web/`).
  - `mobile/flutter/` — standalone Flutter codebase; same token contract and screen templates,
    re-implemented in Dart/Flutter widgets.
  Each track consumes the same framework-agnostic contract already specified above (§1–4) and the
  same screen inventory (`15-mobile-screen-inventory.md`) so the three apps stay visually and
  behaviorally consistent even though nothing but the design spec is shared between them. Recorded
  here as the decision of record; original recommendation (Capacitor-only, for code reuse and one
  hiring track) is superseded by this answer — flagging for awareness that running three native
  codebases in parallel triples ongoing build/maintenance/hiring cost versus the single-track
  recommendation, in case that trade-off wasn't the intent. Build work for each track is split into
  its own child issue under INO-85.
- ~~Icon system~~ — decided, see `14-icon-system.md` (Lucide, sizing/color contract).
- ~~Screen inventory~~ — done, see `15-mobile-screen-inventory.md` (framework-agnostic; shared by
  all three framework tracks above).
- ~~App icon / splash screen~~ — done on all three tracks from the same `inovixux-icon-b2c.svg`
  source (INO-82), each with its own generator script since tooling/format differs per framework:
  `mobile/capacitor/resources/`, `mobile/react-native/assets/`, `mobile/flutter/assets/{icon,splash}/`.
  See `15-mobile-screen-inventory.md` §4 row 1.
- ~~Push notification / deep-link visual patterns~~ — specified in §6 below (INO-97). The visual
  and behavioural contract is written; wiring it to a real notification backend and a real
  link-host is product/backend work that §6.7 names explicitly.

## 6. Push notification & deep-link patterns (INO-97)

**What this section is.** The framework-agnostic visual and behavioural contract for push
notifications and deep links, written against the existing token set and the as-built 13-screen
inventory (`15-mobile-screen-inventory.md` §4) — no new tokens, no new screens. It is the same
kind of artifact as §1–4: the thing an implementation is held to, written before the
implementation exists. What it deliberately does *not* do is stand up a notification backend or a
verified link host; §6.7 lists exactly what is still owed and who owns it.

Every rule below is stated once and applies to all three tracks. Where the tracks genuinely differ
(they do — Angular Router vs React Navigation vs Flutter `Navigator`), the difference is confined
to §6.6's per-track table, so the user-visible behaviour stays identical.

### 6.1 Notification icon treatment

| Platform | Asset | Rule |
|---|---|---|
| **Android** — status-bar small icon | `ic_stat_inovixux` at 24/36/48/72/96 px (mdpi→xxxhdpi), `res/drawable-*/` | Android renders the small icon as an **alpha mask** — every color, gradient and fill is discarded. The gradient `inovixux-icon-b2c.svg` used for the app icon (§5, inventory row 1) therefore **cannot be reused directly**: flatten the IX mark to a single opaque path on a transparent 24dp canvas, keeping the mark's own construction rule (round cap/join, ~2px stroke at a 20px viewBox → 2.4dp at 24dp), same rule `14-icon-system.md` §1 holds Lucide glyphs to. A silhouette that keeps the verified-node dot legible at 24dp is the acceptance bar; if the dot closes up at that size, drop it rather than shipping a smudge. |
| **Android** — notification tint | `--ino-color-accent` | The one color Android *does* apply (`setColor`). Use the raw accent, not `--ino-color-accent-text-safe` — the tint lands on the icon glyph and the app-name label, both non-text or OS-drawn, so the non-text 3:1 floor applies (`14-icon-system.md` §3), not the 4.5:1 text floor. Do **not** theme-switch this per app theme: the tray is the OS's surface and the user may be in a different system theme than the in-app one, so the tint is a fixed brand mark, not a themed token read. |
| **iOS** — tray icon | *(none — OS uses the app icon)* | No extra asset. The existing per-track app-icon export already covers it. Notification content extensions (custom-rendered rich notifications) are explicitly out of scope — an extension re-implements the card UI a fourth time, for one surface, and buys nothing the in-app banner (§6.3) doesn't. |
| **Both** — large icon / avatar slot | Optional, omit by default | Only populate it when the notification is *about a specific entity* that has an image. A logo in the large-icon slot next to the small icon is the same mark twice. |

### 6.2 Badges

Three different badge surfaces, three different rules — they are routinely conflated:

| Surface | When it shows | Treatment |
|---|---|---|
| **OS app-icon badge** | Unread count > 0 | OS-drawn, no tokens apply. Set from the server-supplied unread count so it stays correct while the app is killed; never increment it client-side per received push (that drifts the moment one push is dropped or read on another device). Clear on Notifications-screen view, not on app open. |
| **Tab-bar badge** (the Notifications tab, `15-mobile-screen-inventory.md` §2) | Unread count > 0 | Dot when the count is unknown, numeral when known, `99+` above 99. Fill `--ino-color-danger`, label `--ino-color-on-danger` (both audited in all three themes, `tokens.css`), `--ino-radius-pill`, `--ino-type-eyebrow-size` (11px) *without* the eyebrow token's uppercase tracking — tracking on a 2-character numeral just decenters it. The badge sits **inside** the 44px `--ino-target-comfortable` tab target; it never enlarges the target or displaces the icon+label pair required by §1. |
| **In-row unread marker** (Notifications list rows) | Row unread | A 8px (`--ino-space-2`) `--ino-color-accent` dot in the row's leading slot, **plus** the row's title at body weight rather than muted. Color is never the only signal — same rule as `14-icon-system.md` §3's RAG-dot note. |

### 6.3 In-app banner vs system tray

The decision is made by app state, not by notification content:

| App state when the push arrives | Surface | Why |
|---|---|---|
| **Foreground, any screen** | In-app banner (§6.3.1) | Suppress the system tray presentation entirely. Showing both is the single most common push bug — the user gets a tray banner over an app that could have shown it in-context. |
| **Foreground, already on Notifications** | Silent — list updates in place | Banner-over-the-list is noise; the new row appearing *is* the notification. |
| **Background / killed** | System tray | The only surface available. Tap → §6.5 deep-link resolution. |
| **Any state, and the message blocks the user** (session expired, action required to continue) | Bottom sheet (`variant="overlay"`, §2 row 4) | A blocking message must not auto-dismiss. Banners auto-dismiss, so a banner is the wrong vessel regardless of app state. |

#### 6.3.1 In-app banner composition

Reuses the shipped toast pattern rather than inventing a second transient surface — the web
`ino-toast-container` (`web/src/app/components/toast-container/`) is the reference implementation
and each track re-implements the same contract in its own idiom:

- **Anchoring**: top edge, offset by `--ino-safe-area-top` + `--ino-space-4`. Toasts anchor
  bottom (that component's own safe-area note); **push banners anchor top** so an incoming
  notification never covers the bottom sheet or the tab bar the user is mid-interaction with.
- **Surface**: `ino-card` `variant="overlay"`, `--ino-radius-lg`, `--ino-elevation-2`. No scrim —
  a banner is non-modal; the scrim belongs to the bottom-sheet case above.
- **Composition**: 20px Lucide category glyph (§6.4) → title (1 line, truncate) + body (2 lines
  max, truncate) → optional single inline action. Never two competing actions in a banner; a
  second action means it should have been a sheet.
- **Motion**: in with `--ino-motion-duration-base` (200ms) + `--ino-motion-easing-decelerate`,
  out with the same duration + `--ino-motion-easing-accelerate` — same split §4 already mandates
  for sheets. Under reduced motion, cross-fade only (§4), never slide.
- **Dwell**: 5000ms, matching `ToastService`'s default (`web/src/app/services/toast.service.ts`),
  so the two transient surfaces don't feel like different systems. Swipe-up dismisses early;
  dwell pauses while the banner is focused by an assistive technology.
- **Accessibility**: announced `polite` (the same `aria-live` role the toast container uses) —
  `assertive` would interrupt whatever the user is reading, and a push is by definition not a
  response to their current action. Tap target spans the full banner and is ≥
  `--ino-target-comfortable`.
- **Stacking**: one banner at a time. A second arrival replaces the first (dismiss-then-present,
  not a stack) — stacked transient cards over a phone-width screen contradicts the fluid density's
  whitespace-first rule in §3.

### 6.4 Category → visual mapping

Four categories, mapped to tokens and glyphs that already exist. The *payload schema* that carries
the category is product work (§6.7); the visual contract for each is fixed here:

| Category | Glyph (Lucide) | Accent token | Typical use |
|---|---|---|---|
| `info` | `info` | `--ino-color-accent` | Status change, FYI, digest |
| `success` | `check-circle` | `--ino-color-success` | Completed job, approved submission |
| `warning` | `alert-triangle` | `--ino-color-warning` | Expiring item, action recommended |
| `critical` | `alert-octagon` | `--ino-color-danger` | Failure, action required, blocking (→ sheet, per §6.3) |

Category color tints the **glyph only** — never the banner's surface. Full-bleed status-colored
cards were already ruled out for the web alert component, and a colored surface forces every
foreground token in the banner to be re-audited per category for no communicative gain. The glyph
also never carries the meaning alone: the banner title must state the category in words
(`14-icon-system.md` §3).

### 6.5 Deep-link scheme and resolution

**Two link forms, one path grammar.**

- **Custom scheme** — `inovixux://<path>`, matching the shipped app id `com.inovixux.app`
  (`mobile/capacitor/capacitor.config.ts`, `mobile/react-native/app.json`). Used inside
  notification payloads and app-to-app handoffs. Always resolvable, never verified by anyone.
- **Universal Links / App Links** — `https://app.inovixux.com/<path>`, same paths. The form used
  in email, SMS and web, because it degrades to a web page when the app isn't installed. Requires
  an Apple App Site Association file and an Android `assetlinks.json` served from that host — the
  host does not exist yet (§6.7).

**The path grammar is the Capacitor route table** (`mobile/capacitor/app/src/app/app.routes.ts`),
which is the only track whose routes are already strings. React Native and Flutter map *to* these
paths rather than each inventing their own — one link string must resolve to the same screen on
all three tracks, or the link can't be put in a notification payload at all.

| Path | Screen (inventory §1 row) | Auth |
|---|---|---|
| `/home` | Home / dashboard (5) | required |
| `/home/:id` | Detail (7) | required |
| `/search` | Search (8) | required |
| `/notifications` | Notifications (9) | required |
| `/settings` | Settings / account (10) | required |
| `/sign-in` | Sign in (3) | public |
| `/forgot-password` | Forgot / reset password (4) — typically the reset-token landing | public |
| anything else | **Home**, silently | — |

Two resolution rules that are easy to get wrong:

- **Unknown path → Home, not an error screen.** This matches the `**` redirect already in the
  Capacitor route table. `error-offline` (row 13) is for *failed loads*, not for a link the app
  doesn't recognise — a stale link from an older app version landing the user on an error page
  reads as a broken app rather than a stale link.
- **Auth-required path while signed out → Sign in, holding the target.** After a successful sign
  in the app resumes to the held target instead of dropping the user on Home. The holding
  behaviour is specified here; it can only be *built* once a session backend exists (§6.7), and
  the existing sign-in screens already carry that same "no auth backend wired" note.

### 6.6 Cold start, warm start, back stack

**Cold start** (app not running). Capture the link *before* the first screen paints, hold on the
platform splash while it resolves, then paint the resolved screen with its parent stack already
in place (below). Never paint Home and then navigate — the visible jump is the tell that a deep
link was bolted on afterwards. If resolution needs a network round-trip, paint the destination
screen in its loading state, not Home.

**Warm start** (app backgrounded). Resolve onto the existing navigation state: switch to the
owning tab, then push the target if it isn't already on top. Do not tear down and rebuild the
stack — a user returning from a notification expects the app they left to still be underneath.

**Back stack.** A deep link must synthesize its parent chain, so `back` from a deep-linked Detail
goes `Detail → Home → exit`, never `Detail → exit`. On Android that means an explicit synthetic
back stack (system back is a first-class OS affordance and dumping the user out of the app is a
policy-level smell); on iOS the swipe-back gesture returns to Home in-app, with the OS's own
"back to <app>" breadcrumb handling the return to the referring app. Same destination, same
parent chain, both platforms.

Per-track implementation surface — the only place the three tracks diverge:

| Track | Link intake | Route mapping | Note |
|---|---|---|---|
| Capacitor | `@capacitor/app` `appUrlOpen` listener | Angular `Router.navigateByUrl(path)` | Paths are already the route table; thinnest of the three. |
| React Native | React Navigation `linking` config (`prefixes` + `config`) | Declarative path → screen map, incl. `Detail: 'home/:id'` | React Navigation synthesizes the parent stack natively when `config` nests Detail under the Home stack — use that rather than manual `push` chains. |
| Flutter | `app_links` (or equivalent) stream + initial-link read | **Needs a named-route table first** — `root_shell.dart` currently uses imperative `Navigator.push` with no route names | The one track with real preparatory work: introduce named routes (or `go_router`) mapping the §6.5 grammar before link intake is wired, otherwise the parent-chain rule above has nothing to build on. |

### 6.7 Residual dependencies — what is *not* closed by this section

The visual/behavioural contract above is complete and implementable as written. These five items
are product/backend work and none of them is a design-system decision:

1. **Push transport** — APNs + FCM credentials, device-token registration, and a server that
   actually sends. Nothing in this repo sends a notification today.
2. **Link host** — `app.inovixux.com` with a served AASA file and `assetlinks.json`. Until it
   exists, only the `inovixux://` custom scheme is testable, and Universal/App Links cannot be
   verified by the OS.
3. **Payload schema** — the field carrying `category` (§6.4) and the field carrying the deep-link
   path (§6.5). The visual mapping is fixed; the wire format is a product call.
4. **Unread-count source** — badge values (§6.2) must come from the server; there is no
   notification data model yet, which is also why all three Notifications screens currently render
   the empty state.
5. **Session backend** — required for the "hold the target through sign-in" rule in §6.5, the same
   dependency the sign-in screens already carry.

Implementation across the three tracks is tracked separately and is blocked on items 1–2.

## 7. Decision feedback — sound & haptics (INO-170, L-14)

No dedicated "approve/reject a pending item" screen exists yet in any of the three tracks (see
`15-mobile-screen-inventory.md`) — the closest built pattern is the confirm/cancel action sheet
(§2 Modal / bottom sheet row, screen inventory row 11: `ConfirmActionSheet.tsx`,
`ino-confirm-action-sheet.component.ts`, `confirm_action_sheet.dart`). That component's confirm
action *is* a binary consequential-decision commit, so haptic feedback is wired there rather than
on a not-yet-built approval screen — any future approval/rejection flow built on this shared
component inherits the feedback automatically.

- **Haptics, not sound.** A human-in-the-loop approval product needs the confirmation of a
  consequential decision to be perceptible without looking (the L-14 rationale) — haptics satisfy
  that on a device in a pocket or on a desk. Audio does not: most approval decisions happen with
  the device muted or on silent/DND, so a sound-only cue would silently fail exactly when it
  matters most, and would need bundled audio assets, a playback dependency, and a mute-state check
  per platform for no reliability gain over haptics. **Sound is deliberately not implemented.** If
  a future ticket wants it, treat it as additive (an optional cue layered on top of haptics, gated
  by an explicit in-app setting), not a replacement.
- **Non-destructive confirm (approve-shaped)** → a single "success" notification haptic
  (`Haptics.NotificationFeedbackType.Success` / `NotificationType.Success` /
  `HapticFeedback.mediumImpact()`).
- **Destructive confirm (reject-shaped)** → a heavier "warning" haptic
  (`Haptics.NotificationFeedbackType.Warning` / `NotificationType.Warning` /
  `HapticFeedback.heavyImpact()`) — distinguishable from the approve cue without looking.
- **Cancel is silent.** Backing out of the sheet is not a decision being confirmed, so it carries
  no haptic.
- **Dependencies added:** `expo-haptics` (react-native, MIT, official Expo module) and
  `@capacitor/haptics` (capacitor, MIT, official Capacitor plugin). Flutter uses the
  `HapticFeedback` platform channel already built into `flutter/services.dart` — no new pub
  dependency. All three calls are fire-and-forget and swallow rejection (simulators and
  haptics-less devices/browsers must not crash the confirm action).
