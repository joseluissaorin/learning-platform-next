"use client";

import { useState } from "react";
import { ChevronLeft, Send, ThumbsUp, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ConceptQuestionProps,
  type ConceptFeedback,
} from "@/types/learning";
import {
  calculateNextReview,
  calculateMasteryGain,
  evaluatePerformance,
} from "@/lib/spaced-repetition";

export function ConceptQuestion({
  concept,
  onComplete,
  onBack,
}: ConceptQuestionProps) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<ConceptFeedback | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const handleSubmit = async () => {
    setIsEvaluating(true);
    setAttempts((prev) => prev + 1);

    try {
      // Evaluate the answer
      const performance = evaluatePerformance(answer, concept);

      // Calculate next review date
      const nextReview = calculateNextReview(concept, performance);

      // Calculate mastery gain
      const masteryIncrease = calculateMasteryGain(concept, performance);

      // Generate feedback based on performance
      if (performance < 0.7 && attempts < 2) {
        setFeedback({
          status: "partial",
          message: "Good start! However, could you elaborate more on [specific aspect]?",
          explanation:
            "Consider thinking about the relationship between [concept A] and [concept B].",
          suggestedReviewDate: nextReview,
          masteryIncrease,
          relatedConceptSuggestions: concept.relatedConcepts?.map((rc) => ({
            id: rc.id,
            title: rc.title,
            reason:
              rc.relationship === "prerequisite"
                ? "This concept is foundational to your current topic"
                : "This concept is closely related and might help your understanding",
          })),
        });
      } else {
        setFeedback({
          status: "complete",
          message: "Excellent understanding!",
          explanation: "You've demonstrated a solid grasp of the concept.",
          suggestedReviewDate: nextReview,
          masteryIncrease,
          relatedConceptSuggestions: concept.relatedConcepts
            ?.filter((rc) => rc.relationship === "followUp")
            .map((rc) => ({
              id: rc.id,
              title: rc.title,
              reason: "You're ready to explore this advanced concept",
            })),
        });
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-xl font-medium">
          Understanding Check: {concept.title}
        </h3>
        <p className="text-base-content/70">
          Please explain the concept of {concept.title} in your own words. Focus on
          the key principles and their relationships.
        </p>
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Type your explanation here..."
        className="textarea-bordered textarea min-h-[150px] w-full"
        disabled={isEvaluating}
      />

      {feedback && (
        <div
          className={cn(
            "rounded-lg p-4",
            feedback.status === "complete" ? "bg-success/20" : "bg-info/20",
          )}
        >
          <div className="flex items-start space-x-2">
            {feedback.status === "complete" ? (
              <ThumbsUp className="mt-0.5 h-5 w-5 text-success" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 text-info" />
            )}
            <div className="space-y-2">
              <div>
                <p className="font-medium">{feedback.message}</p>
                <p className="mt-1 text-sm">{feedback.explanation}</p>
              </div>

              {feedback.suggestedReviewDate && (
                <div className="flex items-center gap-1 text-sm text-base-content/70">
                  <Clock className="h-4 w-4" />
                  Next review:{" "}
                  {feedback.suggestedReviewDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}

              {feedback.masteryIncrease && (
                <div className="text-sm text-success">
                  +{feedback.masteryIncrease} Mastery
                </div>
              )}

              {feedback.relatedConceptSuggestions &&
                feedback.relatedConceptSuggestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Suggested Next Steps:</p>
                    <ul className="space-y-1">
                      {feedback.relatedConceptSuggestions.map((suggestion) => (
                        <li
                          key={suggestion.id}
                          className="text-sm text-base-content/70"
                        >
                          {suggestion.title} - {suggestion.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <button className="btn-outline btn" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Concept
        </button>

        {feedback?.status === "complete" ? (
          <button
            className="btn-primary btn"
            onClick={() => onComplete(feedback)}
          >
            Continue Learning
          </button>
        ) : (
          <button
            className="btn-primary btn"
            onClick={handleSubmit}
            disabled={!answer.trim() || isEvaluating}
          >
            {isEvaluating ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Answer
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
} 