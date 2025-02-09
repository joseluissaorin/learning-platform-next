import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type AssessmentQuestion, type AssessmentResult } from '@/lib/services/assessment-service';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: AssessmentQuestion[];
  onAnswerSubmit: (question: AssessmentQuestion, answer: string) => Promise<AssessmentResult>;
  onComplete: (results: AssessmentResult[]) => void;
}

export function AssessmentModal({
  isOpen,
  onClose,
  questions,
  onAnswerSubmit,
  onComplete
}: AssessmentModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleAnswerSubmit = async () => {
    if (!userAnswer.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await onAnswerSubmit(currentQuestion, userAnswer);
      setResults(prev => [...prev, result]);

      if (isLastQuestion) {
        onComplete([...results, result]);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setUserAnswer('');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAnswerInput = () => {
    switch (currentQuestion?.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="space-y-2">
            {currentQuestion.options?.map((option, index) => (
              <div key={index} className="flex items-center">
                <input
                  type="radio"
                  id={`option-${index}`}
                  name="answer"
                  value={option}
                  checked={userAnswer === option}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="mr-2"
                />
                <label htmlFor={`option-${index}`}>{option}</label>
              </div>
            ))}
          </div>
        );
      case 'TRUE_FALSE':
        return (
          <div className="space-x-4">
            <Button
              variant={userAnswer === 'true' ? 'default' : 'outline'}
              onClick={() => setUserAnswer('true')}
            >
              True
            </Button>
            <Button
              variant={userAnswer === 'false' ? 'default' : 'outline'}
              onClick={() => setUserAnswer('false')}
            >
              False
            </Button>
          </div>
        );
      case 'OPEN_ENDED':
        return (
          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="w-full h-32 p-2 border rounded-md"
            placeholder="Type your answer here..."
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Question {currentQuestionIndex + 1} of {questions.length}
          </DialogTitle>
        </DialogHeader>

        {currentQuestion && (
          <div className="space-y-4">
            <p className="text-lg font-medium">{currentQuestion.text}</p>
            {renderAnswerInput()}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAnswerSubmit}
                disabled={!userAnswer.trim() || isSubmitting}
              >
                {isLastQuestion ? 'Complete' : 'Next'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 