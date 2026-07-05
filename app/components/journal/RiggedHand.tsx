"use client";

import { useImperativeHandle, useRef } from "react";
import { animate } from "framer-motion";

export type RiggedHandHandle = {
  grip: () => void;
  release: () => void;
};

type PieceId = "index" | "middle" | "ring" | "pinky" | "thumb";

type Piece = {
  id: PieceId;
  label: string;
  closedRotate: number;
  delayMs: number;
  origin: string;
  box: React.CSSProperties;
};

// Placeholder geometry only — rough tabs laid over the visible fingertips in
// the current resting-pose hand.png (1536x1024, dorsal view, wrist right).
// Every box/origin here is a guess to be thrown out once the real 6-piece cut
// lands (session-24 plan, Track A). Only the piece ids, the cascade delayMs,
// and the closedRotate signs are meant to survive that swap.
const PIECES: Piece[] = [
  { id: "index", label: "idx", closedRotate: -50, delayMs: 0, origin: "90% 50%", box: { left: "16%", top: "34%", width: "22%", height: "10%" } },
  { id: "middle", label: "mid", closedRotate: -55, delayMs: 0, origin: "90% 50%", box: { left: "14%", top: "43%", width: "24%", height: "10%" } },
  { id: "ring", label: "rng", closedRotate: -55, delayMs: 80, origin: "90% 50%", box: { left: "15%", top: "52%", width: "23%", height: "10%" } },
  { id: "pinky", label: "pky", closedRotate: -50, delayMs: 80, origin: "90% 50%", box: { left: "18%", top: "60%", width: "19%", height: "9%" } },
  { id: "thumb", label: "thb", closedRotate: -30, delayMs: 160, origin: "70% 20%", box: { left: "38%", top: "58%", width: "16%", height: "14%" } },
];

const GRIP_DURATION = 0.3;
const RELEASE_DURATION = 0.3;

// Full-articulation hand rig: one static palm/back-of-hand base plus 5
// independently-pivoting finger layers. grip()/release() drive them with the
// same standalone animate()-on-ref pattern already used elsewhere in this app
// (see bookRef's scale zoom in page.tsx) — no per-finger React state, no new
// animation dependency.
export default function RiggedHand({ ref }: { ref?: React.Ref<RiggedHandHandle> }) {
  const pieceRefs = useRef<Partial<Record<PieceId, HTMLDivElement | null>>>({});

  useImperativeHandle(ref, () => ({
    // Staggered close — index+middle first, ring+pinky a beat behind, thumb
    // last to "lock" the grip. Reads as a hand closing, not a hinge snapping.
    grip() {
      for (const piece of PIECES) {
        const el = pieceRefs.current[piece.id];
        if (!el) continue;
        setTimeout(() => {
          animate(el, { rotate: `${piece.closedRotate}deg` }, { duration: GRIP_DURATION, ease: "easeIn" });
        }, piece.delayMs);
      }
    },
    // Release doesn't need to mirror the stagger — it's only ever called right
    // as the piece is fading/culling out of view (see openCoverFull), so this
    // is mostly a state reset for the next grip() rather than a visible beat.
    release() {
      for (const piece of PIECES) {
        const el = pieceRefs.current[piece.id];
        if (!el) continue;
        animate(el, { rotate: "0deg" }, { duration: RELEASE_DURATION, ease: "easeOut" });
      }
    },
  }), []);

  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "1536 / 1024" }}>
      {/* Palm / back-of-hand base — doesn't animate, fingers pivot independently
          over top of it. TODO: swap for the cropped palm-only piece once the
          mid-grip illustration is sourced and cut (session-24 plan). */}
      <img
        src="/hand.png"
        alt=""
        draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", mixBlendMode: "multiply" }}
      />

      {/* Finger placeholders — dummy labeled tabs standing in for the 5 cropped
          finger PNGs, so the grip()/release() cascade and pivot mechanics can
          be built and tuned before the real assets exist. Swap each piece's
          `box`/`origin` for its true crop once cut; ids and delayMs carry over. */}
      {PIECES.map((piece) => (
        <div
          key={piece.id}
          ref={(el) => { pieceRefs.current[piece.id] = el; }}
          style={{
            position: "absolute",
            transformOrigin: piece.origin,
            border: "1px dashed rgba(255,190,110,0.65)",
            background: "rgba(200,140,80,0.2)",
            borderRadius: "3px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "7px",
            fontFamily: "monospace",
            color: "rgba(255,210,150,0.9)",
            pointerEvents: "none",
            ...piece.box,
          }}
        >
          {piece.label}
        </div>
      ))}
    </div>
  );
}
