# Session 24 — Rigged Hand: Full Articulation Plan + 3D Research

## What this plan covers

Two tracks. Track A is what we're actually building next. Track B is researched and
documented so it isn't lost, but deliberately **not** in scope yet.

- **Track A (build now):** the 2D "cutout puppet" hand — full articulation, 6 independent
  pieces (palm/back-of-hand, thumb, index, middle, ring, pinky), each with its own pivot,
  rigged with CSS transforms and the existing `animate()`-on-ref pattern.
- **Track B (researched, deferred):** a true 3D hand — feasibility confirmed, free/low-cost
  path identified, explicitly parked until Track A has shipped and been tested on screen.

---

## Track A — Full articulation 2D rig

### Why 6 pieces instead of 3

Original recommendation was a simplified 3-piece rig (palm, thumb, fingers-as-one-group) to
de-risk the first attempt at this technique. Decision: go straight to full articulation —
palm + thumb + 4 independent fingers — since time/energy isn't the constraint here. Same
architecture either way, just more layers and more pivot tuning.

Bonus full articulation unlocks: a **grip cascade** — fingers don't all close in lockstep,
they close in a slight stagger (e.g. index+middle first, ring+pinky a beat behind, thumb
sets last locking the grip) — which reads as a much more natural, hand-like motion than a
single rigid piece ever could. Worth building in from the start, it's cheap once each finger
is independently animatable.

### Step 1 — Source ONE cohesive illustration

Do not prompt six separate hand-part images — independent generations won't match in
anatomy, lighting, or line weight. Generate one full illustration of the hand already
mid-grip, then cut that single image apart.

> Pen and ink illustration. A right human hand, dorsal view, gripping the top-right corner
> of a closed dark leather journal — fingers curled firmly over the edge, knuckles raised
> and pronounced with the effort of the grip, thumb tucked underneath and mostly hidden. The
> hand reads as larger and weightier in frame than a resting hand. Wrist and forearm exit
> the right side of the frame. Warm natural skin tone, bold ink crosshatching for shadow and
> knuckle definition, in the style of 1800s manuscript book plates. Transparent background.
> Subject fills the lower-right third of the frame, angled slightly toward camera for depth.

### Step 2 — Mask into 6 pieces

In Photoshop / GIMP / Photopea (free, browser-based): cut along the natural creases into
palm/back-of-hand, thumb, index, middle, ring, pinky. Export each as its own transparent
PNG. For each piece, note roughly where its pivot (the knuckle it rotates from) sits within
the crop — "about 15% from the left, 80% down" is precise enough. That becomes the CSS
`transformOrigin` for that layer. Get the pivot wrong and the piece swings from the wrong
point instead of curling naturally.

### Step 3 — Build the rig component

New component (e.g. `app/components/journal/RiggedHand.tsx`), separate from `page.tsx` —
same reasoning as `PageStack`/`RiffleOverlay` already being their own components. Six
absolutely-positioned `<img>` layers sharing one container, each with its own
`transformOrigin`. Exposes an imperative ref API — `grip()` and `release()` — driven by the
same standalone `animate()`-on-ref pattern used everywhere else in this app (no new
animation library, no React state per finger).

`grip()`: rotates each finger closed, staggered per the cascade above, thumb last.
`release()`: reverses it, roughly mirrored timing.

### Step 4 — Wire into the existing ritual

`openCoverFull` / `closeCoverFull` (in `page.tsx`) call `handRef.current.grip()` right at the
press beat, at the very start of the swing. Fingers stay closed through the drag/hitch/
release. `release()` fires right as the crossfade to the resting hand starts — same handoff
point already tuned for the grip↔rest crossfade, just add the finger-release call alongside
the existing opacity fade.

### Step 5 — Sell the weight

On top of the articulation itself: layer the finger pieces slightly "in front of" the palm
(small offset + their own drop-shadow, not just the one shared filter the whole hand uses
now), and a contact shadow under the grip point that tightens/darkens as the fingers close.
This is what turns "fingers that move" into "fingers that feel like they're gripping
something with weight," on top of the articulation itself.

---

## Track B — 3D path (researched, parked)

Question was: can a real 3D hand (heavy, thick, actual light-wrapping-around-volume) be
sourced without paying for professional animation/rigging? Short answer: yes, current AI
generation tools handle both mesh generation and rigging for free or near-free.

**Mesh generation** — text-to-3D or image-to-3D (could feed in the hand illustration itself
as the reference image): [Meshy](https://www.meshy.ai/) and [Tripo3D](https://www.tripo3d.ai/)
both have generous free tiers; [Hunyuan3D](https://www.meshy.ai/tutorials/character-auto-rigging-workflow)
is fully free/open-source and self-hostable for unlimited generations if you're willing to
run it yourself. [3D AI Studio](https://www.3daistudio.com/blog/best-free-ai-3d-model-generators-2026)
is a free aggregator that lets you try a prompt across several engines and keep the best
result.

**Auto-rigging** — this is the part that used to require a real animator, and doesn't
anymore for a case this simple. Meshy's auto-rigger specifically handles hands: builds the
full finger skeleton with correct parent-child joints, computes skinning weights
automatically, done in under 30 seconds, no manual weight painting. [Details here](https://www.tripo3d.ai/blog/explore/free-rigged-hand-3d-model-guide).
Free-tier hand assets are released CC0 (royalty-free, commercial-safe). Alternatives if
Meshy's rig doesn't fit: Mixamo, AccuRIG, or Blender's Rigify (all free, Rigify needs
Blender familiarity).

**What generation does NOT solve:** getting a rigged GLB into this app is a separate,
real engineering task — it means bringing in Three.js (or similar) plus a GLTF loader as a
genuinely new dependency, and building a WebGL layer that composites convincingly with the
existing CSS 3D-transform leather book (matching lighting, perspective, and the exact camera
framing so it doesn't look like two different rendering technologies stapled together). That
integration work is real regardless of how the asset was sourced — the research below just
confirms the *asset* isn't the blocker, the *compositing* still is.

**Recommendation:** don't start this until Track A has shipped and been seen on screen.
If the full-articulation 2D rig still doesn't hit the ceiling once it's built and tested,
this is the next real move, and the sourcing side is now a known, low-cost path rather than
an open question.

---

## Open items before Track A build starts

- [ ] Source and mask the 6 hand-part PNGs (on your end)
- [ ] Confirm pivot-point notes for each piece once exported
- [ ] I build `RiggedHand.tsx` + wire it into the ritual once the assets exist
