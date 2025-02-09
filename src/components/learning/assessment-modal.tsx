"use client";

import { useState, useEffect } from "react";
import { type LearningSession } from "@/types/learning";
import { type AssessmentQuestion, type AssessmentResult, type AssessmentSummary } from "@/lib/services/assessment-service";
import { assessmentService } from "@/lib/services/assessment-service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAssessmentNotifications } from "@/lib/hooks/useAssessmentNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AssessmentModalProps {
  session: LearningSession;
  onComplete: () => void;
  onClose: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function AssessmentModal({ session, onComplete, onClose, onShowToast }: AssessmentModalProps) {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  const {
    handleQuestionResult,
    handleAssessmentComplete,
    handleError
  } = useAssessmentNotifications({ onShowToast });

  useEffect(() => {
    const loadQuestions = async () => {
      setIsGeneratingQuestions(true);
      setError(null);
      try {
        const generatedQuestions = await assessmentService.generateQuestions(session);
        if (generatedQuestions.length === 0 && retryCount < 3) {
          // Retry if no questions were generated
          setRetryCount(prev => prev + 1);
          throw new Error('No questions generated');
        }
        setQuestions(generatedQuestions);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate questions';
        setError(errorMessage);
        handleError(error as Error, 'question_generation');
      } finally {
        setIsGeneratingQuestions(false);
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [session, retryCount, handleError]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = (currentQuestionIndex / questions.length) * 100;

  const handleAnswerChange = (answer: string) => {
    if (!currentQuestion) return;
    
    setUserAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer
    }));
    setError(null); // Clear any previous errors
  };

  const handleNext = async () => {
    if (!currentQuestion) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await assessmentService.validateAnswer(
        currentQuestion,
        userAnswers[currentQuestion.id] || ''
      );
      handleQuestionResult(result);
      setResults(prev => [...prev, result]);

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        const assessmentSummary = await assessmentService.createAssessmentSummary(
          [...results, result]
        );
        setSummary(assessmentSummary);
        handleAssessmentComplete(assessmentSummary);
        await assessmentService.updateProgress(session, [...results, result]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process answer';
      setError(errorMessage);
      handleError(error as Error, 'answer_validation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setRetryCount(0);
    setError(null);
  };

  const handleComplete = () => {
    onComplete();
  };

  if (isLoading || isGeneratingQuestions) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Card className="w-full max-w-2xl p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Card className="w-full max-w-2xl p-6">
          <div className="space-y-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-end space-x-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <Card className="w-full max-w-2xl p-6">
        <AnimatePresence mode="wait">
          {summary ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Assessment Complete</h2>
              <div className="space-y-4">
                <p>Correct Answers: {summary.correctAnswers} / {summary.totalQuestions}</p>
                <Progress value={(summary.correctAnswers / summary.totalQuestions) * 100} />
                <div className="space-y-2">
                  <h3 className="font-semibold">Knowledge Gaps:</h3>
                  <ul className="list-disc pl-6">
                    {summary.knowledgeGaps.map((gap, index) => (
                      <li key={index}>{gap}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold">Recommendations:</h3>
                  <ul className="list-disc pl-6">
                    {summary.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button onClick={handleComplete} className="w-full">
                Continue Learning
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="question"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Assessment</h2>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
              <Progress value={progress} />
              {currentQuestion && (
                <div className="space-y-6">
                  <p className="text-lg">{currentQuestion.text}</p>
                  {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                    <RadioGroup
                      onValueChange={handleAnswerChange}
                      value={userAnswers[currentQuestion.id]}
                    >
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`}>{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                  {currentQuestion.type === 'OPEN_ENDED' && (
                    <Input
                      value={userAnswers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      placeholder="Type your answer here..."
                    />
                  )}
                  {currentQuestion.type === 'TRUE_FALSE' && (
                    <RadioGroup
                      onValueChange={handleAnswerChange}
                      value={userAnswers[currentQuestion.id]}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="true" />
                        <Label htmlFor="true">True</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="false" />
                        <Label htmlFor="false">False</Label>
                      </div>
                    </RadioGroup>
                  )}
                </div>
              )}
              <div className="flex justify-end space-x-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!userAnswers[currentQuestion?.id] || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : currentQuestionIndex === questions.length - 1 ? (
                    'Finish'
                  ) : (
                    'Next'
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
} 