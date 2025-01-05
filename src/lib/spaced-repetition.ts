import { type Concept, type SpacedRepetitionConfig } from "@/types/learning";

const DEFAULT_CONFIG: SpacedRepetitionConfig = {
  baseInterval: 24, // 24 hours
  intervalModifier: 2, // Double the interval on good performance
  maxInterval: 24 * 30 * 3, // 3 months
  minMasteryGain: 5,
  maxMasteryGain: 20,
};

export function calculateNextReview(
  concept: Concept,
  performance: number, // 0-1
  config: SpacedRepetitionConfig = DEFAULT_CONFIG,
): Date {
  const now = new Date();
  
  // If it's the first review or performance is very poor, review soon
  if (!concept.lastReviewed || performance < 0.3) {
    return new Date(now.getTime() + config.baseInterval * 3600000);
  }

  // Calculate interval based on performance and current review count
  const interval = Math.min(
    config.baseInterval * Math.pow(config.intervalModifier, concept.reviewCount) * performance,
    config.maxInterval,
  );

  return new Date(now.getTime() + interval * 3600000);
}

export function calculateMasteryGain(
  concept: Concept,
  performance: number, // 0-1
  config: SpacedRepetitionConfig = DEFAULT_CONFIG,
): number {
  // Base gain based on performance
  const baseGain = config.minMasteryGain + 
    (config.maxMasteryGain - config.minMasteryGain) * performance;

  // Adjust gain based on current mastery (harder to gain at higher levels)
  const masteryFactor = 1 - concept.masteryLevel / 100;

  // Adjust gain based on difficulty (more gain for harder concepts)
  const difficultyFactor = concept.difficulty / 5;

  return Math.round(baseGain * masteryFactor * difficultyFactor);
}

export function evaluatePerformance(
  answer: string,
  concept: Concept,
): number {
  // TODO: Implement actual answer evaluation using LLM
  // For now, return a random performance score
  return Math.random();
}

export function getRecommendedConcepts(
  concepts: Concept[],
  config: SpacedRepetitionConfig = DEFAULT_CONFIG,
): Concept[] {
  const now = new Date();
  
  return concepts
    .filter((concept) => {
      // Include concepts that:
      // 1. Haven't been reviewed yet
      // 2. Are due for review
      // 3. Have low mastery
      return (
        !concept.lastReviewed ||
        (concept.nextReview && concept.nextReview <= now) ||
        concept.masteryLevel < 70
      );
    })
    .sort((a, b) => {
      // Prioritize:
      // 1. Overdue reviews
      // 2. Lower mastery levels
      // 3. Prerequisites
      const aScore =
        (a.nextReview && a.nextReview < now ? 100 : 0) +
        (100 - (a.masteryLevel || 0)) +
        (a.relatedConcepts?.some((r) => r.relationship === "prerequisite") ? 50 : 0);
      
      const bScore =
        (b.nextReview && b.nextReview < now ? 100 : 0) +
        (100 - (b.masteryLevel || 0)) +
        (b.relatedConcepts?.some((r) => r.relationship === "prerequisite") ? 50 : 0);
      
      return bScore - aScore;
    });
} 