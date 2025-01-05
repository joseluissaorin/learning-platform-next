import { useState } from "react";
import { QuestionType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuestionCard } from "./question-card";
import { generateQuestions, evaluateAnswer } from "@/lib/ai/question-generator";
import { Loader2 } from "lucide-react";

interface QuestionManagerProps {
  unitId: string;
  content: string;
  context?: string;
}

export function QuestionManager({ unitId, content, context }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleGenerateQuestions = async () => {
    setLoading(true);
    try {
      const generatedQuestions = await generateQuestions({
        content,
        context,
        preferredTypes: [QuestionType.MULTIPLE_CHOICE, QuestionType.OPEN_ENDED],
        count: 3
      });

      // Save questions to the database
      const response = await fetch(`/api/learning-units/${unitId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(generatedQuestions),
      });

      if (!response.ok) {
        throw new Error("Failed to save questions");
      }

      const savedQuestions = await response.json();
      setQuestions(savedQuestions);
    } catch (error) {
      console.error("Error generating questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    try {
      const evaluation = await evaluateAnswer(currentQuestion, answer, content);
      
      // Show explanation after answer
      setShowExplanation(true);

      // Move to next question after a delay
      setTimeout(() => {
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setShowExplanation(false);
        }
      }, 3000);
    } catch (error) {
      console.error("Error evaluating answer:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Practice Questions</span>
          <Button
            onClick={handleGenerateQuestions}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Questions"
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {questions.length > 0 ? (
          <div className="space-y-4">
            <QuestionCard
              question={questions[currentQuestionIndex]}
              onAnswer={handleAnswer}
              showExplanation={showExplanation}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            {loading ? (
              <p>Generating questions...</p>
            ) : (
              <p>Click the button above to generate practice questions.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 