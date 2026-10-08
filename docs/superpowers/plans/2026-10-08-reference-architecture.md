# Reference architecture implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic architectural details with geometry informed by the analyzed MOV and all six photographs, preserving the reversible journey and working simulator.

**Architecture:** Pure layout data produces instanced architectural surfaces, separate curved fixtures and a source-derived elevator interior. React Three Fiber continues to consume the existing deterministic camera pose. Reference provenance is kept accessible; dimensions and the undocumented connection are design decisions, not measured facts.

**Tech Stack:** Existing React/TypeScript, Three.js/R3F/Drei, Vitest and Playwright; no new runtime dependencies.

**Spec:** Approved visual analysis in `/workspace/visual-review-2026-10-08/analisi-visiva.md`; original mandatory continuous journey and user approval `procedi`.

**Latest user amendment:** «Inserisci direttamente l'ingresso con l'ascensore all'interno del palazzo, da chiuso ad aperto». This supersedes the corridor/right-turn/four-portal VISUAL sequence: one axial in-building portal is shown; simulation fleet parameters stay unchanged.

## Global Constraints

- Do not change `src/simulation`, `src/configurator`, `src/algorithms`, mathematical overlays or numerical presets.
- Photographs constrain silhouette and visible finishes; MOV keyframes 0.00, 1.45, 2.05 and 3.05 s constrain entrance/lobby composition. Later frames are facade references, not a path to elevators.
- Keep a single physical portal directly inside the lobby, with backwards scroll reconstructing identical state.
- Path coordinates remain project dimensions. The direct portal placement is the user-approved adaptation, not a documented location in the real reference building.
- Keep reduced-motion/no-WebGL alternatives, keyboard navigation and mobile framing. No deployment or new third-party assets.

## Review Focus

- Wider facade/balconies must fit the first portrait and desktop frames.
- Expanded lobby columns and reception must not obstruct any sampled camera pose.
- Instanced surfaces must preserve stable geometry/material resources across scroll updates.
- Intended Canvas unmount during navigation must not masquerade as hardware context loss.
- Reference images must not be preloaded into the primary rendering path or change simulator state.

---

### Task 1: Reference-constrained architectural geometry

**Files:** Create `src/journey/architecture.ts`, `src/journey/ReferenceArchitecture.tsx`, `tests/architecture.test.ts`; modify `JourneyScene.tsx`, `pose.ts` only if framing requires it.

**Interfaces:** `buildReferenceArchitecture(): ReferenceArchitectureLayout` provides tagged box instances, facade/window colors, column positions and organic fixture transforms. Rendering consumes this model without changing `journeyPose(progress, aspect)` phase boundaries or door displacement.

- [x] Write and run failing tests for nonuniform facade depth, left balconies above the entrance, setback crown, free central camera lane and complete new bounds in the initial viewport.
- [x] Following the user amendment, verify RED→GREEN for direct axial pose, one portal, lateral reception, reversible opening and threshold crossing.
- [x] Implement pure geometry and instanced renderer: blue/grey glazing, warm interior bays, grey frames, ivory round columns, organic pendants and pale reception.
- [x] Replace decorative elevator brass/rail interior with observed steel surround, red left display, twin rear dark panels, upper-right grille and ribbed floor. Preserve door groups/ref and their deterministic animation.
- [x] Run architectural and full unit suites, then inspect rendered key poses against the source frames.

### Task 2: Resource lifecycle and accessible source provenance

**Files:** Modify `src/components/SceneCanvas.tsx`, `src/journey/JourneyFallback.tsx`, visual-only portions of `src/App.tsx` and scoped CSS; add selected reference assets and `docs/visual-reference.md`; add focused browser tests.

**Interfaces:** Existing `onFailure()` is reserved for genuine context loss, not intentional teardown. Fallback remains independent of WebGL and the Worker; source images are opt-in/lazy.

- [x] Reproduce the route-return Canvas failure with the existing journey test before editing lifecycle code.
- [x] Remove context-loss listener during intended unmount; verify genuine context loss still selects the fallback.
- [x] Add concise provenance and original references, distinguishing architectural evidence from the designed connection. Align accessible static captures with revised facade/lobby/single portal.
- [x] Verify keyboard, reduced-motion, no-WebGL, source disclosure and simulator state persistence.

### Task 3: Integration and delivery

**Files:** Existing browser tests as required; README and verification report.

- [x] Run unit tests and production build; run actual desktop/portrait/reverse-scroll single-portal journey plus the six real-Worker acceptance tests.
- [x] Inspect entrance, lobby, single-portal and opening screenshots; attempt declared rendering measurement on software renderer, record timeout rather than claiming real-GPU performance.
- [x] Request one focused final code review, fix important findings with regression tests, preserve unrelated pre-existing algorithm-page layout defects in the report.
- [x] Commit/push only the existing development branch after validation. No main merge or public deployment.

## Execution ledger

- Baseline: branch `work`, commit `86c7251`, clean tracked checkout; existing installed dependencies reused.
- Ruling: execute in the existing cloud checkout, not a new worktree; cloud onboarding instructions prefer existing isolation and user asks ordinary decisions to proceed autonomously.
- Ruling: approval `procedi` permits the documented geometry revision. Async clarification covers the undocumented connection; no unobserved architecture is represented as measured or historically verified.
- Art consultation: reused 3D & Motion Designer; implementation and integration stay with Lead, one final reviewer only.
- User ruling: replace the undocumented corridor/right-turn/bank with direct in-building single-portal placement as explicitly requested. Keep the mathematical fleet unchanged; present this adaptation clearly in provenance.
- Evidence: baseline70/70; initial architectural tests4RED→6GREEN; amended axial journey/reception tests7RED→16GREEN. Route-return browser failure reproduced on the unmodified baseline, Canvas disappears after navigation.
- Evidence: lifecycle2RED→3GREEN; static-image fallback browser RED on missing image→implemented real captures; portrait opening card RED at y154px→bottom card; pier occlusion RED1.20<1.4975→GREEN after widening. Full unit suite81/81 and production build pass.
- Browser: extended run16pass/2fail (pre-existing algorithm-page320/375overflow); benchmark90-frame softwareGPU times out60s. Neither failure is disabled or represented as success. All six real-Worker acceptance tests passed.
- Final review: one important geometric pocket issue corrected; minor grille visibility corrected; mathematical source/configuration, PDF, dependencies and lockfile unchanged.
- Final confirmation:81/81unit, production build and16/16selectedbrowser pass on final source/assets. The three already-diagnosed extended checks remain present and are explicitly reported in `docs/verification.md`, not claimed green.
