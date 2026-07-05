# Session 25 — 3D Research Validated + Placeholder Rig Landed

## Heads up before anything else

While this research was running, `app/components/journal/RiggedHand.tsx` got created and
`app/page.tsx` got wired up to use it — both changed under me mid-session (an Edit attempt
failed with "file modified since read," which is what caught it). Timestamps put both edits
at today, minutes before I tried to touch them. Best guess: a parallel Claude Code terminal
session on the same repo built Track A's placeholder rig while this chat was doing the Track B
research. Nothing here overwrites that work — I re-read it, checked it, and picked up from
where it left off. Worth confirming: **if you've got a Claude Code session open on this repo
right now, say so before I touch `page.tsx` or `RiggedHand.tsx` again** — otherwise we'll keep
clobbering each other's edits.

Also flagging, unrelated to the hand rig: `git status` shows sessions 13–24's worth of work —
`public/hand.png`, `PROJECT-INSTRUCTIONS.md`, sessions 22–24's `.md` files, all of it — sitting
**uncommitted**. The last real commit is `dfa4a2e` ("latest rework update," not very
descriptive). If this laptop has a bad day, that's several sessions gone. Worth a commit once
the rig settles, even a rough one.

---

## Track B — 3D research, now checked against current sources

Session 24 already concluded Track B (a real 3D hand via Three.js) is feasible but not worth
starting yet. Re-ran the research to check that conclusion still holds and to correct one
detail:

- **Meshy stays the pick** for auto-rigging — it's still the one AI 3D generator with
  built-in, hands-specific auto-rigging (skeleton + skinning weights, no manual weight
  painting). Tripo3D and similar generate good meshes but don't auto-rig; that'd mean a
  separate manual pass in Blender or Mixamo.
- **Licensing correction**: session 24 said free-tier Meshy output is CC0. Current research
  says free tier is **CC BY 4.0** (commercial use fine, attribution required) — not CC0.
  I'm not fully certain which is right (licensing pages change and I'm reading marketing copy,
  not a contract), so don't take either as gospel — check Meshy's own licensing page directly
  before this matters for anything real. For a personal project it's a non-issue either way.
- **React Three Fiber integration**: confirmed real, confirmed non-trivial, confirmed no
  shortcut. You'd load the GLB via `useLoader(GLTFLoader, ...)` (or generate a typed component
  with `gltfjsx`), drive bone rotations either through baked animation clips or manually in a
  `useFrame` loop, and — the actual hard part — make a WebGL-rendered mesh sit convincingly
  inside a scene that's currently pure CSS 3D transforms (matching lighting, perspective, and
  camera framing so it doesn't look like two rendering technologies stapled together). Nothing
  in current tooling solves that compositing problem for you.

**Verdict: unchanged.** Track B stays parked. If anything, it's a stronger "not yet" than
session 24 already had it, because Track A's remaining gap just got cheaper (below) — less
reason to skip ahead to the expensive option.

---

## Track A — what's actually left, now that a placeholder rig exists

`RiggedHand.tsx` (as it stands right now) is a **mechanics-only placeholder**: the real
`hand.png` renders as a static base layer, and 5 dashed-border debug boxes ("idx", "mid",
"rng", "pky", "thb") are laid over the approximate finger positions, each independently
rotatable. Cascade timing matches session 24's plan (index+middle first, ring+pinky 80ms
behind, thumb 160ms behind, locking the grip). `tsc --noEmit` is clean and the aspect ratio
(1536:1024) matches the real PNG exactly — I checked the file's actual header rather than
trust the comment.

Two honest things about it as it stands:

1. **It will not look like a gripping hand yet.** The debug boxes rotate over the *real,
   static* fingers underneath — you'll see rectangles move, not fingers curl. That's fine;
   its job right now is proving the cascade timing and pivot points feel right before real art
   exists, not looking finished. The code's own comments already say this.
2. **The actual blocker session 24 flagged — sourcing 6 real cut-apart finger pieces — is
   still untouched.** The palm layer is still the whole flat image; nothing's been masked yet.
   This is the one open question worth resolving before more rig-tuning time goes in, because
   it changes what the palm piece even needs to look like.

