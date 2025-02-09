import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { type LearningSession } from '@/types/learning';
import { assessmentService, type AssessmentQuestion, type AssessmentResult, type AssessmentBlockStatus } from '@/lib/services/assessment-service';
import { AssessmentModal } from './AssessmentModal';

interface LearningSessionProps {
  session: LearningSession;
  onComplete: () => void;
}

export function LearningSession({ session, onComplete }: LearningSessionProps) {
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [currentQuestions, setCurrentQuestions] = useState<AssessmentQuestion[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [blockStatus, setBlockStatus] = useState<AssessmentBlockStatus | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkBlockStatus();
  }, [session]);

  const checkBlockStatus = async () => {
    try {
      const status = await assessmentService.getProgressBlockStatus(session);
      setBlockStatus(status);
    } catch (error) {
      console.error('Error checking block status:', error);
      toast({
        title: "Error",
        description: "Failed to check assessment status",
        variant: "destructive"
      });
    }
  };

  const handleStartAssessment = async () => {
    try {
      // Generate questions based on covered concepts
      const questions = await assessmentService.generateAssessment(
        session.title,
        session.concepts.map(c => ({
          id: c.id,
          title: c.title,
          content: c.content
        })),
        {
          multipleChoice: 3,
          trueFalse: 2,
          openEnded: 1
        }
      );

      setCurrentQuestions(questions);
      setIsAssessmentModalOpen(true);
      toast({
        title: "Assessment Started",
        description: "Answer the questions to test your understanding",
        variant: "default"
      });
    } catch (error) {
      console.error('Error starting assessment:', error);
      toast({
        title: "Error",
        description: "Failed to start assessment",
        variant: "destructive"
      });
    }
  };

  const handleAnswerSubmit = async (question: AssessmentQuestion, answer: string) => {
    try {
      const result = await assessmentService.checkAnswer(
        question,
        answer,
        session.concepts.find(c => c.id === question.learningUnitId)?.content || ''
      );

      setAssessmentResults(prev => [...prev, result]);
      
      toast({
        title: result.isCorrect ? "Correct!" : "Incorrect",
        description: result.feedback,
        variant: result.isCorrect ? "default" : "destructive"
      });

      return result;
    } catch (error) {
      console.error('Error validating answer:', error);
      toast({
        title: "Error",
        description: "Failed to validate answer",
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleAssessmentComplete = async (results: AssessmentResult[]) => {
    try {
      await assessmentService.updateProgress(session, results);
      const summary = await assessmentService.createAssessmentSummary(results);
      
      toast({
        title: "Assessment Completed",
        description: `Score: ${summary.correctAnswers}/${summary.totalQuestions}`,
        variant: "default"
      });

      setIsAssessmentModalOpen(false);
      setCurrentQuestions([]);
      setAssessmentResults([]);
      checkBlockStatus();
    } catch (error) {
      console.error('Error completing assessment:', error);
      toast({
        title: "Error",
        description: "Failed to complete assessment",
        variant: "destructive"
      });
    }
  };

  const handleModalClose = () => {
    if (blockStatus?.isBlocked) {
      toast({
        title: "Warning",
        description: "You need to complete the assessment to continue",
        variant: "destructive"
      });
      return;
    }
    setIsAssessmentModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{session.title}</h2>
        <button
          onClick={handleStartAssessment}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          disabled={blockStatus?.isBlocked}
        >
          Start Assessment
        </button>
      </div>

      {blockStatus?.isBlocked && (
        <div className="p-4 bg-warning/20 border border-warning rounded-md">
          <p className="text-warning-foreground">
            {blockStatus.reason || 'Assessment needs to be completed'}
          </p>
          <p className="text-sm text-muted-foreground">
            Required score: {blockStatus.requiredScore}% | Current score: {blockStatus.currentScore}%
          </p>
        </div>
      )}

      <AssessmentModal
        isOpen={isAssessmentModalOpen}
        onClose={handleModalClose}
        questions={currentQuestions}
        onAnswerSubmit={handleAnswerSubmit}
        onComplete={handleAssessmentComplete}
      />

      {/* Session content goes here */}
      <div className="prose max-w-none">
        {session.concepts.map((concept) => (
          <div key={concept.id} className="mb-8">
            <h3 className="text-xl font-semibold mb-2">{concept.title}</h3>
            <div dangerouslySetInnerHTML={{ __html: concept.content }} />
          </div>
        ))}
      </div>
    </div>
  );
} 