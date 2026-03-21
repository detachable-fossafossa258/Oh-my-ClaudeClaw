/**
 * decay.js — Importance decay algorithm
 *
 * Re-exports the decay logic from refiner.js for standalone use.
 * The decay algorithm follows v2-spec §3.5:
 *   - 30-day units of no access → importance decreases
 *   - Higher access frequency slows decay
 *   - importance >= 8 AND layer='longterm' → exempt
 *   - Minimum importance = 1
 */

export { applyDecay, calculateDecay } from "./refinement/refiner.js";
