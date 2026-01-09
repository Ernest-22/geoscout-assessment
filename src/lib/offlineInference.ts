import { ObservationState } from "@/types";

/**
 * Deterministic Offline Inference Engine
 * -------------------------------------
 * This module provides a white-box, rule-based mineral identification system.
 * It prioritizes explainability, safety, and determinism over coverage.
 *
 * Used when:
 * - No API key is available
 * - Network connectivity fails
 *
 * Design principles:
 * - Evidence-based (minimum match thresholds)
 * - Scoring over hard if/else chains
 * - Explicit uncertainty handling (returns null when inconclusive)
 */

/** Definition of a mineral rule profile */
type MineralRule = {
  name: string;
  traits: string[];
  minMatches: number;
};

/**
 * Offline mineral knowledge base
 * NOTE: Intentionally limited in scope (field-identifiable minerals only)
 */
const MINERAL_RULES: MineralRule[] = [
  {
    name: "Quartz (SiO₂)",
    traits: ["Glassy", "Transparent", "Translucent", "Hexagonal", "Conchoidal", "Colorless"],
    minMatches: 3,
  },
  {
    name: "Calcite (CaCO₃)",
    traits: ["Rhombohedral", "Glassy", "Pearly", "White", "Transparent"],
    minMatches: 2,
  },
  {
    name: "Feldspar",
    traits: ["Opaque", "Glassy", "Pink", "White", "Blocky"],
    minMatches: 3,
  },
  {
    name: "Pyrite (FeS₂)",
    traits: ["Metallic", "Gold", "Yellow", "Cubic", "Massive"],
    minMatches: 3,
  },
  {
    name: "Galena (PbS)",
    traits: ["Metallic", "Cubic", "Silver", "Grey", "Opaque", "Heavy"],
    minMatches: 3,
  },
  {
    name: "Hematite (Fe₂O₃)",
    traits: ["Red", "Brown", "Dull", "Earthy", "Metallic"],
    minMatches: 2,
  },
  {
    name: "Magnetite (Fe₃O₄)",
    traits: ["Metallic", "Black", "Opaque", "Magnetic"],
    minMatches: 3,
  },
  {
    name: "Halite (NaCl)",
    traits: ["Cubic", "Transparent", "Colorless", "Salty"],
    minMatches: 3,
  },
  {
    name: "Gypsum (CaSO₄·2H₂O)",
    traits: ["White", "Transparent", "Tabular", "Soft"],
    minMatches: 2,
  },
];

/**
 * Attempts to infer a mineral using deterministic scoring logic.
 *
 * @param obs - Current observation state
 * @returns Mineral name if confident, otherwise null
 */
export function inferMineral(obs: ObservationState): { name: string; confidence: number } | null {
  const observedTraits = Object.keys(obs).map(t => t.toLowerCase());
  
  let bestMatch: { name: string; score: number; totalTraits: number } | null = null;

  for (const mineral of MINERAL_RULES) {
    const matchCount = mineral.traits.filter(trait =>
      observedTraits.includes(trait.toLowerCase())
    ).length;

    if (matchCount >= mineral.minMatches) {
      if (!bestMatch || matchCount > bestMatch.score) {
        bestMatch = { 
          name: mineral.name, 
          score: matchCount,
          totalTraits: mineral.traits.length 
        };
      }
    }
  }

  if (!bestMatch) return null;

  // Confidence calculation: Matches divided by a "Solid ID" baseline of 4 traits
  const confidence = Math.min(bestMatch.score / 4, 1.0); 

  return { name: bestMatch.name, confidence };
}