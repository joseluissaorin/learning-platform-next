import { useCallback } from 'react';
import { type AssessmentResult, type AssessmentSummary } from '@/lib/services/assessment-service';

interface NotificationOptions {
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export function useAssessmentNotifications({ onShowToast }: NotificationOptions) {
  const handleQuestionResult = useCallback((result: AssessmentResult) => {
    if (result.isCorrect) {
      onShowToast('Correct! ' + result.feedback, 'success');
    } else {
      onShowToast(result.feedback, 'warning');
    }
  }, [onShowToast]);

  const handleAssessmentComplete = useCallback((summary: AssessmentSummary) => {
    const successRate = (summary.correctAnswers / summary.totalQuestions) * 100;
    
    if (successRate >= 70) {
      onShowToast(
        `Great job! You scored ${successRate.toFixed(1)}%. You can now continue learning.`,
        'success'
      );
    } else {
      onShowToast(
        `You scored ${successRate.toFixed(1)}%. Review the feedback and try again to continue.`,
        'warning'
      );
    }
  }, [onShowToast]);

  const handleError = useCallback((error: Error, context: string) => {
    const errorMessages: Record<string, string> = {
      'question_generation': 'Failed to generate questions. Please try again.',
      'answer_validation': 'Failed to validate answer. Please try again.',
      'progress_update': 'Failed to update progress. Your progress will be saved when connectivity is restored.',
      'assessment_check': 'Failed to check assessment status. Please refresh the page.',
      'default': 'An error occurred. Please try again.'
    };

    onShowToast(errorMessages[context] || errorMessages.default, 'error');
    console.error(`Assessment Error (${context}):`, error);
  }, [onShowToast]);

  return {
    handleQuestionResult,
    handleAssessmentComplete,
    handleError
  };
} 