# Elevator Experience Implementation Plan

> For agentic workers: use the approved four-specialist execution. Lead integrates; no per-task review agents or additional approval gates.

**Goal:** Deliver the approved cinematic landing and a mathematically documented, reproducible elevator simulator.
**Architecture:** React SPA, scroll-driven R3F scene, pure TypeScript discrete-event engine in a Web Worker. Demand and learning are independent of dispatch; identical traces are supplied to every policy.
**Tech Stack:** React, Vite, TypeScript, Three/R3F/Drei, GSAP, KaTeX, Vitest, Playwright.
**Spec:** ../specs/2026-10-08-elevator-experience-design.md

## Global constraints
- Four introductory elevators; configured simulation fleet can vary.
- PDF equations are authoritative; source defects corrected explicitly.
- Baseline + time-band + adaptive comparisons on identical demand.
- All units in seconds, kg and metres internally; totalFloors includes ground.
- Real metrics, censored outcomes visible, no promises of real-world improvements.
- No public deployment, commits or overwrite of existing staged user work.
- Existing isolated cloud checkout; no new worktree needed.

## Review focus
- Heavy workloads: bounded execution with explicit error, no silent demand reduction.
- Zero demand / incomplete service: honest denominators and no NaN.
- Single upper floor / single elevator: valid trips and adaptive reserve.
- Cancel / route return: stale worker responses ignored; state preserved.
- Reversed scroll / no WebGL / reduced motion: usable scene or static alternative.

## Task 1 — Contracts and numerical foundation (Architect)
- [ ] Establish types, validated scenario, original preset and deterministic PRNG.
- [ ] RED→GREEN: floor convention, invalid fields, deterministic demand, multiple distinct break components, zero participation and disjoint training seeds.
- [ ] Implement demand, office learning, Gaussian forecast, NNLS diagnostics and statistics.
- [ ] Verify useful fixtures and numerics; report exact interfaces to engine/lead.

## Task 2 — Discrete-event engine and policies (Mathematician)
- [ ] RED→GREEN: travel formula, real segment residue, shared dwell, drop before pickup, rejected pickup retained, capacity and passenger conservation, adaptive idle reserve, horizon censoring.
- [ ] Implement shared route evaluator/event executor, insertion delta J and reference baseline, band/adaptive parking.
- [ ] Accept explicit request traces; emit event/replay data and auditable metrics.
- [ ] Compare deterministic fixtures; run original preset stress and invariants.

## Task 3 — Interface and worker (Lead)
- [ ] Scaffold build and worker protocol; config controls all real fields.
- [ ] Integrate editable groups/floor ranges and pauses; validate before run.
- [ ] Present calculated results, distributions, replay and CSV/JSON export; cancellation guarded by runId.
- [ ] Add source-linked algorithms page with all 19 equations and clearly labelled research/screening.

## Task 4 — Cinematic scene (Motion Designer)
- [ ] RED→GREEN: deterministic journey pose and door checkpoints before implementing mapping.
- [ ] Build exterior/lobby/corridor/right turn/four-elevator wall/cabin with shared meshes and materials.
- [ ] Integrate one scroll progression; tune frame composition for desktop/mobile and text transition.
- [ ] Supply static fallback and reduced-motion path; no external paid or large asset dependencies.

## Task 5 — Acceptance and performance (QA, then Lead fixes)
- [ ] Run core suite and type/build checks.
- [ ] Browser: configuration/run/cancel, export, route/back, scroll reversal, four doors, mobile, keyboard and fallback.
- [ ] Record workload, browser, frame and worker timings; guardrails communicate their limits.
- [ ] Fix significant findings once with regression tests; rerun affected verification.
- [ ] Save reusable install/start instructions and final concise evidence report.

No implementation checkpoint requires renewed approval: the user approved the design and autonomous execution order. Technical rulings and completed verification are recorded in progress.md.