### The one real finding from this session: don't regenerate the illustration, and don't hand-mask it in Photoshop

Session 24's plan was: generate a brand-new *mid-grip* illustration (fingers already curled),
then manually cut it into 6 pieces in Photoshop/GIMP/Photopea, eyeballing each pivot point.

Two problems with that, found while checking current tooling:

**Problem 1 — the mid-grip source pose is the wrong direction for this animation.**
`release()` needs to swing fingers *away* from a curled position back to resting. If the
source art is already mid-grip, the palm underneath the curled fingers was never drawn —
it's occluded in the source image. Uncurl the fingers in that direction and you reveal blank
space where the palm should be, because there's no anatomy there to reveal. Curling *further
closed* from an already-open source is safe (fingers only ever cover more of the palm, never
less); curling *open* from an already-closed source is the risky direction — and it's exactly
the direction `release()` needs every single time the ritual plays.

**Fix**: cut apart the **existing `/hand.png`** (already a relaxed, fingers-slightly-spread
resting pose — see the session-22 gen prompt) instead of generating a new mid-grip
illustration. `grip()` then curls fingers inward from a source pose that's already open,
which only ever increases self-occlusion — the safe direction. It also means no new
illustration needs generating at all — one less step, one less thing that can come out
inconsistent with what's already shipped.

**Problem 2 — manual Photoshop masking is real, fiddly work with no visual feedback until you reload the browser.**
Current AI layer-segmentation tools (SAM-2/SAM-3-based — e.g. the class of tool represented
by Jenova AI's layer extractor, LlamaGen's Layer Splitter, "Image to Layers," RoboNeo) do this
semantically now: click a finger, it segments that finger out as a clean RGBA layer, and
critically, several of these do **occlusion reconstruction** — they inpaint the pixels a
segmented object was covering, rather than leaving a hole. That second part matters even with
the safe resting-pose source: wherever one finger overlaps another slightly, or overlaps the
palm's edge, inpainting fills in what should logically be there instead of leaving a gap.

I haven't run any of these myself (no image to feed them from in this session, and some are
paid/rate-limited) — this is "here's the category of tool and why it fits," not "I tested tool
X and it works." Worth trying one on the actual hand.png before committing to it as the plan.

### Recommended order for finishing Track A

1. Try an AI layer-splitter (pick one — Komiko, LlamaGen, or similar) on the *existing*
   `/hand.png`, asking it to separate palm/back-of-hand, thumb, index, middle, ring, pinky.
   Check the output quality, especially at the joints.
2. If that's clean: export the 6 RGBA pieces, note each piece's pivot (the knuckle it should
   rotate from) as a rough percentage within its own crop.
3. Swap `RiggedHand.tsx`'s debug boxes for `<img>` tags pointing at the 6 real pieces, same
   position/size/transformOrigin math the placeholder already uses — the rig logic
   (`grip()`/`release()`, cascade delays, easing) doesn't need to change, only what's rendered
   inside each piece.
4. Re-tune rotation angles and pivot points by eye once real art is in — this was always going
   to be a "look at it in the browser and adjust" step, placeholder or not.
5. Layer in session 24's "sell the weight" idea once real art exists: fingers slightly in
   front of the palm with their own drop shadow, plus a contact shadow that tightens as the
   grip closes.

If the AI layer-splitter output is *not* clean enough (bad joints, weird artifacts), fall back
to session 24's original manual-masking plan — it still works, it's just more hands-on.

---

## Open items

- [ ] Confirm: is a Claude Code session actively running against this repo right now?
- [ ] Try an AI layer-splitter on `/hand.png`, evaluate the 6-piece output
- [ ] Once real pieces exist, swap them into `RiggedHand.tsx` and re-tune by eye
- [ ] Commit the backlog of uncommitted work (sessions 13–24 + this one)
- [ ] Consider a rough git commit message convention going forward — "latest rework update" ×2
      in the log isn't going to help future-you find anything
